/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/runtime', 'N/email', 'N/file', 'N/format', 'N/search', 'N/compress', '../Models/jj_cm_efficiency_searches.js'],
    /**
     * @param{log} log
     * @param{runtime} runtime
     * @param{email} email
     * @param{file} file
     * @param{format} format
     * @param{search} search
     * @param{compress} compress
     * @param{cm_efficiency} cm_efficiency
     */
    (log, runtime, email, file, format, search, compress, cm_efficiency) => {
        
        const getInputData = (inputContext) => {
            try {
                const scriptObj = runtime.getCurrentScript();
                const rawLocation = scriptObj.getParameter('custscript_jj_eff_excel_location');
                const locationParts = rawLocation ? rawLocation.split('|') : [];
                const locationId = locationParts[0];
                const exportLevel = locationParts[1] || 'department';
                const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                const endDate = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                const isRepair = scriptObj.getParameter('custscript_jj_eff_excel_is_repair');
  
                // ── Lightweight department lookup ───────────────────────────────────
                const deptSearch = search.create({
                    type: 'customrecord_jj_manufacturing_dept',
                    filters: [
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
                
                const deptIds = [];
                deptSearch.run().each(result => {
                    deptIds.push(result.getValue('internalid'));
                    return true; // switch to paged search.run().getRange() loops if you expect >1000 depts
                });
 
                log.debug('Departments found', deptIds.length);
 
                // ── One input entry per department; each becomes its own reduce() key ──
                const inputs = {};
                deptIds.forEach(deptId => {
                    inputs[deptId] = JSON.stringify({
                        locationId,
                        startDate,
                        endDate,
                        isRepair,
                        deptId,
                        exportLevel
                    });
                });
 
                return inputs;
            } catch (err) {
                log.error('Error in getInputData', err);
                return [];
            }
        };

        const reduce = (reduceContext) => {
            try {
                const deptId = reduceContext.key;
                
                const reduceGovStart = runtime.getCurrentScript().getRemainingUsage();

                const params = JSON.parse(reduceContext.values[0]);
                const { locationId, startDate, endDate, isRepair, exportLevel  } = params;
 
                let options = {
                    includeWaxTree: isRepair !== 'T'
                    // TODO (see caveat above): add a real per-department filter here,
                    // e.g. options.departmentId = deptId, IF buildEfficiencyData
                    // supports narrowing its internal query to one department.
                    // Without that, the call below still fetches the full location.
                };
                if (isRepair === 'T') {
                    options.repairOrderFilter = 'T';
                } else if (isRepair === 'F') {
                    options.repairOrderFilter = 'F';
                } else {
                    options.repairOrderFilter = null;
                }
 
                const data = cm_efficiency.buildEfficiencyData(locationId, startDate, endDate, options);
 
                const loc = data && data[locationId];
                const dept = loc && loc.departments && loc.departments[deptId];
 
                if (!dept) {
                    log.debug('Departments with No Data', {
                        deptId,
                        availableDeptKeys: loc ? Object.keys(loc.departments || {}) : 'no loc/location data at all'
                    });
                    return;
                }
 
                // ── Recovery data, scoped to just this department's name ────────────
                let recoveryMap = {};
                let empRecoveryMap = {};
                try {
                    if (dept.department_name) {
                        const recoveryResult = cm_efficiency.getAvgRecoveryPercentageBatch(
                            startDate, endDate, [dept.department_name]
                        );
                        if (recoveryResult && recoveryResult.data) {
                            recoveryMap = recoveryResult.data.recoveryMap || {};
                            empRecoveryMap = recoveryResult.data.employeeRecoveryMap || {};
                        }
                    }
                } catch (recErr) {
                    log.error('Error fetching recovery data in reduce', { deptId, error: recErr });
                }

                //    every location/department in the whole dataset. ────────────────
                const rows = [];
                const locName = loc.location_name;
 
                if (exportLevel === 'employee') {
                    if (dept.employees_array && dept.employees_array.length > 0) {  
                        dept.employees_array.forEach(emp => {
                            (emp.unique_categories_array || []).forEach(cat => {
                                const bags = emp.category_bag_names_map?.[cat] || [];
                                bags.forEach(bagName => {
                                    const bagQty = emp.categories.find(c => c.category_name === cat && c.bag_name === bagName) || {};

                                    const sG  = parseFloat(bagQty.starting_qty_gold || 0);
                                    const iG  = parseFloat(bagQty.issued_qty_gold || 0);
                                    const lG  = parseFloat(bagQty.loss_qty_gold || 0);
                                    const scG = parseFloat(bagQty.scrap_qty_gold || 0);
                                    const bG  = parseFloat(bagQty.balance_qty_gold || 0);
                                    const issuedNetWtG = sG + iG - scG - bG;
                                    const recvG = sG + iG - lG - scG - bG;
                                    const purity = parseFloat(bagQty.metal_purity_percent || 0) / 100;
                                    const pureWt = recvG * purity;
                                    const pureLoss = lG * purity;
                                    const netLoss = lG - pureLoss;
                                    const grossLossPct = recvG > 0 ? (lG / recvG * 100) : 0;
                                    const netLossPct = recvG > 0 ? (netLoss / recvG * 100) : 0;

                                    const sD  = parseFloat(bagQty.starting_qty_diamond || 0);
                                    const iD  = parseFloat(bagQty.issued_qty_diamond || 0);
                                    const lD  = parseFloat(bagQty.loss_qty_diamond || 0);
                                    const scD = parseFloat(bagQty.scrap_qty_diamond || 0);
                                    const bD  = parseFloat(bagQty.balance_qty_diamond || 0);
                                    const issuedNetWtD = sD + iD - scD - bD;
                                    const recvD = sD + iD - lD - scD - bD;
                                    const diamondLossPct = recvD > 0 ? (lD / recvD * 100) : 0;

                                    const sP  = parseFloat(bagQty.starting_pieces_info || 0);
                                    const iP  = parseFloat(bagQty.issued_pieces_info || 0);
                                    const scP = parseFloat(bagQty.scrap_pieces_info || 0);
                                    const bP  = parseFloat(bagQty.balance_pieces_info || 0);
                                    const lP  = parseFloat(bagQty.loss_pieces_info || 0);
                                    const rPc = sP + iP - scP - bP;
                                    const lPc = lP;

                                    const deptRecoveryPct = recoveryMap[dept.department_name] || 0;
                                    const empRecoveryPct = empRecoveryMap[dept.department_name]?.[emp.name] || deptRecoveryPct;
                                    const goldRecoveryWt = pureLoss > 0 ? pureLoss * (empRecoveryPct / 100) : 0;
                                    const goldRecoveryPct = pureLoss > 0 && goldRecoveryWt > 0 ? (goldRecoveryWt / pureLoss) * 100 : 0;

                                    rows.push({
                                        location: locName,
                                        department: dept.department_name,
                                        employee: emp.name,
                                        category: cat,
                                        subcategory: emp.category_bag_sub_category_map?.[cat]?.[bagName] || '-',
                                        style: emp.category_bag_print_design_map?.[cat]?.[bagName] || '-',
                                        bagName: bagName,
                                        issuedNetWtG, recvG, lG, grossLossPct,
                                        purity: purity * 100, pureWt, pureLoss, netLoss, netLossPct,
                                        issuedNetWtD, recvD, lD, diamondLossPct,
                                        rPc, lPc, goldRecoveryWt, goldRecoveryPct
                                    });
                                });
                            });
                        });
                    }
                } else {
                    // Department export: iterate department-level bag map directly
                    (dept.unique_categories_array || []).forEach(cat => {
                        const bags = dept.category_bag_names_map?.[cat] || [];
                        bags.forEach(bagName => {
                            const bKey = `${deptId}_${cat}_${bagName}`;
                            const bagQty = dept.category_bag_qty_map?.[bKey] || {};

                            const sG  = parseFloat(bagQty.starting_qty_gold || 0);
                            const iG  = parseFloat(bagQty.issued_qty_gold || 0);
                            const lG  = parseFloat(bagQty.loss_qty_gold || 0);
                            const scG = parseFloat(bagQty.scrap_qty_gold || 0);
                            const bG  = parseFloat(bagQty.balance_qty_gold || 0);
                            const issuedNetWtG = sG + iG - scG - bG;
                            const recvG = sG + iG - lG - scG - bG;
                            const purity = parseFloat(bagQty.metal_purity_percent || 0) / 100;
                            const pureWt = recvG * purity;
                            const pureLoss = lG * purity;
                            const netLoss = lG - pureLoss;
                            const grossLossPct = recvG > 0 ? (lG / recvG * 100) : 0;
                            const netLossPct = recvG > 0 ? (netLoss / recvG * 100) : 0;

                            const sD  = parseFloat(bagQty.starting_qty_diamond || 0);
                            const iD  = parseFloat(bagQty.issued_qty_diamond || 0);
                            const lD  = parseFloat(bagQty.loss_qty_diamond || 0);
                            const scD = parseFloat(bagQty.scrap_qty_diamond || 0);
                            const bD  = parseFloat(bagQty.balance_qty_diamond || 0);
                            const issuedNetWtD = sD + iD - scD - bD;
                            const recvD = sD + iD - lD - scD - bD;
                            const diamondLossPct = recvD > 0 ? (lD / recvD * 100) : 0;

                            const sP  = parseFloat(bagQty.starting_pieces_info || 0);
                            const iP  = parseFloat(bagQty.issued_pieces_info || 0);
                            const scP = parseFloat(bagQty.scrap_pieces_info || 0);
                            const bP  = parseFloat(bagQty.balance_pieces_info || 0);
                            const lP  = parseFloat(bagQty.loss_pieces_info || 0);
                            const rPc = sP + iP - scP - bP;
                            const lPc = lP;

                            const deptRecoveryPct = recoveryMap?.[dept.department_name] || 0;
                            const goldRecoveryWt = pureLoss > 0 ? pureLoss * (deptRecoveryPct / 100) : 0;
                            const goldRecoveryPct = pureLoss > 0 && goldRecoveryWt > 0 ? (goldRecoveryWt / pureLoss) * 100 : 0;

                            rows.push({
                                location: locName,
                                department: dept.department_name,
                                employee: '',
                                category: cat,
                                subcategory: dept.category_bag_sub_category_map?.[cat]?.[bagName] || '-',
                                style: dept.category_bag_print_design_map?.[cat]?.[bagName] || '-',
                                bagName: bagName,
                                issuedNetWtG, recvG, lG, grossLossPct,
                                purity: purity * 100, pureWt, pureLoss, netLoss, netLossPct,
                                issuedNetWtD, recvD, lD, diamondLossPct,
                                rPc, lPc, goldRecoveryWt, goldRecoveryPct
                            });
                        });
                    });
                }

                if (!rows.length) return; // Skip if no rows created
 
                // log.debug('Rows built for department', { deptId, deptName: dept.department_name, count: rows.length });
 
                if (rows.length > 0) {
                    reduceContext.write(deptId, JSON.stringify(rows));
                }
            } catch (err) {
                log.error('Error in reduce for department ' + reduceContext.key, err);
            }
        };

        const summarize = (summaryContext) => {
            try {
                const scriptObj = runtime.getCurrentScript();
                const rawLocationParam = scriptObj.getParameter('custscript_jj_eff_excel_location') || '';
                const exportLevel = (rawLocationParam.split('|')[1]) || 'department';
                const isDeptExport = exportLevel === 'department';
 
                // ── Backend summary data (wax-tree adjustments) ──────────────────
                let backendDeptSummaryData = {};
                try {
                    let locationId  = scriptObj.getParameter('custscript_jj_eff_excel_location');
                    if (locationId && String(locationId).includes('|')) {
                        locationId = String(locationId).split('|')[0];
                    }
                    const startDate  = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                    const endDate    = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                    const isRepair   = scriptObj.getParameter('custscript_jj_eff_excel_is_repair');
 
                    let opts = { includeWaxTree: isRepair !== 'T' };
                    if      (isRepair === 'T') opts.repairOrderFilter = 'T';
                    else if (isRepair === 'F') opts.repairOrderFilter = 'F';
                    else                       opts.repairOrderFilter = null;
 
                    const summaryData = cm_efficiency.buildSummaryEfficiencyData(locationId, startDate, endDate, opts);
                    Object.keys(summaryData).forEach(locId => {
                        Object.keys(summaryData[locId].departments || {}).forEach(dId => {
                            const d = summaryData[locId].departments[dId];
                            backendDeptSummaryData[d.department_name] = {
                                received_qty_gold:              parseFloat(d.received_qty_gold              || 0),
                                wax_tree_received_qty_gold:     parseFloat(d.wax_tree_received_qty_gold     || 0),
                                wax_tree_actual_production_gold: parseFloat(d.wax_tree_actual_production_gold || 0),
                                wax_tree_loss_gold:             parseFloat(d.wax_tree_loss_gold             || 0)
                            };
                        });
                    });
                } catch (summErr) {
                    log.debug('Error loading backend summary data for wax tree adjustment', summErr);
                }
 
                // ── Colour palette ───────────────────────────────────────────────
                const CLR = {
                    headerBg: '#1F2937', headerFg: '#FFFFFF', totalBg: '#E0E7FF',
                    empBg: '#F5F3FF', grandBg: '#E5E7EB', lossFg: '#DC2626',
                    bagCntBg: '#DBEAFE', catBg: '#F0F9FF', whiteBg: '#FFFFFF',
                    altRowBg: '#F9FAFB', linkFg: '#2563EB'
                };
 
                // ── Styles XML (same for every file part) ────────────────────────
                const styles = `
                    <Styles>
                    <Style ss:ID="h">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#374151"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#374151"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#374151"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#374151"/>
                    </Borders>
                    <Font ss:Bold="1" ss:Color="${CLR.headerFg}" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.headerBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="title">
                    <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
                    <Font ss:Bold="1" ss:Color="${CLR.headerFg}" ss:FontName="Calibri" ss:Size="12"/>
                    <Interior ss:Color="${CLR.headerBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="d">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.whiteBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="dalt">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.altRowBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="dl">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:Color="${CLR.lossFg}" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.whiteBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="dlalt">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:Color="${CLR.lossFg}" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.altRowBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="db">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.bagCntBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="dc">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.catBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="t">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                    </Borders>
                    <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.totalBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="tl">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                    </Borders>
                    <Font ss:Bold="1" ss:Color="${CLR.lossFg}" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.totalBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="tb">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A5B4FC"/>
                    </Borders>
                    <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.bagCntBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="e">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8B5CF6"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                    </Borders>
                    <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.empBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="el">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8B5CF6"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                    </Borders>
                    <Font ss:Bold="1" ss:Color="${CLR.lossFg}" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.empBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="eb">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8B5CF6"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C4B5FD"/>
                    </Borders>
                    <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.bagCntBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="g">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6B7280"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6B7280"/>
                    </Borders>
                    <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.grandBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="gl">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6B7280"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6B7280"/>
                    </Borders>
                    <Font ss:Bold="1" ss:Color="${CLR.lossFg}" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.grandBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="gb">
                    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6B7280"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9CA3AF"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6B7280"/>
                    </Borders>
                    <Font ss:Bold="1" ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.bagCntBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="dnl">
                    <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.whiteBg}" ss:Pattern="Solid"/>
                    </Style>
 
                    <Style ss:ID="dnlalt">
                    <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
                    <Borders>
                        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                        <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
                    </Borders>
                    <Font ss:FontName="Calibri" ss:Size="9"/>
                    <Interior ss:Color="${CLR.altRowBg}" ss:Pattern="Solid"/>
                    </Style>
                    </Styles>`;
 
                // ── Column widths ────────────────────────────────────────────────
                const COL_WIDTHS_ALL = [
                    60, 100, 120, 100, 70, 70, 80,
                    70, 70, 55, 50, 45, 60, 55, 55, 50,
                    75, 75, 65, 55, 55, 50, 60, 55
                ];
                const COL_WIDTHS = isDeptExport ? COL_WIDTHS_ALL.filter((_, i) => i !== 2) : COL_WIDTHS_ALL;

                const colDefs = COL_WIDTHS.map(w => `   <Column ss:Width="${w}"/>`).join('\n');
 
                const HEADERS = isDeptExport ? [
                    'Location', 'Department', 'Category', 'Subcategory',
                    'Style Number', 'Bag Name',
                    'Issued Net Wt Gold (g)', 'Received Qty Gold (g)', 'Gross Loss Gold (g)',
                    'Gross Loss %', 'Purity %', 'Pure Weight (g)', 'Pure Loss (g)',
                    'Net Loss (g)', 'Net Loss %',
                    'Issued Net Wt Diamond (ct)', 'Recv Qty Diamond (ct)', 'Loss Qty Diamond (ct)',
                    'Diamond Loss %', 'Received Pieces', 'Loss Pieces',
                    'Gold Recovery Wt (gm)', 'Gold Recovery %'
                ] : [
                    'Location', 'Department', 'Employee', 'Category', 'Subcategory',
                    'Style Number', 'Bag Name',
                    'Issued Net Wt Gold (g)', 'Received Qty Gold (g)', 'Gross Loss Gold (g)',
                    'Gross Loss %', 'Purity %', 'Pure Weight (g)', 'Pure Loss (g)',
                    'Net Loss (g)', 'Net Loss %',
                    'Issued Net Wt Diamond (ct)', 'Recv Qty Diamond (ct)', 'Loss Qty Diamond (ct)',
                    'Diamond Loss %', 'Received Pieces', 'Loss Pieces',
                    'Gold Recovery Wt (gm)', 'Gold Recovery %'
                ];
 
                // ── Collect all rows from reduce output ──────────────────────────
                const allRows   = [];
                const seenKeys  = new Set();
                summaryContext.output.iterator().each(function (key, value) {
                    let parsed;
                    try { parsed = JSON.parse(value); } catch (e) { return true; }
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    items.forEach(row => {
                        const dk = [row.location, row.department, row.employee, row.category, row.bagName].join('|~~|');
                        if (!seenKeys.has(dk)) { seenKeys.add(dk); allRows.push(row); }
                    });
                    return true;
                });
 
                // ── Recovery map ─────────────────────────────────────────────────
                let recoveryMap = {};
                try {
                    const allDeptNames = [];
                    allRows.forEach(row => {
                        if (row.department && !allDeptNames.includes(row.department))
                            allDeptNames.push(row.department);
                    });
                    if (allDeptNames.length > 0) {
                        const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                        const endDate   = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                        const result = cm_efficiency.getAvgRecoveryPercentageBatch(startDate, endDate, allDeptNames);
                        if (result && result.data && result.data.recoveryMap)
                            recoveryMap = result.data.recoveryMap;
                    }
                } catch (recErr) {
                    log.error('Error fetching recovery data in summarize', recErr);
                }
 
                // ── Helper functions ─────────────────────────────────────────────
                const esc = (s) => String(s || '')
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
 
                const cell = (styleId, type, value) =>
                    `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
 
                const numCell = (styleId, value) => {
                    const n = parseFloat(value);
                    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${isNaN(n) ? 0 : n}</Data></Cell>`;
                };
 
                const pctStr   = (num, den) => den > 0 ? (num / den * 100).toFixed(2) + '%' : '0.00%';
                const sumField = (rows, field) => rows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
 
                const getDeptTotals = (rows, deptName) => {
                    let rG = sumField(rows, 'recvG');
                    let iG = sumField(rows, 'issuedNetWtG');
                    let lG = sumField(rows, 'lG');
                    
                    // Override with wax tree data if available for this department
                    if (deptName && backendDeptSummaryData[deptName]) {
                        const waxData = backendDeptSummaryData[deptName];
                        if (waxData.wax_tree_received_qty_gold > 0) {
                            rG = waxData.wax_tree_received_qty_gold;
                        }
                        if (waxData.wax_tree_actual_production_gold > 0) {
                            iG = waxData.wax_tree_actual_production_gold;
                        }
                        if (waxData.wax_tree_loss_gold > 0) {
                            lG = waxData.wax_tree_loss_gold;
                        }
                    }
 
                    const pw  = sumField(rows, 'pureWt');
                    const pl  = sumField(rows, 'pureLoss');
                    const iD  = sumField(rows, 'issuedNetWtD');
                    const rD  = sumField(rows, 'recvD');
                    const lD  = sumField(rows, 'lD');
                    const rPc = sumField(rows, 'rPc');
                    const lPc = sumField(rows, 'lPc');
                    const nl  = lG - pl;
                    const bagSet = new Set(rows.map(r => r.bagName));
                    return {
                        iG, rG, lG, pw, pl, nl, iD, rD, lD, rPc, lPc,
                        bagCount: bagSet.size,
                        grossLossPct: pctStr(lG, rG),
                        netLossPct:   pctStr(nl, rG),
                        diamondLossPct: pctStr(lD, rD),
                        pureLoss: pl
                    };
                };
 
                // ── Group rows by department ─────────────────────────────────────
                const deptMap   = {};
                const deptOrder = [];
                allRows.forEach(row => {
                    if (!deptMap[row.department]) {
                        deptMap[row.department] = { rows: [], location: row.location };
                        deptOrder.push(row.department);
                    }
                    deptMap[row.department].rows.push(row);
                });
 
                // ── Grand totals (computed by summing department totals) ──────────────
                // This ensures grand total = sum of department totals, using wax tree data where available
                let GT = { iG: 0, rG: 0, lG: 0, pw: 0, pl: 0, nl: 0, iD: 0, rD: 0, lD: 0, rPc: 0, lPc: 0, bagCount: 0, pureLoss: 0 };
                const grandBagSet = new Set();
                deptOrder.forEach(deptName => {
                    const deptTotals = getDeptTotals(deptMap[deptName].rows, deptName);
                    GT.iG  += deptTotals.iG;
                    GT.rG  += deptTotals.rG;
                    GT.lG  += deptTotals.lG;
                    GT.pw  += deptTotals.pw;
                    GT.pl  += deptTotals.pl;
                    GT.nl  += deptTotals.nl;
                    GT.iD  += deptTotals.iD;
                    GT.rD  += deptTotals.rD;
                    GT.lD  += deptTotals.lD;
                    GT.rPc += deptTotals.rPc;
                    GT.lPc += deptTotals.lPc;
                    GT.pureLoss += deptTotals.pureLoss;
                    deptMap[deptName].rows.forEach(r => grandBagSet.add(r.bagName));
                });
                GT.bagCount = grandBagSet.size;
                
                // ── Compute loss percentages for grand total ──────────────────────
                GT.grossLossPct = pctStr(GT.lG, GT.rG);
                GT.netLossPct = pctStr(GT.nl, GT.rG);
                GT.diamondLossPct = pctStr(GT.lD, GT.rD);
 
                // ── Weighted average recovery for grand total ────────────────────
                let totalWeightedRecovery   = 0;
                let totalPureLossForWeighting = 0;
                deptOrder.forEach(dn => {
                    const deptTotals = getDeptTotals(deptMap[dn].rows, dn);
                    totalWeightedRecovery   += deptTotals.pureLoss * (recoveryMap?.[dn] || 0);
                    totalPureLossForWeighting += deptTotals.pureLoss;
                });
                const grandAvgRecoveryPct = totalPureLossForWeighting > 0
                    ? totalWeightedRecovery / totalPureLossForWeighting : 0;
                const gtGoldRecoveryWt  = GT.pl > 0 ? (GT.pl * (grandAvgRecoveryPct / 100)).toFixed(4) : 0;
                const gtGoldRecoveryPct = GT.pl > 0 && gtGoldRecoveryWt > 0
                    ? (parseFloat(gtGoldRecoveryWt) / GT.pl * 100).toFixed(2) : 0;
 
                // ── Grand total bag count query ───────────────────────────────────
                let uniqueGrandBags = new Set(allRows.map(r => r.bagName)).size;
                const grandLocation = allRows.length > 0 ? allRows[0].location : '';
                try {
                    const startDate  = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                    const endDate    = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                    const isRepair   = scriptObj.getParameter('custscript_jj_eff_excel_is_repair');
                    const locationId = scriptObj.getParameter('custscript_jj_eff_excel_location');
                    let repairClause = '';
                    if      (isRepair === 'T') repairClause = `AND NVL(op.custrecord_jj_repair_order, 'F') = 'T'`;
                    else if (isRepair === 'F') repairClause = `AND NVL(op.custrecord_jj_repair_order, 'F') = 'F'`;
                    let cleanLocationId = locationId;
                    if (cleanLocationId && String(cleanLocationId).includes('|'))
                        cleanLocationId = String(cleanLocationId).split('|')[0];
                    const q = `
                        SELECT COUNT(DISTINCT op.custrecord_jj_oprtns_bagno) AS bag_count
                        FROM CUSTOMRECORD_JJ_OPERATIONS op
                        LEFT JOIN CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN dir ON dir.custrecord_jj_operations = op.ID
                        LEFT JOIN CUSTOMRECORD_JJ_MANUFACTURING_DEPT dept ON op.custrecord_jj_oprtns_department = dept.ID
                        LEFT JOIN employee emp ON op.custrecord_jj_oprtns_employee = emp.ID
                        WHERE NVL(op.isinactive, 'F') = 'F'
                            AND NVL(dept.isinactive, 'F') = 'F'
                            AND NVL(emp.isinactive, 'F') = 'F'
                            AND (NVL(dir.custrecord_jj_issued_quantity, 0) > 0 OR NVL(dir.custrecord_jj_dir_starting_qty, 0) > 0)
                            AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') >= TO_DATE('${startDate} 00:00:00', 'YYYY-MM-DD HH24:MI:SS')
                            AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') < TO_DATE('${endDate} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                            ${repairClause}
                            ${cleanLocationId ? `AND dept.custrecord_jj_mandept_location = '${cleanLocationId}'` : ''}`;
                    const res = cm_efficiency.runQuery(q, 'MR_GrandTotalBagCount');
                    if (res && res.length > 0) {
                        const cnt = parseInt(res[0].bag_count) || 0;
                        if (cnt > 0) uniqueGrandBags = cnt;
                    }
                } catch (bagCountErr) {
                    log.debug('Error in grand total bag count query, using Set-based fallback', bagCountErr);
                }
 
                // ─────────────────────────────────────────────────────────────────
                // ── FILE-SIZE TRACKING & MULTI-PART SPLITTING ────────────────────
                // ─────────────────────────────────────────────────────────────────
 
                const MB              = 1024 * 1024;
                const MAX_FILE_BYTES  = 9.5 * MB;          // hard ceiling per file
                const WARN_BYTES      = 9.0 * MB;          // log a warning at this point
 
                const titleStartDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date') || '';
                const titleEndDate   = scriptObj.getParameter('custscript_jj_eff_excel_end_date')   || '';
 
                // Fixed XML closing block — same for every part
                const XML_SUFFIX =
                    '  </Table>\n' +
                    '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n' +
                    '   <FreezePanes/>\n' +
                    '   <FrozenNoSplit/>\n' +
                    '   <SplitHorizontal>3</SplitHorizontal>\n' +
                    '   <TopRowBottomPane>3</TopRowBottomPane>\n' +
                    '   <ActivePane>2</ActivePane>\n' +
                    '  </WorksheetOptions>\n' +
                    ' </Worksheet>\n' +
                    '</Workbook>\n';
 
                // Build the fixed XML prefix (Workbook open + Styles + Worksheet + Table
                // + column defs + title row + spacer + header row) for a given part number.
                const buildXmlPrefix = (partNum, totalParts, isRepair) => {
                    const dateRangeLabel = titleStartDate && titleEndDate
                        ? `  |  ${titleStartDate} – ${titleEndDate}` : '';
                    // "Part N of M" label for split files; plain label for single files.
                    const partLabel = totalParts > 1
                        ? ` — Part ${partNum} of ${totalParts}` : '';
                    const continuedLabel = partNum > 1 ? ' (Continued)' : '';
                    
                    // Determine report type label
                    let reportType = 'OVERALL';
                    if (isRepair === 'T') reportType = 'REPAIR';
                    else if (isRepair === 'F') reportType = 'PRODUCTION';
                    
                    const reportTypeLabel = isDeptExport ? ` - ${reportType} - DEPARTMENT DATA` : ` - ${reportType} - EMPLOYEE DATA`;
 
                    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                    xml += '<?mso-application progid="Excel.Sheet"?>\n';
                    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
                    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
                    xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel">\n';
                    xml += styles + '\n';
                    xml += ` <Worksheet ss:Name="EFFICIENCY REPORT - ${reportType}${isDeptExport ? ' - DEPARTMENT DATA' : ' - EMPLOYEE DATA'}">\n`;
                    xml += '  <Table>\n';
                    xml += colDefs + '\n';
 
                    // Title row
                    xml += `  <Row ss:Height="22">\n`;
                    xml += `  <Cell ss:StyleID="title" ss:MergeAcross="${HEADERS.length - 1}">` +
                           `<Data ss:Type="String">EFFICIENCY ANALYSIS REPORT${esc(reportTypeLabel)}` +
                           `${esc(dateRangeLabel)}${esc(partLabel)}${esc(continuedLabel)}</Data></Cell>\n`;
                    xml += `  </Row>\n`;
                    xml += `  <Row ss:Height="6"/>\n`; // blank spacer
 
                    // Header row
                    xml += `  <Row ss:Height="28">\n`;
                    HEADERS.forEach(h => { xml += `   ${cell('h', 'String', h)}\n`; });
                    xml += `  </Row>\n`;
 
                    return xml;
                };
 
                // Reserve space for: suffix XML + one grand-total row (≈ 3 KB safety buffer)
                const SUFFIX_RESERVE       = XML_SUFFIX.length + 3 * 1024;
                // Effective threshold for row data within a single file
                const EFFECTIVE_THRESHOLD  = MAX_FILE_BYTES - SUFFIX_RESERVE;
 
                // ── Phase 1: build department XML blocks + measure sizes ──────────
                // We need total-part count BEFORE writing prefixes (because the
                // prefix embeds "Part N of M"). So we do a dry-run pass first.
 
                // Reusable function that builds the full XML for one department's rows
                const buildDeptXml = (deptName, globalRowIdxStart) => {
                    const { rows: dRows, location } = deptMap[deptName];
                    const totals = getDeptTotals(dRows, deptName);
                    let xml = '';
                    let localRowIdx = globalRowIdxStart;
 
                    // Group by employee
                    const empMap   = {};
                    const empOrder = [];
                    dRows.forEach(row => {
                        const empKey = row.employee || '-';
                        if (!empMap[empKey]) { empMap[empKey] = []; empOrder.push(empKey); }
                        empMap[empKey].push(row);
                    });
 
                    empOrder.forEach(empName => {
                        const eRows   = empMap[empName];
                        const eTotals = getDeptTotals(eRows, '');
 
                        eRows.forEach(row => {
                            const isAlt = localRowIdx % 2 === 1;
                            const ds   = isAlt ? 'dalt'   : 'd';
                            const dls  = isAlt ? 'dlalt'  : 'dl';
                            const dnls = isAlt ? 'dnlalt' : 'dnl';
 
                            xml += `  <Row ss:Height="16">\n`;
                            xml += `   ${cell(dnls, 'String', location)}\n`;
                            xml += `   ${cell(dnls, 'String', deptName)}\n`;
                            if (!isDeptExport) xml += `   ${cell(dnls, 'String', row.employee)}\n`;
                            xml += `   ${cell('dc', 'String', row.category)}\n`;
                            xml += `   ${cell(ds,   'String', row.subcategory)}\n`;
                            xml += `   ${cell(ds,   'String', row.style)}\n`;
                            xml += `   ${cell(ds,   'String', row.bagName)}\n`;
                            xml += `   ${numCell(ds,   row.issuedNetWtG)}\n`;
                            xml += `   ${numCell(ds,   row.recvG)}\n`;
                            xml += `   ${numCell(dls,  row.lG)}\n`;
                            xml += `   ${cell(dls,   'String', row.grossLossPct.toFixed(2) + '%')}\n`;
                            xml += `   ${cell(ds,    'String', row.purity.toFixed(2) + '%')}\n`;
                            xml += `   ${numCell(ds,   row.pureWt)}\n`;
                            xml += `   ${numCell(dls,  row.pureLoss)}\n`;
                            xml += `   ${numCell(dls,  row.netLoss)}\n`;
                            xml += `   ${cell(dls,   'String', row.netLossPct.toFixed(2) + '%')}\n`;
                            xml += `   ${numCell(ds,   row.issuedNetWtD)}\n`;
                            xml += `   ${numCell(ds,   row.recvD)}\n`;
                            xml += `   ${numCell(dls,  row.lD)}\n`;
                            xml += `   ${cell(dls,   'String', row.diamondLossPct.toFixed(2) + '%')}\n`;
                            xml += `   ${numCell(ds,   row.rPc)}\n`;
                            xml += `   ${numCell(dls,  row.lPc)}\n`;
                            xml += `   ${numCell(ds,   row.goldRecoveryWt)}\n`;
                            xml += `   ${cell(ds,    'String', row.goldRecoveryPct.toFixed(2) + '%')}\n`;
                            xml += `  </Row>\n`;
                            localRowIdx++;
                        });
 
                        // Employee subtotal (skip the unassigned '-' bucket)
                        if (!isDeptExport && empName !== '-') {
                            xml += `  <Row ss:Height="17">\n`;
                            xml += `   ${cell('e', 'String', '')}\n`;
                            xml += `   ${cell('e', 'String', '')}\n`;
                            xml += `   ${cell('e', 'String', empName + ' — Total')}\n`;
                            xml += `   ${cell('e', 'String', '')}\n`;
                            xml += `   ${cell('e', 'String', '')}\n`;
                            xml += `   ${cell('e', 'String', '')}\n`;
                            xml += `   ${cell('eb','Number',  eTotals.bagCount)}\n`;
                            xml += `   ${numCell('e',  eTotals.iG.toFixed(4))}\n`;
                            xml += `   ${numCell('e',  eTotals.rG.toFixed(4))}\n`;
                            xml += `   ${numCell('el', eTotals.lG.toFixed(4))}\n`;
                            xml += `   ${cell('el', 'String', eTotals.grossLossPct)}\n`;
                            xml += `   ${cell('e',  'String', '')}\n`;
                            xml += `   ${numCell('e',  eTotals.pw.toFixed(4))}\n`;
                            xml += `   ${numCell('el', eTotals.pl.toFixed(4))}\n`;
                            xml += `   ${numCell('el', eTotals.nl.toFixed(4))}\n`;
                            xml += `   ${cell('el', 'String', eTotals.netLossPct)}\n`;
                            xml += `   ${numCell('e',  eTotals.iD.toFixed(4))}\n`;
                            xml += `   ${numCell('e',  eTotals.rD.toFixed(4))}\n`;
                            xml += `   ${numCell('el', eTotals.lD.toFixed(4))}\n`;
                            xml += `   ${cell('el', 'String', eTotals.diamondLossPct)}\n`;
                            xml += `   ${numCell('e',  eTotals.rPc.toFixed(2))}\n`;
                            xml += `   ${numCell('el', eTotals.lPc.toFixed(2))}\n`;
                            xml += `   ${numCell('e',  (eTotals.pureLoss * ((recoveryMap[deptName] || 0) / 100)).toFixed(4))}\n`;
                            xml += `   ${cell('e',  'String', (eTotals.pureLoss > 0 ? (recoveryMap[deptName] || 0).toFixed(2) : '0.00') + '%')}\n`;
                            xml += `  </Row>\n`;
                        }
                    });
 
                    // Department subtotal
                    xml += `  <Row ss:Height="18">\n`;
                    xml += `   ${cell('t',  'String', '')}\n`;
                    xml += `   ${cell('t',  'String', deptName + ' — Total')}\n`;
                    if (!isDeptExport) xml += `   ${cell('t',  'String', '')}\n`; 
                    xml += `   ${cell('t',  'String', '')}\n`;
                    xml += `   ${cell('t',  'String', '')}\n`;
                    xml += `   ${cell('t',  'String', '')}\n`;
                    xml += `   ${cell('tb', 'Number', totals.bagCount)}\n`;
                    xml += `   ${numCell('t',  totals.iG.toFixed(4))}\n`;
                    xml += `   ${numCell('t',  totals.rG.toFixed(4))}\n`;
                    xml += `   ${numCell('tl', totals.lG.toFixed(4))}\n`;
                    xml += `   ${cell('tl', 'String', totals.grossLossPct)}\n`;
                    xml += `   ${cell('t',  'String', '')}\n`;
                    xml += `   ${numCell('t',  totals.pw.toFixed(4))}\n`;
                    xml += `   ${numCell('tl', totals.pl.toFixed(4))}\n`;
                    xml += `   ${numCell('tl', totals.nl.toFixed(4))}\n`;
                    xml += `   ${cell('tl', 'String', totals.netLossPct)}\n`;
                    xml += `   ${numCell('t',  totals.iD.toFixed(4))}\n`;
                    xml += `   ${numCell('t',  totals.rD.toFixed(4))}\n`;
                    xml += `   ${numCell('tl', totals.lD.toFixed(4))}\n`;
                    xml += `   ${cell('tl', 'String', totals.diamondLossPct)}\n`;
                    xml += `   ${numCell('t',  totals.rPc.toFixed(2))}\n`;
                    xml += `   ${numCell('tl', totals.lPc.toFixed(2))}\n`;
                    xml += `   ${numCell('t',  (totals.pureLoss * ((recoveryMap[deptName] || 0) / 100)).toFixed(4))}\n`;
                    xml += `   ${cell('t',  'String', (totals.pureLoss > 0 ? (recoveryMap[deptName] || 0).toFixed(2) : '0.00') + '%')}\n`;
                    xml += `  </Row>\n`;
 
                    return { xml, rowsConsumed: localRowIdx - globalRowIdxStart };
                };
 
                // Grand-total row XML (only appended to the LAST part)
                const buildGrandTotalXml = () => {
                    let xml = `  <Row ss:Height="18">\n`;
                    xml += `   ${cell('g',  'String', grandLocation)}\n`;
                    xml += `   ${cell('g',  'String', 'Grand Total')}\n`;
                    if (!isDeptExport) xml += `   ${cell('g',  'String', '')}\n`; 
                    xml += `   ${cell('g',  'String', '')}\n`;
                    xml += `   ${cell('g',  'String', '')}\n`;
                    xml += `   ${cell('g',  'String', '')}\n`;
                    xml += `   ${cell('gb', 'Number', uniqueGrandBags)}\n`;
                    xml += `   ${numCell('g',  GT.iG.toFixed(4))}\n`;
                    xml += `   ${numCell('g',  GT.rG.toFixed(4))}\n`;
                    xml += `   ${numCell('gl', GT.lG.toFixed(4))}\n`;
                    xml += `   ${cell('gl', 'String', GT.grossLossPct)}\n`;
                    xml += `   ${cell('g',  'String', '')}\n`;
                    xml += `   ${numCell('g',  GT.pw.toFixed(4))}\n`;
                    xml += `   ${numCell('gl', GT.pl.toFixed(4))}\n`;
                    xml += `   ${numCell('gl', GT.nl.toFixed(4))}\n`;
                    xml += `   ${cell('gl', 'String', GT.netLossPct)}\n`;
                    xml += `   ${numCell('g',  GT.iD.toFixed(4))}\n`;
                    xml += `   ${numCell('g',  GT.rD.toFixed(4))}\n`;
                    xml += `   ${numCell('gl', GT.lD.toFixed(4))}\n`;
                    xml += `   ${cell('gl', 'String', GT.diamondLossPct)}\n`;
                    xml += `   ${numCell('g',  GT.rPc.toFixed(2))}\n`;
                    xml += `   ${numCell('gl', GT.lPc.toFixed(2))}\n`;
                    xml += `   ${numCell('g',  gtGoldRecoveryWt)}\n`;
                    xml += `   ${cell('g',  'String', gtGoldRecoveryPct + '%')}\n`;
                    xml += `  </Row>\n`;
                    return xml;
                };
 
                // "Continued in next part" row — closes an intermediate file part cleanly
                const buildContinuedNoteXml = (nextPartNum) => {
                    return `  <Row ss:Height="20">\n` +
                        `   <Cell ss:StyleID="title" ss:MergeAcross="${HEADERS.length - 1}">` +
                        `<Data ss:Type="String">⟶  Data continues in Part ${nextPartNum}  ⟶</Data></Cell>\n` +
                        `  </Row>\n`;
                };
 
                // ── Dry-run: bin departments into parts to discover total part count
                // We use an estimated prefix size (without "Part N of M" text yet —
                // close enough for planning purposes) to measure the threshold.
                const ESTIMATED_PREFIX_SIZE = buildXmlPrefix(1, 1).length;
 
                const partBins = []; // array of arrays of deptName
                let   binBytes = ESTIMATED_PREFIX_SIZE;
                let   currentBin = [];
 
                log.audit('File Splitting — Dry Run Started', {
                    maxFileMB: (MAX_FILE_BYTES / MB).toFixed(2),
                    effectiveThresholdMB: (EFFECTIVE_THRESHOLD / MB).toFixed(2),
                    totalDepartments: deptOrder.length
                });
 
                let dryRunGlobalIdx = 0;
                deptOrder.forEach(deptName => {
                    const { xml: deptXml, rowsConsumed } = buildDeptXml(deptName, dryRunGlobalIdx);
                    dryRunGlobalIdx += rowsConsumed;
                    const deptSize = deptXml.length;
 
                    log.audit(`Dry-run | Dept: ${deptName}`, {
                        deptSizeKB:    (deptSize / 1024).toFixed(1) + ' KB',
                        currentBinMB:  (binBytes  / MB).toFixed(2) + ' MB',
                        projectedMB:   ((binBytes + deptSize) / MB).toFixed(2) + ' MB'
                    });
 
                    // Would this department push the current bin over the threshold?
                    const noteSize = buildContinuedNoteXml(partBins.length + 2).length;
                    if (currentBin.length > 0 && (binBytes + deptSize + noteSize) > EFFECTIVE_THRESHOLD) {
                        // Seal the current bin and start a new one
                        log.audit(`⚠ Size threshold reached at ${(binBytes / MB).toFixed(2)} MB — ` +
                                  `rolling over, starting Part ${partBins.length + 2}`);
                        partBins.push(currentBin);
                        currentBin = [];
                        binBytes   = ESTIMATED_PREFIX_SIZE;
                    }
 
                    currentBin.push({ deptName, deptXml, deptSize });
                    binBytes += deptSize;
 
                    // Warn at 9.0 MB within any bin
                    if (binBytes >= WARN_BYTES) {
                        log.audit(`⚠ Warning: current part approaching limit at ${(binBytes / MB).toFixed(2)} MB`);
                    }
                });
 
                // Push the final bin
                if (currentBin.length > 0) partBins.push(currentBin);
 
                const totalParts = partBins.length;
                log.audit(`File Splitting — Dry Run Complete | Total parts needed: ${totalParts}`);
 
                // ── Build final XML for each part ─────────────────────────────────
                const fileParts = [];
 
                partBins.forEach((bin, binIndex) => {
                    const partNum = binIndex + 1;
                    const isLast  = partNum === totalParts;
 
                    const prefix = buildXmlPrefix(partNum, totalParts, isRepair);
                    let rows_xml = '';
 
                    bin.forEach(({ deptName, deptXml }) => {
                        rows_xml += deptXml;
                    });
 
                    // Append grand total only on the final part
                    if (isLast) {
                        if (isDeptExport) {
                            rows_xml += buildGrandTotalXml();
                        }
                    } else {
                        // Signal to the reader that data continues
                        rows_xml += buildContinuedNoteXml(partNum + 1);
                    }
 
                    const fullXml = prefix + rows_xml + XML_SUFFIX;
                    const finalSizeMB = (fullXml.length / MB).toFixed(2);
 
                    log.audit(`Part ${partNum} of ${totalParts} assembled`, {
                        sizeMB: finalSizeMB + ' MB',
                        sizeBytes: fullXml.length,
                        departments: bin.map(b => b.deptName).join(', '),
                        isLastPart: isLast
                    });
 
                    // Safety guard — should never fire due to dry-run planning, but log if it does
                    if (fullXml.length > MAX_FILE_BYTES) {
                        log.error(`⚠ SAFETY: Part ${partNum} exceeded ${(MAX_FILE_BYTES / MB).toFixed(2)} MB ` +
                                  `(actual: ${finalSizeMB} MB). A department may be too large to split further.`);
                    }
 
                    fileParts.push({ partNum, xml: fullXml, sizeMB: finalSizeMB });
                });
 
                // ─────────────────────────────────────────────────────────────────
                // ── Email preparation ────────────────────────────────────────────
                // ─────────────────────────────────────────────────────────────────
 
                const userEmail = scriptObj.getParameter('custscript_jj_eff_excel_user_email');
                let   userId    = scriptObj.getParameter('custscript_jj_eff_excel_user_id');
 
                if (!userId || parseInt(userId) <= 0) {
                    try {
                        const empSearch = search.create({
                            type: 'employee',
                            filters: [['isinactive', 'is', 'F']],
                            columns: ['internalid']
                        });
                        const rs = empSearch.run().getRange({ start: 0, end: 1 });
                        if (rs && rs.length > 0) userId = rs[0].getValue('internalid');
                    } catch (e) {
                        log.error('Error finding fallback employee author in MR script', e);
                    }
                }
 
                // ── Create file objects for all parts ────────────────────────────────
                // Format date range for filename (e.g., "May_02-May_26")
                const dateRangeStr = (() => {
                    try {
                        const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                        const endDate = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                        if (!startDate || !endDate) return '';
                
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                        // Parse date string in YYYY-MM-DD format directly
                        const parseNsDate = (raw) => {
                            try {
                                // Try format.parse first (handles account date format)
                                const parsed = format.parse({ value: raw, type: format.Type.DATE });
                                if (parsed && typeof parsed.getMonth === 'function') {
                                    return parsed;
                                }
                            } catch (e) {
                                // Fall through to manual parsing
                            }
                            
                            // Manual parsing for YYYY-MM-DD format
                            try {
                                const parts = String(raw).split('-');
                                if (parts.length === 3) {
                                    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                    if (typeof d.getMonth === 'function' && !isNaN(d.getTime())) {
                                        return d;
                                    }
                                }
                            } catch (e) {
                                // Continue to final fallback
                            }
                            
                            return null;
                        };
                
                        const start = parseNsDate(startDate);
                        const end   = parseNsDate(endDate);
                        if (!start || !end || typeof start.getMonth !== 'function' || typeof end.getMonth !== 'function') return '';
                
                        const fmt = (d) =>
                            `${months[d.getMonth()]}_${String(d.getDate()).padStart(2, '0')}`;
                
                        return `${fmt(start)}-${fmt(end)}`;
                    } catch (e) {
                        log.debug('Error formatting date range for filename', e);
                        return '';
                    }
                })();

                const XLS_MIME_LIMIT = 13 * MB; // conservative: leave ~2MB headroom for email headers + zip overhead

                // Build all xls file objects first
                const fallbackTimestamp = Date.now();
                const fileObjs = fileParts.map(part => {
                    const suffix = totalParts > 1 ? `_Part${part.partNum}of${totalParts}` : '';
                    const fileName = dateRangeStr
                        ? `Efficiency_Report_${dateRangeStr}${suffix}.xls`
                        : `Efficiency_Report_${fallbackTimestamp}${suffix}.xls`;
                    log.audit(`Creating file: ${fileName}`, { sizeMB: part.sizeMB + ' MB' });
                    return {
                        name: fileName,
                        fileObj: file.create({
                            name: fileName,
                            fileType: file.Type.PLAINTEXT,
                            contents: part.xml
                        }),
                        sizeMB: part.sizeMB
                    };
                });

                // ── Zip strategy ─────────────────────────────────────────────────────
                // Group files into zip bundles that stay under ~13MB (uncompressed).
                // XLS/XML compresses very well — typically 85-90% — so 13MB raw XML
                // usually produces a ~1.5-2MB zip. Adjust XLS_MIME_LIMIT if needed.

                const zipBundles = [];      // each entry: array of { name, fileObj }
                let   bundleBytes = 0;
                let   currentBundle = [];

                fileObjs.forEach(({ name, fileObj, sizeMB }) => {
                    const rawBytes = parseFloat(sizeMB) * MB;

                    // If adding this file would push the bundle over the raw-content threshold,
                    // seal the current bundle and start a new one.
                    // Always add at least one file per bundle (handles single oversized parts).
                    if (currentBundle.length > 0 && (bundleBytes + rawBytes) > XLS_MIME_LIMIT) {
                        zipBundles.push(currentBundle);
                        currentBundle = [];
                        bundleBytes = 0;
                    }

                    currentBundle.push({ name, fileObj });
                    bundleBytes += rawBytes;
                });
                if (currentBundle.length > 0) zipBundles.push(currentBundle);

                log.audit('Zip bundle plan', {
                    totalFileParts: fileObjs.length,
                    totalZipBundles: zipBundles.length
                });

                // ── Build zip file(s) and send email(s) ──────────────────────────────
                const totalBundles = zipBundles.length;

                zipBundles.forEach((bundle, bundleIndex) => {
                    const bundleNum = bundleIndex + 1;

                    // Create a zip archive from this bundle
                    const archiver = compress.createArchiver();         // ← createArchiver()
                    bundle.forEach(({ fileObj }) => {
                        archiver.add({ file: fileObj });                // ← just { file }, no name
                    });

                    const zipSuffix = totalBundles > 1 ? `_Email${bundleNum}of${totalBundles}` : '';
                    const zipFileName = dateRangeStr
                        ? `Efficiency_Report_${dateRangeStr}${zipSuffix}.zip`
                        : `Efficiency_Report_${fallbackTimestamp}${zipSuffix}.zip`;

                    const zipFile = archiver.archive({ name: zipFileName });

                    log.audit(`Zip created: ${zipFileName}`, {
                        filesInZip: bundle.map(b => b.name).join(', ')
                    });

                    // Build the attachment list description for the email body
                    const attachmentList = bundle.map(b => `  • ${b.name}`).join('\n');

                    let emailSubject, emailBody;

                    if (totalBundles === 1 && totalParts === 1) {
                        emailSubject = 'Efficiency Analysis Report';
                        emailBody = 'Hello,\n\nPlease find attached the Efficiency Analysis Report as a zip file.\n\nOpen the .xls file inside in Excel for full formatting.';
                    } else if (totalBundles === 1) {
                        emailSubject = `Efficiency Analysis Report — ${totalParts} Parts (Zipped)`;
                        emailBody = `Hello,\n\nThe Efficiency Analysis Report has been split into ${totalParts} parts and zipped into a single attachment.\n\nFiles inside the zip:\n${attachmentList}\n\nOpen all parts in Excel. The Grand Total row appears in Part ${totalParts}.`;
                    } else {
                        emailSubject = `Efficiency Analysis Report — Zip ${bundleNum} of ${totalBundles}`;
                        emailBody = `Hello,\n\nThe Efficiency Analysis Report is too large for a single email and has been split across ${totalBundles} emails.\n\nThis is Email ${bundleNum} of ${totalBundles}.\n\nFiles in this zip:\n${attachmentList}\n\nNote: Open all parts across all emails in Excel. The Grand Total row appears in the last part.`;
                    }

                    if (userEmail && userId) {
                        email.send({
                            author:      parseInt(userId),
                            recipients:  userEmail,
                            subject:     emailSubject,
                            body:        emailBody,
                            attachments: [zipFile]   // single zip attachment per email
                        });
                        log.audit(`Email ${bundleNum}/${totalBundles} sent to ${userEmail}`, {
                            zipFile: zipFileName
                        });
                    } else {
                        log.error('Missing user id or email — report not sent', { bundleNum });
                    }
                });
 
            } catch (err) {
                log.error('Error in summarize', err);
            }
        };

        return { getInputData, reduce, summarize }

    }
);