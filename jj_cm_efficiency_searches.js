/**
 * @NApiVersion 2.1
 */
/************************************************************************************************
 * DEWIN-331 Bag Management Solution - Efficiency Analysis Model
 * **********************************************************************************************
 *
 * Author: Jobin & Jismi IT Services LLP
 *
 * Date Created : 10 - June - 2026
 *
 * Created By: Jobin & Jismi IT Services LLP
 *
 * Description : Model for handling efficiency analysis data, searches, and related operations.
 *               This module provides methods to retrieve, create, update, and analyze efficiency
 *               metrics including production rates, defect rates, downtime, OEE scores, and
 *               labor efficiency metrics.uu
 *
 * REVISION HISTORY
 * @version 1.0 created initial build by JJ0419
 *
 *
 * COPYRIGHT © 2024 Jobin & Jismi.
 * All rights reserved. This script is a proprietary product of Jobin & Jismi IT Services LLP and is protected by copyright
 * law and international treaties. Unauthorized reproduction or distribution of this script, or any portion of it,
 * may result in severe civil and criminal penalties and will be prosecuted to the maximum extent possible under law.
 ***********************************************************************************************/
define(['N/search', 'N/record', 'N/config', 'N/url', 'N/query', 'N/runtime', 'N/format', 'N/file', '../Libraries/jj_cm_ns_utility.js', 'N/cache', 'N/task'],
    /**
     * @param{search} search
     * @param{record} record
     * @param{config} config
     * @param{url} url
     * @param{query} query
     * @param{runtime} runtime
     * @param{format} format
     * @param{file} file
     * @param{jjUtil} jjUtil
     * @param{cache} cache
     * @param{task} task
     */
    (search, record, config, url, query, runtime, format, file, jjUtil, cache, task) => {
        const CACHE_FILE_ID = 131524; // Cache file ID
        const CACHE_KEY = 'item_list'; // Cache key
        const CACHE_NAME = 'item_cache'; // Cache name
        // const METAL_ARRAY_GOLD = [4609, 8410, 8411, 25093]; // [G18, G22, G994, G14] // SB Old
        // const METAL_ARRAY_GOLD = [28612, 22327, 22328, 22329]; // [G14, G18, G22, G994] // Old
        const METAL_ARRAY_GOLD = [53017, 53018, 53019, 53020]; // [G14, G18, G22, G994] // SB and PD
        // const BARCODING_AND_FG_DEPT_ID = 24;
        const PAGE_SIZE = 10; // Number of records per page
        const OPERATION_STATUS_IN_TRANSIT = 2;
        const OPERATION_STATUS_IN_PROGRESS = 1;

        const PROCESS_STATUS_READY_TO_PROCESS = 2;

        // Constants for material and item classification
        const DIAMOND_ID = 6;
        const GOLD_CLASS_IDS = [5, 22, 23, 24, 25]; // [Gold, Gold Bullion, Gold Findings, Gold Mountings, Gold Back Chain]
        const JEWELRY_CLASS_ID = 10;
        const GOLD_AND_JEWELRY_CLASS_IDS = [...GOLD_CLASS_IDS, JEWELRY_CLASS_ID]; // Combined for SQL queries

        const FIRST_DEPARTMENT_ID = 1;
        const CASTING_DEPT_ID = 9;
        const CASTING = 9;
        const TREE_CUTTING_CLEANING = 10;
        const GRINDING = 12;

        /**
         * @description Efficiency Analysis Search Results
         */
        const efficiencyAnalysisResults = {
            
            /**
             * Execute a SQL query and return results using query.create API
             * @param {string} sqlQuery - The SQL query to execute
             * @returns {Array} - Array of query results as objects
             */
            runQuery(sqlQuery) {
                try {
                    if (!sqlQuery) {
                        log.error('runQuery - ERROR: sqlQuery is null or undefined');
                        return [];
                    }
                    log.debug('runQuery - Executing SuiteQL', { queryLength: sqlQuery.length });
                    const results = [];
                    const PAGE_SIZE = 1000;
                    let pageIndex = 0;
                    let pagedData;
            
                    do {
                        pagedData = query.runSuiteQLPaged({
                            query: sqlQuery,
                            pageSize: PAGE_SIZE
                        });
            
                        if (pageIndex === 0 && pagedData.pageRanges.length === 0) {
                            break;
                        }
            
                        const page = pagedData.fetch({ index: pageIndex });
                        const mapped = page.data.asMappedResults();
                        for (let i = 0; i < mapped.length; i++) {
                            results.push(mapped[i]);
                        }
                        pageIndex++;
                    } while (pagedData && pageIndex < pagedData.pageRanges.length);
            
                    log.debug('runQuery - Results Count', results.length);
                    return results;
                } catch (error) {
                    log.error('runQuery - Error', error);
                    log.error('runQuery - SQL Query was', sqlQuery ? sqlQuery.substring(0, 500) : 'NULL');
                    return [];
                }
            },
            
            /**
             * @description Core efficiency-data builder shared by the Overall, Production
             * and Repair Efficiency Analysis reports.
             *
             * All three reports run essentially identical SQL queries — fetching
             * departments / employees / bags / categories, then starting / issued / loss /
             * scrap / balance quantities, then resolving metal purity via search.create, and
             * (for Overall & Production) Wax Tree production data for Casting,
             * Tree Cutting/Cleaning and Grinding. The ONLY differences between the three
             * reports are:
             *
             *   1. The repair-order filter applied to both SQL queries:
             *        - Overall analysis    -> repairOrderFilter = null  (no filter; includes
             *                                  both production and repair operations)
             *        - Production analysis -> repairOrderFilter = 'F'   (production / non-repair
             *                                  operations only)
             *        - Repair analysis     -> repairOrderFilter = 'T'   (repair operations only)
             *
             *   2. Whether Wax Tree actual-production data is fetched for the Casting,
             *      Tree Cutting/Cleaning and Grinding departments:
             *        - Overall analysis    -> includeWaxTree = true
             *        - Production analysis -> includeWaxTree = true
             *        - Repair analysis     -> includeWaxTree = false
             *
             * @param {string} location - The location filter (optional)
             * @param {string} startDate - The start date for the query in 'YYYY-MM-DD' format
             * @param {string} endDate - The end date for the query in 'YYYY-MM-DD' format
             * @param {Object} options
             * @param {string|null} options.repairOrderFilter - null | 'F' | 'T' (see above)
             * @param {boolean} options.includeWaxTree - whether to fetch Wax Tree data
             * @param {string} options.logPrefix - prefix used for log messages so each
             *        report's logs remain distinguishable
             * @returns {Object} - The grouped and cleaned efficiency data
             */
            buildEfficiencyData(location, startDate, endDate, options) {
                const repairOrderFilter = (options && Object.prototype.hasOwnProperty.call(options, 'repairOrderFilter'))
                    ? options.repairOrderFilter
                    : null;
                const includeWaxTree = !!(options && options.includeWaxTree);
                const logPrefix = (options && options.logPrefix) || 'getEfficiencyData';
 
                try {
                    if (!startDate || !endDate) {
                        return {};
                    }
 
                    const sqlStartDate = startDate + ' 00:00:00';
                    const sqlEndDate = endDate + ' 23:59:59';
 
                    log.debug(logPrefix + " - Parameters", {
                        location: location,
                        startDate: sqlStartDate,
                        endDate: sqlEndDate,
                        repairOrderFilter: repairOrderFilter
                    });
 
                    // ── Repair-order condition shared by BOTH queries below ─────────────────
                    //  - Overall analysis    : repairOrderFilter === null -> no filter applied
                    //                           (both production & repair operations included)
                    //  - Production analysis : repairOrderFilter === 'F'  -> non-repair ops only
                    //  - Repair analysis     : repairOrderFilter === 'T'  -> repair ops only
                    const repairFilterMain = (repairOrderFilter !== null && repairOrderFilter !== undefined)
                        ? `AND NVL(CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_repair_order, 'F') = '${repairOrderFilter}'`
                        : '';
                    const repairFilterStartingQty = (repairOrderFilter !== null && repairOrderFilter !== undefined)
                        ? `AND NVL(op.custrecord_jj_repair_order, 'F') = '${repairOrderFilter}'`
                        : '';
 
                    // Build the SQL query to fetch departments, employees, bags, and categories
                    let sqlQuery = `
                        SELECT DISTINCT
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB."ID") AS department_id,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB.name) AS department_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB.custrecord_jj_mandept_location) AS location_id,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB.name_0) AS location_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_employee) AS employee_id,
                            BUILTIN_RESULT.TYPE_STRING(employee.firstname) AS firstname,
                            BUILTIN_RESULT.TYPE_STRING(employee.lastname) AS lastname,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_bagno) AS bag_id,
                            BUILTIN_RESULT.TYPE_STRING(NVL(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.altname, CUSTOMRECORD_JJ_BAG_GENERATION_SUB.bag_name_original)) AS bag_name,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.name_0_0) AS category_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.category_id) AS category_id,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.sub_category_name) AS sub_category_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.sub_category_id) AS sub_category_id,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.print_design_name) AS print_design_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.print_design_id) AS print_design_id,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_received_pieces_info) AS received_pieces_info,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_loss_pieces_info) AS loss_pieces_info
                        FROM CUSTOMRECORD_JJ_OPERATIONS,
                            (SELECT 
                                CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_operations AS custrecord_jj_operations_join,
                                CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_issued_quantity AS custrecord_jj_issued_quantity_crit,
                                CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_dir_starting_qty AS custrecord_jj_dir_starting_qty_crit
                            FROM CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN
                            ) CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB,
                            (SELECT 
                                CUSTOMRECORD_JJ_BAG_GENERATION."ID" AS id_1,
                                CUSTOMRECORD_JJ_BAG_GENERATION."ID" AS id_join,
                                CUSTOMRECORD_JJ_BAG_GENERATION.name AS bag_name_original,
                                CUSTOMRECORD_JJ_BAG_GENERATION.altname AS altname,
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.name_0 AS name_0_0,
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.category_id AS category_id,
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.sub_category_name AS sub_category_name,
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.sub_category_id AS sub_category_id,
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.print_design_name AS print_design_name,
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.print_design_id AS print_design_id,
                                CUSTOMRECORD_JJ_BAGCORE_MATERIALS_SUB.custrecord_jj_received_pieces_info,
                                CUSTOMRECORD_JJ_BAGCORE_MATERIALS_SUB.custrecord_jj_loss_pieces_info
                            FROM CUSTOMRECORD_JJ_BAG_GENERATION,
                                (SELECT CUSTOMRECORD_JJ_BAG_CORE_TRACKING."ID" AS id_0,
                                        CUSTOMRECORD_JJ_BAG_CORE_TRACKING."ID" AS id_join,
                                        item_SUB.name AS name_0,
                                        item_SUB.category_id AS category_id,
                                        item_SUB.sub_category_name AS sub_category_name,
                                        item_SUB.sub_category_id AS sub_category_id,
                                        item_SUB.itemid AS print_design_name,
                                        item_SUB."ID" AS print_design_id
                                FROM CUSTOMRECORD_JJ_BAG_CORE_TRACKING,
                                    (SELECT item_0."ID" AS "ID", item_0."ID" AS id_join, CUSTOMRECORD_JJ_CATEGORY.name AS name, CUSTOMRECORD_JJ_CATEGORY."ID" AS category_id, item_0.itemid AS itemid, BUILTIN.DF(item_0.custitem_jj_sub_category) AS sub_category_name, item_0.custitem_jj_sub_category AS sub_category_id
                                    FROM item item_0, CUSTOMRECORD_JJ_CATEGORY
                                    WHERE item_0.custitem_jj_category = CUSTOMRECORD_JJ_CATEGORY."ID"(+)) item_SUB
                                WHERE CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_kt_col = item_SUB."ID"(+)) CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB,
                                (SELECT CUSTOMRECORD_JJ_BAGCORE_MATERIALS."ID" AS id_0,
                                        CUSTOMRECORD_JJ_BAGCORE_MATERIALS."ID" AS id_join,
                                        CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_received_pieces_info,
                                        CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_loss_pieces_info
                                FROM CUSTOMRECORD_JJ_BAGCORE_MATERIALS) CUSTOMRECORD_JJ_BAGCORE_MATERIALS_SUB
                            WHERE CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore = CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.id_0(+)
                                AND CUSTOMRECORD_JJ_BAG_GENERATION."ID" = CUSTOMRECORD_JJ_BAGCORE_MATERIALS_SUB.id_0(+)
                            ) CUSTOMRECORD_JJ_BAG_GENERATION_SUB,
                            (SELECT 
                                CUSTOMRECORD_JJ_MANUFACTURING_DEPT."ID" AS "ID",
                                CUSTOMRECORD_JJ_MANUFACTURING_DEPT.name AS name,
                                CUSTOMRECORD_JJ_MANUFACTURING_DEPT.custrecord_jj_mandept_location AS custrecord_jj_mandept_location,
                                LOCATION.name AS name_0,
                                CUSTOMRECORD_JJ_MANUFACTURING_DEPT.isinactive AS isinactive_crit,
                                CUSTOMRECORD_JJ_MANUFACTURING_DEPT.custrecord_jj_mandept_location AS custrecord_jj_mandept_location_crit
                            FROM CUSTOMRECORD_JJ_MANUFACTURING_DEPT, LOCATION
                            WHERE CUSTOMRECORD_JJ_MANUFACTURING_DEPT.custrecord_jj_mandept_location = LOCATION."ID"(+)
                            ) CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB,
                            employee
                        WHERE CUSTOMRECORD_JJ_OPERATIONS."ID" = CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_operations_join(+)
                            AND CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_bagno = CUSTOMRECORD_JJ_BAG_GENERATION_SUB.id_1(+)
                            AND CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_department = CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB."ID"(+)
                            AND CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_employee = employee."ID"(+)
                            AND (CUSTOMRECORD_JJ_BAG_GENERATION_SUB.bag_name_original IS NOT NULL OR CUSTOMRECORD_JJ_BAG_GENERATION_SUB.altname IS NOT NULL)
                            AND (
                                CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_issued_quantity_crit > 0
                                OR CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_dir_starting_qty_crit > 0
                            )
                            AND NVL(CUSTOMRECORD_JJ_OPERATIONS.isinactive, 'F') = 'F'
                            AND NVL(CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB.isinactive_crit, 'F') = 'F'
                            AND NVL(employee.isinactive, 'F') = 'F'
                            ${repairFilterMain}
                            AND BUILTIN.CAST_AS(CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') >= TO_DATE('${sqlStartDate}', 'YYYY-MM-DD HH24:MI:SS')
                            AND BUILTIN.CAST_AS(CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') < TO_DATE('${sqlEndDate}', 'YYYY-MM-DD HH24:MI:SS')
                    `;
 
                    // Add location filter if provided
                    if (location) {
                        sqlQuery += `
                            AND CUSTOMRECORD_JJ_MANUFACTURING_DEPT_SUB.custrecord_jj_mandept_location_crit IN ('${location}')
                        `;
                    }
 
                    let rawResults = this.runQuery(sqlQuery);
 
                    const groupedData = {};
                    const deptPiecesMap = {};
 
                    rawResults.forEach(record => {
                        const locationId = record.location_id;
                        const departmentId = record.department_id;
                        const employeeId = record.employee_id;
                        const bagId = record.bag_id;
                        const bagName = record.bag_name;
                        const categoryName = record.category_name;
                        const categoryId = record.category_id;
                        const subCategoryName = record.sub_category_name;
                        const subCategoryId = record.sub_category_id;
                        const printDesignName = record.print_design_name;
                        const printDesignId = record.print_design_id;
 
                        if (!locationId || !departmentId) return;
 
                        // Aggregate pieces data per department
                        if (!deptPiecesMap[departmentId]) {
                            deptPiecesMap[departmentId] = { received_pieces_info: 0, loss_pieces_info: 0 };
                        }
                        deptPiecesMap[departmentId].received_pieces_info += parseFloat(record.received_pieces_info || 0);
                        deptPiecesMap[departmentId].loss_pieces_info += parseFloat(record.loss_pieces_info || 0);
 
                        // Initialize location if not exists
                        if (!groupedData[locationId]) {
                            groupedData[locationId] = { location_name: record.location_name, departments: {} };
                        }
 
                        // Initialize department if not exists
                        if (!groupedData[locationId].departments[departmentId]) {
                            groupedData[locationId].departments[departmentId] = {
                                department_id: departmentId,
                                department_name: record.department_name,
                                employees: {},
                                unique_bags: new Set(),
                                unique_categories: new Set(),
                                category_print_design_map: {},
                                category_print_design_id_map: {},
                                category_bags_map: {},
                                received_pieces_info: 0,
                                loss_pieces_info: 0
                            };
                        }
 
                        // Add unique bag to department
                        if (bagName) groupedData[locationId].departments[departmentId].unique_bags.add(bagName);
 
                        // Add unique category to department
                        if (categoryName) {
                            groupedData[locationId].departments[departmentId].unique_categories.add(categoryName);
                            if (printDesignName) {
                                groupedData[locationId].departments[departmentId].category_print_design_map[categoryName] = printDesignName;
                            }
                            if (printDesignId) {
                                groupedData[locationId].departments[departmentId].category_print_design_id_map[categoryName] = printDesignId;
                            }
                            if (bagName) {
                                if (!groupedData[locationId].departments[departmentId].category_bags_map[categoryName]) {
                                    groupedData[locationId].departments[departmentId].category_bags_map[categoryName] = {};
                                }
                                groupedData[locationId].departments[departmentId].category_bags_map[categoryName][bagName] = { id: bagId, printDesign: printDesignName, printDesignId: printDesignId, subCategoryName: subCategoryName, categoryId: categoryId, subCategoryId: subCategoryId };
                            }
                        }
 
                        // Add employee to department if employee exists
                        if (employeeId) {
                            if (!groupedData[locationId].departments[departmentId].employees[employeeId]) {
                                const fullName = [record.firstname, record.lastname].filter(Boolean).join(" ");
                                groupedData[locationId].departments[departmentId].employees[employeeId] = {
                                    employee_id: employeeId,
                                    name: fullName || "Unknown Employee",
                                    unique_bags: new Set(),
                                    unique_categories: new Set(),
                                    category_print_design_map: {},
                                    category_print_design_id_map: {},
                                    category_bags_map: {}
                                };
                            }
                            // Add unique bag to employee
                            if (bagName) groupedData[locationId].departments[departmentId].employees[employeeId].unique_bags.add(bagName);
 
                            // Add unique category to employee
                            if (categoryName) {
                                groupedData[locationId].departments[departmentId].employees[employeeId].unique_categories.add(categoryName);
                                if (printDesignName) {
                                    groupedData[locationId].departments[departmentId].employees[employeeId].category_print_design_map[categoryName] = printDesignName;
                                }
                                if (printDesignId) {
                                    groupedData[locationId].departments[departmentId].employees[employeeId].category_print_design_id_map[categoryName] = printDesignId;
                                }
                                if (bagName) {
                                    if (!groupedData[locationId].departments[departmentId].employees[employeeId].category_bags_map[categoryName]) {
                                        groupedData[locationId].departments[departmentId].employees[employeeId].category_bags_map[categoryName] = {};
                                    }
                                    groupedData[locationId].departments[departmentId].employees[employeeId].category_bags_map[categoryName][bagName] = { id: bagId, printDesign: printDesignName, printDesignId: printDesignId, subCategoryName: subCategoryName, categoryId: categoryId, subCategoryId: subCategoryId };
                                }
                            }
                        }
                    });
 
                    // Convert employees object to array and bags Set to count for each department and employee
                    Object.keys(groupedData).forEach(locationId => {
                        Object.keys(groupedData[locationId].departments).forEach(departmentId => {
                            const dept = groupedData[locationId].departments[departmentId];
                            // Serialize category_bags_map (name→id) to counts, names arrays, and ids map
                            const deptCategoryBagCountMap = {};
                            const deptCategoryBagNamesMap = {};
                            const deptCategoryBagIdsMap = {};
                            const deptCategoryBagPrintDesignMap = {};
                            const deptCategoryBagPrintDesignIdMap = {};
                            const deptCategoryBagSubCategoryMap = {};
                            const deptCategoryBagCategoryIdMap = {};
                            const deptCategoryBagSubCategoryIdMap = {};
                            Object.keys(dept.category_bags_map).forEach(cat => {
                                const bagMap = dept.category_bags_map[cat];
                                const names = Object.keys(bagMap);
                                deptCategoryBagCountMap[cat] = names.length;
                                deptCategoryBagNamesMap[cat] = names;
                                deptCategoryBagIdsMap[cat] = {};
                                deptCategoryBagPrintDesignMap[cat] = {};
                                deptCategoryBagPrintDesignIdMap[cat] = {};
                                deptCategoryBagSubCategoryMap[cat] = {};
                                deptCategoryBagCategoryIdMap[cat] = {};
                                deptCategoryBagSubCategoryIdMap[cat] = {};
                                names.forEach(n => {
                                    deptCategoryBagIdsMap[cat][n] = bagMap[n].id;
                                    deptCategoryBagPrintDesignMap[cat][n] = bagMap[n].printDesign;
                                    deptCategoryBagPrintDesignIdMap[cat][n] = bagMap[n].printDesignId;
                                    deptCategoryBagSubCategoryMap[cat][n] = bagMap[n].subCategoryName;
                                    deptCategoryBagCategoryIdMap[cat][n] = bagMap[n].categoryId;
                                    deptCategoryBagSubCategoryIdMap[cat][n] = bagMap[n].subCategoryId;
                                });
                            });
                            dept.employees_array = Object.values(dept.employees).map(emp => {
                                const empCategoryBagCountMap = {};
                                const empCategoryBagNamesMap = {};
                                const empCategoryBagIdsMap = {};
                                const empCategoryBagPrintDesignMap = {};
                                const empCategoryBagPrintDesignIdMap = {};
                                const empCategoryBagSubCategoryMap = {};
                                const empCategoryBagCategoryIdMap = {};
                                const empCategoryBagSubCategoryIdMap = {};
                                Object.keys(emp.category_bags_map).forEach(cat => {
                                    const bagMap = emp.category_bags_map[cat];
                                    const names = Object.keys(bagMap);
                                    empCategoryBagCountMap[cat] = names.length;
                                    empCategoryBagNamesMap[cat] = names;
                                    empCategoryBagIdsMap[cat] = {};
                                    empCategoryBagPrintDesignMap[cat] = {};
                                    empCategoryBagPrintDesignIdMap[cat] = {};
                                    empCategoryBagSubCategoryMap[cat] = {};
                                    empCategoryBagCategoryIdMap[cat] = {};
                                    empCategoryBagSubCategoryIdMap[cat] = {};
                                    names.forEach(n => {
                                        empCategoryBagIdsMap[cat][n] = bagMap[n].id;
                                        empCategoryBagPrintDesignMap[cat][n] = bagMap[n].printDesign;
                                        empCategoryBagPrintDesignIdMap[cat][n] = bagMap[n].printDesignId;
                                        empCategoryBagSubCategoryMap[cat][n] = bagMap[n].subCategoryName;
                                        empCategoryBagCategoryIdMap[cat][n] = bagMap[n].categoryId;
                                        empCategoryBagSubCategoryIdMap[cat][n] = bagMap[n].subCategoryId;
                                    });
                                });
                                return {
                                    employee_id: emp.employee_id,
                                    name: emp.name,
                                    bag_count: emp.unique_bags.size,
                                    unique_bags_array: Array.from(emp.unique_bags),
                                    category_count: emp.unique_categories.size,
                                    unique_categories_array: Array.from(emp.unique_categories),
                                    category_print_design_map: emp.category_print_design_map,
                                    category_print_design_id_map: emp.category_print_design_id_map,
                                    category_bag_count_map: empCategoryBagCountMap,
                                    category_bag_names_map: empCategoryBagNamesMap,
                                    category_bag_ids_map: empCategoryBagIdsMap,
                                    category_bag_print_design_map: empCategoryBagPrintDesignMap,
                                    category_bag_print_design_id_map: empCategoryBagPrintDesignIdMap,
                                    category_bag_sub_category_map: empCategoryBagSubCategoryMap,
                                    category_bag_category_id_map: empCategoryBagCategoryIdMap,
                                    category_bag_sub_category_id_map: empCategoryBagSubCategoryIdMap,
                                    starting_qty: 0,
                                    loss_qty: 0,
                                    categories: []
                                };
                            });
 
                            dept.bag_count = dept.unique_bags.size;
                            dept.unique_bags_array = Array.from(dept.unique_bags);
                            dept.category_count = dept.unique_categories.size;
                            dept.unique_categories_array = Array.from(dept.unique_categories);
                            dept.category_bag_count_map = deptCategoryBagCountMap;
                            dept.category_bag_names_map = deptCategoryBagNamesMap;
                            dept.category_bag_ids_map = deptCategoryBagIdsMap;
                            dept.category_bag_print_design_map = deptCategoryBagPrintDesignMap;
                            dept.category_bag_print_design_id_map = deptCategoryBagPrintDesignIdMap;
                            dept.category_bag_sub_category_map = deptCategoryBagSubCategoryMap;
                            dept.category_bag_category_id_map = deptCategoryBagCategoryIdMap;
                            dept.category_bag_sub_category_id_map = deptCategoryBagSubCategoryIdMap;
                            delete dept.employees;
                            delete dept.unique_bags;
                            delete dept.unique_categories;
                            delete dept.category_bags_map;
                        });
                    });
 
                    // Set starting_qty to 0 for all departments
                    Object.keys(groupedData).forEach(locationId => {
                        Object.keys(groupedData[locationId].departments).forEach(departmentId => {
                            groupedData[locationId].departments[departmentId].starting_qty = 0;
                        });
                    });
 
                    // Fetch starting_qty for each department
                    try {
                        const deptIds = [];
                        Object.keys(groupedData).forEach(locationId => {
                            Object.keys(groupedData[locationId].departments).forEach(departmentId => {
                                deptIds.push(departmentId);
                            });
                        });
 
                        if (deptIds.length > 0) {
                            // purity_sub BOM join removed — purity is resolved separately via search.create below,
                            // which is faster and avoids the 5-table BOM chain running per operation row.
                            let startingQtyQuery = `
                                SELECT 
                                    BUILTIN_RESULT.TYPE_INTEGER(op.custrecord_jj_oprtns_department) AS department_id,
                                    BUILTIN_RESULT.TYPE_INTEGER(op.custrecord_jj_oprtns_employee) AS employee_id,
                                    BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(printdesign.custitem_jj_category)) AS category_name,
                                    BUILTIN_RESULT.TYPE_STRING(NVL(bag.altname, bag.name)) AS bag_name,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_dir_starting_qty, 0) ELSE 0 END)) AS starting_qty_gold,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_starting_qty, 0) ELSE 0 END)) AS starting_qty_diamond,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_issued_quantity, 0) ELSE 0 END)) AS issued_qty_gold,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_issued_quantity, 0) ELSE 0 END)) AS issued_qty_diamond,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_dir_loss_quantity, 0) ELSE 0 END)) AS loss_qty_gold,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_loss_quantity, 0) ELSE 0 END)) AS loss_qty_diamond,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_scrap_quantity, 0) ELSE 0 END)) AS scrap_qty_gold,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_scrap_quantity, 0) ELSE 0 END)) AS scrap_qty_diamond,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_additional_quantity, 0) ELSE 0 END)) AS balance_qty_gold,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_additional_quantity, 0) ELSE 0 END)) AS balance_qty_diamond,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_starting_pcs_info, 0) ELSE 0 END)) AS starting_pieces_info,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_issued_pieces_info, 0) ELSE 0 END)) AS issued_pieces_info,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_scrap_pieces_info, 0) ELSE 0 END)) AS scrap_pieces_info,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_balance_pieces_info, 0) ELSE 0 END)) AS balance_pieces_info,
                                    BUILTIN_RESULT.TYPE_FLOAT(SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_loss_pieces_info, 0) ELSE 0 END)) AS loss_pieces_info
                                FROM CUSTOMRECORD_JJ_OPERATIONS op
                                LEFT JOIN CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN dir
                                    ON dir.custrecord_jj_operations = op.ID
                                LEFT JOIN item
                                    ON dir.custrecord_jj_component = item.ID
                                LEFT JOIN CUSTOMRECORD_JJ_BAG_GENERATION bag
                                    ON op.custrecord_jj_oprtns_bagno = bag.ID
                                LEFT JOIN CUSTOMRECORD_JJ_BAG_CORE_TRACKING bagcore
                                    ON bag.custrecord_jj_baggen_bagcore = bagcore.ID
                                LEFT JOIN item printdesign 
                                    ON bagcore.custrecord_jj_bagcore_kt_col = printdesign.ID
                                LEFT JOIN (
                                    SELECT 
                                        d.ID AS id_join,
                                        d.isinactive AS isinactive_crit
                                    FROM CUSTOMRECORD_JJ_MANUFACTURING_DEPT d
                                ) dept
                                    ON op.custrecord_jj_oprtns_department = dept.id_join
                                LEFT JOIN employee emp
                                    ON op.custrecord_jj_oprtns_employee = emp.ID
                                WHERE op.custrecord_jj_oprtns_department IN (${deptIds.join(',')})
                                    AND (
                                        dir.custrecord_jj_issued_quantity > 0
                                        OR dir.custrecord_jj_dir_starting_qty > 0
                                    )
                                    AND NVL(op.isinactive, 'F') = 'F'
                                    AND NVL(dept.isinactive_crit, 'F') = 'F'
                                    AND NVL(emp.isinactive, 'F') = 'F'
                                    ${repairFilterStartingQty}
                                    AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') >= TO_DATE('${sqlStartDate}', 'YYYY-MM-DD HH24:MI:SS')
                                    AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED') < TO_DATE('${sqlEndDate}', 'YYYY-MM-DD HH24:MI:SS')
                                GROUP BY op.custrecord_jj_oprtns_department, op.custrecord_jj_oprtns_employee, BUILTIN.DF(printdesign.custitem_jj_category), NVL(bag.altname, bag.name)
                                ORDER BY 1, 2, 3, 4
                            `;
 
                            let startingQtyResults = this.runQuery(startingQtyQuery);
 
                            // Create maps for department-level and category-level data
                            const startingQtyMap = {};
                            const lossQtyMap = {};
                            const categoryQtyMap = {};
                            const categoryBagQtyMap = {};
                            const employeeCategoryQtyMap = {};
                            const employeeLevelMap = {};
 
                            startingQtyResults.forEach(record => {
                                const deptId = record.department_id;
                                const employeeId = record.employee_id;
                                const category = record.category_name || 'N/A';
                                const bagName = record.bag_name || '';
                                const deptCatKey = `${deptId}_${category}`;
                                const deptCatBagKey = `${deptId}_${category}_${bagName}`;
 
                                const qtyData = {
                                    starting_qty_gold: parseFloat(record.starting_qty_gold || 0),
                                    starting_qty_diamond: parseFloat(record.starting_qty_diamond || 0),
                                    issued_qty_gold: parseFloat(record.issued_qty_gold || 0),
                                    issued_qty_diamond: parseFloat(record.issued_qty_diamond || 0),
                                    loss_qty_gold: parseFloat(record.loss_qty_gold || 0),
                                    loss_qty_diamond: parseFloat(record.loss_qty_diamond || 0),
                                    scrap_qty_gold: parseFloat(record.scrap_qty_gold || 0),
                                    scrap_qty_diamond: parseFloat(record.scrap_qty_diamond || 0),
                                    balance_qty_gold: parseFloat(record.balance_qty_gold || 0),
                                    balance_qty_diamond: parseFloat(record.balance_qty_diamond || 0),
                                    starting_pieces_info: parseFloat(record.starting_pieces_info || 0),
                                    issued_pieces_info: parseFloat(record.issued_pieces_info || 0),
                                    scrap_pieces_info: parseFloat(record.scrap_pieces_info || 0),
                                    balance_pieces_info: parseFloat(record.balance_pieces_info || 0),
                                    loss_pieces_info: parseFloat(record.loss_pieces_info || 0)
                                };
                                const metalPurityPercent = 0; // resolved later via search.create purity lookup
 
                                // **ALWAYS: Accumulate department-level totals (regardless of employee)**
                                if (!startingQtyMap[deptId]) {
                                    startingQtyMap[deptId] = 0;
                                    lossQtyMap[deptId] = 0;
                                }
                                startingQtyMap[deptId] += qtyData.starting_qty_gold + qtyData.starting_qty_diamond;
                                lossQtyMap[deptId] += qtyData.loss_qty_gold + qtyData.loss_qty_diamond;
 
                                // **ALWAYS: Accumulate category-level data (aggregate across bags)**
                                if (!categoryQtyMap[deptCatKey]) {
                                    categoryQtyMap[deptCatKey] = { starting_qty_gold: 0, starting_qty_diamond: 0, issued_qty_gold: 0, issued_qty_diamond: 0, loss_qty_gold: 0, loss_qty_diamond: 0, scrap_qty_gold: 0, scrap_qty_diamond: 0, balance_qty_gold: 0, balance_qty_diamond: 0, starting_pieces_info: 0, issued_pieces_info: 0, scrap_pieces_info: 0, balance_pieces_info: 0, loss_pieces_info: 0 };
                                }
                                Object.keys(qtyData).forEach(k => { categoryQtyMap[deptCatKey][k] += qtyData[k]; });
 
                                // **ALWAYS: Store per-bag qty data keyed by deptId_category_bagName**
                                if (bagName) {
                                    if (!categoryBagQtyMap[deptCatBagKey]) {
                                        categoryBagQtyMap[deptCatBagKey] = { starting_qty_gold: 0, starting_qty_diamond: 0, issued_qty_gold: 0, issued_qty_diamond: 0, loss_qty_gold: 0, loss_qty_diamond: 0, scrap_qty_gold: 0, scrap_qty_diamond: 0, balance_qty_gold: 0, balance_qty_diamond: 0, starting_pieces_info: 0, issued_pieces_info: 0, scrap_pieces_info: 0, balance_pieces_info: 0, loss_pieces_info: 0, metal_purity_percent: 0 };
                                    }
                                    Object.keys(qtyData).forEach(k => { categoryBagQtyMap[deptCatBagKey][k] += qtyData[k]; });
                                    // purity is a constant per bag — take the max (non-zero wins)
                                    if (metalPurityPercent > 0) categoryBagQtyMap[deptCatBagKey].metal_purity_percent = metalPurityPercent;
                                }
 
                                // **ONLY IF EMPLOYEE EXISTS: Process employee-level data**
                                if (!employeeId) return;
 
                                const empCatKey = `${deptId}_${employeeId}_${category}`;
                                const empKey = `${deptId}_${employeeId}`;
 
                                // Store employee-category-level data (only if employee exists)
                                if (!employeeCategoryQtyMap[empCatKey]) {
                                    employeeCategoryQtyMap[empCatKey] = { starting_qty_gold: 0, starting_qty_diamond: 0, issued_qty_gold: 0, issued_qty_diamond: 0, loss_qty_gold: 0, loss_qty_diamond: 0, scrap_qty_gold: 0, scrap_qty_diamond: 0, balance_qty_gold: 0, balance_qty_diamond: 0, starting_pieces_info: 0, issued_pieces_info: 0, scrap_pieces_info: 0, balance_pieces_info: 0, loss_pieces_info: 0 };
                                }
                                Object.keys(qtyData).forEach(k => { employeeCategoryQtyMap[empCatKey][k] += qtyData[k]; });
 
                                // Initialize employee-level aggregation
                                if (!employeeLevelMap[empKey]) {
                                    employeeLevelMap[empKey] = { starting_qty: 0, loss_qty: 0, categories: [] };
                                }
 
                                // Add per-bag entry to employee categories
                                employeeLevelMap[empKey].categories.push({
                                    category_name: category,
                                    bag_name: bagName,
                                    metal_purity_percent: metalPurityPercent,
                                    ...qtyData
                                });
 
                                // Accumulate employee-level totals
                                employeeLevelMap[empKey].starting_qty += qtyData.starting_qty_gold + qtyData.starting_qty_diamond;
                                employeeLevelMap[empKey].loss_qty += qtyData.loss_qty_gold + qtyData.loss_qty_diamond;
                            });
 
                            // Fetch metal purity via the print design item (assembly item) → CUSTITEM_JJ_METAL_QUALITY
                            // This is the same approach used in getItemClassesAndPurity()
                            try {
                                // Collect all unique print design item IDs across all depts/categories
                                const itemIdToBagsMap = {}; // itemId → [{ deptId, cat, bagName }]
                                Object.keys(groupedData).forEach(locId => {
                                    Object.keys(groupedData[locId].departments).forEach(deptId => {
                                        const dept = groupedData[locId].departments[deptId];
                                        Object.keys(dept.category_bag_print_design_id_map || {}).forEach(cat => {
                                            Object.keys(dept.category_bag_print_design_id_map[cat] || {}).forEach(bagName => {
                                                const itemId = dept.category_bag_print_design_id_map[cat][bagName];
                                                if (!itemId) return;
                                                if (!itemIdToBagsMap[itemId]) itemIdToBagsMap[itemId] = [];
                                                itemIdToBagsMap[itemId].push({ deptId, cat, bagName });
                                            });
                                        });
                                    });
                                });
                                const allItemIds = Object.keys(itemIdToBagsMap);
                                if (allItemIds.length > 0) {
                                    const itemPurityMap = {}; // itemId → purity number
                                    search.create({
                                        type: search.Type.ITEM,
                                        filters: [['internalid', 'anyof', allItemIds]],
                                        columns: [
                                            search.createColumn({ name: 'internalid' }),
                                            search.createColumn({ name: 'custitem_jj_metal_purity_percent', label: 'purity' })
                                        ]
                                    }).run().each(r => {
                                        const itemId = r.getValue('internalid');
                                        const purityValue = r.getValue('custitem_jj_metal_purity_percent') || '0';
                                        itemPurityMap[itemId] = parseFloat(purityValue) || 0;
                                        return true;
                                    });
                                    // Apply purity to all bags in each category
                                    Object.keys(itemIdToBagsMap).forEach(itemId => {
                                        const purity = itemPurityMap[itemId] || 0;
                                        itemIdToBagsMap[itemId].forEach(({ deptId, cat, bagName }) => {
                                            const bKey = `${deptId}_${cat}_${bagName}`;
                                            if (categoryBagQtyMap[bKey]) categoryBagQtyMap[bKey].metal_purity_percent = purity;
                                        });
                                    });
                                    // Update employee categories
                                    Object.keys(employeeLevelMap).forEach(empKey => {
                                        const deptId = empKey.split('_')[0];
                                        (employeeLevelMap[empKey].categories || []).forEach(cat => {
                                            const dept = Object.values(groupedData).reduce((found, loc) => found || loc.departments[deptId], null);
                                            if (!dept) return;
                                            const itemId = dept.category_bag_print_design_id_map?.[cat.category_name]?.[cat.bag_name];
                                            if (itemId && itemPurityMap[itemId] !== undefined) {
                                                cat.metal_purity_percent = itemPurityMap[itemId];
                                            }
                                        });
                                    });
                                }
                            } catch (purityErr) {
                                log.error(logPrefix + ' - Purity Lookup Error', purityErr);
                            }
 
                            // Wax Tree data for Casting, Tree Cutting/Cleaning, Grinding —
                            // only fetched for reports that include it (Overall & Production).
                            // Single query with OR across all 3 date fields.
                            // Per record: if a date matches the UI range, take its corresponding weight; otherwise 0.
                            if (includeWaxTree) {
                                try {
                                    let waxTreeQuery = `
                                        SELECT
                                            SUM(CASE WHEN custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_final_tree_weight, 0) ELSE 0 END) AS casting_qty,
                                            SUM(CASE WHEN custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_casting_loss, 0) ELSE 0 END) AS casting_loss,
                                            SUM(CASE WHEN custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_metal_issue_weight, 0) ELSE 0 END) AS casting_received_qty,
                                            SUM(CASE WHEN custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_received_yield_weight, 0) ELSE 0 END) AS tree_cutting_qty,
                                            SUM(CASE WHEN custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_cutting_loss_weight, 0) ELSE 0 END) AS tree_cutting_loss,
                                            SUM(CASE WHEN custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_final_tree_weight - custrecord_jj_tree_weight - custrecord_jj_bag_components_wt, 0) ELSE 0 END) AS tree_cutting_received_qty,
                                            SUM(CASE WHEN custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_received_weight, 0) ELSE 0 END) AS grinding_qty,
                                            SUM(CASE WHEN custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_loss_weight, 0) ELSE 0 END) AS grinding_loss,
                                            SUM(CASE WHEN custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD') THEN NVL(custrecord_jj_received_yield_weight - custrecord_jj_bag_components_wt, 0) ELSE 0 END) AS grinding_received_qty
                                        FROM customrecord_jj_wax_tree
                                        WHERE isinactive = 'F'
                                          AND (
                                                (custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD'))
                                             OR (custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD'))
                                             OR (custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD') AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD'))
                                              )
                                    `;
                                    let waxTreeResults = query.runSuiteQL({ query: waxTreeQuery }).asMappedResults();
                                    if (waxTreeResults && waxTreeResults.length > 0) {
                                        const row = waxTreeResults[0];
                                        const waxDeptMap = {
                                            [CASTING]: { production: parseFloat(row.casting_qty || 0), loss: parseFloat(row.casting_loss || 0), received: parseFloat(row.casting_received_qty || 0) },
                                            [TREE_CUTTING_CLEANING]: { production: parseFloat(row.tree_cutting_qty || 0), loss: parseFloat(row.tree_cutting_loss || 0), received: parseFloat(row.tree_cutting_received_qty || 0) },
                                            [GRINDING]: { production: parseFloat(row.grinding_qty || 0), loss: parseFloat(row.grinding_loss || 0), received: parseFloat(row.grinding_received_qty || 0) }
                                        };
                                        Object.keys(waxDeptMap).forEach(function (deptId) {
                                            Object.keys(groupedData).forEach(function (locId) {
                                                const deptKey = String(deptId);
                                                if (groupedData[locId].departments[deptKey]) {
                                                    groupedData[locId].departments[deptKey].wax_tree_actual_production_gold = waxDeptMap[deptId].production;
                                                    groupedData[locId].departments[deptKey].wax_tree_loss_gold = waxDeptMap[deptId].loss;
                                                    groupedData[locId].departments[deptKey].wax_tree_received_qty_gold = waxDeptMap[deptId].received;
                                                }
                                            });
                                        });
                                    }
                                } catch (waxErr) {
                                    log.error(logPrefix + ' - Wax Tree Error', waxErr);
                                }
                            }
 
                            Object.keys(groupedData).forEach(locationId => {
                                Object.keys(groupedData[locationId].departments).forEach(departmentId => {
                                    groupedData[locationId].departments[departmentId].starting_qty = startingQtyMap[departmentId] || 0;
                                    groupedData[locationId].departments[departmentId].loss_qty = lossQtyMap[departmentId] || 0;
                                    groupedData[locationId].departments[departmentId].category_qty_map = categoryQtyMap;
                                    groupedData[locationId].departments[departmentId].category_bag_qty_map = categoryBagQtyMap;
                                    groupedData[locationId].departments[departmentId].employee_category_qty_map = employeeCategoryQtyMap;
                                    groupedData[locationId].departments[departmentId].received_pieces_info = deptPiecesMap[departmentId]?.received_pieces_info || 0;
                                    groupedData[locationId].departments[departmentId].loss_pieces_info = deptPiecesMap[departmentId]?.loss_pieces_info || 0;
 
                                    groupedData[locationId].departments[departmentId].employees_array.forEach(emp => {
                                        const empKey = `${departmentId}_${emp.employee_id}`;
                                        const empLevelData = employeeLevelMap[empKey];
                                        if (empLevelData) {
                                            emp.starting_qty = empLevelData.starting_qty;
                                            emp.loss_qty = empLevelData.loss_qty;
                                            emp.categories = empLevelData.categories;
                                        }
                                    });
                                });
                            });
                        } else {
                            log.debug(logPrefix + " - Starting Qty Fetch", "No departments found in groupedData");
                        }
                    } catch (err) {
                        log.error(logPrefix + " - Starting Qty Error", err);
                    }
 
                    return groupedData;
                } catch (error) {
                    log.error(logPrefix + " - Error", error);
                    return {};
                }
            },
            
            /**
             * Retrieves efficiency data for ALL operations (production + repair) across
             * all departments. Used for the Overall Efficiency Analysis page.
             * Includes Wax Tree data for Casting, Tree Cutting/Cleaning, and Grinding
             * departments and applies NO repair-order filter.
             *
             * @param {string} location - The location filter (optional)
             * @param {string} startDate - The start date for the query in 'YYYY-MM-DD' format
             * @param {string} endDate - The end date for the query in 'YYYY-MM-DD' format
             * @returns {Object} - The grouped and cleaned efficiency data
             */
            getOverallEfficiencyData(location, startDate, endDate) {
                return this.buildEfficiencyData(location, startDate, endDate, {
                    repairOrderFilter: null,   // Overall: no repair-order filter (production + repair)
                    includeWaxTree: true,      // Overall: includes Wax Tree data
                    logPrefix: 'getOverallEfficiencyData'
                });
            },
 

            /**
             * Retrieves efficiency data for PRODUCTION (non-repair) operations only.
             * Identical to getOverallEfficiencyData but excludes repair orders.
             * Includes Wax Tree data for Casting, Tree Cutting/Cleaning, and Grinding
             * departments.
             *
             * @param {string} location - The location filter (optional)
             * @param {string} startDate - The start date for the query in 'YYYY-MM-DD' format
             * @param {string} endDate - The end date for the query in 'YYYY-MM-DD' format
             * @returns {Object} - The grouped and cleaned efficiency data
             */
            getProductionEfficiencyData(location, startDate, endDate) {
                return this.buildEfficiencyData(location, startDate, endDate, {
                    repairOrderFilter: 'F',    // Production: non-repair operations only
                    includeWaxTree: true,      // Production: includes Wax Tree data
                    logPrefix: 'getProductionEfficiencyData'
                });
            },
 
            /**
             * Retrieves efficiency data for REPAIR operations only.
             * Excludes Wax Tree data (not applicable to repair orders).
             *
             * @param {string} location - The location filter (e.g., '102').
             * @param {string} startDate - The start date for the date range.
             * @param {string} endDate - The end date for the date range.
             * @param {boolean} isRepairOnly - (unused; kept for backward-compatible signature)
             * @returns {Object} - The grouped and cleaned efficiency data
             */
            getRepairEfficiencyData(location, startDate, endDate, isRepairOnly) {
                return this.buildEfficiencyData(location, startDate, endDate, {
                    repairOrderFilter: 'T',    // Repair: repair operations only
                    includeWaxTree: false,     // Repair: Wax Tree data not applicable
                    logPrefix: 'getRepairEfficiencyData'
                });
            },

            /**
             * DROP-IN REPLACEMENT for buildSummaryEfficiencyData() in
             * jj_ea_efficiency_analysis_model.js
             *
             * ROOT CAUSE OF ZEROS
             * ───────────────────
             * The original summary function omitted BUILTIN_RESULT.TYPE_* wrappers on
             * every SELECT expression.  In NetSuite SuiteQL, when those wrappers are
             * absent, query.runSuiteQLPaged() → row.value.asMap() returns column keys in
             * UPPERCASE (e.g. "STARTING_QTY_GOLD").  The JS then accessed the results as
             * record.starting_qty_gold (lowercase) → undefined → parseFloat(0 || 0) = 0
             * for every numeric field, making all totals zero.
             *
             * A secondary risk: mixing full table names (CUSTOMRECORD_JJ_OPERATIONS) with
             * aliases only in some places can confuse the SuiteQL parser and cause the
             * query to fail silently — runQuery() catches the error and returns [].
             *
             * FIX APPLIED
             * ───────────
             * 1. Every SELECT expression is wrapped with the matching
             *    BUILTIN_RESULT.TYPE_INTEGER / TYPE_STRING / TYPE_FLOAT — identical to
             *    the pattern used by the proven startingQtyQuery inside _buildEfficiencyData.
             * 2. Short, consistent table aliases (op, dir, item, bag, bagcore, dept, loc,
             *    emp) are used everywhere: FROM, JOIN, SELECT, WHERE, GROUP BY.
             * 3. .ID is written without quotes (op.ID, item.ID …) to match the rest of
             *    the module.
             */
            buildSummaryEfficiencyData(location, startDate, endDate, options) {
                const repairOrderFilter = (options && Object.prototype.hasOwnProperty.call(options, 'repairOrderFilter'))
                    ? options.repairOrderFilter
                    : null;
                const includeWaxTree = !!(options && options.includeWaxTree);
                const logPrefix = (options && options.logPrefix) || 'buildSummaryEfficiencyData';

                try {
                    if (!startDate || !endDate) {
                        return {};
                    }

                    const sqlStartDate = startDate + ' 00:00:00';
                    const sqlEndDate   = endDate   + ' 23:59:59';

                    log.debug(logPrefix + ' - Parameters', {
                        location, startDate: sqlStartDate, endDate: sqlEndDate, repairOrderFilter
                    });

                    // Repair-order filter injected into WHERE (same logic as _buildEfficiencyData)
                    const repairFilterMain = (repairOrderFilter !== null && repairOrderFilter !== undefined)
                        ? `AND NVL(op.custrecord_jj_repair_order, 'F') = '${repairOrderFilter}'`
                        : '';

                    // ── SINGLE AGGREGATING QUERY ─────────────────────────────────────────────────
                    // Groups by dept + employee + bag + print-design so that purity can be resolved
                    // per bag.  BUILTIN_RESULT.TYPE_* is applied to EVERY SELECT expression so that
                    // asMap() returns lowercase keys (e.g. "starting_qty_gold", not
                    // "STARTING_QTY_GOLD").  Short aliases used consistently throughout.
                    const sqlQuery = `
                        SELECT
                            BUILTIN_RESULT.TYPE_INTEGER(op.custrecord_jj_oprtns_department)      AS department_id,
                            BUILTIN_RESULT.TYPE_STRING(dept.name)                                  AS department_name,
                            BUILTIN_RESULT.TYPE_INTEGER(dept.custrecord_jj_mandept_location)       AS location_id,
                            BUILTIN_RESULT.TYPE_STRING(loc.name)                                   AS location_name,
                            BUILTIN_RESULT.TYPE_INTEGER(op.custrecord_jj_oprtns_employee)         AS employee_id,
                            BUILTIN_RESULT.TYPE_STRING(emp.firstname)                              AS firstname,
                            BUILTIN_RESULT.TYPE_STRING(emp.lastname)                               AS lastname,
                            BUILTIN_RESULT.TYPE_INTEGER(op.custrecord_jj_oprtns_bagno)            AS bag_id,
                            BUILTIN_RESULT.TYPE_INTEGER(bagcore.custrecord_jj_bagcore_kt_col)     AS print_design_id,
                            SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_dir_starting_qty,  0) ELSE 0 END) AS starting_qty_gold,
                            SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_issued_quantity,    0) ELSE 0 END) AS issued_qty_gold,
                            SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_dir_loss_quantity,  0) ELSE 0 END) AS loss_qty_gold,
                            SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_scrap_quantity,     0) ELSE 0 END) AS scrap_qty_gold,
                            SUM(CASE WHEN item.class IN (${GOLD_AND_JEWELRY_CLASS_IDS.join(', ')}) THEN NVL(dir.custrecord_jj_additional_quantity, 0) ELSE 0 END) AS balance_qty_gold,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_starting_qty,  0) ELSE 0 END) AS starting_qty_diamond,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_issued_quantity,    0) ELSE 0 END) AS issued_qty_diamond,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_loss_quantity,  0) ELSE 0 END) AS loss_qty_diamond,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_scrap_quantity,     0) ELSE 0 END) AS scrap_qty_diamond,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_additional_quantity, 0) ELSE 0 END) AS balance_qty_diamond,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_starting_pcs_info,  0) ELSE 0 END) AS starting_pieces_info,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_issued_pieces_info,  0) ELSE 0 END) AS issued_pieces_info,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_scrap_pieces_info,   0) ELSE 0 END) AS scrap_pieces_info,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_balance_pieces_info, 0) ELSE 0 END) AS balance_pieces_info,
                            SUM(CASE WHEN item.class = ${DIAMOND_ID} THEN NVL(dir.custrecord_jj_dir_loss_pieces_info,    0) ELSE 0 END) AS loss_pieces_info
                        FROM CUSTOMRECORD_JJ_OPERATIONS op
                        LEFT JOIN CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN dir
                            ON  dir.custrecord_jj_operations = op.ID
                        LEFT JOIN item
                            ON  dir.custrecord_jj_component  = item.ID
                        LEFT JOIN CUSTOMRECORD_JJ_BAG_GENERATION bag
                            ON  op.custrecord_jj_oprtns_bagno = bag.ID
                        LEFT JOIN CUSTOMRECORD_JJ_BAG_CORE_TRACKING bagcore
                            ON  bag.custrecord_jj_baggen_bagcore = bagcore.ID
                        LEFT JOIN CUSTOMRECORD_JJ_MANUFACTURING_DEPT dept
                            ON  op.custrecord_jj_oprtns_department = dept.ID
                        LEFT JOIN LOCATION loc
                            ON  dept.custrecord_jj_mandept_location = loc.ID
                        LEFT JOIN employee emp
                            ON  op.custrecord_jj_oprtns_employee = emp.ID
                        WHERE NVL(op.isinactive,   'F') = 'F'
                            AND NVL(dept.isinactive, 'F') = 'F'
                            AND NVL(emp.isinactive,  'F') = 'F'
                            AND (
                                NVL(dir.custrecord_jj_issued_quantity,   0) > 0
                                OR NVL(dir.custrecord_jj_dir_starting_qty, 0) > 0
                            )
                            ${repairFilterMain}
                            AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED')
                                >= TO_DATE('${sqlStartDate}', 'YYYY-MM-DD HH24:MI:SS')
                            AND BUILTIN.CAST_AS(op.custrecord_jj_oprtns_exit, 'TIMESTAMP_TZ_TRUNCED')
                                <  TO_DATE('${sqlEndDate}',   'YYYY-MM-DD HH24:MI:SS')
                            ${location ? `AND dept.custrecord_jj_mandept_location = '${location}'` : ''}
                        GROUP BY
                            op.custrecord_jj_oprtns_department,
                            dept.name,
                            dept.custrecord_jj_mandept_location,
                            loc.name,
                            op.custrecord_jj_oprtns_employee,
                            emp.firstname,
                            emp.lastname,
                            op.custrecord_jj_oprtns_bagno,
                            bagcore.custrecord_jj_bagcore_kt_col
                        ORDER BY 1, 5, 8
                    `;

                    let rawResults = this.runQuery(sqlQuery);
                    log.debug(logPrefix + ' - Raw result count', rawResults.length);

                    // ── Purity lookup: collect unique print_design_id values ─────────────────────
                    const printDesignIds = new Set();
                    rawResults.forEach(r => {
                        if (r.print_design_id) printDesignIds.add(String(r.print_design_id));
                    });

                    const itemPurityMap = {}; // itemId (string) → purity percent (number 0–100)
                    if (printDesignIds.size > 0) {
                        try {
                            search.create({
                                type: search.Type.ITEM,
                                filters: [['internalid', 'anyof', Array.from(printDesignIds)]],
                                columns: [
                                    search.createColumn({ name: 'internalid' }),
                                    search.createColumn({ name: 'custitem_jj_metal_purity_percent', label: 'purity' })
                                ]
                            }).run().each(r => {
                                const itemId = r.getValue('internalid');
                                itemPurityMap[itemId] = parseFloat(r.getValue('custitem_jj_metal_purity_percent') || '0') || 0;
                                return true;
                            });
                        } catch (pErr) {
                            log.error(logPrefix + ' - Purity Lookup Error', pErr);
                        }
                    }

                    // ── Build grouped data ───────────────────────────────────────────────────────
                    const groupedData   = {};
                    const globalBagSet  = new Set();

                    rawResults.forEach(record => {
                        const locationId     = record.location_id;
                        const locationName   = record.location_name;
                        const departmentId   = record.department_id;
                        const departmentName = record.department_name;
                        const employeeId     = record.employee_id;
                        const bagId          = record.bag_id;
                        const printDesignId  = record.print_design_id ? String(record.print_design_id) : null;
                        const purityFactor   = printDesignId ? (itemPurityMap[printDesignId] || 0) / 100 : 0;

                        if (!locationId || !departmentId) return;

                        if (bagId) globalBagSet.add(bagId);

                        // ── Init location ────────────────────────────────────────────────────────
                        if (!groupedData[locationId]) {
                            groupedData[locationId] = {
                                location_id:   locationId,
                                location_name: locationName,
                                departments:   {}
                            };
                        }

                        // ── Init department ──────────────────────────────────────────────────────
                        if (!groupedData[locationId].departments[departmentId]) {
                            groupedData[locationId].departments[departmentId] = {
                                department_id:   departmentId,
                                department_name: departmentName,
                                unique_bags:     new Set(),

                                // Gold / Jewelry accumulators
                                issued_net_wt_gold: 0,
                                received_qty_gold:  0,
                                gross_loss_gold:    0,
                                pure_weight_gold:   0,
                                pure_loss_gold:     0,
                                net_loss_gold:      0,

                                // Diamond accumulators
                                issued_net_wt_diamond: 0,
                                received_qty_diamond:  0,
                                loss_qty_diamond:      0,

                                // Piece counts (diamond)
                                received_pieces: 0,
                                loss_pieces:     0,

                                employees: {}
                            };
                        }

                        const dept = groupedData[locationId].departments[departmentId];
                        if (bagId) dept.unique_bags.add(bagId);

                        // ── Qty reads — now guaranteed lowercase by BUILTIN_RESULT wrappers ──────
                        const sG  = parseFloat(record.starting_qty_gold  || 0);
                        const iG  = parseFloat(record.issued_qty_gold    || 0);
                        const lG  = parseFloat(record.loss_qty_gold      || 0);
                        const scG = parseFloat(record.scrap_qty_gold     || 0);
                        const bG  = parseFloat(record.balance_qty_gold   || 0);

                        const sD  = parseFloat(record.starting_qty_diamond  || 0);
                        const iD  = parseFloat(record.issued_qty_diamond    || 0);
                        const lD  = parseFloat(record.loss_qty_diamond      || 0);
                        const scD = parseFloat(record.scrap_qty_diamond     || 0);
                        const bD  = parseFloat(record.balance_qty_diamond   || 0);

                        const sP  = parseFloat(record.starting_pieces_info  || 0);
                        const iP  = parseFloat(record.issued_pieces_info    || 0);
                        const scP = parseFloat(record.scrap_pieces_info     || 0);
                        const bP  = parseFloat(record.balance_pieces_info   || 0);
                        const lP  = parseFloat(record.loss_pieces_info      || 0);

                        // ── Derived quantities ───────────────────────────────────────────────────
                        // issued_net_wt = (starting + issued) minus what was returned (scrap + balance)
                        const issuedNetWtG  = sG + iG - scG - bG;
                        // received_qty  = net output produced (total input minus all outflows)
                        const recvG         = sG + iG - lG - scG - bG;
                        const pureWtG       = recvG * purityFactor;
                        const pureLossG     = lG    * purityFactor;

                        const issuedNetWtD  = sD + iD - scD - bD;
                        const recvD         = sD + iD - lD - scD - bD;

                        const receivedPieces = sP + iP - scP - bP;

                        // ── Accumulate at DEPARTMENT level (all rows, including null-employee) ───
                        dept.issued_net_wt_gold    += issuedNetWtG;
                        dept.received_qty_gold     += recvG;
                        dept.gross_loss_gold       += lG;
                        dept.pure_weight_gold      += pureWtG;
                        dept.pure_loss_gold        += pureLossG;
                        dept.issued_net_wt_diamond += issuedNetWtD;
                        dept.received_qty_diamond  += recvD;
                        dept.loss_qty_diamond      += lD;
                        dept.received_pieces       += receivedPieces;
                        dept.loss_pieces           += lP;

                        // ── Accumulate at EMPLOYEE level (skip null-employee rows) ───────────────
                        if (!employeeId) return;

                        if (!dept.employees[employeeId]) {
                            const fullName = [record.firstname, record.lastname].filter(Boolean).join(' ');
                            dept.employees[employeeId] = {
                                employee_id:   employeeId,
                                employee_name: fullName || 'Unknown Employee',
                                unique_bags:   new Set(),

                                issued_net_wt_gold:    0,
                                received_qty_gold:     0,
                                gross_loss_gold:       0,
                                pure_weight_gold:      0,
                                pure_loss_gold:        0,
                                net_loss_gold:         0,

                                issued_net_wt_diamond: 0,
                                received_qty_diamond:  0,
                                loss_qty_diamond:      0,

                                received_pieces: 0,
                                loss_pieces:     0
                            };
                        }

                        const emp = dept.employees[employeeId];
                        if (bagId) emp.unique_bags.add(bagId);

                        emp.issued_net_wt_gold    += issuedNetWtG;
                        emp.received_qty_gold     += recvG;
                        emp.gross_loss_gold       += lG;
                        emp.pure_weight_gold      += pureWtG;
                        emp.pure_loss_gold        += pureLossG;
                        emp.issued_net_wt_diamond += issuedNetWtD;
                        emp.received_qty_diamond  += recvD;
                        emp.loss_qty_diamond      += lD;
                        emp.received_pieces       += receivedPieces;
                        emp.loss_pieces           += lP;
                    });

                    // ── Finalise: round, derive net_loss_gold, build employees_array ─────────────
                    Object.keys(groupedData).forEach(locationId => {
                        Object.keys(groupedData[locationId].departments).forEach(departmentId => {
                            const dept = groupedData[locationId].departments[departmentId];

                            // Convert employee map → sorted array with rounded values
                            dept.employees_array = Object.values(dept.employees).map(emp => ({
                                employee_id:   emp.employee_id,
                                name:          emp.employee_name,
                                bag_count:     emp.unique_bags.size,
                                unique_bags_array: Array.from(emp.unique_bags),

                                issued_net_wt_gold:    parseFloat(emp.issued_net_wt_gold.toFixed(4)),
                                received_qty_gold:     parseFloat(emp.received_qty_gold.toFixed(4)),
                                gross_loss_gold:       parseFloat(emp.gross_loss_gold.toFixed(4)),
                                pure_weight_gold:      parseFloat(emp.pure_weight_gold.toFixed(4)),
                                pure_loss_gold:        parseFloat(emp.pure_loss_gold.toFixed(4)),
                                net_loss_gold:         emp.received_qty_gold > 0
                                                        ? parseFloat((emp.gross_loss_gold / emp.received_qty_gold).toFixed(6))
                                                        : 0,

                                issued_net_wt_diamond: parseFloat(emp.issued_net_wt_diamond.toFixed(4)),
                                received_qty_diamond:  parseFloat(emp.received_qty_diamond.toFixed(4)),
                                loss_qty_diamond:      parseFloat(emp.loss_qty_diamond.toFixed(4)),

                                received_pieces:       parseFloat(emp.received_pieces.toFixed(4)),
                                loss_pieces:           parseFloat(emp.loss_pieces.toFixed(4)),

                                // Empty maps — summary report does not use per-bag/category breakdowns
                                unique_categories_array: [],
                                category_bag_names_map: {}, category_bag_ids_map: {},
                                category_bag_print_design_map: {}, category_bag_print_design_id_map: {},
                                category_bag_sub_category_map: {}, category_bag_category_id_map: {},
                                category_bag_sub_category_id_map: {}, category_bag_count_map: {},
                                category_print_design_map: {}, category_print_design_id_map: {},
                                categories: []
                            }));

                            // Finalise department fields
                            dept.bag_count        = dept.unique_bags.size;
                            dept.unique_bags_array = Array.from(dept.unique_bags);

                            dept.issued_net_wt_gold    = parseFloat(dept.issued_net_wt_gold.toFixed(4));
                            dept.received_qty_gold     = parseFloat(dept.received_qty_gold.toFixed(4));
                            dept.gross_loss_gold       = parseFloat(dept.gross_loss_gold.toFixed(4));
                            dept.pure_weight_gold      = parseFloat(dept.pure_weight_gold.toFixed(4));
                            dept.pure_loss_gold        = parseFloat(dept.pure_loss_gold.toFixed(4));
                            dept.net_loss_gold         = dept.received_qty_gold > 0
                                                            ? parseFloat((dept.gross_loss_gold / dept.received_qty_gold).toFixed(6))
                                                            : 0;
                            dept.issued_net_wt_diamond = parseFloat(dept.issued_net_wt_diamond.toFixed(4));
                            dept.received_qty_diamond  = parseFloat(dept.received_qty_diamond.toFixed(4));
                            dept.loss_qty_diamond      = parseFloat(dept.loss_qty_diamond.toFixed(4));
                            dept.received_pieces       = parseFloat(dept.received_pieces.toFixed(4));
                            dept.loss_pieces           = parseFloat(dept.loss_pieces.toFixed(4));

                            // Wax-tree placeholders (may be overwritten below)
                            dept.wax_tree_actual_production_gold = 0;
                            dept.wax_tree_loss_gold              = 0;
                            dept.wax_tree_received_qty_gold      = 0;

                            delete dept.unique_bags;
                            delete dept.employees;
                        });

                        groupedData[locationId].total_unique_bags = globalBagSet.size;
                    });

                    // ── Wax Tree (Overall & Production only) ─────────────────────────────────────
                    if (includeWaxTree) {
                        try {
                            const waxTreeQuery = `
                                SELECT
                                    SUM(CASE WHEN custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_final_tree_weight, 0) ELSE 0 END)   AS casting_qty,
                                    SUM(CASE WHEN custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_casting_loss, 0) ELSE 0 END)        AS casting_loss,
                                    SUM(CASE WHEN custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_metal_issue_weight, 0) ELSE 0 END)  AS casting_received_qty,
                                    SUM(CASE WHEN custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_received_yield_weight, 0) ELSE 0 END) AS tree_cutting_qty,
                                    SUM(CASE WHEN custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_cutting_loss_weight, 0) ELSE 0 END)  AS tree_cutting_loss,
                                    SUM(CASE WHEN custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_final_tree_weight - custrecord_jj_tree_weight
                                                - custrecord_jj_bag_components_wt, 0) ELSE 0 END) AS tree_cutting_received_qty,
                                    SUM(CASE WHEN custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_received_weight, 0) ELSE 0 END)      AS grinding_qty,
                                    SUM(CASE WHEN custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_loss_weight, 0) ELSE 0 END)           AS grinding_loss,
                                    SUM(CASE WHEN custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                            AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD')
                                        THEN NVL(custrecord_jj_received_yield_weight
                                                - custrecord_jj_bag_components_wt, 0) ELSE 0 END)  AS grinding_received_qty
                                FROM customrecord_jj_wax_tree
                                WHERE isinactive = 'F'
                                AND (
                                        (custrecord_jj_to_cutting_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                        AND custrecord_jj_to_cutting_date <= TO_DATE('${endDate}', 'YYYY-MM-DD'))
                                    OR (custrecord_jj_to_grinding_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                        AND custrecord_jj_to_grinding_date <= TO_DATE('${endDate}', 'YYYY-MM-DD'))
                                    OR (custrecord_jj_to_bagging_date >= TO_DATE('${startDate}', 'YYYY-MM-DD')
                                        AND custrecord_jj_to_bagging_date <= TO_DATE('${endDate}', 'YYYY-MM-DD'))
                                    )
                            `;

                            const waxResults = query.runSuiteQL({ query: waxTreeQuery }).asMappedResults();
                            if (waxResults && waxResults.length > 0) {
                                const row = waxResults[0];
                                const waxDeptMap = {
                                    [CASTING]: {
                                        production: parseFloat(row.casting_qty          || 0),
                                        loss:       parseFloat(row.casting_loss          || 0),
                                        received:   parseFloat(row.casting_received_qty  || 0)
                                    },
                                    [TREE_CUTTING_CLEANING]: {
                                        production: parseFloat(row.tree_cutting_qty          || 0),
                                        loss:       parseFloat(row.tree_cutting_loss          || 0),
                                        received:   parseFloat(row.tree_cutting_received_qty  || 0)
                                    },
                                    [GRINDING]: {
                                        production: parseFloat(row.grinding_qty          || 0),
                                        loss:       parseFloat(row.grinding_loss          || 0),
                                        received:   parseFloat(row.grinding_received_qty  || 0)
                                    }
                                };

                                Object.keys(waxDeptMap).forEach(deptId => {
                                    Object.keys(groupedData).forEach(locId => {
                                        const deptObj = groupedData[locId].departments[String(deptId)];
                                        if (!deptObj) return;

                                        deptObj.wax_tree_actual_production_gold = waxDeptMap[deptId].production;
                                        deptObj.wax_tree_loss_gold              = waxDeptMap[deptId].loss;
                                        deptObj.wax_tree_received_qty_gold      = waxDeptMap[deptId].received;

                                        // Override the DIR-derived gold values with Wax Tree actuals
                                        // for Casting / Tree Cutting & Cleaning / Grinding
                                        deptObj.received_qty_gold = waxDeptMap[deptId].production;
                                        deptObj.gross_loss_gold   = waxDeptMap[deptId].loss;
                                        deptObj.net_loss_gold     = deptObj.received_qty_gold > 0
                                            ? parseFloat((deptObj.gross_loss_gold / deptObj.received_qty_gold).toFixed(6))
                                            : 0;
                                    });
                                });
                            }
                        } catch (waxErr) {
                            log.error(logPrefix + ' - Wax Tree Error', waxErr);
                        }
                    }

                    log.debug(logPrefix + ' - Complete', Object.keys(groupedData).length + ' location(s)');
                    
                    // ── Format and log summary data for debugging ────────────────────────────────
                    try {
                        const summaryLog = [];
                        Object.keys(groupedData).forEach(locId => {
                            const location = groupedData[locId];
                            summaryLog.push(`\n📍 LOCATION: ${location.location_name} (Total Unique Bags: ${location.total_unique_bags})`);
                            
                            Object.keys(location.departments).forEach(deptId => {
                                const dept = location.departments[deptId];
                                summaryLog.push(`\n  🏭 DEPARTMENT: ${dept.department_name}`);
                                summaryLog.push(`     ├─ Bags: ${dept.bag_count}`);
                                summaryLog.push(`     ├─ Gold Metrics:`);
                                summaryLog.push(`     │  ├─ Issued Net Wt (Gold): ${parseFloat(dept.issued_net_wt_gold.toFixed(4))}`);
                                summaryLog.push(`     │  ├─ Received Qty (Gold): ${parseFloat(dept.received_qty_gold.toFixed(4))}`);
                                summaryLog.push(`     │  ├─ Gross Loss (Gold): ${parseFloat(dept.gross_loss_gold.toFixed(4))}`);
                                summaryLog.push(`     │  ├─ Pure Weight (Gold): ${parseFloat(dept.pure_weight_gold.toFixed(4))}`);
                                summaryLog.push(`     │  ├─ Pure Loss (Gold): ${parseFloat(dept.pure_loss_gold.toFixed(4))}`);
                                summaryLog.push(`     │  └─ Net Loss (Gold): ${parseFloat(dept.net_loss_gold.toFixed(6))}`);
                                summaryLog.push(`     └─ Diamond Metrics:`);
                                summaryLog.push(`        ├─ Issued Net Wt (Diamond): ${parseFloat(dept.issued_net_wt_diamond.toFixed(4))}`);
                                summaryLog.push(`        ├─ Received Qty (Diamond): ${parseFloat(dept.received_qty_diamond.toFixed(4))}`);
                                summaryLog.push(`        ├─ Loss Qty (Diamond): ${parseFloat(dept.loss_qty_diamond.toFixed(4))}`);
                                summaryLog.push(`        ├─ Received Pieces: ${parseFloat(dept.received_pieces.toFixed(4))}`);
                                summaryLog.push(`        └─ Loss Pieces: ${parseFloat(dept.loss_pieces.toFixed(4))}`);
                                
                                // Log employees if they exist
                                if (dept.employees_array && dept.employees_array.length > 0) {
                                    summaryLog.push(`\n     👥 EMPLOYEES (${dept.employees_array.length}):`);
                                    dept.employees_array.forEach((emp, idx) => {
                                        const isLast = idx === dept.employees_array.length - 1;
                                        summaryLog.push(`     ${isLast ? '└' : '├'}─ ${emp.name} (Bags: ${emp.bag_count})`);
                                        summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Issued Net Wt: ${parseFloat(emp.issued_net_wt_gold.toFixed(4))}`);
                                        summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Received Qty: ${parseFloat(emp.received_qty_gold.toFixed(4))}`);
                                        summaryLog.push(`        ${isLast ? ' ' : '│'}  └─ Loss Qty: ${parseFloat(emp.gross_loss_gold.toFixed(4))}`);
                                    });
                                }
                            });
                        });
                        log.debug(logPrefix + ' - Summary Data' , summaryLog.join('\n'));
                    } catch (logErr) {
                        log.error(logPrefix + ' - Logging Error', logErr);
                    }
                    
                    return groupedData;

                } catch (error) {
                    log.error(logPrefix + ' - Error', error);
                    return {};
                }
            },
            
             
            // ─────────────────────────────────────────────────────────────────────────────
            // PUBLIC WRAPPERS — one per report type
            // ─────────────────────────────────────────────────────────────────────────────
             
            /**
             * Summary totals for ALL operations (production + repair, no filter).
             * Mirrors getSummaryProductionEfficiencyData but without the repair-order
             * filter, and includes Wax Tree data for Casting / Tree Cutting / Grinding.
             *
             * @param {string|null} location
             * @param {string}      startDate  'YYYY-MM-DD'
             * @param {string}      endDate    'YYYY-MM-DD'
             * @returns {Object}
             */
            getSummaryOverallEfficiencyData(location, startDate, endDate) {
                return this.buildSummaryEfficiencyData(location, startDate, endDate, {
                    repairOrderFilter: null,   // Overall: no repair-order filter (all operations)
                    includeWaxTree:    true,   // Overall: includes Wax Tree data
                    logPrefix:         'getSummaryOverallEfficiencyData'
                });
            },
             
            /**
             * Summary totals for PRODUCTION (non-repair) operations only.
             * Includes Wax Tree data for Casting / Tree Cutting / Grinding.
             *
             * @param {string|null} location
             * @param {string}      startDate  'YYYY-MM-DD'
             * @param {string}      endDate    'YYYY-MM-DD'
             * @returns {Object}
             */
            getSummaryProductionEfficiencyData(location, startDate, endDate) {
                return this.buildSummaryEfficiencyData(location, startDate, endDate, {
                    repairOrderFilter: 'F',    // Production: non-repair operations only
                    includeWaxTree:    true,   // Production: includes Wax Tree data
                    logPrefix:         'getSummaryProductionEfficiencyData'
                });
            },
             
            /**
             * Summary totals for REPAIR operations only.
             * Wax Tree data is NOT applicable to repair orders and is excluded.
             *
             * @param {string|null} location
             * @param {string}      startDate  'YYYY-MM-DD'
             * @param {string}      endDate    'YYYY-MM-DD'
             * @returns {Object}
             */
            getSummaryRepairEfficiencyData(location, startDate, endDate) {
                return this.buildSummaryEfficiencyData(location, startDate, endDate, {
                    repairOrderFilter: 'T',    // Repair: repair operations only
                    includeWaxTree:    false,  // Repair: Wax Tree not applicable
                    logPrefix:         'getSummaryRepairEfficiencyData'
                });
            },

            /**********************************************************************************************************************/

            /**
             * Batch method to get average recovery percentage by department for a date range.
             * This is used to populate the recovery efficiency analysis report without needing to fetch each transaction's employee-wise recovery records individually.
             * @param {string} startDate in 'YYYY-MM-DD' format
             * @param {string} endDate in 'YYYY-MM-DD' format
             * @param {Array} departmentNames array of department names to include in the report
             * @return {Object} { status: 'SUCCESS'|'ERROR', reason: string, data: { recoveryMap: { [deptName]: avgRecoveryPercentage } } }
             */
            getAvgRecoveryPercentageBatch(startDate, endDate, departmentNames) {
                try {
                    if (!startDate || !endDate || !departmentNames.length) {
                        return {
                            status: 'SUCCESS',
                            reason: 'Missing params',
                            data: { recoveryMap: {}, departmentRecoveryMap: {}, employeeRecoveryMap: {}, recoveryDates: [] }
                        };
                    }

                    // ── Step 1: Fetch all raw rows (dept, employee, date, dept%, emp%) ──────
                    const empRecSearch = search.create({
                        type: "customrecord_jj_employee_wise_recovery",
                        filters: [
                            ["custrecord_jj_emp_recovery_loss_tran.custbody_jj_loss_transferred", "is", "T"],
                            "AND",
                            ["custrecord_jj_emp_recovery_loss_tran.mainline", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_emp_recovery_department", summary: "GROUP", label: "department_name" }),
                            search.createColumn({ name: "custrecord_jj_emp_recovery_employee", summary: "GROUP", label: "employee_name" }),
                            search.createColumn({ name: "datecreated", join: "CUSTRECORD_JJ_EMP_RECOVERY_LOSS_TRAN", summary: "GROUP", label: "tran_date" }),
                            search.createColumn({ name: "custrecord_jj_emp_rec_dept_recovery_perc", summary: "AVG", label: "dept_recovery_pct" }),
                            search.createColumn({ name: "custrecord_jj_emp_recovery_percentage", summary: "AVG", label: "emp_recovery_pct" })
                        ]
                    });

                    const allRows = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: empRecSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(empRecSearch, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 3000
                    });

                    // ── Step 2: Parse rows, collect all unique dates ───────────────────────
                    const deptNameSet = new Set(departmentNames);
                    const allDatesSet = new Set();

                    // parsed rows: [ { deptName, empName, date, deptPct, empPct } ]
                    const parsed = [];

                    allRows.forEach(function (r) {
                        let deptRaw = r['department_name'];
                        let deptName = (deptRaw && typeof deptRaw === 'object')
                            ? (deptRaw.text || deptRaw.value || '') : (deptRaw || '');
                        deptName = deptName.trim();

                        let empRaw = r['employee_name'];
                        let empName = (empRaw && typeof empRaw === 'object')
                            ? (empRaw.text || empRaw.value || '') : (empRaw || '');
                        empName = empName.trim();

                        let tranDateRaw = r['tran_date'];
                        let tranDate = (tranDateRaw && typeof tranDateRaw === 'object')
                            ? (tranDateRaw.value || tranDateRaw.text || '') : (tranDateRaw || '');
                        tranDate = tranDate.trim();

                        let deptPct = parseFloat(
                            (r['dept_recovery_pct'] && typeof r['dept_recovery_pct'] === 'object')
                                ? r['dept_recovery_pct'].value : r['dept_recovery_pct']
                        ) || 0;

                        let empPct = parseFloat(
                            (r['emp_recovery_pct'] && typeof r['emp_recovery_pct'] === 'object')
                                ? r['emp_recovery_pct'].value : r['emp_recovery_pct']
                        ) || 0;

                        // In allRows.forEach — normalize tranDate immediately after extracting:
                        tranDate = (tranDateRaw && typeof tranDateRaw === 'object')
                            ? (tranDateRaw.value || tranDateRaw.text || '') : (tranDateRaw || '');
                        tranDate = tranDate.trim();

                        // NORMALIZE to YYYY-MM-DD (strip time, unify format)
                        let parsedTranDate = parseYMD(tranDate);
                        tranDate = (parsedTranDate && !isNaN(parsedTranDate.getTime())) ? toYMD(parsedTranDate) : '';

                        if (!deptName || !tranDate) return;

                        if (tranDate) allDatesSet.add(tranDate);
                        parsed.push({ deptName: deptName, empName: empName, date: tranDate, deptPct: deptPct, empPct: empPct });
                    });

                    // ── Step 3: Build recovery periods from ALL unique dates ───────────────
                    // Sort all unique dates
                    function parseYMD(s) {
                        if (!s) return null;
                        // Handle "26-Apr-2026 1:56 pm" → just parse date part, ignore time
                        let datePart = s.split(' ')[0]; // "26-Apr-2026"

                        if (datePart.indexOf('-') !== -1) {
                            let parts = datePart.split('-');
                            if (parts.length === 3) {
                                // Could be DD-Mon-YYYY (26-Apr-2026) or YYYY-MM-DD
                                if (isNaN(parseInt(parts[1]))) {
                                    // DD-Mon-YYYY
                                    const months = {
                                        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                                        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
                                    };
                                    return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
                                } else if (parts[0].length === 4) {
                                    // YYYY-MM-DD
                                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                }
                            }
                        }
                        if (s.indexOf('/') !== -1) {
                            // MM/DD/YYYY
                            let parts2 = s.split('/');
                            return new Date(parseInt(parts2[2]), parseInt(parts2[0]) - 1, parseInt(parts2[1]));
                        }
                        // Fallback
                        return new Date(s);
                    }

                    function toYMD(d) {
                        return d.getFullYear() + '-' +
                            String(d.getMonth() + 1).padStart(2, '0') + '-' +
                            String(d.getDate()).padStart(2, '0');
                    }

                    // Sort unique dates ascending
                    let allDates = Array.from(allDatesSet).sort(function (a, b) {
                        let da = parseYMD(a), db = parseYMD(b);
                        return da - db;
                    });

                    // Build period for each recovery date
                    // period[0]: 1900-01-01 → allDates[0]
                    // period[i]: allDates[i-1]+1 → allDates[i]
                    let periods = allDates.map(function (dateStr, idx) {
                        let periodEnd = parseYMD(dateStr);
                        let periodStart;
                        if (idx === 0) {
                            periodStart = new Date('1900-01-01');
                        } else {
                            periodStart = new Date(parseYMD(allDates[idx - 1]));
                            periodStart.setDate(periodStart.getDate() + 1);
                        }
                        return {
                            periodStart: toYMD(periodStart),
                            periodEnd: toYMD(periodEnd),
                            date: dateStr
                        };
                    });


                    // ── Step 4: Select recovery dates by business rule ────────────────────────
                    // Rule: For each day in [startDate, endDate], find the next nearest recovery date on/after it
                    // Collect all unique recovery dates found
                    // This way, if the range spans multiple recovery periods, we get all applicable recovery dates
                    // Example: April 25-27 → April 25 maps to April 26, April 27 maps to May 17 → use average of both

                    let endTs = parseYMD(endDate).getTime();
                    let startTs = parseYMD(startDate).getTime();

                    // For each day in range, find the next nearest recovery date on/after it
                    let recoveryDatesForRange = new Set();

                    let currentDate = new Date(parseYMD(startDate));
                    while (currentDate.getTime() <= endTs) {
                        let currentYMD = toYMD(currentDate);
                        let currentTs = currentDate.getTime();

                        // Find first recovery date >= currentDate
                        let foundRecoveryDate = null;
                        for (let i = 0; i < allDates.length; i++) {
                            let dateTs = parseYMD(allDates[i]).getTime();
                            if (dateTs >= currentTs)
                            {
                                foundRecoveryDate = allDates[i];
                                break;
                            }
                        }

                        if (foundRecoveryDate) {
                            recoveryDatesForRange.add(foundRecoveryDate);
                            // Jump to day after this recovery date to avoid redundant checks
                            let nextDate = new Date(parseYMD(foundRecoveryDate));
                            nextDate.setDate(nextDate.getDate() + 1);
                            currentDate = nextDate;
                        } else {
                            // No recovery date found, move to next day
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    }

                    let selectedDates = Array.from(recoveryDatesForRange).sort(function (a, b) {
                        return parseYMD(a).getTime() - parseYMD(b).getTime();
                    });

                    let selectedDatesSet = new Set(selectedDates);

                    // ── Step 5: Filter parsed rows to selected dates, compute averages ─────
                    let filteredRows = parsed.filter(function (r) {
                        return selectedDatesSet.has(r.date) && deptNameSet.has(r.deptName);
                    });

                    // Department recovery: avg dept_recovery_pct per dept (across selected dates)
                    // Use dept-level rows — since dept% same for all emps in same dept+date, just collect unique dept+date rows
                    let deptDateSeen = {};   // key: deptName|date → true (avoid double-counting if multiple emp rows per dept+date)
                    let deptPctAccum = {};   // deptName → [ deptPct values, one per selected date ]

                    filteredRows.forEach(function (r) {
                        let key = r.deptName + '|' + r.date;
                        if (!deptDateSeen[key]) {
                            deptDateSeen[key] = true;
                            if (!deptPctAccum[r.deptName]) deptPctAccum[r.deptName] = [];
                            deptPctAccum[r.deptName].push(r.deptPct);
                        }
                    });

                    let departmentRecoveryMap = {};
                    let recoveryMap = {};
                    departmentNames.forEach(function (name) {
                        departmentRecoveryMap[name] = 0;
                        recoveryMap[name] = 0;
                    });

                    Object.keys(deptPctAccum).forEach(function (deptName) {
                        let vals = deptPctAccum[deptName];
                        let avg = parseFloat((vals.reduce(function (s, v) { return s + v; }, 0) / vals.length).toFixed(4));
                        departmentRecoveryMap[deptName] = avg;
                        recoveryMap[deptName] = avg;
                    });

                    // Employee recovery: avg emp_recovery_pct per dept → employee
                    // employeeRecoveryMap[deptName][empName] = avg emp pct across selected dates
                    let empPctAccum = {}; // deptName → { empName → [ empPct values ] }

                    filteredRows.forEach(function (r) {
                        if (!r.empName) return;
                        if (!empPctAccum[r.deptName]) empPctAccum[r.deptName] = {};
                        if (!empPctAccum[r.deptName][r.empName]) empPctAccum[r.deptName][r.empName] = [];
                        empPctAccum[r.deptName][r.empName].push(r.empPct);
                    });

                    let employeeRecoveryMap = {};
                    Object.keys(empPctAccum).forEach(function (deptName) {
                        employeeRecoveryMap[deptName] = {};
                        Object.keys(empPctAccum[deptName]).forEach(function (empName) {
                            let vals = empPctAccum[deptName][empName];
                            let avg = parseFloat((vals.reduce(function (s, v) { return s + v; }, 0) / vals.length).toFixed(4));
                            employeeRecoveryMap[deptName][empName] = avg;
                        });
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Batch recovery data retrieved',
                        data: {
                            recoveryMap: recoveryMap,
                            departmentRecoveryMap: departmentRecoveryMap,
                            employeeRecoveryMap: employeeRecoveryMap,
                            recoveryDates: selectedDates
                        }
                    };

                } catch (error) {
                    log.error('getAvgRecoveryPercentageBatch error', error);
                    return {
                        status: 'ERROR',
                        reason: error.message,
                        data: { recoveryMap: {}, departmentRecoveryMap: {}, employeeRecoveryMap: {}, recoveryDates: [] }
                    };
                }
            },
        };

        return {
            searchResults: efficiencyAnalysisResults,
            // Old functions (kept for other features)
            buildEfficiencyData: efficiencyAnalysisResults.buildEfficiencyData.bind(efficiencyAnalysisResults),
            getOverallEfficiencyData: efficiencyAnalysisResults.getOverallEfficiencyData.bind(efficiencyAnalysisResults),
            getProductionEfficiencyData: efficiencyAnalysisResults.getProductionEfficiencyData.bind(efficiencyAnalysisResults),
            getRepairEfficiencyData: efficiencyAnalysisResults.getRepairEfficiencyData.bind(efficiencyAnalysisResults),
            // New Summary functions (optimized for API)
            buildSummaryEfficiencyData: efficiencyAnalysisResults.buildSummaryEfficiencyData.bind(efficiencyAnalysisResults),
            getSummaryOverallEfficiencyData: efficiencyAnalysisResults.getSummaryOverallEfficiencyData.bind(efficiencyAnalysisResults),
            getSummaryProductionEfficiencyData: efficiencyAnalysisResults.getSummaryProductionEfficiencyData.bind(efficiencyAnalysisResults),
            getSummaryRepairEfficiencyData: efficiencyAnalysisResults.getSummaryRepairEfficiencyData.bind(efficiencyAnalysisResults),
            getAvgRecoveryPercentageBatch: efficiencyAnalysisResults.getAvgRecoveryPercentageBatch.bind(efficiencyAnalysisResults)
        };
    }
);
