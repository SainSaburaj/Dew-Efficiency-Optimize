/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/runtime', 'N/email', 'N/file', 'N/format', 'N/search', '../Models/jj_cm_efficiency_searches.js'],
    /**
     * @param{log} log
     * @param{runtime} runtime
     * @param{email} email
     * @param{file} file
     * @param{format} format
     * @param{search} search
     * @param{cm_efficiency} cm_efficiency
     */
    (log, runtime, email, file, format, search, cm_efficiency) => {
        
        const getInputData = (inputContext) => {
            try {
                const scriptObj = runtime.getCurrentScript();
                const locationId = scriptObj.getParameter('custscript_jj_eff_excel_location');
                const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                const endDate = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                const isRepair = scriptObj.getParameter('custscript_jj_eff_excel_is_repair');
  
                // ── Lightweight department lookup ───────────────────────────────────
                // TODO: replace this with whatever criteria correctly scopes
                // "departments relevant to this location/date range" in your data
                // model. Ideally this becomes a small exported function in
                // jj_cm_efficiency_searches.js (e.g. getDepartmentIdsForLocation)
                // so it can't drift out of sync with what buildEfficiencyData()
                // itself considers in scope. The search below is a generic
                // placeholder and almost certainly needs a location filter added.
                const deptIds = [];
                const deptSearch = search.create({
                    type: 'customrecord_jj_manufacturing_dept',
                    filters: [
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
 
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
                        deptId
                    });
                });
 
                return inputs;
            } catch (err) {
                log.error('Error in getInputData', err);
                return [];
            }
        };

        const map = (mapContext) => {
            try {
                // Pure pass-through — no governance-significant work happens here.
                // Each key/value pair (one per department) flows straight to reduce().
                mapContext.write(mapContext.key, mapContext.value);
            } catch (err) {
                log.error('Error in map', err);
            }
        };

        const reduce = (reduceContext) => {
            try {
                const deptId = reduceContext.key;
                const params = JSON.parse(reduceContext.values[0]);
                const { locationId, startDate, endDate, isRepair } = params;
 
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
                    log.debug('No data for department', deptId);
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
 
                // ── Row flattening — identical logic to the old getInputData, just
                //    scoped to this single department object instead of looping
                //    every location/department in the whole dataset. ────────────────
                const rows = [];
                const locName = loc.location_name;
 
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
                                    issuedNetWtG: issuedNetWtG,
                                    recvG: recvG,
                                    lG: lG,
                                    grossLossPct: grossLossPct,
                                    purity: purity * 100,
                                    pureWt: pureWt,
                                    pureLoss: pureLoss,
                                    netLoss: netLoss,
                                    netLossPct: netLossPct,
                                    issuedNetWtD: issuedNetWtD,
                                    recvD: recvD,
                                    lD: lD,
                                    diamondLossPct: diamondLossPct,
                                    rPc: rPc,
                                    lPc: lPc,
                                    goldRecoveryWt: goldRecoveryWt,
                                    goldRecoveryPct: goldRecoveryPct
                                });
                            });
                        });
                    });
                } else {
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
                                employee: '-',
                                category: cat,
                                subcategory: dept.category_bag_sub_category_map?.[cat]?.[bagName] || '-',
                                style: dept.category_bag_print_design_map?.[cat]?.[bagName] || '-',
                                bagName: bagName,
                                issuedNetWtG: issuedNetWtG,
                                recvG: recvG,
                                lG: lG,
                                grossLossPct: grossLossPct,
                                purity: purity * 100,
                                pureWt: pureWt,
                                pureLoss: pureLoss,
                                netLoss: netLoss,
                                netLossPct: netLossPct,
                                issuedNetWtD: issuedNetWtD,
                                recvD: recvD,
                                lD: lD,
                                diamondLossPct: diamondLossPct,
                                rPc: rPc,
                                lPc: lPc,
                                goldRecoveryWt: goldRecoveryWt,
                                goldRecoveryPct: goldRecoveryPct
                            });
                        });
                    });
                }
 
                log.debug('Rows built for department', { deptId, deptName: dept.department_name, count: rows.length });
 
                // Write this department's rows out under its own key — summarize()
                // will iterate every key/value pair and flatten/dedupe exactly as
                // before. Skip the write entirely if there's nothing to report so
                // summarize doesn't have to handle empty-array noise.
                if (rows.length > 0) {
                    reduceContext.write(deptId, JSON.stringify(rows));
                }
            } catch (err) {
                log.error('Error in reduce for department ' + reduceContext.key, err);
            }
        };

        const summarize = (summaryContext) => {
            try {
                // ── Script object (must be first – used throughout this function) ────────
                const scriptObj = runtime.getCurrentScript();

                // ── Fetch backend summary data to include wax tree adjustments ──────────
                // The backend buildSummaryEfficiencyData includes wax tree received qty 
                // adjustments for Casting, Tree Cutting & Cleaning, and Grinding departments
                let backendDeptSummaryData = {};
                try {
                    const locationId = scriptObj.getParameter('custscript_jj_eff_excel_location');
                    const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                    const endDate = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                    const isRepair = scriptObj.getParameter('custscript_jj_eff_excel_is_repair');
                    
                    let options = {
                        includeWaxTree: isRepair !== 'T'
                    };
                    if (isRepair === 'T') {
                        options.repairOrderFilter = 'T';
                    } else if (isRepair === 'F') {
                        options.repairOrderFilter = 'F';
                    } else {
                        options.repairOrderFilter = null;
                    }
                    
                    // buildSummaryEfficiencyData includes wax tree adjustments for special departments
                    const summaryData = cm_efficiency.buildSummaryEfficiencyData(locationId, startDate, endDate, options);
                    
                    // Map backend summary data by department name for easy lookup
                    Object.keys(summaryData).forEach(locId => {
                        Object.keys(summaryData[locId].departments || {}).forEach(deptId => {
                            const dept = summaryData[locId].departments[deptId];
                            backendDeptSummaryData[dept.department_name] = {
                                received_qty_gold: parseFloat(dept.received_qty_gold || 0),
                                wax_tree_received_qty_gold: parseFloat(dept.wax_tree_received_qty_gold || 0)
                            };
                        });
                    });
                    
                    log.debug('Backend summary data loaded for wax tree adjustments', Object.keys(backendDeptSummaryData).length);
                } catch (summErr) {
                    log.debug('Error loading backend summary data for wax tree adjustment', summErr);
                }
 
                // ── Colour palette (XML Spreadsheet 2003 uses HTML hex, no alpha) ──────
                const CLR = {
                    headerBg:  '#1F2937',  // dark slate  → header row
                    headerFg:  '#FFFFFF',  // white       → header text
                    totalBg:   '#E0E7FF',  // light indigo → entity subtotal rows
                    empBg:     '#F5F3FF',  // very light indigo → employee subtotal rows
                    grandBg:   '#E5E7EB',  // light gray  → grand total row
                    lossFg:    '#DC2626',  // red         → loss columns
                    bagCntBg:  '#DBEAFE',  // sky-50      → bag-count cells
                    catBg:     '#F0F9FF',  // very light blue → category cells
                    whiteBg:   '#FFFFFF',  // white       → regular data cells
                    altRowBg:  '#F9FAFB',  // gray-50     → alternate data rows
                    linkFg:    '#2563EB',  // blue-600    → hyperlinks
                };
 
                // ── Style declarations ────────────────────────────────────────────────
                // ID naming: h=header, t=total, g=grand, d=data, l=loss, b=bagcount, c=category
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
                    </Styles>`
                ;
 
                // ── Column widths (22 data columns + index col) ──────────────────────
                const COL_WIDTHS = [
                    60,   // Location
                    100,   // Department
                    120,   // Employee
                    100,   // Category
                    70,   // Subcategory
                    70,   // Style Number
                    80,   // Bag Name
                    70,   // Issued Net Wt Gold
                    70,   // Recv Qty Gold
                    55,   // Gross Loss Gold
                    50,   // Gross Loss %
                    45,   // Purity %
                    60,   // Pure Weight
                    55,   // Pure Loss
                    55,   // Net Loss
                    50,   // Net Loss %
                    75,   // Issued Net Wt Diamond
                    75,   // Recv Qty Diamond
                    65,   // Loss Qty Diamond
                    55,   // Diamond Loss %
                    55,   // Recv Pieces
                    50,   // Loss Pieces
                    60,   // Gold Recovery Wt
                    55    // Gold Recovery %
                ];
 
                const colDefs = COL_WIDTHS.map(w =>
                    `   <Column ss:AutoFitWidth="0" ss:Width="${w}"/>`
                ).join('\n');
 
                // ── Collect all rows from reduce output ──────────────────────────────
                // reduce() now writes one key per department with that department's
                // JSON-stringified rows array as the value. Flatten + dedupe exactly
                // as before.
                const allRows = [];
                const seenKeys = new Set();
                summaryContext.output.iterator().each(function (key, value) {
                    let parsed;
                    try { parsed = JSON.parse(value); } catch(e) { return true; }
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    items.forEach(row => {
                        const dk = [row.location, row.department, row.employee, row.category, row.bagName].join('|~~|');
                        if (!seenKeys.has(dk)) { seenKeys.add(dk); allRows.push(row); }
                    });
                    return true;
                });
 
                // ── Fetch recovery data for all departments (for subtotal/grand-total rows) ──
                let recoveryMap = {};
                try {
                    const allDeptNames = [];
                    allRows.forEach(row => {
                        if (row.department && !allDeptNames.includes(row.department)) {
                            allDeptNames.push(row.department);
                        }
                    });
 
                    if (allDeptNames.length > 0) {
                        const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                        const endDate = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                        const recoveryResult = cm_efficiency.getAvgRecoveryPercentageBatch(startDate, endDate, allDeptNames);
                        if (recoveryResult && recoveryResult.data && recoveryResult.data.recoveryMap) {
                            recoveryMap = recoveryResult.data.recoveryMap;
                        }
                    }
                } catch (recErr) {
                    log.error('Error fetching recovery data in summarize', recErr);
                    // Continue without recovery data if fetch fails
                }
 
                // ── Helper: escape XML special chars ─────────────────────────────────
                const esc = (s) => String(s || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
 
                const cell = (styleId, type, value) =>
                    `<Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
 
                const numCell = (styleId, value) => {
                    const n = parseFloat(value);
                    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${isNaN(n) ? 0 : n}</Data></Cell>`;
                };
 
                // ── Group rows by department for subtotals ────────────────────────────
                const deptMap = {};       // deptName → { rows[], totals{} }
                const deptOrder = [];
 
                allRows.forEach(row => {
                    const key = row.department;
                    if (!deptMap[key]) {
                        deptMap[key] = { rows: [], location: row.location };
                        deptOrder.push(key);
                    }
                    deptMap[key].rows.push(row);
                });
 
                // ── Compute department subtotals ──────────────────────────────────────
                const pctStr = (num, den) => den > 0 ? (num / den * 100).toFixed(2) + '%' : '0.00%';
 
                const sumField = (rows, field) => rows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
 
                const getDeptTotals = (rows, deptName) => {
                    // If we have backend summary data with wax tree adjustments, use it for received qty
                    let rG = sumField(rows, 'recvG');  // Default: sum from rows
                    if (backendDeptSummaryData[deptName]) {
                        // Use backend value which includes wax tree adjustments for special depts
                        rG = backendDeptSummaryData[deptName].received_qty_gold;
                    }
                    
                    // Sum directly from pre-calculated row fields
                    const iG  = sumField(rows, 'issuedNetWtG');   // Sum of per-bag issuedNetWtG
                    const lG  = sumField(rows, 'lG');             // Sum of per-bag loss gold
                    const pw  = sumField(rows, 'pureWt');         // Sum of per-bag pure weight
                    const pl  = sumField(rows, 'pureLoss');       // Sum of per-bag pure loss
                    const iD  = sumField(rows, 'issuedNetWtD');   // Sum of per-bag issuedNetWtD (diamonds)
                    const rD  = sumField(rows, 'recvD');          // Sum of per-bag recvD (received diamonds)
                    const lD  = sumField(rows, 'lD');             // Sum of per-bag loss diamonds
                    const rPc = sumField(rows, 'rPc');            // Sum of per-bag received pieces
                    const lPc = sumField(rows, 'lPc');            // Sum of per-bag loss pieces
                    const bagSet = new Set(rows.map(r => r.bagName));
 
                    // Calculate net loss as absolute value (not ratio): netLoss = lG - pl (loss gold minus pure loss)
                    // This matches: lG (total loss) - pl (pure loss from that loss)
                    // Note: Frontend displays "Net Loss %" as (lG / rG * 100) percentage, not absolute
                    const nl = lG - pl;  // absolute net loss
 
                    return {
                        iG, rG, lG, pw, pl, nl, iD, rD, lD, rPc, lPc,
                        bagCount: bagSet.size,
                        grossLossPct: pctStr(lG, rG),
                        netLossPct: pctStr(nl, rG),
                        diamondLossPct: pctStr(lD, rD),
                        pureLoss: pl  // Include for recovery calculation
                    };
                };
 
                // ── Grand totals ──────────────────────────────────────────────────────
                const GT = getDeptTotals(allRows, '');
 
                // ── Build worksheet XML ───────────────────────────────────────────────
                const HEADERS = [
                    'Location', 'Department', 'Employee', 'Category', 'Subcategory',
                    'Style Number', 'Bag Name',
                    'Issued Net Wt Gold (g)', 'Received Qty Gold (g)', 'Gross Loss Gold (g)',
                    'Gross Loss %', 'Purity %', 'Pure Weight (g)', 'Pure Loss (g)',
                    'Net Loss (g)', 'Net Loss %',
                    'Issued Net Wt Diamond (ct)', 'Recv Qty Diamond (ct)', 'Loss Qty Diamond (ct)',
                    'Diamond Loss %', 'Received Pieces', 'Loss Pieces',
                    'Gold Recovery Wt (gm)', 'Gold Recovery %'
                ];
 
                let rows_xml = '';
 
                // ── Title row ─────────────────────────────────────────────────────────
                const titleStartDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date') || '';
                const titleEndDate   = scriptObj.getParameter('custscript_jj_eff_excel_end_date')   || '';
                const dateRangeLabel = titleStartDate && titleEndDate ? `  |  ${titleStartDate} – ${titleEndDate}` : '';
                rows_xml += `  <Row ss:Height="22">
                <Cell ss:StyleID="title" ss:MergeAcross="${HEADERS.length - 1}"><Data ss:Type="String">EFFICIENCY ANALYSIS REPORT${esc(dateRangeLabel)}</Data></Cell>
                </Row>\n`;
 
                // ── Blank spacer ──────────────────────────────────────────────────────
                rows_xml += `  <Row ss:Height="6"/>\n`;
 
                // ── Header row ────────────────────────────────────────────────────────
                rows_xml += `  <Row ss:Height="28">\n`;
                HEADERS.forEach(h => { rows_xml += `   ${cell('h', 'String', h)}\n`; });
                rows_xml += `  </Row>\n`;
 
                // ── Data rows grouped by department ───────────────────────────────────
                let globalRowIdx = 0;
 
                deptOrder.forEach(deptName => {
                    const { rows: dRows, location } = deptMap[deptName];
                    const totals = getDeptTotals(dRows, deptName);
 
                    // ── Group department rows by employee for sub-subtotals ───────────
                    const empMap = {};
                    const empOrder = [];
                    dRows.forEach(row => {
                        const empKey = row.employee || '-';
                        if (!empMap[empKey]) {
                            empMap[empKey] = [];
                            empOrder.push(empKey);
                        }
                        empMap[empKey].push(row);
                    });
 
                    empOrder.forEach(empName => {
                        const eRows = empMap[empName];
                        const eTotals = getDeptTotals(eRows, '');
 
                        eRows.forEach(row => {
                            const isAlt = globalRowIdx % 2 === 1;
                            const ds  = isAlt ? 'dalt'   : 'd';
                            const dls = isAlt ? 'dlalt'  : 'dl';
                            const dnls = isAlt ? 'dnlalt' : 'dnl';
 
                            rows_xml += `  <Row ss:Height="16">\n`;
                            rows_xml += `   ${cell(dnls, 'String', location)}\n`;
                            rows_xml += `   ${cell(dnls, 'String', deptName)}\n`;
                            rows_xml += `   ${cell(dnls, 'String', row.employee)}\n`;
                            rows_xml += `   ${cell('dc',  'String', row.category)}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.subcategory)}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.style)}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.bagName)}\n`;
                            rows_xml += `   ${numCell(ds,   row.issuedNetWtG)}\n`;
                            rows_xml += `   ${numCell(ds,   row.recvG)}\n`;
                            rows_xml += `   ${numCell(dls,  row.lG)}\n`;
                            rows_xml += `   ${cell(dls,   'String', row.grossLossPct.toFixed(2) + '%')}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.purity.toFixed(2) + '%')}\n`;
                            rows_xml += `   ${numCell(ds,   row.pureWt)}\n`;
                            rows_xml += `   ${numCell(dls,  row.pureLoss)}\n`;
                            rows_xml += `   ${numCell(dls,  row.netLoss)}\n`;
                            rows_xml += `   ${cell(dls,   'String', row.netLossPct.toFixed(2) + '%')}\n`;
                            rows_xml += `   ${numCell(ds,   row.issuedNetWtD)}\n`;
                            rows_xml += `   ${numCell(ds,   row.recvD)}\n`;
                            rows_xml += `   ${numCell(dls,  row.lD)}\n`;
                            rows_xml += `   ${cell(dls,   'String', row.diamondLossPct.toFixed(2) + '%')}\n`;
                            rows_xml += `   ${numCell(ds,   row.rPc)}\n`;
                            rows_xml += `   ${numCell(dls,  row.lPc)}\n`;
                            rows_xml += `   ${numCell(ds,   row.goldRecoveryWt)}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.goldRecoveryPct.toFixed(2) + '%')}\n`;
                            rows_xml += `  </Row>\n`;
 
                            globalRowIdx++;
                        });
 
                        // ── Employee subtotal row (skipped for the unassigned '-' bucket) ──
                        if (empName !== '-') {
                            rows_xml += `  <Row ss:Height="17">\n`;
                            rows_xml += `   ${cell('e',  'String', '')}\n`;
                            rows_xml += `   ${cell('e',  'String', '')}\n`;
                            rows_xml += `   ${cell('e',  'String', empName + ' — Total')}\n`;
                            rows_xml += `   ${cell('e',  'String', '')}\n`;                      // Category
                            rows_xml += `   ${cell('e',  'String', '')}\n`;                      // Subcategory
                            rows_xml += `   ${cell('e',  'String', '')}\n`;                      // Style
                            rows_xml += `   ${cell('eb', 'Number', eTotals.bagCount)}\n`;         // Bag count
                            rows_xml += `   ${numCell('e',  eTotals.iG.toFixed(4))}\n`;
                            rows_xml += `   ${numCell('e',  eTotals.rG.toFixed(4))}\n`;
                            rows_xml += `   ${numCell('el', eTotals.lG.toFixed(4))}\n`;
                            rows_xml += `   ${cell('el', 'String', eTotals.grossLossPct)}\n`;
                            rows_xml += `   ${cell('e',  'String', '')}\n`;                      // Purity (N/A)
                            rows_xml += `   ${numCell('e',  eTotals.pw.toFixed(4))}\n`;
                            rows_xml += `   ${numCell('el', eTotals.pl.toFixed(4))}\n`;
                            rows_xml += `   ${numCell('el', eTotals.nl.toFixed(4))}\n`;
                            rows_xml += `   ${cell('el', 'String', eTotals.netLossPct)}\n`;
                            rows_xml += `   ${numCell('e',  eTotals.iD.toFixed(4))}\n`;
                            rows_xml += `   ${numCell('e',  eTotals.rD.toFixed(4))}\n`;
                            rows_xml += `   ${numCell('el', eTotals.lD.toFixed(4))}\n`;
                            rows_xml += `   ${cell('el', 'String', eTotals.diamondLossPct)}\n`;
                            rows_xml += `   ${numCell('e',  eTotals.rPc.toFixed(2))}\n`;
                            rows_xml += `   ${numCell('el', eTotals.lPc.toFixed(2))}\n`;
                            rows_xml += `   ${numCell('e',  (eTotals.pureLoss * ((recoveryMap[deptName] || 0) / 100)).toFixed(4))}\n`;
                            rows_xml += `   ${cell('e',  'String', (eTotals.pureLoss > 0 ? (recoveryMap[deptName] || 0).toFixed(2) : '0.00') + '%')}\n`;
                            rows_xml += `   ${cell('e',  'String', '')}\n`;  // Dept Recovery % – N/A for subtotal
                            rows_xml += `   ${cell('e',  'String', '')}\n`;  // Emp Recovery % – N/A for subtotal
                            rows_xml += `  </Row>\n`;
                        }
                    });
 
                    // ── Department subtotal row ───────────────────────────────────────
                    rows_xml += `  <Row ss:Height="18">\n`;
                    rows_xml += `   ${cell('t',  'String', '')}\n`;
                    rows_xml += `   ${cell('t',  'String', deptName + ' — Total')}\n`;
                    rows_xml += `   ${cell('t',  'String', '')}\n`;                      // Employee
                    rows_xml += `   ${cell('t',  'String', '')}\n`;                      // Category
                    rows_xml += `   ${cell('t',  'String', '')}\n`;                      // Subcategory
                    rows_xml += `   ${cell('t',  'String', '')}\n`;                      // Style
                    rows_xml += `   ${cell('tb', 'Number', totals.bagCount)}\n`;         // Bag count
                    rows_xml += `   ${numCell('t',  totals.iG.toFixed(4))}\n`;
                    rows_xml += `   ${numCell('t',  totals.rG.toFixed(4))}\n`;
                    rows_xml += `   ${numCell('tl', totals.lG.toFixed(4))}\n`;
                    rows_xml += `   ${cell('tl', 'String', totals.grossLossPct)}\n`;
                    rows_xml += `   ${cell('t',  'String', '')}\n`;                      // Purity (N/A for total)
                    rows_xml += `   ${numCell('t',  totals.pw.toFixed(4))}\n`;
                    rows_xml += `   ${numCell('tl', totals.pl.toFixed(4))}\n`;
                    rows_xml += `   ${numCell('tl', totals.nl.toFixed(4))}\n`;
                    rows_xml += `   ${cell('tl', 'String', totals.netLossPct)}\n`;
                    rows_xml += `   ${numCell('t',  totals.iD.toFixed(4))}\n`;
                    rows_xml += `   ${numCell('t',  totals.rD.toFixed(4))}\n`;
                    rows_xml += `   ${numCell('tl', totals.lD.toFixed(4))}\n`;
                    rows_xml += `   ${cell('tl', 'String', totals.diamondLossPct)}\n`;
                    rows_xml += `   ${numCell('t',  totals.rPc.toFixed(2))}\n`;
                    rows_xml += `   ${numCell('tl', totals.lPc.toFixed(2))}\n`;
                    rows_xml += `   ${numCell('t',  (totals.pureLoss * ((recoveryMap[deptName] || 0) / 100)).toFixed(4))}\n`;
                    rows_xml += `   ${cell('t',  'String', (totals.pureLoss > 0 ? (recoveryMap[deptName] || 0).toFixed(2) : '0.00') + '%')}\n`;
                    rows_xml += `  </Row>\n`;
                });
 
                // ── Grand total row ───────────────────────────────────────────────────
                // OPTIMIZATION: Use dedicated SQL query for accurate grand total bag count (same as UI)
                let uniqueGrandBags = new Set(allRows.map(r => r.bagName)).size;  // Fallback
                const grandLocation = allRows.length > 0 ? allRows[0].location : '';
                
                try {
                    const startDate = scriptObj.getParameter('custscript_jj_eff_excel_start_date');
                    const endDate = scriptObj.getParameter('custscript_jj_eff_excel_end_date');
                    const isRepair = scriptObj.getParameter('custscript_jj_eff_excel_is_repair');
                    const locationId = scriptObj.getParameter('custscript_jj_eff_excel_location');
                    
                    // Build repair filter for query
                    let repairFilterForGrandTotal = '';
                    if (isRepair === 'T') {
                        repairFilterForGrandTotal = `AND NVL(op.custrecord_jj_repair_order, 'F') = 'T'`;
                    } else if (isRepair === 'F') {
                        repairFilterForGrandTotal = `AND NVL(op.custrecord_jj_repair_order, 'F') = 'F'`;
                    }
                    
                    // Dedicated bag count query (identical logic to UI buildSummaryEfficiencyData)
                    const grandTotalBagCountQuery = `
                        SELECT COUNT(DISTINCT op.custrecord_jj_oprtns_bagno) AS bag_count
                        FROM CUSTOMRECORD_JJ_OPERATIONS op
                        LEFT JOIN CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN dir
                            ON dir.custrecord_jj_operations = op.ID
                        LEFT JOIN CUSTOMRECORD_JJ_MANUFACTURING_DEPT dept
                            ON op.custrecord_jj_oprtns_department = dept.ID
                        LEFT JOIN employee emp
                            ON op.custrecord_jj_oprtns_employee = emp.ID
                        WHERE NVL(op.isinactive, 'F') = 'F'
                            AND NVL(dept.isinactive, 'F') = 'F'
                            AND NVL(emp.isinactive, 'F') = 'F'
                            AND (
                                NVL(dir.custrecord_jj_issued_quantity, 0) > 0
                                OR NVL(dir.custrecord_jj_dir_starting_qty, 0) > 0
                            )
                            AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') >= TO_DATE('${startDate} 00:00:00', 'YYYY-MM-DD HH24:MI:SS')
                            AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') < TO_DATE('${endDate} 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                            ${repairFilterForGrandTotal}
                            ${locationId ? `AND dept.custrecord_jj_mandept_location = '${locationId}'` : ''}
                    `;
                    
                    // Execute via cm_efficiency module (same infrastructure used elsewhere)
                    const bagCountResults = cm_efficiency.runQuery(grandTotalBagCountQuery, 'MR_GrandTotalBagCount');
                    if (bagCountResults && bagCountResults.length > 0) {
                        const countFromQuery = parseInt(bagCountResults[0].bag_count) || 0;
                        if (countFromQuery > 0) {
                            uniqueGrandBags = countFromQuery;
                            log.debug('Grand Total Bag Count from Dedicated Query', countFromQuery);
                        }
                    }
                } catch (bagCountErr) {
                    log.debug('Error executing dedicated bag count query, using Set-based fallback', bagCountErr);
                }
 
                // Calculate weighted average recovery percentage for grand total
                // Use each department's pure loss weight to calculate the overall average
                let totalWeightedRecovery = 0;
                let totalPureLossForWeighting = 0;
                deptOrder.forEach(deptName => {
                    const deptPureLoss = sumField(deptMap[deptName].rows, 'pureLoss');
                    const deptRecoveryPct = recoveryMap?.[deptName] || 0;
                    totalWeightedRecovery += deptPureLoss * deptRecoveryPct;
                    totalPureLossForWeighting += deptPureLoss;
                });
                const grandAvgRecoveryPct = totalPureLossForWeighting > 0
                    ? totalWeightedRecovery / totalPureLossForWeighting
                    : 0;
 
                const gtGoldRecoveryWt = GT.pl > 0 ? (GT.pl * (grandAvgRecoveryPct / 100)).toFixed(4) : 0;
                const gtGoldRecoveryPct = GT.pl > 0 && gtGoldRecoveryWt > 0 ? (gtGoldRecoveryWt / GT.pl * 100).toFixed(2) : 0;
 
                rows_xml += `  <Row ss:Height="18">\n`;
                rows_xml += `   ${cell('g',  'String', grandLocation)}\n`;
                rows_xml += `   ${cell('g',  'String', 'Grand Total')}\n`;
                rows_xml += `   ${cell('g',  'String', '')}\n`;
                rows_xml += `   ${cell('g',  'String', '')}\n`;
                rows_xml += `   ${cell('g',  'String', '')}\n`;
                rows_xml += `   ${cell('g',  'String', '')}\n`;
                rows_xml += `   ${cell('gb', 'Number', uniqueGrandBags)}\n`;
                rows_xml += `   ${numCell('g',  GT.iG.toFixed(4))}\n`;
                rows_xml += `   ${numCell('g',  GT.rG.toFixed(4))}\n`;
                rows_xml += `   ${numCell('gl', GT.lG.toFixed(4))}\n`;
                rows_xml += `   ${cell('gl', 'String', GT.grossLossPct)}\n`;
                rows_xml += `   ${cell('g',  'String', '')}\n`;
                rows_xml += `   ${numCell('g',  GT.pw.toFixed(4))}\n`;
                rows_xml += `   ${numCell('gl', GT.pl.toFixed(4))}\n`;
                rows_xml += `   ${numCell('gl', GT.nl.toFixed(4))}\n`;
                rows_xml += `   ${cell('gl', 'String', GT.netLossPct)}\n`;
                rows_xml += `   ${numCell('g',  GT.iD.toFixed(4))}\n`;
                rows_xml += `   ${numCell('g',  GT.rD.toFixed(4))}\n`;
                rows_xml += `   ${numCell('gl', GT.lD.toFixed(4))}\n`;
                rows_xml += `   ${cell('gl', 'String', GT.diamondLossPct)}\n`;
                rows_xml += `   ${numCell('g',  GT.rPc.toFixed(2))}\n`;
                rows_xml += `   ${numCell('gl', GT.lPc.toFixed(2))}\n`;
                rows_xml += `   ${numCell('g',  gtGoldRecoveryWt)}\n`;
                rows_xml += `   ${cell('g',  'String', gtGoldRecoveryPct + '%')}\n`;
                rows_xml += `  </Row>\n`;
 
                // ── Assemble final XML ────────────────────────────────────────────────
                let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
                xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
                xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
                xmlContent += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
                xmlContent += ' xmlns:x="urn:schemas-microsoft-com:office:excel">\n';
                xmlContent += styles + '\n';
                xmlContent += ' <Worksheet ss:Name="Efficiency Report">\n';
                xmlContent += '  <Table>\n';
                xmlContent += colDefs + '\n';
                xmlContent += rows_xml;
                xmlContent += '  </Table>\n';
                xmlContent += '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
                xmlContent += '   <FreezePanes/>\n';
                xmlContent += '   <FrozenNoSplit/>\n';
                xmlContent += '   <SplitHorizontal>3</SplitHorizontal>\n';
                xmlContent += '   <TopRowBottomPane>3</TopRowBottomPane>\n';
                xmlContent += '   <ActivePane>2</ActivePane>\n';
                xmlContent += '  </WorksheetOptions>\n';
                xmlContent += ' </Worksheet>\n';
                xmlContent += '</Workbook>\n';
 
                // ── Send email ────────────────────────────────────────────────────────
                const userEmail = scriptObj.getParameter('custscript_jj_eff_excel_user_email');
                let userId = scriptObj.getParameter('custscript_jj_eff_excel_user_id');
 
                if (!userId || parseInt(userId) <= 0) {
                    try {
                        let empSearch = search.create({
                            type: 'employee',
                            filters: [['isinactive', 'is', 'F']],
                            columns: ['internalid']
                        });
                        let rs = empSearch.run().getRange({ start: 0, end: 1 });
                        if (rs && rs.length > 0) userId = rs[0].getValue('internalid');
                    } catch (e) {
                        log.error('Error finding fallback employee author in MR script', e);
                    }
                }
 
                const fileObj = file.create({
                    name: 'Efficiency_Report_' + Date.now() + '.xls',
                    fileType: file.Type.PLAINTEXT,
                    contents: xmlContent
                });
 
                if (userEmail && userId) {
                    email.send({
                        author: parseInt(userId),
                        recipients: userEmail,
                        subject: 'Efficiency Analysis Report',
                        body: 'Hello,\n\nPlease find attached the Efficiency Analysis Report.\n\nOpen in Excel for full formatting.',
                        attachments: [fileObj]
                    });
                    log.audit('Email sent to ' + userEmail);
                } else {
                    log.error('Missing user id or email');
                }
 
            } catch (err) {
                log.error('Error in summarize', err);
            }
        };

        return { getInputData, map, reduce, summarize }

    }
);