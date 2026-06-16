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

                log.debug('getInputData Parameters', { locationId, startDate, endDate, isRepair });

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

                const data = cm_efficiency.buildEfficiencyData(locationId, startDate, endDate, options);
                const rows = [];

                Object.keys(data).forEach(locId => {
                    const loc = data[locId];
                    Object.keys(loc.departments || {}).forEach(deptId => {
                        const dept = loc.departments[deptId];
                        
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

                                        rows.push({
                                            location: loc.location_name,
                                            department: dept.department_name,
                                            employee: emp.name,
                                            category: cat,
                                            subcategory: emp.category_bag_sub_category_map?.[cat]?.[bagName] || '-',
                                            style: emp.category_bag_print_design_map?.[cat]?.[bagName] || '-',
                                            bagName: bagName,
                                            issuedNetWtG: issuedNetWtG.toFixed(4),
                                            recvG: recvG.toFixed(4),
                                            lG: lG.toFixed(4),
                                            grossLossPct: grossLossPct.toFixed(2) + '%',
                                            purity: (purity * 100).toFixed(2) + '%',
                                            pureWt: pureWt.toFixed(4),
                                            pureLoss: pureLoss.toFixed(4),
                                            netLoss: netLoss.toFixed(4),
                                            netLossPct: netLossPct.toFixed(2) + '%',
                                            issuedNetWtD: issuedNetWtD.toFixed(4),
                                            recvD: recvD.toFixed(4),
                                            lD: lD.toFixed(4),
                                            diamondLossPct: diamondLossPct.toFixed(2) + '%',
                                            rPc: rPc.toFixed(2),
                                            lPc: lPc.toFixed(2)
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

                                    rows.push({
                                        location: loc.location_name,
                                        department: dept.department_name,
                                        employee: '-',
                                        category: cat,
                                        subcategory: dept.category_bag_sub_category_map?.[cat]?.[bagName] || '-',
                                        style: dept.category_bag_print_design_map?.[cat]?.[bagName] || '-',
                                        bagName: bagName,
                                        issuedNetWtG: issuedNetWtG.toFixed(4),
                                        recvG: recvG.toFixed(4),
                                        lG: lG.toFixed(4),
                                        grossLossPct: grossLossPct.toFixed(2) + '%',
                                        purity: (purity * 100).toFixed(2) + '%',
                                        pureWt: pureWt.toFixed(4),
                                        pureLoss: pureLoss.toFixed(4),
                                        netLoss: netLoss.toFixed(4),
                                        netLossPct: netLossPct.toFixed(2) + '%',
                                        issuedNetWtD: issuedNetWtD.toFixed(4),
                                        recvD: recvD.toFixed(4),
                                        lD: lD.toFixed(4),
                                        diamondLossPct: diamondLossPct.toFixed(2) + '%',
                                        rPc: rPc.toFixed(2),
                                        lPc: lPc.toFixed(2)
                                    });
                                });
                            });
                        }
                    });
                });

                log.debug('Total Rows Found', rows.length);
                return rows;
            } catch (err) {
                log.error('Error in getInputData', err);
                return [];
            }
        };

        const map = (mapContext) => {
            try {
                mapContext.write(mapContext.key, mapContext.value);
            } catch (err) {
                log.error('Error in map', err);
            }
        };

        const reduce = (reduceContext) => {
            // Passthrough if needed, but not required since map outputs keys
        };

        const summarize = (summaryContext) => {
            try {
                // ── Script object (must be first – used throughout this function) ────────
                const scriptObj = runtime.getCurrentScript();

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
                ];
        
                const colDefs = COL_WIDTHS.map(w =>
                    `   <Column ss:AutoFitWidth="0" ss:Width="${w}"/>`
                ).join('\n');
        
                // ── Collect all rows from map output ─────────────────────────────────
                // getInputData now returns the entire dataset as a single JSON-stringified
                // array under one key, so we must unwrap it here.
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
                log.debug('Deduplicated allRows count', allRows.length);
        
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
        
                const getDeptTotals = (rows) => {
                    const iG  = sumField(rows, 'issuedNetWtG');
                    const rG  = sumField(rows, 'recvG');
                    const lG  = sumField(rows, 'lG');
                    const pw  = sumField(rows, 'pureWt');
                    const pl  = sumField(rows, 'pureLoss');
                    const nl  = sumField(rows, 'netLoss');
                    const iD  = sumField(rows, 'issuedNetWtD');
                    const rD  = sumField(rows, 'recvD');
                    const lD  = sumField(rows, 'lD');
                    const rPc = sumField(rows, 'rPc');
                    const lPc = sumField(rows, 'lPc');
                    const bagSet = new Set(rows.map(r => r.bagName));
                    return { iG, rG, lG, pw, pl, nl, iD, rD, lD, rPc, lPc,
                             bagCount: bagSet.size,
                             grossLossPct: pctStr(lG, rG),
                             netLossPct: pctStr(nl, rG),
                             diamondLossPct: pctStr(lD, rD) };
                };
        
                // ── Grand totals ──────────────────────────────────────────────────────
                const GT = getDeptTotals(allRows);
        
                // ── Build worksheet XML ───────────────────────────────────────────────
                const HEADERS = [
                    'Location', 'Department', 'Employee', 'Category', 'Subcategory',
                    'Style Number', 'Bag Name',
                    'Issued Net Wt Gold (g)', 'Received Qty Gold (g)', 'Gross Loss Gold (g)',
                    'Gross Loss %', 'Purity %', 'Pure Weight (g)', 'Pure Loss (g)',
                    'Net Loss (g)', 'Net Loss %',
                    'Issued Net Wt Diamond (ct)', 'Recv Qty Diamond (ct)', 'Loss Qty Diamond (ct)',
                    'Diamond Loss %', 'Received Pieces', 'Loss Pieces',
                    'Gold Recovery Wt (gm)', 'Gold Recovery %',
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
                    const totals = getDeptTotals(dRows);
                
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
                        const eTotals = getDeptTotals(eRows);
                
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
                            rows_xml += `   ${cell(dls,   'String', row.grossLossPct)}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.purity)}\n`;
                            rows_xml += `   ${numCell(ds,   row.pureWt)}\n`;
                            rows_xml += `   ${numCell(dls,  row.pureLoss)}\n`;
                            rows_xml += `   ${numCell(dls,  row.netLoss)}\n`;
                            rows_xml += `   ${cell(dls,   'String', row.netLossPct)}\n`;
                            rows_xml += `   ${numCell(ds,   row.issuedNetWtD)}\n`;
                            rows_xml += `   ${numCell(ds,   row.recvD)}\n`;
                            rows_xml += `   ${numCell(dls,  row.lD)}\n`;
                            rows_xml += `   ${cell(dls,   'String', row.diamondLossPct)}\n`;
                            rows_xml += `   ${numCell(ds,   row.rPc)}\n`;
                            rows_xml += `   ${numCell(dls,  row.lPc)}\n`;
                            rows_xml += `   ${numCell(ds,   row.goldRecoveryWt  || 0)}\n`;
                            rows_xml += `   ${cell(ds,    'String', row.goldRecoveryPct || '0.00%')}\n`;
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
                            rows_xml += `   ${cell('e',  'String', '')}\n`;  // Recovery Wt – N/A
                            rows_xml += `   ${cell('e',  'String', '')}\n`;  // Recovery % – N/A
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
                    rows_xml += `   ${cell('t',  'String', '')}\n`;  // Recovery Wt – N/A for dept total
                    rows_xml += `   ${cell('t',  'String', '')}\n`;  // Recovery % – N/A for dept total
                    rows_xml += `  </Row>\n`;
                });
        
                // ── Grand total row ───────────────────────────────────────────────────
                const uniqueGrandBags = new Set(allRows.map(r => r.bagName)).size;
                const grandLocation = allRows.length > 0 ? allRows[0].location : '';
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
                rows_xml += `   ${cell('g',  'String', '')}\n`;  // Recovery Wt – N/A for grand total
                rows_xml += `   ${cell('g',  'String', '')}\n`;  // Recovery % – N/A for grand total
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

        return { getInputData, map, summarize }

    }
);