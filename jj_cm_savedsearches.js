/**
 * @NApiVersion 2.1
 */
/************************************************************************************************
 * DEWIN-331 Bag Management Solution
 * **********************************************************************************************
 *
 * Author: Jobin & Jismi IT Services LLP
 *
 * Date Created : 05 - November - 2024
 *
 * Created By: Jobin & Jismi IT Services LLP
 *
 * Description :
 *
 * REVISION HISTORY
 * @version 1.0 created initial build by JJ0312
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
     * @param{runtime} runtime
     * @param{format} format
     * @param{file} file 
     * @param{jjUtil} jjUtil
     */

    (search, record, config, url, query, runtime, format, file, jjUtil, cache, task) => {
        const CACHE_FILE_ID = 131524; // Cache file ID
        const CACHE_KEY = 'item_list'; // Cache key
        const CACHE_NAME = 'item_cache'; // Cache name
        const DIAMOND_ID = 6;
        // const METAL_ARRAY_GOLD = [4609, 8410, 8411, 25093]; // [G18, G22, G994, G14] // SB Old
        // const METAL_ARRAY_GOLD = [28612, 22327, 22328, 22329]; // [G14, G18, G22, G994] // Old
        const METAL_ARRAY_GOLD = [53017, 53018, 53019, 53020]; // [G14, G18, G22, G994] // SB and PD
        // const BARCODING_AND_FG_DEPT_ID = 24;
        const PAGE_SIZE = 10; // Number of records per page
        const OPERATION_STATUS_IN_TRANSIT = 2;
        const OPERATION_STATUS_IN_PROGRESS = 1;

        const PROCESS_STATUS_READY_TO_PROCESS = 2;

        const MATERIAL_TYPE_ID_GOLD = 1;
        const MATERIAL_TYPE_ID_DIAMOND = 2;
        const MATERIAL_TYPE_ID_COLOR_STONE = 3;
        const MATERIAL_TYPE_ID_ALLOY = 6;
        const STOCK_ORDER_ID = 2;
        const REPAIR_ORDER_TYPE_ID = '3';
        const JOB_WORK_ORDER_TYPE_ID = '4';

        const FIRST_DEPARTMENT_ID = 1;
        const CASTING_DEPT_ID = 9;
        const CASTING = 9;
        const TREE_CUTTING_CLEANING = 10;
        const GRINDING = 12;
        // const PURE_GOLD_ARRAY = [53028]; // G999 (SB)
        const PURE_GOLD_ARRAY = [66072]; // G999 (PD)
        const GOOD_STATUS_ID = 1;
        const PARTY_DIAMOND_QUALITY = 3;
        const GOLD_CLASS_IDS = [5, 22, 23, 24, 25]; // [Gold, Gold Bullion, Gold Findings, Gold Mountings, Gold Back Chain]
        const GOLD_SCRAP_ITEM_LOT_NAME = "Scrap_Gold";
        const JEWELRY_CLASS_ID = 10;
        const GOLD_AND_JEWELRY_CLASS_IDS = [...GOLD_CLASS_IDS, JEWELRY_CLASS_ID]; // Combined for SQL queries
        // const GOLD_SCRAP_ITEM_ID = [9321, 25090, 25091]; // Internal id of the item "Scrap" (SB Old)
        // const SCRAP_ITEM_PARENT_ID = 25092; // Parent internal id for scrap items (SB Old)
        const GOLD_SCRAP_ITEM_ID = [53435, 53436, 53437]; // Internal id of the item "Scrap" (SB and PD)
        const SCRAP_ITEM_PARENT_ID = 53434; // Parent internal id for scrap items (SB and PD)
        const CURRENCY_INR_ID = 1;
        const JEWELRY_TYPE_ID = 8;
        const CARATS_TO_GRAMS_CONST = 0.2;

        const DIAMOND_CLASSES_IDS = ['6'];
        const STONE_CLASSES_IDS = ['7'];
        const JEWELRY_CLASSES_IDS = ['10'];
        const ALLOY_CLASSES_IDS = ['8']; // added for alloy qty calculation
        const REASON_CODE_LOC_TRANSFER = "51";

        // const ALLOY_TYPE_ID = 6;
        // const ALLOY_ITEMS = [3206, 3207, 3208]; // [Alloy Pink (P), Alloy White (W), Alloy Yellow (Y)] (Old)
        const ALLOY_ITEMS = [53429, 53430, 53431]; // [Alloy Pink (P), Alloy White (W), Alloy Yellow (Y)] (SB and PD)

        // const GOLD_TYPE_ID = 1;

        // const LABOUR_OVERHEADS_CHARGE_ITEM_ID = 25718; // Labour Overheads Charge item record id (SB Old)
        // const NET_LOSS_CHARGE_ITEM_ID = 25719; // Net Loss Charge item record id (SB Old)
        // const FINDING_ITEM_SERVICE_ID = 26125; // Finding item service charge id (SB Old)
        // const LABOUR_OVERHEADS_CHARGE_ITEM_ID = 41074; // Labour Overheads Charge item record id (SB and PD)
        // const NET_LOSS_CHARGE_ITEM_ID = 41075; // Net Loss Charge item record id (SB and PD)
        // const FINDING_ITEM_SERVICE_ID = 41211; // Finding item service charge id (SB and PD)

        const CHARGE_TYPES = {
            LABOUR_OVERHEADS_CHARGE: 1,
            FINDING_ITEM_SERVICE: 2,
            NET_LOSS_CHARGE: 3
        };

        /**
         * @description searchResults
         */
        const searchResults = {
            /**
             * Function to get current user access details
             * @param {number} currentUserId - Current user id
             * @param {number} userRole - User role
             * @returns {Array} - Array of user access details
             */
            getUserAccessDetails(currentUserId, userRole) {
                try {
                    // log.debug("currentUserId, userRole", { currentUserId, userRole });
                    // Get user access details
                    let bagMovementConfigSearch = search.create({
                        type: "customrecord_jj_bag_movement_config",
                        filters: [
                            ["custrecord_jj_user", "anyof", currentUserId],
                            "AND", ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_user_role", "anyof", userRole]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_user", label: "user" }),
                            search.createColumn({ name: "custrecord_jj_user_role", label: "user_role" }),
                            search.createColumn({ name: "custrecord_jj_bag_management_processes", label: "manufacturing_process" }),
                            search.createColumn({ name: "custrecord_jj_summary_access", label: "summary_access" }),
                            search.createColumn({ name: "custrecord_jj_manufacturing_department", label: "department" }),
                            search.createColumn({ name: "custrecord_jj_bin_number", label: "bin_number" }),
                            search.createColumn({ name: "custrecord_jj_loss_bin_number", label: "loss_bin_number" }),
                            search.createColumn({ name: "custrecord_jj_loss_status", label: "loss_status" }),
                            search.createColumn({ name: "custrecord_jj_location", label: "locations" })
                        ]
                    });

                    let results = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: bagMovementConfigSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(bagMovementConfigSearch, 'label'),
                        PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
                        PAGE_SIZE: 1000 // Adjust page size if needed
                    });

                    results = results.map(result => {
                        if (result.locations?.value && result.locations?.text) {
                            const values = result.locations.value.split(',');
                            const texts = result.locations.text.split(',');
                            result.locations = values.map((value, index) => ({
                                value: value.trim(),
                                text: texts[index] ? texts[index].trim() : ''
                            }));
                        } else {
                            result.locations = [];
                        }
                        return result;
                    });
                    return results;
                } catch (e) {
                    log.error('error @ getUserAccessDetails', e.message);
                    return [];
                }
            },

            /**
             * Retrieves all the items from the system.
             * 
             * @param {Array/Number} bags - Array of bag IDs or a bag id.
             * @param {Array/Number} department - Array of department IDs or a department id.
             * @param {String} bagSearchKey - Bag search key.
             * @param {Number} pageIndex - Page index.
             * @returns {Array} - Array of item details
             */
            getBagsReadyToMove(bags, department, bagSearchKey, pageIndex, params, manufacturer, pageSize, operationId, locations) {
                try {
                    // log.debug('getBagsReadyToMove', { bags: bags, department: department, bagSearchKey: bagSearchKey, pageIndex: pageIndex, params: params, manufacturer: manufacturer, operationId: operationId, locations: locations });
                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_department.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagcore.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_exit", "isempty", ""],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_merge", "is", "F"],
                    ];
                    if (!params || params != "rejection") {
                        // log.debug("getBagsReadyToMove if !params || params != rejection");
                        filters.push(
                            "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"],
                            // "AND", ["custrecord_jj_oprtns_bagno", "anyof", bags]
                        );
                    }

                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_location", "anyof", locationArr],
                                "AND", ["custrecord_jj_oprtns_department.custrecord_jj_mandept_location", "anyof", locationArr]
                            );
                        }
                    }

                    // if (manufacturer) { // for bag movement in bag management processes
                    //     // log.debug("getBagsReadyToMove if manufacturer");
                    //     filters.push("AND", ["custrecord_jj_oprtns_department.custrecord_jj_mandept_hod", "anyof", manufacturer]);
                    // }

                    if (bags && bags.length > 0 && department) {
                        // log.debug("getBagsReadyToMove if bags && bags.length > 0 && department");
                        filters.push("AND", ["custrecord_jj_oprtns_bagno", "anyof", bags]);
                        filters.push("AND", ["custrecord_jj_oprtns_department", "anyof", department]);
                    } else if (bags && bags.length > 0) { // for list active bags for rejection
                        // log.debug("getBagsReadyToMove else if bags && bags.length > 0");
                        filters.push("AND", ["custrecord_jj_oprtns_bagno", "anyof", bags]);
                        filters.push(
                            "AND",
                            [
                                ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "F"],
                                "OR",
                                [
                                    ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "T"],
                                    "AND",
                                    ["custrecord_jj_oprtns_received", "is", "T"]
                                ]
                            ]
                        );
                    } else if (department && bagSearchKey) {
                        // log.debug("getBagsReadyToMove else if department && bagSearchKey");
                        filters.push("AND", ["custrecord_jj_oprtns_department", "anyof", department]);
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.idtext", "contains", bagSearchKey]);
                        filters.push(
                            "AND",
                            [
                                ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "F"],
                                "OR",
                                [
                                    ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "T"],
                                    "AND",
                                    ["custrecord_jj_oprtns_received", "is", "T"]
                                ]
                            ]
                        );
                    } else if (department && params == "bag_movement") {
                        // log.debug("getBagsReadyToMove else if department && params == 'bag_movement'");
                        filters.push("AND", ["custrecord_jj_oprtns_department", "anyof", department]);
                        filters.push(
                            "AND",
                            [
                                ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "F"],
                                "OR",
                                [
                                    ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "T"],
                                    "AND",
                                    ["custrecord_jj_oprtns_received", "is", "T"]
                                ]
                            ]
                        );
                    } else if (department) {
                        // log.debug("getBagsReadyToMove else if department");
                        filters.push("AND", ["custrecord_jj_oprtns_department", "anyof", department]);
                        filters.push("AND", ["custrecord_jj_oprtns_load_created", "is", "F"]);
                    } else if (bagSearchKey) {
                        // log.debug("getBagsReadyToMove else if bagSearchKey");
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.idtext", "contains", bagSearchKey]);
                        filters.push(
                            "AND",
                            [
                                ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "F"],
                                "OR",
                                [
                                    ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "T"],
                                    "AND",
                                    ["custrecord_jj_oprtns_received", "is", "T"]
                                ]
                            ]
                        );
                    } else if (operationId) {
                        filters.push("AND", ["internalid", "anyof", operationId]);
                        filters.push("AND", ["custrecord_jj_oprtns_received", "is", "F"]);
                    }
                    else {
                        // log.debug("getBagsReadyToMove else");
                        // filters.push("AND", ["custrecord_jj_oprtns_qa_completed", "is", "T"]);
                        filters.push(
                            "AND",
                            [
                                ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "F"],
                                "OR",
                                [
                                    ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "T"],
                                    "AND",
                                    ["custrecord_jj_oprtns_received", "is", "T"]
                                ]
                            ]
                        );
                    }

                    let operationsSearchObj = search.create({
                        type: "customrecord_jj_operations",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", label: "operation_id" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagcore", label: "bag_core_tracking" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagno", sort: search.Sort.DESC, label: "bag_no" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_department", label: "department" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_status", label: "status" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_employee", label: "employee" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "quantity_per_bag" }),
                            search.createColumn({ name: "custrecord_jj_mandept_hod", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "hod" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "order_no" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "style_no" }),
                            // search.createColumn({ name: "altname", join: "CUSTRECORD_JJ_OPRTNS_EMPLOYEE", label: "employee_altname" }),
                            search.createColumn({ name: "entityid", join: "CUSTRECORD_JJ_OPRTNS_EMPLOYEE", label: "employee_altname" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "category" }),
                            // search.createColumn({ name: "custbody_jj_wo_ring_size", join: "CUSTRECORD_JJ_OPRTNS_WO", label: "ring_size" }),
                            search.createColumn({ name: "custrecord_jj_ring_size", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "ring_size" }),

                            search.createColumn({ name: "custrecord_jj_mandept_outsourcing_fab", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_outsourcing_fab" }),
                            search.createColumn({ name: "custrecord_jj_mandept_vendor", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "outsourcing_vendor" }),
                            search.createColumn({ name: "custrecord_jj_mandept_accounting_outward", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_accounting_outward" }),
                            search.createColumn({ name: "custrecord_jj_mandept_accounting_inward", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_accounting_inward" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_vendor", label: "vendor_id" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer_name" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_to_dept", join: "CUSTRECORD_JJ_RELATED_BAG_MOVEMENT", label: "to_department" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "order_type" }),
                            search.createColumn({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "serial_repair" }),
                            search.createColumn({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "serial_repair_wt" }),
                        ]
                    });
                    if (!pageIndex) {
                        return jjUtil.dataSets.iterateSavedSearch({
                            searchObj: operationsSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(operationsSearchObj, 'label'),
                            PAGE_INDEX: null,
                            PAGE_SIZE: 1000,
                        });
                    }
                    else {
                        let totalRecords = operationsSearchObj.runPaged().count;
                        // log.debug("totalItems", totalRecords);
                        // let allResults = jjUtil.dataSets.iterateSavedSearch({
                        let paginatedResults = jjUtil.dataSets.iterateSavedSearch({
                            searchObj: operationsSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(operationsSearchObj, 'label'),
                            PAGE_INDEX: pageIndex,
                            PAGE_SIZE: pageSize || PAGE_SIZE
                        });

                        // Calculate pagination
                        // let totalRecords = allResults.length;
                        // log.debug("totalRecords", totalRecords);
                        // let totalPages = Math.ceil(totalRecords / PAGE_SIZE);
                        // log.debug("totalPages", totalPages);
                        // log.debug("currentPageIndex", pageIndex);
                        // let START_INDEX = (pageIndex - 1 || 0) * PAGE_SIZE;
                        // let END_INDEX = START_INDEX + PAGE_SIZE;
                        // log.debug("START_INDEX", START_INDEX);
                        // log.debug("END_INDEX", END_INDEX);

                        // // Slice results for the current page
                        // let paginatedResults = allResults.slice(START_INDEX, END_INDEX);
                        log.debug("paginatedResults", paginatedResults);

                        // return paginatedResults;

                        // log.debug("currentPageIndex", {
                        //     "currentPageIndex": pageIndex,
                        //     "totalPages": totalPages,
                        //     "totalItems": totalRecords
                        // });

                        return {
                            "currentPageIndex": paginatedResults?.pageInfo?.pageIndex || 0,
                            "totalPages": paginatedResults?.pageInfo?.pageLength || 0,
                            "bagList": paginatedResults?.lines || [],
                            "totalItems": totalRecords
                        }
                    }

                } catch (error) {
                    log.error('getBagsReadyToMove', error);
                    return [];
                }
            },

            getEmployees(isHod, allEmployees) {
                try {
                    let filters = [["isinactive", "is", "F"]];
                    if (isHod) {
                        filters.push("AND", ["custentity_jj_head_of_department", "is", "T"]);
                    } else if (!allEmployees) {
                        filters.push("AND", ["custentity_jj_head_of_department", "is", "F"]);
                    }
                    let employeeSearchObj = search.create({
                        type: "employee",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", label: "internal_id" }),
                            // search.createColumn({ name: "altname", label: "name" }),
                            search.createColumn({ name: "entityid", label: "name" }),
                            search.createColumn({ name: "firstname", label: "first_name" }),
                            search.createColumn({ name: "middlename", label: "middle_name" }),
                            search.createColumn({ name: "lastname", label: "last_name" })
                        ]
                    });

                    let searchResult = [];
                    employeeSearchObj.run().each(function (result) {
                        let name = result.getValue('altname');
                        if (!name) {
                            name = result.getValue('firstname');
                            if (result.getValue('middlename')) {
                                name += ' ' + result.getValue('middlename');
                            }
                            name += ' ' + result.getValue('lastname');
                        }
                        searchResult.push({
                            value: result.getValue('internalid'),
                            name: name
                        });
                        return true;
                    });

                    return searchResult;

                    // return jjUtil.dataSets.iterateSavedSearch({
                    //     searchObj: employeeSearchObj,
                    //     columns: jjUtil.dataSets.fetchSavedSearchColumn(employeeSearchObj, 'label'),
                    //     PAGE_INDEX: null,
                    //     PAGE_SIZE: 1000,
                    // });
                } catch (error) {
                    log.error('getEmployees', error);
                    return [];
                }
            },

            getAllManufacturingDepartments(departmentIds, params, allDepartments, userId, locations) {
                try {
                    // log.debug("getAllManufacturingDepartments", { departmentIds, params, allDepartments, userId, locations });
                    let filters = [["isinactive", "is", "F"], "AND", ["custrecord_jj_mandept_hod.isinactive", "is", "F"]];
                    let columns = [
                        search.createColumn({ name: "internalid", sort: search.Sort.ASC, label: "internal_id" }),
                        search.createColumn({ name: "name", label: "name" })
                    ];

                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_mandept_location", "anyof", locationArr]);
                        }
                    }

                    if (["dept_hod", "user_specific_dept_hod", "user_specific", "location_transfer", "loss_recovery", "bulk_move"].includes(params)) {
                        columns.push("custrecord_jj_mandept_employees");
                    }

                    // if (!allDepartments &&
                    //     userId &&
                    //     (
                    //         params == "user_specific" ||
                    //         // params == "location_transfer" ||
                    //         params == "loss_recovery" ||
                    //         params == "user_specific_dept_hod" ||
                    //         params == "bulk_move"
                    //     )
                    // ) {
                    //     filters.push("AND", ["custrecord_jj_mandept_hod", "anyof", userId]);
                    // }

                    if (params && params == "Casting") {
                        // filters.push("AND", ["internalid", "anyof", departmentIds]);
                        filters.push("AND", ["custrecord_jj_mandept_has_bulk_movement", "is", 'T'],
                            "AND", ["custrecord_jj_mandept_has_bulk_acknowled", "is", 'F']);
                        columns.push("custrecord_jj_mandept_hod");
                    } else if (params && params == "build_dept") {
                        filters.push("AND", ["custrecord_jj_mandept_is_build_dept", "is", 'T']);
                        columns.push(
                            'custrecord_jj_mandept_bin_no',
                            'custrecord_jj_mandept_wip_status',
                            'custrecord_jj_mandept_location',
                            'custrecord_jj_mandept_label_pend_status'
                        );
                    } else if (params && params == "bulk_move") {
                        filters.push("AND", [["custrecord_jj_mandept_has_bulk_movement", "is", 'T'],
                            "OR", ["custrecord_jj_mandept_has_bulk_acknowled", "is", 'T']]);
                        columns.push(
                            "custrecord_jj_mandept_hod",
                            "custrecord_jj_mandept_has_bulk_movement",
                            "custrecord_jj_mandept_has_bulk_acknowled",
                            "custrecord_jj_mandept_next_department"
                        );
                    } else if (params && (params == "dept_hod" || params == "user_specific_dept_hod")) {
                        filters.push("AND", [
                            ["custrecord_jj_mandept_is_build_dept", "is", "T"],
                            "OR", ["custrecord_jj_mandept_is_outward_dept", "is", "F"],
                        ]);
                        columns.push(
                            "custrecord_jj_mandept_hod",
                            "custrecord_jj_mandept_has_bulk_movement",
                            "custrecord_jj_mandept_has_bulk_acknowled",
                            "custrecord_jj_mandept_is_build_dept",
                            "custrecord_jj_mandept_is_outward_dept",
                            "custrecord_jj_mandept_outsourcing_fab",
                            "custrecord_jj_mandept_accounting_outward",
                            "custrecord_jj_mandept_accounting_inward",
                            "custrecord_jj_mandept_vendor",
                        );
                    } else if (params && params == "location_transfer") {
                        filters.push("AND", [
                            ["custrecord_jj_mandept_is_build_dept", "is", "T"],
                            "OR", ["custrecord_jj_mandept_is_outward_dept", "is", "T"],
                        ]);
                        columns.push(
                            "internalid",
                            "custrecord_jj_mandept_bin_no",
                            "custrecord_jj_mandept_location",
                            "custrecord_jj_mandept_is_build_dept",
                            "custrecord_jj_mandept_is_outward_dept",
                            "custrecord_jj_mandept_is_final_outw_dept",
                        );
                    } else if (params && params == "loss_recovery") {
                        filters.push("AND", ["custrecord_jj_mandept_recovery_possible", "is", "T"]);
                    } else if (params && params == "bag_gen") {
                        filters.push(
                            "AND", ["custrecord_jj_mandept_is_outward_dept", "is", "F"],
                            "AND", ["custrecord_jj_mandept_has_bulk_movement", "is", "F"],
                            "AND", ["custrecord_jj_mandept_outsourcing_fab", "is", "F"],
                            "AND", ["custrecord_jj_mandept_accounting_outward", "is", "F"],
                            "AND", ["custrecord_jj_mandept_accounting_inward", "is", "F"],

                        );
                    } else if (params && params == "bulk_move_back_end") {
                        // filters.push("AND", ["internalid", "anyof", departmentIds]);
                        columns.push(
                            "internalid",
                            "custrecord_jj_mandept_hod",
                            "custrecord_jj_mandept_bin_no",
                            "custrecord_jj_mandept_location",
                            "custrecord_jj_mandept_good_status",
                            "custrecord_jj_mandept_loss_status",
                            "custrecord_jj_mandept_loss_record_bin",
                            "custrecord_jj_mandept_wip_status",
                            "custrecord_jj_mandept_wt_status",
                            "custrecord_jj_mandept_repair_stock",
                            "custrecord_jj_mandept_next_department",
                            "custrecord_jj_mandept_has_bulk_movement",
                            "custrecord_jj_mandept_has_bulk_acknowled",
                        );
                    } else if (departmentIds && departmentIds.length > 0) {
                        filters.push("AND", ["internalid", "anyof", departmentIds]);
                        columns.push(
                            "internalid",
                            "custrecord_jj_mandept_hod",
                            "custrecord_jj_mandept_bin_no",
                            "custrecord_jj_mandept_location",
                            "custrecord_jj_mandept_good_status",
                            "custrecord_jj_mandept_loss_status",
                            "custrecord_jj_mandept_loss_record_bin",
                            "custrecord_jj_mandept_wip_status",
                            "custrecord_jj_mandept_wt_status",
                            "custrecord_jj_mandept_repair_stock"
                        );
                    }

                    let manufacturingDeptSearchObj = search.create({
                        type: "customrecord_jj_manufacturing_dept",
                        filters: filters,
                        columns: columns
                    });

                    if (params && (params == "Casting" || params == "dept_hod" || params == "user_specific_dept_hod")) {
                        let searchResult = [];
                        manufacturingDeptSearchObj.run().each(function (result) {
                            // Get multi-select values and texts
                            const employeeValues = result.getValue('custrecord_jj_mandept_employees');
                            const employeeTexts = result.getText('custrecord_jj_mandept_employees');

                            // Create value-text pair array
                            let employeeList = [];
                            if (employeeValues && employeeTexts) {
                                const valuesArray = employeeValues.split(',');
                                const textsArray = employeeTexts.split(',');

                                employeeList = valuesArray.map((val, index) => ({
                                    value: val.trim(),
                                    text: textsArray[index]?.trim() || ''
                                }));
                            }
                            searchResult.push({
                                department: {
                                    value: result.getValue('internalid'),
                                    text: result.getValue('name')
                                },
                                hod: {
                                    value: result.getValue('custrecord_jj_mandept_hod'),
                                    text: result.getText('custrecord_jj_mandept_hod')
                                },
                                hasBulkMovement: result.getValue('custrecord_jj_mandept_has_bulk_movement'),
                                hasBulkAcknowled: result.getValue('custrecord_jj_mandept_has_bulk_acknowled'),
                                isBuildDept: result.getValue('custrecord_jj_mandept_is_build_dept'),
                                isAccOut: result.getValue('custrecord_jj_mandept_accounting_outward'),
                                isFabDept: result.getValue('custrecord_jj_mandept_outsourcing_fab'),
                                isAccIn: result.getValue('custrecord_jj_mandept_accounting_inward'),
                                outsourceVendor: {
                                    value: result.getValue('custrecord_jj_mandept_vendor'),
                                    text: result.getText('custrecord_jj_mandept_vendor')
                                },
                                employees: employeeList,
                            });
                            return true;
                        });
                        return searchResult;
                    } else if (params && params == "build_dept") {
                        let searchResult = [];
                        manufacturingDeptSearchObj.run().each(function (result) {
                            searchResult.push({
                                deptId: result.getValue("internalid"),
                                binNumber: result.getValue('custrecord_jj_mandept_bin_no'),
                                inventoryStatus: result.getValue("custrecord_jj_mandept_wip_status"),
                                locationId: result.getValue('custrecord_jj_mandept_location'),
                                statusLabelPend: result.getValue('custrecord_jj_mandept_label_pend_status'),
                            });
                            return false;
                        });
                        return searchResult;
                    } else if (params && params == "bulk_move") {
                        let searchResult = [];
                        manufacturingDeptSearchObj.run().each(function (result) {
                            searchResult.push({
                                department: {
                                    value: result.getValue('internalid'),
                                    text: result.getValue('name')
                                },
                                hod: {
                                    value: result.getValue('custrecord_jj_mandept_hod'),
                                    text: result.getText('custrecord_jj_mandept_hod')
                                },
                                hasBulkMovement: result.getValue('custrecord_jj_mandept_has_bulk_movement'),
                                hasBulkAcknowled: result.getValue('custrecord_jj_mandept_has_bulk_acknowled'),
                                nextDept: {
                                    value: result.getValue('custrecord_jj_mandept_next_department'),
                                    text: result.getText('custrecord_jj_mandept_next_department')
                                }
                            });
                            return true;
                        });
                        return searchResult;
                    } else if (params && params == "location_transfer") {
                        let searchResult = [];
                        manufacturingDeptSearchObj.run().each(function (result) {
                            searchResult.push({
                                department: {
                                    value: result.getValue('internalid'),
                                    text: result.getValue('name')
                                },
                                binNumber: {
                                    value: result.getValue('custrecord_jj_mandept_bin_no'),
                                    text: result.getValue('custrecord_jj_mandept_bin_no')
                                },
                                isBuildDept: result.getValue('custrecord_jj_mandept_is_build_dept'),
                                isOutwardDept: result.getValue('custrecord_jj_mandept_is_outward_dept'),
                                isFinalOutwardDept: result.getValue('custrecord_jj_mandept_is_final_outw_dept'),
                                locations: [
                                    {
                                        value: result.getValue('custrecord_jj_mandept_location'),
                                        text: result.getText('custrecord_jj_mandept_location')
                                    }
                                ]
                            });
                            return true;
                        });
                        return searchResult;
                    } else if (params && params == "bulk_move_back_end") {
                        let deptData = {};
                        manufacturingDeptSearchObj.run().each(function (result) {
                            let deptId = result.getValue("internalid");
                            // store the details of department globaly
                            deptData[deptId] = {
                                hod: result.getValue("custrecord_jj_mandept_hod"),
                                binNumber: result.getValue("custrecord_jj_mandept_bin_no"),
                                location: result.getValue("custrecord_jj_mandept_location"),
                                goodStatus: result.getValue("custrecord_jj_mandept_good_status"),
                                lossStatus: result.getValue("custrecord_jj_mandept_loss_status"),
                                lossRecordBin: result.getValue("custrecord_jj_mandept_loss_record_bin"),
                                wipStatus: result.getValue("custrecord_jj_mandept_wip_status"),
                                waxTreeStatus: result.getValue("custrecord_jj_mandept_wt_status"),
                                repairStockStatus: result.getValue("custrecord_jj_mandept_repair_stock"),
                                nextDeptId: result.getValue("custrecord_jj_mandept_next_department"),
                                hasBulkMovement: result.getValue('custrecord_jj_mandept_has_bulk_movement'),
                                hasBulkAcknowled: result.getValue('custrecord_jj_mandept_has_bulk_acknowled'),
                            };
                            return true;
                        });
                        return deptData;
                    } else if (departmentIds && departmentIds.length > 0) {
                        let deptData = {};
                        manufacturingDeptSearchObj.run().each(function (result) {
                            let deptId = result.getValue("internalid");
                            // store the details of department globaly
                            deptData[deptId] = {
                                hod: result.getValue("custrecord_jj_mandept_hod"),
                                binNumber: result.getValue("custrecord_jj_mandept_bin_no"),
                                location: result.getValue("custrecord_jj_mandept_location"),
                                goodStatus: result.getValue("custrecord_jj_mandept_good_status"),
                                lossStatus: result.getValue("custrecord_jj_mandept_loss_status"),
                                lossRecordBin: result.getValue("custrecord_jj_mandept_loss_record_bin"),
                                wipStatus: result.getValue("custrecord_jj_mandept_wip_status"),
                                waxTreeStatus: result.getValue("custrecord_jj_mandept_wt_status"),
                                repairStockStatus: result.getValue("custrecord_jj_mandept_repair_stock")
                            };
                            return true;
                        });
                        return deptData;
                    } else {
                        let searchResult = [];
                        manufacturingDeptSearchObj.run().each(function (result) {
                            searchResult.push({
                                value: result.getValue('internalid'),
                                name: result.getValue('name')
                            });
                            return true;
                        });

                        return searchResult;
                    }
                    // return jjUtil.dataSets.iterateSavedSearch({
                    //     searchObj: manufacturingDeptSearchObj,
                    //     columns: jjUtil.dataSets.fetchSavedSearchColumn(manufacturingDeptSearchObj, 'label'),
                    //     PAGE_INDEX: null,
                    //     PAGE_SIZE: 1000,
                    // });
                } catch (error) {
                    log.error('getAllManufacturingDepartments', error);
                    if (departmentIds && departmentIds.length > 0) {
                        return {};
                    } else {
                        return [];
                    }
                }
            },

            getOverdueMaterialBags(deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize, overdueDays, locations) {
                try {
                    let filters = [
                        [`formulanumeric: CASE WHEN TRUNC(SYSDATE) - TRUNC({custrecord_jj_bag_core_material.created}) >= ${overdueDays} THEN 1 ELSE 0 END`, "equalto", "1"],
                        "AND", ["custrecord_jj_bagcoremat_bag_name.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_merge", "is", "F"],
                        "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_is_rejected", "is", "F"],
                        "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_bagcoremat_bagcore.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"],
                        "AND", ["custrecord_jj_bagcoremat_item.class", "anyof", GOLD_CLASS_IDS]
                    ];

                    // if (locations) {
                    //     filters.push("AND", ["custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_location", "anyof", locations]);
                    // }
                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_location", "anyof", locationArr]);
                        }
                    }

                    if (deptId && deptId != undefined && deptId != "undefined" && allDept != "true") {
                        filters.push("AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_present_dept", "anyof", deptId]);
                    }

                    if (bagIds && bagIds != undefined && bagIds != "undefined") {
                        filters.push("AND", ["custrecord_jj_bagcoremat_bag_name", "anyof", bagIds]);
                    }

                    if (bagSearchKey && params == 'active_bags_for_overdue') {
                        filters.push("AND", [
                            ["custrecord_jj_bagcoremat_bag_name.idtext", "contains", bagSearchKey],
                            "OR",
                            ["formulatext: {custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_wo}", "contains", bagSearchKey]
                        ]
                        );
                    }

                    let bagCoreMaterialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", summary: "GROUP", label: "bag_no_id" }),
                            search.createColumn({ name: "formulanumeric", summary: "MAX", formula: "TRUNC(SYSDATE) - TRUNC({custrecord_jj_bag_core_material.created})", label: "Formula (Numeric)" }),
                            search.createColumn({ name: "name", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", summary: "GROUP", label: "bag_no_name" }),
                            search.createColumn({ name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", summary: "GROUP", label: "bag_core_tracking" }),
                            search.createColumn({ name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", summary: "GROUP", label: "department" }),
                            search.createColumn({ name: "custrecord_jj_baggen_time", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", summary: "GROUP", label: "date" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", summary: "GROUP", label: "quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_style", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", summary: "GROUP", label: "item_image" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", summary: "GROUP", label: "design" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_duedate", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", summary: "GROUP", label: "duedate" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", summary: "MAX", label: "work_order_id" })
                        ]
                    });

                    if (!pageIndex) {
                        return jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagCoreMaterialsSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagCoreMaterialsSearchObj, 'label'),
                            PAGE_INDEX: null,
                            PAGE_SIZE: 1000,
                        });
                    } else {
                        let totalRecords = bagCoreMaterialsSearchObj.runPaged().count;
                        let paginatedResults = jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagCoreMaterialsSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagCoreMaterialsSearchObj, 'label'),
                            PAGE_INDEX: pageIndex,
                            PAGE_SIZE: pageSize || PAGE_SIZE,
                        });
                        log.debug("paginatedResults", paginatedResults);
                        return {
                            "currentPageIndex": paginatedResults?.pageInfo?.pageIndex || 0,
                            "totalPages": paginatedResults?.pageInfo?.pageLength || 0,
                            "bagList": paginatedResults.lines,
                            "totalItems": totalRecords
                        }
                    }
                } catch (error) {
                    log.error('getOverdueMaterialBags', error);
                    return [];
                }
            },

            getActiveBagsByEmployee(deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize, date, employee, selectedBags, locations) {
                try {
                    log.debug('getActiveBagsByEmployee { deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize, date, employee, selectedBags, locations }',
                        { deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize, date, employee, selectedBags, locations });
                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_entry", "isnotempty", ""],
                        "AND", ["custrecord_jj_oprtns_exit", "isempty", ""],
                        "AND", ["custrecord_jj_oprtns_bagno.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_merge", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_department.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagcore.isinactive", "is", "F"],
                    ];

                    let columns = [
                        search.createColumn({ name: "custrecord_jj_oprtns_bagno", sort: search.Sort.DESC, label: "bag_no_id" })
                    ];

                    // if (locations) {
                    //     filters.push("AND", ["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_location", "anyof", locations]);
                    // }
                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_location", "anyof", locationArr]);
                        }
                    }

                    if (params != 'bag_print_all') {
                        columns.push(
                            search.createColumn({ name: "name", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "bag_no_name" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_department", label: "department" }),
                            search.createColumn({ name: "name", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "department_name" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagcore", label: "bag_core_tracking" }),
                            search.createColumn({ name: "custrecord_jj_baggen_time", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "date" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "work_order_id" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_employee", label: "Employee" }),
                        );
                    }

                    const dateFormat = (date) => {
                        try {
                            log.debug("dateFormat", date);
                            let [year, month, day] = date.split("-"); // Parsing day, month, and year directly from the date
                            if (jjUtil.dateLogic.validateGivenDate([year, month, day])) {
                                let newDate = new Date(year, month - 1, day);
                                if (jjUtil.dateLogic.isInstanceOfDate(newDate)) {
                                    let formattedDate = format.format({
                                        type: format.Type.DATE,
                                        value: newDate,
                                    });
                                    return formattedDate;
                                }
                            }
                            return "";
                        } catch (e) {
                            // Logging an error in case of an exception
                            log.error("Error @cm_savedsearches @getActiveBagsByEmployee @searchResults @dateFormat", e);
                            return "";
                        }
                    };

                    if ((params == 'active_bags' || params == 'bag_print_all') && date) {
                        let formatedDate = dateFormat(date);
                        if (formatedDate) filters.push("AND", ["custrecord_jj_oprtns_entry", "onorafter", formatedDate]);
                    }

                    if (params == 'active_bags' || params == 'bag_print_all') {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "anyof", "@NONE@"]);
                    }

                    // if (deptId && deptId.length > 0 && deptId != undefined && deptId != "undefined" && allDept != "true") {
                    //     filters.push("AND", ["custrecord_jj_oprtns_department", "anyof", deptId]);
                    // }
                    if ((
                        (Array.isArray(deptId) && deptId.length > 0) || // if array, check length
                        (!Array.isArray(deptId) && deptId)             // if not array, just check truthiness
                    ) && deptId != undefined && deptId != "undefined" && allDept != "true") {
                        filters.push("AND", ["custrecord_jj_oprtns_department", "anyof", deptId]);
                    }
                    if (bagIds && bagIds != undefined && bagIds != "undefined") {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno", "anyof", bagIds]);
                    }
                    if (customerId) {
                        filters.push("AND", ["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_customer", "anyof", customerId]);
                    }
                    if (bagSearchKey && (params == 'active_bags') || (params == 'bag_print_all')) {
                        filters.push("AND", [
                            ["custrecord_jj_oprtns_bagno.idtext", "contains", bagSearchKey],
                            "OR", ["formulatext: {custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_so}", "contains", bagSearchKey],
                            "OR", ["formulatext: {custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_wo}", "contains", bagSearchKey],
                            "OR", ["formulatext: {custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_design}", "contains", bagSearchKey]
                        ]);
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer_name" }),
                        );
                    } else if (bagSearchKey) {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.idtext", "contains", bagSearchKey]);
                    }
                    if (params == 'rejected_bags') {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_is_rejected", "is", "T"]);
                    } else {
                        filters.push(
                            "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"]
                        );
                    }
                    if (params == 'bags_overdue') {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "anyof", "@NONE@"])
                    }
                    if (params == 'location_transfer') {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "noneof", "@NONE@"]);
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_associated_assembly_build", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "assembly_build" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_kt_col", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "item" }),
                            search.createColumn({ name: "custrecord_jj_baggen_in_location", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "location" }),
                        );
                    } else if (params != 'bag_print_all') {
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer_name" }),
                            search.createColumn({ name: "custrecord_jj_mandept_hod", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "hod" }),
                            search.createColumn({ name: "custrecord_jj_baggen_is_issued", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "is_issued" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_style", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "item_image" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "design" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_duedate", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "duedate" }),
                        )
                    }

                    if (employee) {
                        filters.push("AND", ["custrecord_jj_oprtns_employee", "anyof", employee]);
                    }

                    if (params == 'REJECT') {
                        filters.push("AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "anyof", "@NONE@"]);
                    }

                    if (params == 'bag_print_all' && selectedBags) {
                        let selectedIds = selectedBags.split(',').map(function (id) {
                            return id.trim();
                        });

                        if (selectedIds.length > 0) {
                            log.debug("Selected Bags", selectedIds);

                            filters.push("AND",
                                ["custrecord_jj_oprtns_bagno", "anyof", selectedIds]
                            );
                        }
                    }


                    let bagGenerationSearchObj = search.create({
                        type: "customrecord_jj_operations",
                        filters: filters,
                        columns: columns
                    });
                    if (!pageIndex) {
                        return jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagGenerationSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagGenerationSearchObj, 'label'),
                            PAGE_INDEX: null,
                            PAGE_SIZE: 1000,
                        });
                    }
                    else {
                        let totalRecords = bagGenerationSearchObj.runPaged().count;
                        let paginatedResults = jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagGenerationSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagGenerationSearchObj, 'label'),
                            PAGE_INDEX: pageIndex,
                            PAGE_SIZE: pageSize || PAGE_SIZE,
                        });

                        log.debug("paginatedResults", paginatedResults);

                        return {
                            "currentPageIndex": paginatedResults?.pageInfo?.pageIndex || 0,
                            "totalPages": paginatedResults?.pageInfo?.pageLength || 0,
                            "bagList": paginatedResults.lines,
                            "totalItems": totalRecords
                        }
                    }
                } catch (error) {
                    log.error('Error @getActiveBagsByEmployee', error);
                    return {};
                }
            },

            // also used for summary
            getActiveBags(deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize, locations) {
                try {
                    // log.debug('getActiveBags { deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize }', { deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize });
                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_baggen_merge", "is", "F"],
                        "AND", ["custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_baggen_dept.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_baggen_bagcore.isinactive", "is", "F"],
                    ];
                    let columns = [
                        search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "bag_no_id" }),
                        search.createColumn({ name: "name", label: "bag_no_name" }),
                        search.createColumn({ name: "custrecord_jj_baggen_present_dept", label: "department" }),
                        search.createColumn({ name: "custrecord_jj_baggen_bagcore", label: "bag_core_tracking" }),
                        search.createColumn({ name: "custrecord_jj_baggen_time", label: "date" }),
                        search.createColumn({ name: "custrecord_jj_baggen_qty", label: "quantity" }),
                        search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "work_order_id" }),
                        search.createColumn({ name: "custrecord_jj_ring_size", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "ring_size" })
                    ];

                    // if (locations) {
                    //     filters.push("AND", ["custrecord_jj_baggen_bagcore.custrecord_jj_bagcore_location", "anyof", locations]);
                    // }
                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_baggen_bagcore.custrecord_jj_bagcore_location", "anyof", locationArr]);
                        }
                    }

                    // if (deptId && deptId.length > 0 && deptId != undefined && deptId != "undefined" && allDept != "true") {
                    //     filters.push("AND", ["custrecord_jj_baggen_present_dept", "anyof", deptId]);
                    // }
                    if ((
                        (Array.isArray(deptId) && deptId.length > 0) || // if array, check length
                        (!Array.isArray(deptId) && deptId)             // if not array, just check truthiness
                    ) && deptId != undefined && deptId != "undefined" && allDept != "true") {
                        filters.push("AND", ["custrecord_jj_baggen_present_dept", "anyof", deptId]);
                    }
                    if (bagIds && bagIds != undefined && bagIds != "undefined") {
                        filters.push("AND", ["internalid", "anyof", bagIds]);
                    }
                    if (customerId) {
                        filters.push("AND", ["custrecord_jj_baggen_bagcore.custrecord_jj_bagcore_customer", "anyof", customerId]);
                    }
                    if (bagSearchKey && params == 'active_bags') {
                        filters.push("AND", [
                            ["idtext", "contains", bagSearchKey],
                            "OR",
                            ["formulatext: {custrecord_jj_baggen_bagcore.custrecord_jj_bagcore_wo}", "contains", bagSearchKey]
                        ]);
                    } else if (bagSearchKey) {
                        filters.push("AND", ["idtext", "contains", bagSearchKey]);
                    }
                    if (params == 'rejected_bags') {
                        filters.push("AND", ["custrecord_jj_is_rejected", "is", "T"]);
                    } else {
                        filters.push(
                            "AND", ["custrecord_jj_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_baggen_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"]
                        );
                    }
                    if (params == 'bags_overdue') {
                        filters.push("AND", ["custrecord_jj_associated_assembly_build", "anyof", "@NONE@"])
                    }
                    if (params == 'location_transfer') {
                        filters.push("AND", ["custrecord_jj_associated_assembly_build", "noneof", "@NONE@"]);
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_associated_assembly_build", label: "assembly_build" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_kt_col", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "item" }),
                            search.createColumn({ name: "custrecord_jj_baggen_in_location", label: "location" }),
                        );
                    } else {
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "customer" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "customer_name" }),
                            search.createColumn({ name: "custrecord_jj_mandept_hod", join: "CUSTRECORD_JJ_BAGGEN_PRESENT_DEPT", label: "hod" }),
                            search.createColumn({ name: "custrecord_jj_baggen_is_issued", label: "is_issued" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_style", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "item_image" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "design" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_duedate", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "duedate" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "order_type" }),
                            search.createColumn({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "serial_repair" }),
                            search.createColumn({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "serial_repair_wt" }),
                        )
                    }

                    if (params == 'REJECT') {
                        filters.push("AND", ["custrecord_jj_associated_assembly_build", "anyof", "@NONE@"]);
                    }

                    let bagGenerationSearchObj = search.create({
                        type: "customrecord_jj_bag_generation",
                        filters: filters,
                        columns: columns
                    });
                    if (!pageIndex) {
                        return jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagGenerationSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagGenerationSearchObj, 'label'),
                            PAGE_INDEX: null,
                            PAGE_SIZE: 1000,
                        });
                    }
                    else {
                        let totalRecords = bagGenerationSearchObj.runPaged().count;
                        let paginatedResults = jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagGenerationSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagGenerationSearchObj, 'label'),
                            PAGE_INDEX: pageIndex,
                            PAGE_SIZE: pageSize || PAGE_SIZE,
                        });

                        // Calculate pagination
                        // let totalRecords = allResults.length;
                        // log.debug("totalRecords", totalRecords);
                        // let totalPages = Math.ceil(totalRecords / PAGE_SIZE);
                        // log.debug("totalPages", totalPages);
                        // log.debug("currentPageIndex", pageIndex);
                        // let START_INDEX = (pageIndex - 1 || 0) * PAGE_SIZE;
                        // let END_INDEX = START_INDEX + PAGE_SIZE;
                        // log.debug("START_INDEX", START_INDEX);
                        // log.debug("END_INDEX", END_INDEX);

                        // // Slice results for the current page
                        // let paginatedResults = allResults.slice(START_INDEX, END_INDEX);
                        log.debug("paginatedResults", paginatedResults);
                        // log.debug("getActiveBags", {
                        //         "currentPageIndex": pageIndex,
                        //         "totalPages": totalPages,
                        //         "bagList": paginatedResults,
                        //         "totalItems": totalRecords
                        //     });

                        // return paginatedResults;

                        return {
                            "currentPageIndex": paginatedResults?.pageInfo?.pageIndex || 0,
                            "totalPages": paginatedResults?.pageInfo?.pageLength || 0,
                            "bagList": paginatedResults.lines,
                            "totalItems": totalRecords
                        }
                    }
                } catch (error) {
                    log.error('getActiveBags', error);
                    return {};
                }
            },

            /**
             * Retrieves details of work orders using a saved search.
             *
             * @returns {Array} An array of work order details.
             * @throws Will log an error and return an empty array if the search fails.
             */
            getWorkOrderDetails(workOrderId, locations) {
                try {
                    log.debug("getWorkOrderDetails data", { workOrderId, locations })
                    // Define base filters
                    let filters = [
                        ["type", "anyof", "WorkOrd"],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND", ["status", "noneof", "WorkOrd:H", "WorkOrd:G"],
                        // "AND",
                        // ["custbody_jj_from_so", "noneof", "@NONE@"],
                        // "AND",
                        // ["custbody_jj_from_so.custbody_jj_order_type", "noneof", CASTING_ORDER_TYPE],
                        // "AND",
                        // ["custbody_jj_from_so.mainline", "is", "T"],
                        "AND", [
                            ["custbody_jj_from_so", "anyof", "@NONE@"],
                            "OR",
                            ["custbody_jj_from_so.mainline", "is", "T"],
                        ]
                    ];

                    // Add location filter if provided
                    // if (locations) {
                    //     filters.push("AND", ["location", "anyof", locations]);
                    // }
                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["location", "anyof", locationArr]);
                        }
                    }

                    // Conditionally add an internal ID filter if workOrderId is provided
                    if (workOrderId) {
                        // log.debug("123")
                        filters.push("AND", ["internalidnumber", "equalto", workOrderId]);
                    }

                    // Create the work order search object with the conditional filters
                    let workorderSearchObj = search.create({
                        type: "workorder",
                        settings: [{
                            "name": "consolidationtype",
                            "value": "ACCTTYPE"
                        }],
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "subsidiarynohierarchy", label: "subsidiary" }),
                            search.createColumn({ name: "locationnohierarchy", label: "location" }),
                            search.createColumn({ name: "entity", label: "name" }),
                            search.createColumn({ name: "trandate", label: "date" }),
                            search.createColumn({ name: "item", label: "item" }),
                            search.createColumn({ name: "salesorder", label: "salesorder" }),
                            search.createColumn({ name: "tranid", label: "tranid" }),
                            search.createColumn({ name: "custbody_jj_from_so", label: "created_from" }),
                            search.createColumn({ name: "statusref", label: "status" }),
                            search.createColumn({ name: "companyname", join: "customerMain", label: "company_name" }),
                            // search.createColumn({ name: "entityid", join: "customerMain", label: "name" }),
                            search.createColumn({ name: "altname", join: "customerMain", label: "name" }),
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "internal_id" }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "SUBSTR({custbody_jj_from_so}, INSTR({custbody_jj_from_so}, '#'))",
                                label: "sales_order_number"
                            }),
                            search.createColumn({ name: "quantity", label: "quantity" }),
                            search.createColumn({
                                name: "internalid",
                                join: "customerMain",
                                label: "customer_internal_id"
                            }),
                            search.createColumn({ name: "custbody_jj_associated_bag_core_record", label: "bag_core_tracking_record" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_is_rejected", join: "CUSTBODY_JJ_ASSOCIATED_BAG_CORE_RECORD", label: "bag_core_is_rejected" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_duedate", join: "CUSTBODY_JJ_ASSOCIATED_BAG_CORE_RECORD", label: "delivery_date" }),
                            search.createColumn({
                                name: "custitem_jj_item_image",
                                join: "item",
                                label: "custitem_jj_item_image"
                            }),
                            search.createColumn({ name: "custbody_jj_order_type", label: "custbody_jj_order_type" }),
                            search.createColumn({ name: "custbody_jj_order_type", join: "custbody_jj_from_so", label: "order_type" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_bag_generate_stat", join: "CUSTBODY_JJ_ASSOCIATED_BAG_CORE_RECORD", label: "bag_gen_status" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_bag_generated", join: "CUSTBODY_JJ_ASSOCIATED_BAG_CORE_RECORD", label: "bag_generated" }),
                            search.createColumn({ name: "custbody_jj_in_progress_bag", label: "in_prog_bag" }),
                            search.createColumn({ name: "custbody_jj_wo_ring_size", label: "ring_size" }),
                            search.createColumn({ name: "custitem_jj_category", join: "item", label: "category" }),
                        ]
                    });

                    // Use jjUtil.dataSets to iterate over the search results
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: workorderSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(workorderSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                } catch (error) {
                    log.error('Error in getWorkOrderDetails', error);
                    return [];
                }
            },
            /**
             * Retrieves item details for a specific bag generation.
             * 
             * @param {number} bagGenerationId - The internal ID of the bag generation.
             * @returns {Array} An array of item details.
             */
            // getBagItemDetails(bagGenerationId) {
            //     try {
            //         let customrecord_jj_bagcore_materialsSearchObj = search.create({
            //             type: "customrecord_jj_bagcore_materials",
            //             filters: [
            //                 ["custrecord_jj_bagcoremat_bag_name.internalid", "anyof", bagGenerationId],
            //                 "AND", ["isinactive", "is", "F"]
            //             ],
            //             columns: [
            //                 search.createColumn({ name: "internalid", label: "bagCoreMaterialId" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_item", label: "Item" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_size", label: "Size" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "Quantity" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_piece", label: "Weight" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_bag_name", label: "bag_no" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_uom", label: "uom" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_total_issue", label: "total_issue" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_to_issue", label: "to_issue" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_total_loss", label: "total_loss" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_total_receive", label: "total_receive" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_wo_line_no", label: "wo_line_no" }),
            //                 search.createColumn({ name: "custrecord_jj_bagcoremat_wo", label: "work_order_id" }),
            //                 search.createColumn({
            //                     name: "class",
            //                     join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM",
            //                     label: "item_class"
            //                  }),

            //             ]
            //         });

            //         // Use jjUtil.dataSets to iterate over the search results
            //         return jjUtil.dataSets.iterateSavedSearch({
            //             searchObj: customrecord_jj_bagcore_materialsSearchObj,
            //             columns: jjUtil.dataSets.fetchSavedSearchColumn(customrecord_jj_bagcore_materialsSearchObj, 'label'),
            //             PAGE_INDEX: null,
            //             PAGE_SIZE: 1000
            //         });

            //     } catch (error) {
            //         log.error('Error in getBagItemDetails', error);
            //         return [];
            //     }
            // },

            // Also used for summary
            getBagItemDetails(bagGenerationId) {
                try {
                    let customrecord_jj_bagcore_materialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: [
                            ["custrecord_jj_bagcoremat_bag_name.internalid", "anyof", bagGenerationId], // array or string
                            "AND", ["isinactive", "is", "F"],
                            // "AND", ["custrecord_jj_bag_core_material.isinactive", "is", "F"],
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "bagCoreMaterialId" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_item", label: "Item" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_size", label: "Size" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "Quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_piece", label: "Weight" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_bag_name", label: "bag_no" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_uom", label: "uom" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_issue", label: "total_issue" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_to_issue", label: "to_issue" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_loss", label: "total_loss" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_receive", label: "total_receive" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_wo_line_no", label: "wo_line_no" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_wo", label: "work_order_id" }),
                            search.createColumn({ name: "custrecord_jj_actual_pieces", label: "actual_pieces" }),
                            search.createColumn({ name: "custrecord_jj_issued_pieces", label: "issued_pieces" }),
                            search.createColumn({ name: "custrecord_jj_to_be_issued_pieces", label: "tobe_issued_pieces" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_received_pieces", label: "received_pieces" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_loss_pieces", label: "loss_pieces" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_additional_qty", label: "balance_qty" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_balance_pieces", label: "balance_pieces" }),
                            search.createColumn({ name: "class", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "item_class" }),

                            search.createColumn({ name: "custrecord_jj_lot_number", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Lot Number" }),
                            search.createColumn({ name: "custrecord_jj_quantity", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Lot Quantity" }),

                            search.createColumn({ name: "custrecord_jj_pieces", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Lot Pieces" }),

                            search.createColumn({ name: "isserialitem", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "is_serial" }),
                            search.createColumn({ name: "isinactive", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "lot_inactive" }),

                            search.createColumn({ name: "custrecord_jj_bagcore_style", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "item_image" }),
                            search.createColumn({ name: "custrecord_jj_actual_pieces_info", label: "actual_pieces_info" }),
                            search.createColumn({ name: "custrecord_jj_to_be_issued_pieces_info", label: "to_be_issued_pieces_info" }),
                            search.createColumn({ name: "custrecord_jj_balance_pieces_info", label: "balance_pieces_info" }),
                            search.createColumn({ name: "custrecord_jj_issued_pieces_info", label: "issued_pieces_info" }),
                            search.createColumn({ name: "custrecord_jj_loss_pieces_info", label: "loss_pieces_info" }),
                            search.createColumn({ name: "custrecord_jj_received_pieces_info", label: "received_pieces_info" }),

                            search.createColumn({ name: "parent", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "parent" }),
                            search.createColumn({ name: "custitem_jj_stone_quality_group", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "stone_quality_group" }),

                            search.createColumn({ name: "created", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "created_date" }),
                            search.createColumn({ name: "type", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "type" }),
                            search.createColumn({ name: "cost", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "cost" }),

                            search.createColumn({ name: "custrecord_jj_bagcoremat_scrap_qty", label: "scrap_qty" }),
                            // search.createColumn({ name: "custrecord_jj_bagcoremat_scrap_pieces", label: "scrap_pieces" }),
                            search.createColumn({ name: "custrecord_jj_scrap_pieces_info", label: "scrap_pieces_info" }),
                            search.createColumn({ name: "custitem_jj_metal_purity_percent", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "purity" }),
                            search.createColumn({ name: "custitem_jj_metal_color", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "metal_color" }),
                            search.createColumn({ name: "custitem_jj_metal_quality", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "metal_quality" }),
                            search.createColumn({ name: "custitem_jj_stone_quality", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "stone_quality" }),
                            search.createColumn({ name: "custitem_jj_stone_color", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "stone_color" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_newly_add_line", label: "newly_added_line" }),
                        ]
                    });
                    let searchResult =
                        jjUtil.dataSets.iterateSavedSearch({
                            searchObj: customrecord_jj_bagcore_materialsSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(customrecord_jj_bagcore_materialsSearchObj, 'label'),
                            PAGE_INDEX: null,
                            PAGE_SIZE: 1000
                        });
                    // log.debug("searchResult", searchResult);

                    const groupedResults = {};

                    // searchResult.forEach((result) => {
                    //     const bagCoreMaterialId = result.bagCoreMaterialId.value;
                    //     const createdDate = result.created_date;
                    //     const lotNumber = result["Lot Number"]
                    //     const quantity = result["Lot Quantity"]
                    //     const isLotInactive = result.lot_inactive;

                    //     // Remove the parent item from the item text
                    //     result.Item.text = result.Parent?.text
                    //         ? result.Item.text.replace(result.Parent.text + " : ", "")
                    //         : result.Item.text;

                    //     // Initialize the group if it doesn't exist
                    //     if (!groupedResults[bagCoreMaterialId]) {
                    //         groupedResults[bagCoreMaterialId] = {
                    //             bagCoreMaterialId: result.bagCoreMaterialId,
                    //             Item: result.Item,
                    //             Size: result.Size,
                    //             Quantity: result.Quantity,
                    //             actual_quantity: result.Quantity,
                    //             actual_pieces: result.actual_pieces,
                    //             weight: result.Weight,
                    //             bag_no: result.bag_no,
                    //             uom: result.uom,
                    //             total_issue: result.total_issue,
                    //             to_issue: result.to_issue,
                    //             total_loss: result.total_loss,
                    //             total_receive: result.total_receive,
                    //             wo_line_no: result.wo_line_no,
                    //             work_order_id: result.work_order_id,
                    //             item_class: result.item_class,
                    //             isSerialized: result.is_serial,
                    //             issued_pieces: result.issued_pieces,
                    //             tobe_issued_pieces: result.tobe_issued_pieces,
                    //             received_pieces: result.received_pieces,
                    //             loss_pieces: result.loss_pieces,
                    //             issued_weight: result.Quantity,
                    //             balance_qty: result.balance_qty,
                    //             balance_pieces: result.balance_pieces,
                    //             itemImage: result.item_image,
                    //             actual_pieces_info: result.actual_pieces_info,
                    //             to_be_issued_pieces_info: result.to_be_issued_pieces_info,
                    //             balance_pieces_info: result.balance_pieces_info,
                    //             total_issued_pieces_info: result.issued_pieces_info,
                    //             loss_pieces_info: result.loss_pieces_info,
                    //             received_pieces_info: result.received_pieces_info,
                    //             stoneQualityGroup: result.stone_quality_group,
                    //             inventoryDetail: [],
                    //             created_dates: []  // Store created dates for sorting
                    //         };
                    //     }

                    //     // Add the created date to the list of created_dates for this material
                    //     groupedResults[bagCoreMaterialId].created_dates.push(createdDate);

                    //     // Add lot number and quantity to the inventoryDetail array
                    //     if (lotNumber.value && quantity.value && !isLotInactive?.value) {
                    //         groupedResults[bagCoreMaterialId].inventoryDetail.push({
                    //             lotNumber: lotNumber,
                    //             quantity: quantity
                    //         });
                    //     }
                    // });

                    // // Now we loop through each item to calculate the number of days since the earliest created date
                    // Object.values(groupedResults).forEach(item => {
                    //     if (item.created_dates.length > 0) {
                    //         // Get the minimum created date
                    //         const minCreatedDate = new Date(Math.min(...item.created_dates.map(date => new Date(date))));
                    //         // Get the current date
                    //         const currentDate = new Date();
                    //         // Calculate the difference in time (in milliseconds)
                    //         const timeDiff = currentDate - minCreatedDate;
                    //         // Convert the difference from milliseconds to days
                    //         const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                    //         // Assign the calculated number of days
                    //         item.days_since_creation = daysDiff;
                    //     }
                    // });

                    // log.debug("groupedResults", Object.values(groupedResults));
                    // // Convert grouped results to an array
                    // return Object.values(groupedResults);

                    // Utility function to parse the custom date format (27-Feb-2025 12:17 pm)

                    // const parseCustomDate = (dateStr) => {
                    //     log.debug("Input dateStr:", dateStr);

                    //     // Handle if the string is empty or malformed
                    //     if (!dateStr) {
                    //         log.error("Empty or invalid date string provided.");
                    //         return null; // Early exit if the input string is invalid
                    //     }

                    //     // Mapping month abbreviations to numerical values
                    //     const months = {
                    //         "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
                    //         "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
                    //     };

                    //     // Split the date string into its components
                    //     const parts = dateStr.split(/[\s-:]+/);

                    //     log.debug("Date parts after splitting:", parts);

                    //     if (parts.length < 6) {  // We expect 6 parts (day, month, year, hour, minute, period)
                    //         log.error("Date string has insufficient parts to parse.");
                    //         return null; // Ensure that the date string has enough parts
                    //     }

                    //     const [day, monthStr, year, hourStr, minuteStr, period] = parts;

                    //     // Get the numerical value for the month
                    //     const month = months[monthStr];
                    //     if (month === undefined) {
                    //         log.error("Invalid month string: " + monthStr);
                    //         return null; // Exit if the month is invalid
                    //     }

                    //     // Parse the hour and minute from their respective strings
                    //     let hour = parseInt(hourStr, 10); // Ensure it's parsed as an integer
                    //     const minute = parseInt(minuteStr, 10); // Ensure it's parsed as an integer

                    //     if (isNaN(hour) || isNaN(minute)) {
                    //         log.error("Invalid hour or minute values.");
                    //         return null;
                    //     }

                    //     // Handle the AM/PM logic for 12-hour clock
                    //     if (period.toLowerCase() === "pm" && hour < 12) {
                    //         hour += 12; // Convert PM hour to 24-hour format (except for 12 PM)
                    //     }
                    //     if (period.toLowerCase() === "am" && hour === 12) {
                    //         hour = 0; // Convert 12 AM to 0 hour
                    //     }

                    //     // Now, create a JavaScript Date object
                    //     const parsedDate = new Date(year, month, day, hour, minute);

                    //     log.debug("Parsed Date:", parsedDate);

                    //     return parsedDate;
                    // };

                    const parseCustomDate = (dateStr) => {
                        // log.debug("Input dateStr:", dateStr);

                        // Handle empty or invalid date string
                        if (!dateStr) {
                            log.error("Empty or invalid date string provided.");
                            return null;
                        }

                        try {
                            // Parse the date using NetSuite's format module
                            const parsedDate = format.parse({ value: dateStr, type: format.Type.DATETIME });

                            // log.debug("Parsed Date:", parsedDate);
                            return parsedDate;
                        } catch (error) {
                            log.error("Error parsing date:", error);
                            return null;
                        }
                    };
                    searchResult.forEach((result) => {
                        const bagCoreMaterialId = result.bagCoreMaterialId.value;
                        const createdDateStr = result.created_date?.value;
                        // log.debug("createdDateStr", createdDateStr);
                        const lotNumber = result["Lot Number"];
                        // log.debug("lotNumber", lotNumber);
                        const quantity = result["Lot Quantity"];
                        const pieces = result["Lot Pieces"];
                        const isLotInactive = result.lot_inactive;

                        // Remove the parent item from the item text
                        result.Item.text = result.parent?.text
                            ? result.Item.text.replace(result.parent.text + " : ", "")
                            : result.Item.text;

                        // Initialize the group if it doesn't exist
                        if (!groupedResults[bagCoreMaterialId]) {
                            groupedResults[bagCoreMaterialId] = {
                                bagCoreMaterialId: result.bagCoreMaterialId,
                                Item: result.Item,
                                Size: result.Size,
                                Quantity: result.Quantity,
                                actual_quantity: result.Quantity,
                                actual_pieces: result.actual_pieces,
                                weight: result.Weight,
                                bag_no: result.bag_no,
                                uom: result.uom,
                                total_issue: result.total_issue,
                                to_issue: result.to_issue,
                                total_loss: result.total_loss,
                                total_receive: result.total_receive,
                                wo_line_no: result.wo_line_no,
                                work_order_id: result.work_order_id,
                                item_class: result.item_class,
                                isSerialized: result.is_serial,
                                issued_pieces: result.issued_pieces,
                                tobe_issued_pieces: result.tobe_issued_pieces,
                                received_pieces: result.received_pieces,
                                loss_pieces: result.loss_pieces,
                                issued_weight: result.Quantity,
                                balance_qty: result.balance_qty,
                                balance_pieces: result.balance_pieces,
                                itemImage: result.item_image,
                                actual_pieces_info: result.actual_pieces_info,
                                to_be_issued_pieces_info: result.to_be_issued_pieces_info,
                                balance_pieces_info: result.balance_pieces_info,
                                total_issued_pieces_info: result.issued_pieces_info,
                                loss_pieces_info: result.loss_pieces_info,
                                received_pieces_info: result.received_pieces_info,
                                stoneQualityGroup: result.stone_quality_group,
                                is_gold: GOLD_CLASS_IDS.includes(Number(result.item_class.value)),

                                scrap_qty: result.scrap_qty,
                                // scrap_pieces: result.scrap_pieces,
                                scrap_pieces_info: result.scrap_pieces_info,

                                isOthCharge: result.type?.value == 'OthCharge' || result.type?.value == 'Service',
                                isServiceItem: result.type?.value == 'Service',
                                purchasePrice: Number(result.cost?.value || 0),

                                metalColor: result.metal_color,
                                metalQuality: result.metal_quality,
                                purity: result.purity,
                                stone_quality: result.stone_quality,
                                stone_color: result.stone_color,
                                newly_added_line: result.newly_added_line,

                                inventoryDetail: [],
                                created_dates: []  // Store created dates for sorting
                            };
                        }

                        // Check if createdDateStr is empty or null before parsing
                        if (jjUtil.checkForParameter(createdDateStr)) {
                            // Parse the created date from the string format
                            const parsedCreatedDate = parseCustomDate(createdDateStr);
                            // log.debug("parsedCreatedDate", parsedCreatedDate);

                            // Add the parsed created date to the list of created_dates for this material
                            groupedResults[bagCoreMaterialId].created_dates.push(parsedCreatedDate);
                        }

                        // Add lot number and quantity to the inventoryDetail array if conditions are met
                        if (lotNumber.value && quantity.value && !isLotInactive?.value) {
                            groupedResults[bagCoreMaterialId].inventoryDetail.push({
                                lotNumber: lotNumber,
                                quantity: quantity,
                                pieces: pieces
                            });
                        }
                    });

                    // // Now we loop through each item to calculate the number of days since the earliest created date
                    // Object.values(groupedResults).forEach(item => {
                    //     if (item.created_dates.length > 0) {
                    //         // Get the minimum created date
                    //         const minCreatedDate = new Date(Math.min(...item.created_dates.map(date => date.getTime())));
                    //         // Get the current date
                    //         const currentDate = new Date();
                    //         // Calculate the difference in time (in milliseconds)
                    //         const timeDiff = Math.abs(currentDate - minCreatedDate);
                    //         // Convert the difference from milliseconds to days
                    //         const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                    //         // Assign the calculated number of days
                    //         item.days_since_creation = daysDiff;
                    //     }
                    // });

                    Object.values(groupedResults).forEach(item => {
                        if (item.created_dates.length > 0) {
                            // Convert all dates to UTC and get the minimum date
                            const minCreatedDate = new Date(Math.min(...item.created_dates.map(date =>
                                Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
                            )));

                            // Get the current date in UTC (without time)
                            const currentDate = Date.UTC(
                                new Date().getFullYear(),
                                new Date().getMonth(),
                                new Date().getDate()
                            );

                            // Calculate the difference in days
                            const daysDiff = Math.floor((currentDate - minCreatedDate) / (1000 * 3600 * 24));

                            // log.debug("{ minCreatedDate, currentDate, daysDiff }", { minCreatedDate, currentDate, daysDiff });

                            // Assign the calculated number of days
                            item.days_since_creation = daysDiff;
                        }
                    });

                    // log.debug("groupedResults", Object.values(groupedResults));

                    // Convert grouped results to an array
                    return Object.values(groupedResults);

                } catch (error) {
                    log.error('Error in getBagItemDetails', error);
                    return [];
                }
            },

            /**
             * Fetches ONLY unique metal qualities and colors from all Gold Bullion items in bags.
             * Returns clean arrays with text values only (no IDs).
             * 
             * @param {Array} bagIds - Array of bag generation IDs
             * @returns {Object} { qualities: ["G14", "G18", ...], colors: ["Yellow", "White", ...] }
             */
            getUniqueQualitiesAndColors(bagIds) {
                try {
                    if (!bagIds || bagIds.length === 0) {
                        log.debug("getUniqueQualitiesAndColors - No bag IDs provided");
                        return { qualities: [], colors: [] };
                    }

                    // Use SuiteQL to fetch ONLY Gold Bullion items with their quality and color
                    const sqlQuery = `
                        SELECT DISTINCT
                            BUILTIN.DF(item.custitem_jj_metal_quality) AS metalQualityText,
                            BUILTIN.DF(item.custitem_jj_metal_color) AS metalColorText
                        FROM CUSTOMRECORD_JJ_BAG_GENERATION
                        INNER JOIN CUSTOMRECORD_JJ_BAGCORE_MATERIALS 
                            ON CUSTOMRECORD_JJ_BAG_GENERATION.ID = CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bag_name
                        INNER JOIN item 
                            ON CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item = item.ID
                        WHERE CUSTOMRECORD_JJ_BAG_GENERATION.isinactive = 'F'
                        AND CUSTOMRECORD_JJ_BAGCORE_MATERIALS.isinactive = 'F'
                        AND item.CLASS = 22
                        AND CUSTOMRECORD_JJ_BAG_GENERATION.ID IN (${bagIds.join(',')})
                        ORDER BY metalQualityText, metalColorText
                    `;

                    let results = query.runSuiteQL({
                        query: sqlQuery,
                        params: []
                    });

                    const allResults = results.asMappedResults();

                    // Extract unique qualities and colors
                    const qualitiesSet = new Set();
                    const colorsSet = new Set();

                    allResults.forEach((result) => {
                        const metalQualityText = result.metalQualityText;
                        const metalColorText = result.metalColorText;

                        // Add only non-null, non-empty text values
                        if (metalQualityText && String(metalQualityText).trim()) {
                            qualitiesSet.add(String(metalQualityText).trim());
                        }
                        if (metalColorText && String(metalColorText).trim()) {
                            colorsSet.add(String(metalColorText).trim());
                        }
                    });

                    // Convert to sorted arrays
                    const qualities = Array.from(qualitiesSet).sort();
                    const colors = Array.from(colorsSet).sort();

                    log.debug("getUniqueQualitiesAndColors",
                        "Bags: " + bagIds.length +
                        " | Unique Qualities: [" + qualities.join(", ") + "]" +
                        " | Unique Colors: [" + colors.join(", ") + "]"
                    );

                    return {
                        qualities: qualities,
                        colors: colors
                    };

                } catch (error) {
                    log.error('Error in getUniqueQualitiesAndColors', error);
                    log.error('Error stack:', error.stack);
                    return { qualities: [], colors: [] };
                }
            },


            /**
            * Calculates total gold, diamond, and color stone weight for multiple bags
            * using a single saved search for performance optimization.
            *
            * @param {Array} bagIds - Array of bag generation IDs
            * @returns {Object} { goldWeight, diamondWeight, colorStoneWeight }
            */
            getTotalMaterialWeightsForBags(bagIds) {
                try {
                    if (!bagIds || bagIds.length === 0) {
                        return {
                            goldWeight: 0,
                            diamondWeight: 0,
                            colorStoneWeight: 0
                        };
                    }

                    let goldWeight = 0;
                    let diamondWeight = 0;
                    let colorStoneWeight = 0;

                    let bagCoreMaterialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: [
                            ["custrecord_jj_bagcoremat_bag_name.internalid", "anyof", bagIds],
                            "AND", ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_item.class", "anyof",
                                GOLD_CLASS_IDS.concat(DIAMOND_CLASSES_IDS, STONE_CLASSES_IDS)
                            ]
                        ],
                        columns: [
                            search.createColumn({
                                name: "class",
                                join: "custrecord_jj_bagcoremat_item",
                                label: "item_class"
                            }),
                            search.createColumn({
                                name: "custrecord_jj_bagcoremat_total_receive",
                                label: "total_receive"
                            })
                        ]
                    });

                    let searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: bagCoreMaterialsSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(bagCoreMaterialsSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    const GOLD_CLASS_SET = new Set(GOLD_CLASS_IDS.map(Number));
                    const DIAMOND_CLASS_SET = new Set(DIAMOND_CLASSES_IDS.map(Number));
                    const STONE_CLASS_SET = new Set(STONE_CLASSES_IDS.map(Number));

                    // log.debug('getTotalMaterialWeightsForBags - searchResults:', searchResults);

                    if (searchResults && Array.isArray(searchResults)) {
                        searchResults.forEach((result) => {
                            const receiveWeight = Number(result.total_receive?.value || 0);
                            const itemClassId = Number(result.item_class?.value);
                            // const itemClassIdStr = String(result.item_class?.value);

                            if (GOLD_CLASS_SET.has(itemClassId)) {
                                goldWeight += receiveWeight;
                            }
                            if (DIAMOND_CLASS_SET.has(itemClassId)) {
                                // Diamond weight is in carats, convert to grams (1 carat = 0.2 grams)
                                diamondWeight += receiveWeight;
                            }
                            if (STONE_CLASS_SET.has(itemClassId)) {
                                // Color stone weight is in carats, convert to grams (1 carat = 0.2 grams)
                                colorStoneWeight += receiveWeight;
                            }
                        });
                    }

                    return {
                        goldWeight,
                        diamondWeight,
                        colorStoneWeight
                    };

                } catch (error) {
                    log.error('Error in getTotalMaterialWeightsForBags', error);
                    return { goldWeight: 0, diamondWeight: 0, colorStoneWeight: 0 };
                }
            },

            getTotalGoldWeightForBags(bagIds) {
                const weights = this.getTotalMaterialWeightsForBags(bagIds);
                return weights.goldWeight;
            },

            getTotalDiamondWeightForBags(bagIds) {
                const weights = this.getTotalMaterialWeightsForBags(bagIds);
                return weights.diamondWeight;
            },

            getTotalColorStoneWeightForBags(bagIds) {
                const weights = this.getTotalMaterialWeightsForBags(bagIds);
                return weights.colorStoneWeight;
            },



            /**
             * Retrieves customer details from a saved search.
             * 
             * @returns {Array} An array of customer details.
             */
            getCustomerDetails() {
                try {
                    // Create the customer search with optional filters
                    let customerSearchObj = search.create({
                        type: "customer",
                        filters: [
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "internal_id" }),
                            search.createColumn({ name: "altname", label: "name" }),
                            // search.createColumn({ name: "entityid", label: "name" }),
                            search.createColumn({ name: "companyname", label: "company_name" })
                        ]
                    });

                    // Use jjUtil.dataSets to iterate over the search results
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: customerSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(customerSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                } catch (error) {
                    log.error("Error in getCustomerDetails", error);
                    return [];
                }
            },

            /**
             * Retrieves bins for a specific location.
             * 
             * @param {string} locationId - The internal ID of the location.
             * @returns {Array} An array of bins with value, text, and location_id.
             */
            getBinsForLocation(locationId) {
                try {
                    if (!locationId) {
                        log.error("getBinsForLocation: Location ID is required");
                        return [];
                    }

                    log.debug("getBinsForLocation: Fetching bins for locationId:", locationId);

                    const binSearchFilters = [['location', 'anyof', locationId], "AND", ["inactive", "is", "F"]];
                    const binSearchColInternalId = search.createColumn({ name: 'internalid' });
                    const binSearchColBinNumber = search.createColumn({ name: 'binnumber', sort: search.Sort.ASC });
                    const binSearchColLocation = search.createColumn({ name: 'location' });

                    const binSearch = search.create({
                        type: 'bin',
                        filters: binSearchFilters,
                        columns: [
                            binSearchColInternalId,
                            binSearchColBinNumber,
                            binSearchColLocation,
                        ],
                    });

                    const binResults = [];
                    binSearch.run().each(function (result) {
                        binResults.push({
                            value: result.getValue(binSearchColInternalId),
                            text: result.getValue(binSearchColBinNumber),
                            location_id: result.getValue(binSearchColLocation),
                        });
                        return true;
                    });

                    log.debug("getBinsForLocation: Bins found:", binResults.length);
                    return binResults;

                } catch (error) {
                    log.error('Error in getBinsForLocation', error);
                    return [];
                }
            },

            /**
             * Retrieves a list of order types.
             * 
             * @returns {Array} List of order types.
             * @throws Logs an error and returns an empty array if the search fails.
             */
            getOrderTypes() {
                try {
                    // Create the order type search with optional filters
                    let orderTypeSearchObj = search.create({
                        // type: "customlist_jj_order_type",
                        type: "customlist_jj_order_type_test",
                        filters: [
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "name", label: "name" }),
                            search.createColumn({ name: "internalid", label: "internal_id" })
                        ]
                    });

                    // Use jjUtil.dataSets to iterate over the search results
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: orderTypeSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(orderTypeSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                } catch (error) {
                    log.error("Error in getOrderTypes", error);
                    return [];
                }
            },

            /**
             * Function to retrieve priority list items from customlist_jj_order_priority.
             * @returns {Array} Array of objects containing priority name and internal ID.
             */
            getPriorityList() {
                try {
                    // Create the priority list search
                    let prioritySearchObj = search.create({
                        type: "customlist_jj_order_priority",
                        filters: [
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "name", label: "name" }),
                            search.createColumn({ name: "internalid", label: "internal_id" })
                        ]
                    });

                    // Use jjUtil.dataSets to iterate over the search results
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: prioritySearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(prioritySearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                } catch (error) {
                    log.error("Error in getPriorityList", error);
                    return [];
                }
            },

            /**
             * Function to retrieve items associated with a specific work order using jjUtil.dataSets.
             * @param {number} workOrderId - Internal ID of the work order.
             * @returns {Array} Array of objects containing item, quantity, and units.
             */
            getWorkOrderItems(workOrderId) {
                try {
                    log.debug("getWorkOrderItems", `Fetching items for work order ID: ${workOrderId}`);
                    // Define the work order search object with necessary filters and columns
                    let workorderSearchObj = search.create({
                        type: "workorder",
                        filters: [
                            ["type", "anyof", "WorkOrd"],
                            "AND",
                            // ["internalidnumber", "equalto", workOrderId],
                            ["internalid", "anyof", workOrderId],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["transactionlinetype", "anyof", "@NONE@"],
                            "AND",
                            ["mainline", "is", "F"],
                            // "AND",
                            // ["quantity", "greaterthan", "0"],
                            "AND",
                            ["item.type", "noneof", "@NONE@", "OthCharge", "Service"]

                        ],
                        columns: [
                            search.createColumn({ name: "item", label: "Item" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "unit", label: "Units" }),
                            search.createColumn({ name: "unitid", label: "Units_id" }),
                            search.createColumn({ name: "line", label: "line_id" }),
                            search.createColumn({ name: "lineuniquekey", label: "lineuniquekey" }),
                            search.createColumn({ name: "custcol_jj_pieces", label: "pieces" }),

                            search.createColumn({ name: "isserialitem", join: "item", label: "isSerialized" }),
                            search.createColumn({ name: "class", join: "item", label: "itemClassId" }),

                            search.createColumn({ name: "parent", join: "item", label: "Parent" }),
                            search.createColumn({ name: "internalid", label: "workOrderId" })
                        ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: workorderSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(workorderSearchObj, 'label'),
                        PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
                        PAGE_SIZE: 1000 // Adjust page size if needed
                    });

                    searchResult.forEach(result => {
                        // workOrderId = result.workOrderId;
                        result.Item.text = result.Parent?.text ? result.Item.text.replace(result.Parent.text + " : ", "") : result.Item.text;
                        // Item = result.Item;
                        // Quantity = result.Quantity;
                        // Units = result.Units;
                        // Units_id = result.Units_id;
                        // line_id = result.line_id;
                        // lineuniquekey = result.lineuniquekey;
                        // pieces = result.pieces;
                        // isSerialized = result.isSerialized;
                        // itemClassId = result.itemClassId;
                    });

                    return searchResult;

                    // Use jjUtil.dataSets to iterate over the search results
                    // return jjUtil.dataSets.iterateSavedSearch({
                    //     searchObj: workorderSearchObj,
                    //     columns: jjUtil.dataSets.fetchSavedSearchColumn(workorderSearchObj, 'label'),
                    //     PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
                    //     PAGE_SIZE: 1000 // Adjust page size if needed
                    // });


                } catch (error) {
                    log.error("Error in getWorkOrderItems", error);
                    return [];
                }
            },

            getBagCoreTracking(coreRecords) {
                try {
                    if (!coreRecords || coreRecords.length === 0) {
                        return [];
                    }
                    let bagCoreTrackings = [];
                    let bagGenerationSearchObj = search.create({
                        type: "customrecord_jj_bag_generation",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_baggen_merge", "is", "F"],
                            "AND", ["custrecord_jj_baggen_split", "is", "F"],
                            "AND", ["custrecord_jj_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_baggen_bagcore", "anyof", coreRecords]
                        ],
                        columns: ["internalid", "name", "custrecord_jj_baggen_bagcore"]
                    });

                    bagGenerationSearchObj.run().each(function (result) {
                        bagCoreTrackings.push(result.getValue('custrecord_jj_baggen_bagcore'));
                        return true;
                    });
                    let recordsToReject = [];
                    // push the coreRecords which are not in bagCoreTrackings
                    coreRecords.forEach(coreRecord => {
                        if (!bagCoreTrackings.includes(coreRecord)) {
                            recordsToReject.push(coreRecord);
                        }
                    });
                    return recordsToReject;
                } catch (error) {
                    log.error('Error in getBagCoreTracking', error);
                    return [];
                }
            },

            getBagMovementDetails(bagIds, toDepartment, pageIndex, bagSearchKey, params, pageSize) {
                try {
                    // log.debug('getBagMovementDetails', { bagIds, toDepartment, pageIndex, bagSearchKey, params });
                    let filters = [["custrecord_jj_bagmov_is_acknowledged", "is", "F"], "AND", ["isinactive", "is", "F"]];

                    if (bagIds && bagIds.length > 0) {
                        filters.push("AND", ["custrecord_jj_bagmov_bagno", "anyof", bagIds]);
                    } else if (toDepartment) {
                        log.debug("getBagMovementDetails toDepartment", { toDepartment });
                        filters.push("AND", ["custrecord_jj_bagmov_to_dept", "anyof", toDepartment]);
                    }

                    if (bagSearchKey && params == "bag_acknowledgement") {
                        filters.push("AND", ["custrecord_jj_bagmov_bagno.idtext", "contains", bagSearchKey]);
                    }

                    let bagMovementSearchObj = search.create({
                        type: "customrecord_jj_bag_movement",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", label: "bag_movement_id" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_bagno", sort: search.Sort.DESC, label: "bag_no" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_from_man", label: "from_manufacturer" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_to_man", label: "to_manufacturer" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_from_dept", label: "from_department" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_to_dept", label: "to_department" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_src_operation", label: "operation_id" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_BAGMOV_BAGNO", label: "quantity_per_bag" }),
                            search.createColumn({ name: "custrecord_jj_bagmov_bagcore", label: "bag_core_tracking" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_BAGMOV_BAGCORE", label: "work_order_id" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_vendor", join: "CUSTRECORD_JJ_BAGMOV_SRC_OPERATION", label: "vendor_id" }),
                            search.createColumn({ name: "custrecord_jj_mandept_outsourcing_fab", join: "CUSTRECORD_JJ_BAGMOV_TO_DEPT", label: "is_outsourcing_fab" }),
                            search.createColumn({ name: "custrecord_jj_mandept_accounting_inward", join: "CUSTRECORD_JJ_BAGMOV_TO_DEPT", label: "is_accounting_inward" }),
                            // search.createColumn({ name: "custrecord_jj_mandept_accounting_inward", join: "CUSTRECORD_JJ_BAGMOV_FROM_DEPT", label: "is_accounting_inward" }),
                            // search.createColumn({ name: "custrecord_jj_mandept_outsourcing_fab", join: "CUSTRECORD_JJ_BAGMOV_FROM_DEPT", label: "is_outsourcing_fab" })
                            search.createColumn({ name: "custrecord_jj_ring_size", join: "CUSTRECORD_JJ_BAGMOV_BAGCORE", label: "ring_size" })

                        ]
                    });

                    // // Use jjUtil.dataSets to iterate over the search results
                    if (!pageIndex) {
                        return jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagMovementSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagMovementSearchObj, 'label'),
                            PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
                            PAGE_SIZE: 1000 // Adjust page size if needed
                        });
                    } else {
                        let totalRecords = bagMovementSearchObj.runPaged().count;
                        let paginatedResults = jjUtil.dataSets.iterateSavedSearch({
                            searchObj: bagMovementSearchObj,
                            columns: jjUtil.dataSets.fetchSavedSearchColumn(bagMovementSearchObj, 'label'),
                            PAGE_INDEX: pageIndex, // If jjUtil handles pagination, this can be set to null
                            PAGE_SIZE: pageSize || PAGE_SIZE,
                        });

                        // // Calculate pagination
                        // let totalRecords = allResults.length;
                        // log.debug("totalRecords", totalRecords);
                        // let totalPages = Math.ceil(totalRecords / PAGE_SIZE);
                        // log.debug("totalPages", totalPages);
                        // log.debug("currentPageIndex", pageIndex);
                        // let START_INDEX = (pageIndex - 1 || 0) * PAGE_SIZE;
                        // let END_INDEX = START_INDEX + PAGE_SIZE;
                        // log.debug("START_INDEX", START_INDEX);
                        // log.debug("END_INDEX", END_INDEX);

                        // Slice results for the current page
                        // let paginatedResults = allResults.slice(START_INDEX, END_INDEX);

                        log.debug("paginatedResults", paginatedResults);
                        // log.debug("getBagMovementDetails", {
                        //     "currentPageIndex": pageIndex,
                        //     "totalPages": totalPages,
                        //     "totalItems": totalRecords
                        // });

                        // return paginatedResults;

                        return {
                            "currentPageIndex": paginatedResults?.pageInfo?.pageIndex || 0,
                            "totalPages": paginatedResults?.pageInfo?.pageLength || 0,
                            "bagList": paginatedResults.lines,
                            "totalItems": totalRecords
                        }
                    }
                } catch (error) {
                    log.error('Error in getBagMovementDetails', error);
                    return [];
                }
            },

            getMetals(departmentId, isCastingDept) {
                try {
                    let metalList = [];
                    let searchType = "";
                    let filters = [
                        ["isinactive", "is", "F"]
                        // "AND",
                        // ["formulatext: CASE      WHEN {parent.internalid} IN (7539, 7540, 7538) THEN 'SubItem'  ELSE 'NotSubItem' END", "is", "SubItem"]
                    ];

                    if (!departmentId) {
                        filters.push("AND", ["type", "anyof", "Assembly"], "AND", ["parent", "anyof", METAL_ARRAY_GOLD]);
                        searchType = "assemblyitem";
                        // filters.push("AND", ["internalid", "anyof", GOLD_SCRAP_ITEM_ID]);
                        // searchType = "item";
                        // } else if (departmentId && departmentId == CASTING_DEPT_ID) {
                    } else if (departmentId && isCastingDept) {
                        // filters.push("AND", ["type", "anyof", "Assembly"], "AND", ["parent", "anyof", METAL_ARRAY_GOLD]);
                        // searchType = "assemblyitem";
                        filters.push("AND", ["internalid", "anyof", GOLD_SCRAP_ITEM_ID]); // TODO: Need Update
                        searchType = "item";
                    } else {
                        filters.push("AND", ["internalid", "anyof", PURE_GOLD_ARRAY]);
                        searchType = "item"
                    }

                    let assemblyitemSearchObj = search.create({
                        type: searchType,
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "itemid", label: "Name" }),
                            search.createColumn({ name: "parent", label: "Parent" }),
                            search.createColumn({ name: "custitem_jj_metal_quality", label: "Scrap Quality" })
                        ]
                    });
                    assemblyitemSearchObj.run().each(function (result) {
                        let itemName = result.getValue('itemid');
                        let parent = result.getText('parent');
                        let formattedName = itemName?.split(parent + " : ")?.pop();
                        // log.debug("itemName, parent, finalItemName", { itemName, parent, split: parent + " : ", formattedName });
                        metalList.push({
                            value: result.getValue('internalid'),
                            name: formattedName || itemName,
                            scrapQuality: result.getValue('custitem_jj_metal_quality')
                        });
                        return true;
                    });
                    return metalList;
                } catch (error) {
                    log.error('Error in getMetals', error);
                    return [];
                }
            },
            getBagTreeList(body, date) {
                try {
                    let metal = body?.metal;
                    let locations = body?.locations;
                    if (!metal || !locations || !date) {
                        log.error("Missing required Parameters", { metal, locations, date });
                        return [];
                    }
                    let bagTreeLoadList = [];

                    let customrecord_jj_bag_tree_loadSearchObj = search.create({
                        type: "customrecord_jj_bag_tree_load",
                        filters:
                            [
                                ["isinactive", "is", "F"],
                                "AND",
                                ["custrecord_jj_bag_tree_item", "anyof", metal],
                                "AND",
                                ["custrecord_jj_bag_tree_date", "on", date],//"22-Nov-2024"
                                "AND",
                                ["custrecord_jj_bag_tree_location", "anyof", locations]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "Internal ID" }),
                                search.createColumn({ name: "name", label: "Name" }),
                                search.createColumn({ name: "custrecord_jj_bag_tree_item", label: "Metal" }),
                                search.createColumn({ name: "custrecord_jj_bag_load_status", label: "Load Status" }),
                                search.createColumn({ name: "custrecord_jj_bag_load_locked", label: "Locked" }),
                                search.createColumn({ name: "custrecord_jj_bag_tree_bag_list", label: "Bags" }),
                                search.createColumn({ name: "custrecord_jj_bag_tree_bag_count", label: "No. of Bags" }),
                                search.createColumn({ name: "custrecord_jj_bag_load_core_tracking", label: "Bag Core Tracking" })
                            ]
                    });
                    // let searchResultCount = customrecord_jj_bag_tree_loadSearchObj.runPaged().count;
                    // log.debug("customrecord_jj_bag_tree_loadSearchObj result count", searchResultCount);
                    customrecord_jj_bag_tree_loadSearchObj.run().each(function (result) {

                        bagTreeLoadList.push({
                            id: result.getValue({ name: 'internalid' }),
                            name: result.getValue({ name: 'name' }),
                            item: result.getValue({ name: 'custrecord_jj_bag_tree_item' }),
                            status: result.getValue({ name: 'custrecord_jj_bag_load_status' }),
                            status_name: result.getText({ name: 'custrecord_jj_bag_load_status' }),
                            locked: result.getValue({ name: 'custrecord_jj_bag_load_locked' }),
                            bags: result.getValue({ name: 'custrecord_jj_bag_tree_bag_list' }),
                            bagCount: result.getValue({ name: 'custrecord_jj_bag_tree_bag_count' }),
                            coreTracking: result.getValue({ name: 'custrecord_jj_bag_load_core_tracking' })
                        });
                        // .run().each has a limit of 4,000 results
                        return true;
                    });
                    log.debug('bag Tree Load records List', bagTreeLoadList)
                    return bagTreeLoadList;
                } catch (e) {
                    log.error('error @ getBagTreeList', e);
                    return [];
                }
            },

            getBagsWithComponets(metalId, bagId) {
                try {
                    log.debug("metalId", metalId);
                    log.debug("bagId", bagId);
                    if (!metalId || !bagId || !bagId?.length) {
                        return [];
                    }
                    let bagcoreMaterials = [];
                    let bagcoreMaterialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: [
                            // ["custrecord_jj_bagcoremat_item", "anyof", metalId],
                            [
                                ["custrecord_jj_bagcoremat_item", "anyof", metalId],
                                "OR",
                                ["custrecord_jj_bagcoremat_item.custitem_jj_relate_item_reference", "anyof", metalId]
                            ],
                            "AND",
                            ["isinactive", "is", "F"],
                            "AND",
                            ["custrecord_jj_bagcoremat_bag_name.isinactive", "is", "F"],
                            "AND",
                            ["custrecord_jj_bagcoremat_bag_name", "anyof", bagId]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_piece", label: "weight" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_uom", label: "uom" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_bag_name", label: "bag_no" })
                        ]
                    });
                    bagcoreMaterialsSearchObj.run().each(function (result) {
                        bagcoreMaterials.push({
                            quantity: result.getValue('custrecord_jj_bagcoremat_qty'),
                            weight: result.getValue('custrecord_jj_bagcoremat_piece'),
                            uom: result.getText('custrecord_jj_bagcoremat_uom'),
                            bag_no: result.getValue('custrecord_jj_bagcoremat_bag_name')
                        });
                        return true;
                    });
                    return bagcoreMaterials;
                } catch (error) {
                    log.error('Error in getBagsWithComponets', error);
                    return [];
                }
            },
            getOperationsBag(body, receive) {
                try {
                    log.debug("receive", receive);
                    if (!body.dept) {
                        return [];
                    }
                    let filters = [
                        ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_merge", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_is_rejected", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_entry", "isnotempty", ""], //["custrecord_jj_oprtns_entry", "isempty", ""]
                        "AND", ["custrecord_jj_oprtns_exit", "isempty", ""],
                        "AND", ["custrecord_jj_oprtns_status", "noneof", OPERATION_STATUS_IN_TRANSIT],
                        "AND", ["custrecord_jj_oprtns_department", "anyof", body.dept],
                        "AND", ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagcore.isinactive", "is", "F"]
                    ]; //["custrecord_jj_oprtns_exit", "isnotempty", ""]

                    // // Add filters dynamically based on the presence of values in the body object
                    // if (body.customer) {
                    //     filters.push("AND");
                    //     filters.push(["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_customer", "anyof", body.customer]);
                    // }
                    // if (body.dept) {
                    //     filters.push("AND");
                    //     filters.push();
                    // }
                    // if (body.design) {
                    //     filters.push("AND");
                    //     filters.push(["custrecord_jj_oprtns_bagcore.custrecord_jj_bagcore_design", "is", body.design]);
                    // }

                    if (receive) {
                        filters.push(
                            "AND", ["custrecord_jj_oprtns_received", "is", 'F'],
                            "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_is_issued", "is", "T"],
                            "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "anyof", "@NONE@"]
                        );
                    }

                    // These filters are always applied
                    // if (filters.length > 0) {
                    //     filters.push("AND");
                    // }
                    // filters.push(["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_merge", "is", "F"]);
                    // filters.push("AND");
                    // filters.push(["custrecord_jj_oprtns_bagno.custrecord_jj_is_rejected", "is", "F"]);
                    // filters.push("AND");
                    // filters.push(["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_split", "is", "F"]);

                    // Create the search
                    let customrecord_jj_operationsSearchObj = search.create({
                        type: "customrecord_jj_operations",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagno", label: "Bag Name/Number", sort: search.Sort.DESC }),
                            search.createColumn({ name: "custrecord_jj_oprtns_department", label: "Department " }),
                            search.createColumn({ name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "Present Department" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagcore", label: "Bag Core Tracking" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "Quantity Per Bag" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Design" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Work Order" }),

                            // search.createColumn({ name: "custrecord_jj_mandept_outsourcing_fab", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_outsourcing_fab" }),
                            // search.createColumn({ name: "custrecord_jj_mandept_vendor", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "outsourcing_vendor" }),
                            // search.createColumn({ name: "custrecord_jj_mandept_accounting_outward", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_accounting_outward" }),
                            search.createColumn({ name: "custrecord_jj_mandept_accounting_inward", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_accounting_inward" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_vendor", label: "vendor_id" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Item Category" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer Name" }),

                            search.createColumn({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "orderType" }),
                            search.createColumn({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "repairSerial" }),
                            search.createColumn({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "repairSerialWt" }),

                        ]
                    });
                    let searchResultCount = customrecord_jj_operationsSearchObj.runPaged().count;
                    log.debug("customrecord_jj_operationsSearchObj result count", searchResultCount);
                    // customrecord_jj_operationsSearchObj.run().each(function (result) {
                    // .run().each has a limit of 4,000 results
                    let response = [];
                    customrecord_jj_operationsSearchObj.run().each(function (result) {
                        let orderType = result.getValue({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "orderType" });
                        // Build the object in the required format
                        let obj = {
                            operation_id: {
                                value: result.getValue({ name: "internalid", label: "Internal ID" }), // Internal ID of the record
                                text: result.getValue({ name: "internalid", label: "Internal ID" })
                            },
                            bag_core_tracking: {
                                value: result.getValue({ name: "custrecord_jj_oprtns_bagcore", label: "Bag Core Tracking" }),
                                text: result.getValue({ name: "custrecord_jj_oprtns_bagcore", label: "Bag Core Tracking" })
                            },
                            bag_no: {
                                value: result.getValue({ name: "custrecord_jj_oprtns_bagno" }),
                                text: result.getText({ name: "custrecord_jj_oprtns_bagno" })
                            },
                            department: {
                                value: result.getValue({ name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "Present Department" }),
                                text: result.getText({ name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "Present Department" })
                            },
                            quantity_per_bag: {
                                value: result.getValue({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "Quantity Per Bag" }),
                                text: ''
                            },
                            style_no: {
                                value: result.getValue({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Design" }),
                                text: ''
                            },
                            customer: {
                                value: result.getValue({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer" }),
                                text: result.getValue({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer Name" })
                                    || result.getText({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer" })
                            },
                            work_order: {
                                value: result.getValue({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Work Order" }),
                                text: result.getText({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Work Order" })
                            },
                            is_accounting_inward: {
                                value: result.getValue({ name: "custrecord_jj_mandept_accounting_inward", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_accounting_inward" }),
                                text: result.getText({ name: "custrecord_jj_mandept_accounting_inward", join: "CUSTRECORD_JJ_OPRTNS_DEPARTMENT", label: "is_accounting_inward" })
                            },
                            category: {
                                value: result.getValue({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Item Category" }),
                                text: result.getText({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Item Category" })
                            },
                            orderType: {
                                value: orderType,
                                text: result.getText({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "orderType" })
                            },
                            repairSerial: {
                                value: result.getValue({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "repairSerial" }),
                                text: result.getText({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "repairSerial" })
                            },
                            repairSerialWt: {
                                value: result.getValue({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "repairSerialWt" }),
                                text: result.getText({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "repairSerialWt" })
                            },
                            isRepairOrder: Number(orderType) == Number(REPAIR_ORDER_TYPE_ID),
                            isJobWorkOrder: Number(orderType) == Number(JOB_WORK_ORDER_TYPE_ID),
                        };

                        // Add the object to the results array
                        response.push(obj);
                        return true; // Continue iteration
                    });
                    log.debug('response is', response);
                    return response;

                } catch (error) {
                    log.error('error @ getOperationsBag', error);
                    return [];
                }
            },

            // getWaxTreeList(bagLoadId, param) {
            //     try {
            //         log.debug("Inside search", param);
            //         let filters = [
            //             ["isinactive", "is", "F"]
            //         ]
            //         let columns = [
            //             search.createColumn({ name: "internalid", label: "wax_tree_id" }),
            //             search.createColumn({ name: "name", label: "wax_tree_name" }),
            //             search.createColumn({ name: "custrecord_jj_total_weight_needed", label: "metal_needed" }),
            //             // search.createColumn({ name: "custrecord_jj_total_quantity", label: "Total Quantity" }),
            //             search.createColumn({ name: "custrecord_jj_metal_issue", label: "metal_issue" }),
            //             search.createColumn({ name: "custrecord_jj_metal_issue_weight", label: "metal_issue_weight" }),
            //             search.createColumn({ name: "custrecord_jj_metal_issue_units", label: "metal_issue_unit" }),
            //             search.createColumn({ name: "name", join: "CUSTRECORD_JJ_BAGS", label: "bag_no_name" }),
            //             search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_BAGS", label: "bag_no_id" }),
            //             search.createColumn({ name: "custrecord_jj_no_of_bags", label: "no_of_bags" }),
            //             search.createColumn({ name: "custrecord_jj_wax_weight", label: "wax_weight" })
            //         ]
            //         if (param == 'casting_tree') {
            //             log.debug("Inside metalissue check");
            //             filters.push("AND", ["custrecord_jj_metal_issue", "is", "T"]);
            //             columns.push(search.createColumn({ name: "custrecord_jj_metal_list", label: "metal" }));
            //             columns.push(search.createColumn({ name: "custrecord_jj_load_list", label: "load_id" }));
            //             columns.push(search.createColumn({ name: "custrecord_jj_date", label: "date" }));
            //             columns.push(search.createColumn({ name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "Bag Core Tracking" }));
            //             columns.push(search.createColumn({ name: "custrecord_jj_used_lot", label: "used_lot" }));
            //         } else if (!param || param == "undefined") {
            //             log.debug("Inside bagload");

            //             if (!bagLoadId) {
            //                 return []
            //             }
            //             filters.push("AND", ["custrecord_jj_load_list", "anyof", bagLoadId]);
            //         }
            //         let customrecord_wax_treeSearchObj = search.create({
            //             type: "customrecord_jj_wax_tree",
            //             filters: filters,
            //             columns: columns
            //         });
            //         let castingTree = jjUtil.dataSets.iterateSavedSearch({
            //             searchObj: customrecord_wax_treeSearchObj,
            //             columns: jjUtil.dataSets.fetchSavedSearchColumn(customrecord_wax_treeSearchObj, 'label'),
            //             PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
            //             PAGE_SIZE: 1000 // Adjust page size if needed
            //         });
            //         log.debug("castingTree", castingTree);
            //         return castingTree;

            //     } catch (e) {
            //         log.error('error @ getWaxTreeList', e.message);
            //         return []
            //     }
            // },

            getWaxTreeList(bagLoadId, param, locations) {
                try {
                    // log.debug("Start: getWaxTreeList", { bagLoadId, param });

                    if (!bagLoadId && (!param || param === "undefined")) {
                        log.debug("No bagLoadId or valid param provided, returning empty.");
                        return [];
                    }

                    // Base filters and columns
                    let filters = [["isinactive", "is", "F"]];

                    // if (locations) {
                    //     filters.push("AND", ["custrecord_jj_load_list.custrecord_jj_bag_tree_location", "anyof", locations]);
                    // }
                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_load_list.custrecord_jj_bag_tree_location", "anyof", locationArr]);
                        }
                    }
                    let columns = [
                        { name: "internalid", sort: search.Sort.DESC, label: "wax_tree_id" },
                        { name: "name", label: "wax_tree_name" },
                        { name: "custrecord_jj_total_weight_needed", label: "metal_needed" },
                        { name: "custrecord_jj_metal_issue", label: "metal_issue" },
                        { name: "custrecord_jj_metal_issue_weight", label: "metal_issue_weight" },
                        { name: "custrecord_jj_metal_issue_units", label: "metal_issue_unit" },
                        { name: "name", join: "CUSTRECORD_JJ_BAGS", label: "bag_no_name" },
                        { name: "internalid", join: "CUSTRECORD_JJ_BAGS", label: "bag_no_id" },
                        { name: "custrecord_jj_no_of_bags", label: "no_of_bags" },
                        { name: "custrecord_jj_wax_weight", label: "wax_weight" },
                        { name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_BAGS", label: "bag_department" },
                        { name: "altname", label: "wax_tree_alt_name" },
                        { name: "custrecord_jj_bag_components_wt", label: "bag_components_wt" },
                    ];

                    // Add specific filters and columns based on `param`
                    switch (param) {
                        case "casting_tree":
                            filters.push(
                                "AND", ["custrecord_jj_metal_issue", "is", "T"],
                                "AND", ["custrecord_jj_moved_to_next_dept", "is", "F"],
                                "AND", ["custrecord_jj_moved_to_bagging", "is", "F"]
                            );
                            columns.push(
                                { name: "custrecord_jj_metal_list", label: "metal" },
                                { name: "custrecord_jj_date", label: "date" },
                                { name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "bag_core_tracking" },
                                { name: "custrecord_jj_used_lot", label: "used_lot" },
                                { name: "isserialitem", join: "CUSTRECORD_JJ_METAL_LIST", label: "is_serialized" },
                                { name: "class", join: "CUSTRECORD_JJ_METAL_LIST", label: "item_class_id" },

                                { name: "custrecord_jj_load_list", label: "load_id" },
                                { name: "custrecord_jj_final_tree_weight", label: "final_tree_weight" },

                                { name: "custrecord_jj_to_tree_cutting_status", label: "progress_status" },
                                { name: "custrecord_jj_casting_loss", label: "casting_loss_weight" },

                                { name: "custrecord_jj_metal_moved_to_next_dept", label: "metal_moved_to_next_dept" },
                                { name: "custrecord_jj_casting_loss_transfer", label: "casting_loss_transfer" },
                            );
                            break;

                        case "tree_cutting":
                            filters.push(
                                "AND", ["custrecord_jj_metal_issue", "is", "T"],
                                "AND", ["custrecord_jj_moved_to_next_dept", "is", "T"],
                                "AND", ["custrecord_jj_moved_to_grinding", "is", "F"]
                            );
                            columns.push(
                                { name: "custrecord_jj_metal_list", label: "metal" },
                                { name: "custrecord_jj_date", label: "date" },
                                { name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "bag_core_tracking" },
                                { name: "custrecord_jj_used_lot", label: "used_lot" },
                                { name: "isserialitem", join: "CUSTRECORD_JJ_METAL_LIST", label: "is_serialized" },
                                { name: "class", join: "CUSTRECORD_JJ_METAL_LIST", label: "item_class_id" },

                                { name: "custrecord_jj_final_tree_weight", label: "final_tree_weight" },
                                { name: "custrecord_jj_received_yield_weight", label: "yield_weight" },

                                { name: "custrecord_jj_to_grinding_status", label: "progress_status" },
                                { name: "custrecord_jj_tree_weight", label: "tree_weight" },
                                { name: "custrecord_jj_cutting_loss_weight", label: "loss_weight" },

                                { name: "custrecord_jj_metal_moved_to_grinding", label: "metal_moved_to_grinding" },
                                { name: "custrecord_jj_cutting_loss_transfer", label: "cutting_loss_transfer" },
                                { name: "custrecord_jj_wax_weight_transferred", label: "wax_weight_transferred" },
                            );
                            break;

                        case "tree_grinding":
                            filters.push(
                                "AND", ["custrecord_jj_metal_issue", "is", "T"],
                                "AND", ["custrecord_jj_moved_to_grinding", "is", "T"],
                                "AND", ["custrecord_jj_moved_to_bagging", "is", "F"]
                            );
                            columns.push(
                                { name: "custrecord_jj_metal_list", label: "metal" },
                                { name: "custrecord_jj_date", label: "date" },
                                { name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "bag_core_tracking" },
                                { name: "custrecord_jj_used_lot", label: "used_lot" },
                                { name: "isserialitem", join: "CUSTRECORD_JJ_METAL_LIST", label: "is_serialized" },
                                { name: "class", join: "CUSTRECORD_JJ_METAL_LIST", label: "item_class_id" },

                                { name: "custrecord_jj_received_yield_weight", label: "yield_weight" },

                                { name: "custrecord_jj_to_bagging_status", label: "progress_status" },
                                { name: "custrecord_jj_received_weight", label: "received_weight" },
                                { name: "custrecord_jj_loss_weight", label: "loss_weight" },

                                { name: "custrecord_jj_metal_moved_to_bagging", label: "metal_moved_to_bagging" },
                                { name: "custrecord_jj_loss_transferred", label: "loss_transferred" },
                            );
                            break;

                        default:
                            filters.push("AND", ["custrecord_jj_load_list", "anyof", bagLoadId]);
                            columns.push(
                                { name: "custrecord_jj_multiplier_used", label: "formula_multiplier" },
                                { name: "custrecord_jj_constant_used", label: "formula_constant" },
                                { name: "custrecord_jj_extra_added", label: "extra_qty" },
                            );
                    }

                    // if (param == 'casting_tree') {
                    //     log.debug("Inside metalissue check");
                    //     filters.push(
                    //         "AND", ["custrecord_jj_metal_issue", "is", "T"],
                    //         "AND", ["custrecord_jj_moved_to_next_dept", "is", "F"],
                    //     );
                    //     columns.push(search.createColumn({ name: "custrecord_jj_metal_list", label: "metal" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_load_list", label: "load_id" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_date", label: "date" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "bag_core_tracking" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_used_lot", label: "used_lot" }));
                    // } else if (param == 'tree_cutting') {
                    //     filters.push(
                    //         "AND", ["custrecord_jj_metal_issue", "is", "T"],
                    //         "AND", ["custrecord_jj_moved_to_next_dept", "is", "T"],
                    //         "AND", ["custrecord_jj_moved_to_bagging", "is", "F"]
                    //     );
                    //     columns.push(search.createColumn({ name: "custrecord_jj_metal_list", label: "metal" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_load_list", label: "load_id" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_date", label: "date" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "bag_core_tracking" }));
                    //     columns.push(search.createColumn({ name: "custrecord_jj_used_lot", label: "used_lot" }));
                    // } else if (!param || param == "undefined") {
                    //     log.debug("Inside bagload");

                    //     if (!bagLoadId) {
                    //         return []
                    //     }
                    //     filters.push("AND", ["custrecord_jj_load_list", "anyof", bagLoadId]);
                    // }

                    // Create search and fetch results
                    let waxTreeSearchObj = search.create({
                        type: "customrecord_jj_wax_tree",
                        filters: filters,
                        columns: columns.map((col) => search.createColumn(col)),
                    });
                    let castingTree = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: waxTreeSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(waxTreeSearchObj, 'label'),
                        PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
                        PAGE_SIZE: 1000 // Adjust page size if needed
                    });
                    // log.debug("Results from getWaxTreeList", castingTree);
                    return castingTree;

                } catch (e) {
                    log.error("Error in getWaxTreeList", e.message);
                    return [];
                }
            },
            getBagTreeLoadList(bagLoadId, bagNumWaxTree, locations) {
                try {
                    if (!bagLoadId || !locations) {
                        log.error("Missing Required Parameters", { bagLoadId: bagLoadId, bagNumWaxTree: bagNumWaxTree, locations: locations });
                        return {}
                    }
                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["internalid", "anyof", bagLoadId],
                        "AND", ["custrecord_jj_bag_tree_bag_list.custrecord_jj_baggen_merge", "is", "F"],
                        "AND", ["custrecord_jj_bag_tree_bag_list.custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_bag_tree_bag_list.custrecord_jj_is_rejected", "is", "F"],
                        "AND", ["custrecord_jj_bag_tree_bag_list.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_bag_load_core_tracking.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_bag_tree_location", "anyof", locations]
                    ]
                    if (bagNumWaxTree.length > 0) {
                        filters.push("AND", ["custrecord_jj_bag_tree_bag_list.internalid", "noneof", bagNumWaxTree]);

                    }
                    let bagTreeLoadResultObj =
                    {
                        bag_tree_load: {},
                        bags_id: [],
                        metal: {},
                        date_created: {},
                    };
                    let customrecord_jj_bag_tree_loadSearchObj = search.create({
                        type: "customrecord_jj_bag_tree_load",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "name", label: "load_name" }),
                            search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_BAG_TREE_BAG_LIST", label: "bag_id" }),
                            search.createColumn({ name: "name", join: "CUSTRECORD_JJ_BAG_TREE_BAG_LIST", label: "bag_name" }),
                            search.createColumn({ name: "custrecord_jj_bag_tree_item", label: "metal_id" }),
                            search.createColumn({ name: "internalid", label: "load_id" }),
                            // search.createColumn({ name: "created", label: "date" })
                        ]
                    });
                    // let bagTreeLoadResultObj = jjUtil.dataSets.iterateSavedSearch({
                    //     searchObj: customrecord_jj_bag_tree_loadSearchObj,
                    //     columns: jjUtil.dataSets.fetchSavedSearchColumn(customrecord_jj_bag_tree_loadSearchObj, 'label'),
                    //     PAGE_INDEX: null, // If jjUtil handles pagination, this can be set to null
                    //     PAGE_SIZE: 1000 // Adjust page size if needed
                    // });
                    // log.debug("bagTreeLoadResultObj", bagTreeLoadResultObj);
                    // return bagTreeLoadResultObj
                    let searchResultCount = customrecord_jj_bag_tree_loadSearchObj.runPaged().count;
                    // log.debug("customrecord_wax_treeearchObj result count", searchResultCount);
                    if (searchResultCount > 0) {
                        customrecord_jj_bag_tree_loadSearchObj.run().each(function (result) {
                            bagTreeLoadResultObj.bags_id.push({
                                value: result.getValue({ name: "internalid", join: "CUSTRECORD_JJ_BAG_TREE_BAG_LIST" }),
                                text: result.getValue({ name: "name", join: "CUSTRECORD_JJ_BAG_TREE_BAG_LIST" })
                            });
                            bagTreeLoadResultObj.bag_tree_load.text = result.getValue("name");
                            bagTreeLoadResultObj.bag_tree_load.value = result.getValue("internalid");
                            bagTreeLoadResultObj.metal.value = result.getValue("custrecord_jj_bag_tree_item");
                            bagTreeLoadResultObj.metal.text = result.getText("custrecord_jj_bag_tree_item");
                            bagTreeLoadResultObj.date_created.value = result.getValue("created");
                            return true;
                        });
                        return bagTreeLoadResultObj;
                    }
                    else {
                        return {}
                    }



                } catch (e) {
                    log.error('error @ getBagTreeLoadList', e.message);
                    return {}
                }

            },
            getBagGenLoadList(bagsArray, metalId, locations) {
                try {
                    if (!bagsArray || bagsArray.length <= 0 || !metalId || !locations) {
                        return [];
                    }

                    // let bagGenerationSearchObj = search.create({
                    //     type: "customrecord_jj_bag_generation",
                    //     filters: [
                    //         ["isinactive", "is", "F"],
                    //         "AND", ["custrecord_jj_baggen_merge", "is", "F"],
                    //         "AND", ["custrecord_jj_baggen_split", "is", "F"],
                    //         "AND", ["custrecord_jj_is_rejected", "is", "F"],
                    //         "AND", ["custrecord_jj_baggen_dept.isinactive", "is", "F"],
                    //         "AND", ["internalid", "anyof", bagsArray],
                    //         "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_bagcoremat_item", "anyof", metalId],
                    //     ],
                    //     columns: [
                    //         search.createColumn({ name: "name", label: "ID" }),
                    //         search.createColumn({ name: "internalid", label: "Internal Id" }),
                    //         search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "Style" }),
                    //         search.createColumn({ name: "custrecord_jj_bagcoremat_piece", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", label: "weight" }),
                    //         search.createColumn({ name: "custrecord_jj_baggen_qty", label: "Quantity Per Bag" }),
                    //         search.createColumn({ name: "custrecord_jj_baggen_dept", label: "Department " }),
                    //         search.createColumn({ name: "custrecord_jj_mandept_hod", join: "CUSTRECORD_JJ_BAGGEN_DEPT", label: "hod" }),
                    //         search.createColumn({ name: "custrecord_jj_baggen_bagcore", label: "Bag Core Tracking" }),
                    //         search.createColumn({ name: "custrecord_jj_bagcoremat_qty", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", label: "Quantity" }),
                    //         search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "Customer" }),
                    //         search.createColumn({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "category" }),
                    //         search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE", label: "Customer Name" }),
                    //     ]
                    // });

                    const bagGenerationSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_merge", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_split", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bagcore.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name", "anyof", bagsArray],
                            "AND", [
                                ["custrecord_jj_bagcoremat_item", "anyof", metalId],
                                "OR", ["custrecord_jj_bagcoremat_item.custitem_jj_relate_item_reference", "anyof", metalId]
                            ],
                            "AND", ["custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_location", "anyof", locations]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_bagcoremat_bag_name", label: "Bag Name/Number" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "Design" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "Quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "Customer" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_bagcore", label: "Bag Core Tracking" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "Customer Name" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "Item Category" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", label: "Quantity Per Bag" })
                        ]
                    });

                    let bags = [];
                    let processedBagIds = new Set();

                    let searchResultCount = bagGenerationSearchObj.runPaged().count;
                    log.debug("bagGenerationSearchObj result count", searchResultCount);
                    if (searchResultCount <= 0) {
                        return [];
                    }
                    bagGenerationSearchObj.run().each(function (result) {
                        // let bagId = result.getValue("internalid");
                        let bagId = result.getValue("custrecord_jj_bagcoremat_bag_name");

                        // Skip if already added
                        if (processedBagIds.has(bagId)) {
                            return true;
                        }

                        processedBagIds.add(bagId);

                        let resultObject = {
                            bag_no: {
                                value: bagId,
                                // text: result.getValue("name")
                                text: result.getText("custrecord_jj_bagcoremat_bag_name")
                            },
                            style_no: {
                                value: result.getValue({
                                    name: "custrecord_jj_bagcore_design",
                                    // join: "CUSTRECORD_JJ_BAGGEN_BAGCORE"
                                    join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE"
                                })
                            },
                            weight: {
                                value: result.getValue({
                                    name: "custrecord_jj_bagcoremat_qty",
                                    // join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME"
                                })
                            },
                            // quantity_per_bag: { value: result.getValue("custrecord_jj_baggen_qty") },
                            quantity_per_bag: { value: result.getValue({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME" }) },
                            // department: { 
                            //     value: result.getValue("custrecord_jj_baggen_dept"),
                            //     text: result.getText("custrecord_jj_baggen_dept")
                            // },
                            // hod: { value: result.getValue({
                            //     name: "custrecord_jj_mandept_hod",
                            //     join: "CUSTRECORD_JJ_BAGGEN_DEPT"
                            // }) },
                            // bag_core_tracking: { value: result.getValue("custrecord_jj_baggen_bagcore") },
                            bag_core_tracking: { value: result.getValue("custrecord_jj_bagcoremat_bagcore") },
                            // customer: {
                            //     value: result.getValue({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE" }),
                            //     text: result.getValue({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE" })
                            //         || result.getText({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE" })
                            // },
                            customer: {
                                value: result.getValue({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" }),
                                text: result.getValue({ name: "custrecord_jj_bagcore_customer_name", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" })
                                    || result.getText({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" })
                            },
                            // category: {
                            //     value: result.getValue({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE" }),
                            //     text: result.getText({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE" })
                            // }
                            category: {
                                value: result.getValue({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" }),
                                text: result.getText({ name: "custrecord_jj_bagcore_item_category", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" })
                            }
                        };
                        bags.push(resultObject);
                        return true;
                    });
                    log.debug("bgas", bags);
                    return bags;
                } catch (e) {
                    log.error('error @ getBagGenLoadList', e.message);
                    return []
                }
            },

            getDirectIssueReturnList(deptId, operationBagArray) {
                try {
                    if (!deptId) {
                        return []
                    }
                    let filters =
                        [
                            ["custrecord_jj_department", "anyof", deptId]
                        ]

                    if (operationBagArray.length > 0) {
                        filters.push("AND", ["custrecord_jj_bag_generation", "anyof", operationBagArray]);
                    }
                    let customrecord_jj_direct_issue_returnSearchObj = search.create({
                        type: "customrecord_jj_direct_issue_return",
                        filters: filters,
                        columns:
                            [
                                search.createColumn({ name: "custrecord_jj_bag_generation", label: "bag_generation" })
                            ]
                    });
                    let searchResultCount = customrecord_jj_direct_issue_returnSearchObj.runPaged().count;
                    log.debug("customrecord_jj_direct_issue_returnSearchObj result count", searchResultCount);
                    if (searchResultCount < 0) {
                        return []
                    }
                    let bag_nos = [];

                    // customrecord_jj_direct_issue_returnSearchObj.run().each(function (result) {
                    //     // Build the object in the required format
                    //     // let obj = {
                    //     //     bag_no: {
                    //     //         value: result.getValue({ name: "custrecord_jj_bag_generation" }),
                    //     //         text: result.getText({ name: "custrecord_jj_bag_generation" })
                    //     //     },
                    //     // };
                    //     bag_nos.push(result.getValue({ name: "custrecord_jj_bag_generation" }));

                    //     // Add the object to the results array
                    //     // bag_nos.push(obj);
                    //     return true; // Continue iteration
                    // });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: customrecord_jj_direct_issue_returnSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(customrecord_jj_direct_issue_returnSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    searchResult.forEach((result) => {
                        if (result.bag_generation?.value) {
                            bag_nos.push(result.bag_generation?.value);
                        }
                    });

                    return bag_nos;

                } catch (e) {
                    log.error('error @ getDirectIssueReturnList', e.message);
                    return [];
                }
            },
            getDiamondDetails(bagNumWaxTree) {
                try {
                    if (bagNumWaxTree.length < 0) {
                        return []
                    }
                    let customrecord_jj_bagcore_materialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: [
                            ["custrecord_jj_bagcoremat_bag_name.internalid", "anyof", bagNumWaxTree],
                            "AND", ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_item.class", "anyof", DIAMOND_ID]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_bagcoremat_item", label: "Item" }),
                            // search.createColumn({ name: "custrecord_jj_bagcoremat_size", label: "Size" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "Quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_piece", label: "Weight" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_bag_name", label: "bag_no" }),
                            search.createColumn({ name: "custrecord_jj_actual_pieces_info", label: "actual_pieces_info" }),
                            search.createColumn({ name: "class", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "item_class" }),
                            search.createColumn({ name: "isserialitem", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "is_serial" }),
                            search.createColumn({ name: "parent", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "Parent" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_receive", label: "total_receive" }),
                        ]
                    });

                    // Use jjUtil.dataSets to iterate over the search results
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: customrecord_jj_bagcore_materialsSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(customrecord_jj_bagcore_materialsSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                } catch (error) {
                    log.error('Error in getDiamondDetails', error);
                    return [];
                }
            },
            // getDirectIssueComponents(bagId) {
            //     try {
            //         let bagCoreMaterialsSearchObj = search.create({
            //             type: "customrecord_jj_bagcore_materials",
            //             filters:
            //                 [
            //                     ["custrecord_jj_bagcoremat_bag_name", "anyof", bagId]
            //                 ],
            //             columns:
            //                 [
            //                     search.createColumn({ name: "custrecord_jj_bagcoremat_item", label: "Item" }),
            //                     search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "Quantity" }),
            //                     search.createColumn({ name: "custrecord_jj_bagcoremat_wo", label: "Work Order" }),
            //                     search.createColumn({ name: "custrecord_jj_bagcoremat_wo_line_no", label: "Work Order Line Number" }),
            //                     search.createColumn({ name: "custrecord_jj_bagcoremat_to_issue", label: "To Be Issued" })
            //                 ]
            //         });
            //         let componentsArray = []; // Initialize an array to store the results.

            //         bagCoreMaterialsSearchObj.run().each(result => {
            //             const bagCoreMaterialId = result.id;
            //             const itemId = result.getValue({ name: "custrecord_jj_bagcoremat_item" }); // Get the Item ID
            //             const itemName = result.getText({ name: "custrecord_jj_bagcoremat_item" }); // Get the Item Name
            //             const quantity = result.getValue({ name: "custrecord_jj_bagcoremat_qty" }); // Get the Quantity
            //             const workorder = result.getValue({ name: "custrecord_jj_bagcoremat_wo" }); // Get the Workorder
            //             const woLineNo = result.getValue({ name: "custrecord_jj_bagcoremat_wo_line_no" }); // Get the Workorder Line Number
            //             const toBeIssued = result.getValue({ name: "custrecord_jj_bagcoremat_to_issue" });

            //             componentsArray.push({
            //                 itemId: itemId,
            //                 itemName: itemName,
            //                 quantity: parseFloat(quantity), // Convert to number if necessary
            //                 workorder: workorder,
            //                 woLineNo: woLineNo,
            //                 bagCoreMaterialId: bagCoreMaterialId,
            //                 toBeIssued: toBeIssued

            //             });

            //             return true; // Return true to continue iteration
            //         });
            //         return { status: 'SUCCESS', reason: 'Direct Issue Componenets Listed', data: componentsArray };
            //     } catch (e) {
            //         log.error('error @ getDirectIssueComponents', e.message);
            //         return {}
            //     }
            // },
            getDirectIssueComponents(bagId, operationId) {
                try {
                    log.debug("Start: getDirectIssueComponents", { bagId, operationId });

                    // let directIssueReturnQuery = `
                    //             SELECT 
                    //                 BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.ID) AS bagCoreMaterialId, 
                    //                 BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.ID) AS directIssueReturnId, 
                    //                 CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item AS itemId,
                    //                 BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item)) AS itemName, 
                    //                 BUILTIN_RESULT.TYPE_STRING(item.itemtype) AS itemType,
                    //                 BUILTIN_RESULT.TYPE_STRING(item.islotitem) AS isLotItem,
                    //                 BUILTIN_RESULT.TYPE_STRING(item.isserialitem) AS isSerialItem,
                    //                 BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_qty) AS quantity, 
                    //                 CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_wo AS workorder, 
                    //                 BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_wo_line_no) AS woLineNo,
                    //                 BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_to_issue) AS toBeIssued,
                    //                 BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_issue) AS totalIssue,
                    //                 BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_receive) AS totalReceive,
                    //                 BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_loss) AS totalLoss
                    //             FROM 
                    //                 CUSTOMRECORD_JJ_BAGCORE_MATERIALS
                    //             LEFT JOIN 
                    //                 CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN 
                    //                 ON CUSTOMRECORD_JJ_BAGCORE_MATERIALS.ID = CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_bag_core_material_record
                    //             LEFT JOIN 
                    //                 item -- Join the item table
                    //                 ON CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item = item.ID
                    //             WHERE 
                    //                 (CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_operations = ? OR CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.ID IS NULL)
                    //                 AND CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bag_name = ?;

                    //              `;
                    let directIssueReturnQuery = `
                        SELECT 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.ID) AS bagCoreMaterialId, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.ID) AS directIssueReturnId, 
                            CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item AS itemId,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item)) AS itemName, 

                            BUILTIN_RESULT.TYPE_STRING(item.itemtype) AS itemType,
                            BUILTIN_RESULT.TYPE_STRING(item.islotitem) AS isLotItem,
                            BUILTIN_RESULT.TYPE_STRING(item.isserialitem) AS isSerialItem,
                            BUILTIN_RESULT.TYPE_INTEGER(item.class) AS itemClass, 
                            BUILTIN_RESULT.TYPE_STRING(item.cost) AS purchasePrice,

                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_qty) AS quantity, 
                            CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_wo AS workorder, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_wo_line_no) AS woLineNo,

                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_to_issue) AS toBeIssued,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_issue) AS totalIssue,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_receive) AS totalReceive,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_loss) AS totalLoss,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_additional_qty) AS totalBalance,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_actual_pieces) AS actualPieces,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_issued_pieces) AS issuedPieces,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_to_be_issued_pieces) AS toBeIssuedPieces,

                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_actual_pieces_info) AS actualPiecesInfo,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_issued_pieces_info) AS issuedPiecesInfo,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_to_be_issued_pieces_info) AS toBeIssuedPiecesInfo,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_balance_pieces_info) AS totalBalancePiecesInfo,

                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_stone_quality)) AS stonequality,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_metal_quality)) AS metalquality,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_stone_quality) AS stonequalityid,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_metal_quality) AS metalqualityid,

                            BUILTIN_RESULT.TYPE_INTEGER(item.custitem_jj_relate_item_reference) AS relatedItemId,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_relate_item_reference)) AS relatedItemName,
                            BUILTIN_RESULT.TYPE_STRING(bagcore.custrecord_jj_bagcore_order_type) AS orderType,
                            BUILTIN_RESULT.TYPE_STRING(bagcore.custrecord_jj_serial_to_repair) AS repairSerial,
                            BUILTIN_RESULT.TYPE_FLOAT(bagcore.custrecord_jj_gwt_of_repair_serial) AS repairSerialWt

                        FROM 
                          CUSTOMRECORD_JJ_BAGCORE_MATERIALS
                        LEFT JOIN 
                          CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN 
                            ON CUSTOMRECORD_JJ_BAGCORE_MATERIALS.ID = CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_bag_core_material_record
				                AND (CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_operations = ? OR CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.ID IS NULL)
					
                        LEFT JOIN 
                            item -- Join the item table
                            ON CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item = item.ID
                        LEFT JOIN 
                            customrecord_jj_bag_core_tracking bagcore
                            ON CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bagcore = bagcore.id
                        WHERE 
                            CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bag_name = ?
                            AND CUSTOMRECORD_JJ_BAGCORE_MATERIALS.isinactive = 'F';`
                    log.debug("END: getDirectIssueComponents", { bagId, operationId });


                    // Execute the query using the N/query module
                    let queryResults = query.runSuiteQL({
                        query: directIssueReturnQuery,
                        params: [operationId, bagId] // Pass operationId and bagId as parameters
                    });

                    let componentsArray = [];
                    let results = queryResults.asMappedResults();
                    // Get results as an array of objects
                    log.debug("results", results);
                    results.forEach(result => {
                        // if (result.itemclass == SERIAL_LOT_ITEM_CLASS) {
                        //     componentsArray.push({
                        //         itemId: result.itemid,
                        //         itemName: result.itemname,
                        //         itemType: result.itemtype,
                        //         isLotItem: result.islotitem,
                        //         isSerialItem: result.isserialitem,
                        //         itemClass: result.itemclass,
                        //         workorder: result.workorder,
                        //         woLineNo: result.wolineno,
                        //         bagCoreMaterialId: result.bagcorematerialid,
                        //         directIssueReturnId: result.directissuereturnid,
                        //         totalReceive: result.totalreceive,
                        //         totalLoss: result.totalloss,
                        //         operationId: operationId,
                        //         actualPiecesInfo: result.actualpiecesinfo,
                        //         totalIssuedPiecesInfo: result.issuedpiecesinfo,
                        //         toBeIssuedPiecesInfo: result.tobeissuedpiecesinfo,

                        //         quantity: parseFloat(result.actualpieces), // Ensure it is a number
                        //         toBeIssued: result.tobeissuedpieces,
                        //         totalIssue: result.issuedpieces,
                        //     });
                        // }
                        // else {
                        componentsArray.push({
                            itemId: result.itemid,
                            itemName: result.itemname,
                            itemType: result.itemtype,
                            isLotItem: result.islotitem,
                            isSerialItem: result.isserialitem,
                            itemClass: result.itemclass,
                            isGold: GOLD_CLASS_IDS.includes(Number(result.itemclass)),
                            isDiamond: DIAMOND_CLASSES_IDS.includes(String(result.itemclass)),
                            isColorStone: STONE_CLASSES_IDS.includes(String(result.itemclass)),
                            isAlloy: ALLOY_CLASSES_IDS.includes(String(result.itemclass)),
                            workorder: result.workorder,
                            woLineNo: result.wolineno,
                            bagCoreMaterialId: result.bagcorematerialid,
                            directIssueReturnId: result.directissuereturnid,
                            totalReceive: result.totalreceive,
                            totalLoss: result.totalloss,
                            operationId: operationId,
                            actualPiecesInfo: result.actualpiecesinfo,
                            totalIssuedPiecesInfo: result.issuedpiecesinfo,
                            toBeIssuedPiecesInfo: result.tobeissuedpiecesinfo,

                            quantity: parseFloat(result.quantity), // Ensure it is a number
                            toBeIssued: result.tobeissued,
                            totalIssue: result.totalissue,

                            quality: result.stonequality || result.metalquality || '',
                            qualityid: result.stonequalityid || result.metalqualityid || '',

                            isOthCharge: result.itemtype === 'OthCharge',
                            isServiceItem: result.itemtype === 'Service',
                            purchasePrice: parseFloat(result.purchaseprice) || 0, // Ensure it is a number

                            relatedItemId: result.relateditemid,
                            relatedItemName: result.relateditemname,
                            orderType: result.ordertype,
                            isRepairOrder: Number(result.ordertype) == Number(REPAIR_ORDER_TYPE_ID),
                            isJobWorkOrder: Number(result.ordertype) == Number(JOB_WORK_ORDER_TYPE_ID),
                            repairSerial: result.repairserial,
                            repairSerialWt: result.repairserialwt,

                            totalBalance: result.totalbalance,
                            totalBalancePiecesInfo: result.totalbalancepiecesinfo,
                        });
                        // }

                    });
                    return { status: 'SUCCESS', reason: 'Direct Issue Components Listed', data: componentsArray };
                } catch (e) {
                    log.error('error @ getDirectIssueComponents', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },
            getItemCache() {
                try {
                    let itemCache = cache.getCache({ name: CACHE_NAME });

                    // Function to load the data from the file
                    function fetchItemCacheFromFile() {
                        const fileObj = file.load({ id: CACHE_FILE_ID });
                        return JSON.parse(fileObj.getContents());
                    }

                    // // Retrieve or load the item cache data using the loader
                    // let cacheData = itemCache.get({
                    //     key: CACHE_KEY,
                    //     loader: function () {
                    //         let fileContents = fetchItemCacheFromFile();

                    //         // Store the file contents in the cache
                    //         itemCache.put({
                    //             key: CACHE_KEY,
                    //             value: fileContents
                    //         });

                    //         return fileContents;
                    //     }
                    // });

                    let cacheData = fetchItemCacheFromFile();

                    // log.debug("cacheData", typeof cacheData);
                    // return { status: 'SUCCESS', reason: 'Item Cache Listed', data: JSON.parse(cacheData) };
                    return { status: 'SUCCESS', reason: 'Item Cache Listed', data: cacheData };
                } catch (error) {
                    log.error('Error in getItemCache', error);
                    return { status: 'ERROR', reason: 'Fetching Item Cache Failed: ' + error.message, data: [] };
                }
            },
            refreshItemCache() {
                try {
                    // Clear the cache by removing the existing key
                    let itemCache = cache.getCache({ name: CACHE_NAME });
                    // log.debug("Before removing cache", itemCache.get({ key: CACHE_KEY }));
                    itemCache.remove({ key: CACHE_KEY });
                    // log.debug("After removing cache", itemCache.get({ key: CACHE_KEY }));

                    let scheduledscriptinstanceSearchObj = search.create({
                        type: "scheduledscriptinstance",
                        filters:
                            [
                                ["scriptdeployment.scriptid", "is", "customdeploy_jj_mr_refresh_item_cache"],
                                "AND",
                                ["mapreducestage", "anyof", "SUMMARIZE"],
                                "AND",
                                ["status", "anyof", "PENDING", "PROCESSING"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "datecreated", label: "Date Created" }),
                                search.createColumn({ name: "startdate", label: "Start Date" }),
                                search.createColumn({ name: "enddate", label: "End Date" }),
                                search.createColumn({ name: "status", label: "Status" }),
                                search.createColumn({ name: "mapreducestage", label: "Map/Reduce Stage" }),
                                search.createColumn({ name: "percentcomplete", label: "Percent Complete" })
                            ]
                    });
                    let searchResultCount = scheduledscriptinstanceSearchObj.runPaged().count;
                    log.debug("scheduledscriptinstanceSearchObj result count", searchResultCount);

                    if (searchResultCount == 0) {
                        // Submit the Map/Reduce task to refresh the cache asynchronously
                        let mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_jj_mr_refresh_item_cache',
                            deploymentId: 'customdeploy_jj_mr_refresh_item_cache',
                        });

                        let taskId = mrTask.submit();
                        log.debug('Map/Reduce Task Submitted', 'Task ID: ' + taskId);

                        // Use a loader function to fetch data if the cache is accessed
                        function fetchItemCacheFromFile() {
                            const fileObj = file.load({ id: CACHE_FILE_ID });
                            return JSON.parse(fileObj.getContents());
                        }

                        // Access the cache to ensure it is populated using the loader
                        let cacheData = itemCache.get({
                            key: CACHE_KEY,
                            loader: function () {
                                let fileContents = fetchItemCacheFromFile();

                                // Save the data to the cache
                                itemCache.put({
                                    key: CACHE_KEY,
                                    value: fileContents
                                });

                                return fileContents;
                            }
                        });
                        // log.debug("After refetching cache", itemCache.get({ key: CACHE_KEY }));
                        return { status: 'SUCCESS', reason: 'Cache refresh has started', data: [] };
                    } else {
                        return { status: 'SUCCESS', reason: 'Cache refresh is currently in progress', data: [] };
                    }

                } catch (e) {
                    log.error('error @ refreshItemCache', e.message);
                    return { status: 'ERROR', reason: 'Failed to Refresh Item Cache: ' + e.message, data: [] };
                }
            },
            // syncItemCache() {
            //     try {
            //         // Clear the cache by removing the existing key
            //         let itemCache = cache.getCache({ name: CACHE_NAME });
            //         itemCache.remove({ key: CACHE_KEY });

            //         // Use a loader function to fetch data if the cache is accessed
            //         function fetchItemCacheFromFile() {
            //             const fileObj = file.load({ id: CACHE_FILE_ID });
            //             return JSON.parse(fileObj.getContents());
            //         }

            //         // Access the cache to ensure it is populated using the loader
            //         let cacheData = itemCache.get({
            //             key: CACHE_KEY,
            //             loader: function () {
            //                 let fileContents = fetchItemCacheFromFile();

            //                 // Save the data to the cache
            //                 itemCache.put({
            //                     key: CACHE_KEY,
            //                     value: fileContents
            //                 });

            //                 return fileContents;
            //             }
            //         });
            //       log.debug("cacheData", cacheData);

            //         return { status: 'SUCCESS', reason: 'Sync Item Cache has started', data: [] };
            //     } catch (e) {
            //         log.error('error @ syncItemCache', e.message);
            //         return { status: 'ERROR', reason: 'Failed to Sync Item Cache: ' + e.message, data: [] };
            //     }
            // },
            // listInventoryDetails(componentId, departmentId, param) {
            //     try {
            //         log.debug("Start: listInventoryDetails", { componentId, departmentId, param });
            //         let deptFields = searchResults.getDepartmentFields(departmentId);
            //         // log.debug("deptFields", deptFields);
            //         let locationId = deptFields?.location;
            //         let binNumber = deptFields?.bin;
            //         let binName = deptFields?.binName;
            //         let goodStatus = deptFields?.goodStatus;
            //         //  let wipStatus = deptFields?.wipStatus;
            //         let waxTreeStatus = deptFields?.waxTreeStatus;

            //         // let inventorybalanceSearch = search.create({
            //         //     type: "inventorybalance",
            //         //     filters:
            //         //         [
            //         //             ["item.type", "anyof", "Assembly", "InvtPart"],
            //         //             "AND",
            //         //             ["item", "anyof", componentId],
            //         //             "AND",
            //         //             ["binnumber", "anyof", binNumber],
            //         //             "AND",
            //         //             ["location", "anyof", locationId],
            //         //             "AND",
            //         //             ["status", "anyof", goodStatus],
            //         //             "AND",
            //         //             ["formulanumeric:      Case                  when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available}              when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available}              when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1       when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1             when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0              ELSE {available} END", "notequalto", "0"],
            //         //             "AND",
            //         //             ["available", "greaterthan", "0"]
            //         //         ],
            //         //     columns:
            //         //         [
            //         //             search.createColumn({ name: "item", label: "item" }),
            //         //             search.createColumn({ name: "binnumber", label: "bin_number" }),
            //         //             search.createColumn({ name: "inventorynumber", label: "inventory_number" }),
            //         //             search.createColumn({ name: "status", label: "status" }),
            //         //             search.createColumn({ name: "location", label: "location" }),
            //         //             search.createColumn({ name: "available", label: "test_available" }),
            //         //             search.createColumn({ name: "onhand", label: "onhand" }),
            //         //             search.createColumn({ name: "invnumcommitted", label: "committed_quantity" }),
            //         //             search.createColumn({
            //         //                 name: "type",
            //         //                 join: "item",
            //         //                 label: "type"
            //         //             }),
            //         //             search.createColumn({
            //         //                 name: "formulanumeric",
            //         //                 formula: "  Case         when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available}        when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available}        when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1    when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1       when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0        ELSE {available} END",
            //         //                 label: "available"
            //         //             })
            //         //         ]
            //         // });

            //         // // Use jjUtil.dataSets to iterate over the search results
            //         // return jjUtil.dataSets.iterateSavedSearch({
            //         //     searchObj: inventorybalanceSearch,
            //         //     columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorybalanceSearch, 'label'),
            //         //     PAGE_INDEX: null,
            //         //     PAGE_SIZE: 1000
            //         // });

            //         let filters = [
            //             ["item.type", "anyof", "Assembly", "InvtPart"],
            //             "AND",
            //             ["location", "anyof", locationId],
            //             // "AND",
            //             // ["status", "anyof", goodStatus, waxTreeStatus],
            //             "AND",
            //             ["formulanumeric: Case when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available}              when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available}              when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1       when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1             when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0              ELSE {available} END", "notequalto", "0"],
            //             "AND",
            //             ["available", "greaterthan", "0"],
            //             "AND",
            //             ["item", "anyof", componentId]
            //         ];

            //         if (param && param == "bulk") {
            //             filters.push("AND", ["status", "anyof", waxTreeStatus]);
            //         } else if (param && param == "issue_wax_tree") {
            //             filters.push("AND", ["status", "anyof", goodStatus]);
            //         } else {
            //             filters.push("AND", ["status", "anyof", goodStatus, waxTreeStatus]);
            //         }

            //         let inventorybalanceSearch = search.create({
            //             type: "inventorybalance",
            //             filters: filters,
            //             columns:
            //                 [
            //                     search.createColumn({
            //                         name: "item",
            //                         summary: "GROUP",
            //                         label: "item"
            //                     }),
            //                     search.createColumn({
            //                         name: "inventorynumber",
            //                         summary: "GROUP",
            //                         label: "inventory_number"
            //                     }),
            //                     search.createColumn({
            //                         name: "formulatext",
            //                         summary: "MAX",
            //                         formula: `MAX(case when {binnumber.internalid}=${binNumber} then{binnumber.internalid} end)`,
            //                         label: "bin_number"
            //                     }),
            //                     search.createColumn({
            //                         name: "formulanumeric",
            //                         summary: "MAX",
            //                         formula: `MAX(case when {binnumber.internalid}=${binNumber} then{available} else 0 end)`,
            //                         label: "available"
            //                     }),
            //                     search.createColumn({
            //                         name: "formulanumeric",
            //                         summary: "MAX",
            //                         formula: "SUM( {available} )",
            //                         label: "totalavailable"
            //                     }),
            //                     search.createColumn({
            //                         name: "formulanumeric",
            //                         summary: "MAX",
            //                         formula: "MAX({invnumcommitted})",
            //                         label: "totalcommitted"
            //                     }),
            //                     search.createColumn({
            //                         name: "formulanumeric",
            //                         summary: "MAX",
            //                         formula: "SUM(NVL({available}, 0)) - MAX(NVL({invnumcommitted}, 0))",
            //                         label: "calculatedavailable"
            //                     }),
            //                     search.createColumn({
            //                         name: "status",
            //                         summary: "GROUP",
            //                         label: "status"
            //                     })
            //                 ]
            //         });

            //         let searchresult = jjUtil.dataSets.iterateSavedSearch({
            //             searchObj: inventorybalanceSearch,
            //             columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorybalanceSearch, 'label'),
            //             PAGE_INDEX: null,
            //             PAGE_SIZE: 1000
            //         });
            //         log.debug("searchresult", searchresult);

            //         searchresult = searchresult.filter(result => {

            //             log.debug("result", result);
            //             if (param && param == "issue_wax_tree") {
            //                 log.debug("waxTreeStatus totalavailable", { waxTreeStatus, available: parseFloat(result.available?.value || 0) });
            //                 result["available"]["value"] = parseFloat(result.available?.value || 0);
            //                 return true;
            //             }
            //             else if ((!param || (param && param == "bulk")) && waxTreeStatus == result.status?.value && parseFloat(result.available.value) > 0) {
            //                 log.debug("waxTreeStatus totalavailable", { waxTreeStatus, available: parseFloat(result.available?.value || 0) });
            //                 result["available"]["value"] = parseFloat(result.available?.value || 0);
            //                 return true;
            //             } else if (parseFloat(result.available.value) > 0 && parseFloat(result.calculatedavailable.value) > 0) {
            //                 // Update the available value to the minimum of the two
            //                 result.available.value = Math.min(result.available.value, result.calculatedavailable.value);
            //                 return true; // Keep this result
            //             }


            //             return false;

            //         });
            //         log.debug("Final Search resultt", searchresult);
            //         return searchresult;


            //     }
            //     catch (e) {
            //         log.error('error @ listInventoryDetails', e.message);
            //         return { status: 'ERROR', reason: 'Failed to List Inventory Details: ' + e.message, data: [] };
            //     }
            // },

            listInventoryDetails(componentId, departmentId, param) {
                try {
                    log.debug("Start: listInventoryDetails", { componentId, departmentId, param });
                    let deptFields = searchResults.getDepartmentFields(departmentId);
                    let locationId = deptFields?.location;
                    let binNumber = deptFields?.bin;
                    let goodStatus = deptFields?.goodStatus;
                    let waxTreeStatus = deptFields?.waxTreeStatus;
                    let goodStatusName = deptFields?.goodStatusName;
                    let waxTreeStatusName = deptFields?.waxTreeStatusName;
                    let memoUnbilledStatus = deptFields?.memoUnbilledStatus;
                    let memoUnbilledStatusName = deptFields?.memoUnbilledStatusName;

                    let filters = [
                        ["item.type", "anyof", "Assembly", "InvtPart"],
                        "AND",
                        ["location", "anyof", locationId],
                        "AND",
                        ["formulanumeric: Case when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available} when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available} when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1 when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1 when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0 ELSE {available} END", "notequalto", "0"],
                        "AND",
                        ["available", "greaterthan", "0"],
                        "AND",
                        ["item", "anyof", componentId],
                        "AND",
                        ["inventorystatus.inventoryavailable", "is", "T"]
                    ];

                    let columns = [
                        search.createColumn({ name: "item", summary: "GROUP", label: "item" }),
                        search.createColumn({ name: "inventorynumber", summary: "GROUP", label: "inventory_number", sort: search.Sort.ASC }),
                        search.createColumn({ name: "formulatext", summary: "MAX", formula: `MAX(case when {binnumber.internalid} = ${binNumber} then {binnumber.internalid} end)`, label: "bin_number" }),
                        search.createColumn({ name: "formulanumeric", summary: "MAX", formula: "SUM( {available} )", label: "totalavailable" }),
                        search.createColumn({ name: "formulanumeric", summary: "MAX", formula: "MAX({invnumcommitted})", label: "invnumcommitted" }),
                        // search.createColumn({ name: "formulanumeric", summary: "MAX", formula: "SUM( {available} ) - MAX({invnumcommitted})", label: "calculatedavailable" }),
                        search.createColumn({ name: "formulanumeric", summary: "MAX", formula: "SUM({available}) - NVL(MAX({invnumcommitted}), 0)", label: "calculatedavailable" })
                    ]

                    if (param && param == "bulk") {
                        columns.push(search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: `SUM(case when {binnumber.internalid}= ${binNumber} AND {inventorystatus.internalid} IN (${waxTreeStatus}) then {available} else 0 end)`,
                            label: "wax_tree_available"
                        }));
                    } else if (param && param == "issue_wax_tree") {
                        columns.push(search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: `SUM(case when {binnumber.internalid}= ${binNumber} AND {inventorystatus.internalid} IN (${goodStatus}) then {available} else 0 end)`,
                            label: "good_available"
                        }));
                    } else {
                        columns.push(search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: `SUM(case when {binnumber.internalid}= ${binNumber} AND {inventorystatus.internalid} IN (${waxTreeStatus}) then {available} else 0 end)`,
                            label: "wax_tree_available"
                        }));
                        columns.push(search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: `SUM(case when {binnumber.internalid}= ${binNumber} AND {inventorystatus.internalid} IN (${goodStatus}) then {available} else 0 end)`,
                            label: "good_available"
                        }));
                        columns.push(search.createColumn({
                            name: "formulanumeric",
                            summary: "SUM",
                            formula: `SUM(case when {binnumber.internalid}= ${binNumber} AND {inventorystatus.internalid} IN (${memoUnbilledStatus}) then {available} else 0 end)`,
                            label: "memo_unbilled_available"
                        }));
                    }

                    let inventorybalanceSearch = search.create({
                        type: "inventorybalance",
                        filters: filters,
                        columns: columns
                    });

                    let searchresult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventorybalanceSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorybalanceSearch, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    log.debug("searchresult", searchresult);

                    // searchresult = searchresult.filter(result => {
                    //     // log.debug("result", result);
                    //     if (result.bin_number?.value) {
                    //         if (param && param == "issue_wax_tree") {
                    //             if (parseFloat(result.wax_tree_available?.value) > 0) {
                    //                 result["available"] = { value: parseFloat(result.wax_tree_available?.value || 0) };
                    //                 result["status"] = { value: waxTreeStatus, text: waxTreeStatusName };
                    //             } else if (parseFloat(result.good_available?.value) > 0) {
                    //                 result["available"] = { value: parseFloat(result.good_available?.value || 0) };
                    //                 result["status"] = { value: goodStatus, text: goodStatusName };
                    //             }
                    //             return true;
                    //         } else if ((!param || (param && param == "bulk")) && parseFloat(result.wax_tree_available?.value) > 0) {
                    //             result["available"] = { value: parseFloat(result.wax_tree_available?.value || 0) };
                    //             return true;
                    //         } else if (parseFloat(result.calculatedavailable?.value) > 0) {
                    //             // Update the available value to the minimum of the two
                    //             if (parseFloat(result.good_available?.value) > 0) {
                    //                 result.available = { value: Math.min(result.good_available.value, result.calculatedavailable?.value) };
                    //                 result["status"] = { value: goodStatus, text: goodStatusName };
                    //             } else if (parseFloat(result.wax_tree_available?.value) > 0) {
                    //                 result.available = { value: Math.min(result.wax_tree_available?.value, result.calculatedavailable?.value) };
                    //                 result["status"] = { value: waxTreeStatus, text: waxTreeStatusName };
                    //             }
                    //             return true; // Keep this result
                    //         }
                    //     }
                    //     return false;
                    // });

                    searchresult = searchresult.flatMap(result => {
                        if (!result.bin_number?.value) return []; // Skip if bin_number is not present

                        const newResults = [];

                        const waxTreeAvailable = parseFloat(result.wax_tree_available?.value || 0) || 0;
                        const goodAvailable = parseFloat(result.good_available?.value || 0) || 0;
                        const calculatedAvailable = parseFloat(result.calculatedavailable?.value || 0) || 0;
                        const memoUnbilledAvailable = parseFloat(result.memo_unbilled_available?.value || 0) || 0;
                        // const invnumcommitted = parseFloat(result.invnumcommitted?.value || 0) || 0;

                        if (param && param == "issue_wax_tree") {
                            if (goodAvailable > 0 && calculatedAvailable > 0) {
                                newResults.push({ ...result, available: { value: Math.min(goodAvailable, calculatedAvailable) }, status: { value: goodStatus, text: goodStatusName } });
                            }
                            // if (waxTreeAvailable > 0) {
                            //     newResults.push({ ...result, available: { value: Math.min(waxTreeAvailable, calculatedAvailable) }, status: { value: waxTreeStatus, text: waxTreeStatusName } });
                            // }
                        } else if ((!param || param == "bulk") && waxTreeAvailable > 0) {
                            newResults.push({ ...result, available: { value: waxTreeAvailable }, status: { value: waxTreeStatus, text: waxTreeStatusName } });
                            if (goodAvailable > 0 && param != "bulk") {
                                newResults.push({ ...result, available: { value: Math.min(goodAvailable, calculatedAvailable) }, status: { value: goodStatus, text: goodStatusName } });
                            }
                        } else if (calculatedAvailable > 0) {
                            if (goodAvailable > 0) {
                                newResults.push({ ...result, available: { value: Math.min(goodAvailable, calculatedAvailable) }, status: { value: goodStatus, text: goodStatusName } });
                            }
                            if (waxTreeAvailable > 0) {
                                newResults.push({ ...result, available: { value: Math.min(waxTreeAvailable, calculatedAvailable) }, status: { value: waxTreeStatus, text: waxTreeStatusName } });
                            }
                            if (memoUnbilledAvailable > 0) {
                                newResults.push({ ...result, available: { value: Math.min(memoUnbilledAvailable, calculatedAvailable) }, status: { value: memoUnbilledStatus, text: memoUnbilledStatusName } });
                            }
                        }

                        return newResults;
                    });

                    // log.debug("Final Search resultt", searchresult);
                    return searchresult;
                }
                catch (e) {
                    log.error('error @ listInventoryDetails', e.message);
                    return { status: 'ERROR', reason: 'Failed to List Inventory Details: ' + e.message, data: [] };
                }
            },

            getInventoryPieces(componentId, departmentId, param, locationId) {
                try {
                    log.debug("Start: getInventoryPieces", { componentId, departmentId, param });

                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_inv_pcs_item", "anyof", componentId],
                        "AND", ["custrecord_jj_inv_pcs_transaction.isinactive", "is", "F"],
                    ];

                    if (param && param == "bin_transfer") {
                        filters.push(
                            "AND", ["custrecord_jj_inv_pcs_location", "anyof", locationId],
                            "AND", ["custrecord_jj_inv_pcs_status", "anyof", GOOD_STATUS_ID]
                        );
                    } else {
                        let deptFields = searchResults.getDepartmentFields(departmentId);
                        let locationId = deptFields?.location;
                        let binNumber = deptFields?.bin;
                        let goodStatus = deptFields?.goodStatus;
                        // let waxTreeStatus = deptFields?.waxTreeStatus;
                        // let goodStatusName = deptFields?.goodStatusName;
                        // let waxTreeStatusName = deptFields?.waxTreeStatusName;
                        let memoUnbilledStatus = deptFields?.memoUnbilledStatus;

                        filters.push(
                            "AND", ["custrecord_jj_inv_pcs_bin", "anyof", binNumber],
                            "AND", ["custrecord_jj_inv_pcs_location", "anyof", locationId],
                            "AND", ["custrecord_jj_inv_pcs_status", "anyof", goodStatus, memoUnbilledStatus]
                        );
                    }

                    let invPcsDetailSearchObj = search.create({
                        type: "customrecord_jj_inv_pcs_detail",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "custrecord_jj_inv_pcs_item", summary: "GROUP", label: "item" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_lot", summary: "GROUP", label: "inventory_number" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_bin", summary: "GROUP", label: "bin_number" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_status", summary: "GROUP", label: "status" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_value", summary: "SUM", label: "pieces_available" })
                        ]
                    });

                    let searchresult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: invPcsDetailSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(invPcsDetailSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    // log.debug("searchresult", searchresult);
                    return searchresult;
                } catch (e) {
                    log.error('error @ getInventoryPieces', e.message);
                    return [];
                }
            },

            listInventoryDetailsForCasting(componentId, departmentId) {
                try {
                    log.debug("Start: listInventoryDetailsForCasting", { componentId, departmentId });

                    let deptFields = searchResults.getDepartmentFields(departmentId);
                    log.debug("deptFields", deptFields);
                    let locationId = deptFields?.location;
                    let binNumber = deptFields?.bin;
                    let binName = deptFields?.binName;
                    let goodStatus = deptFields?.goodStatus;
                    //  let wipStatus = deptFields?.wipStatus;

                    let inventorybalanceSearch = search.create({
                        type: "inventorybalance",
                        filters:
                            [
                                ["item.type", "anyof", "Assembly", "InvtPart"],
                                "AND",
                                ["item", "anyof", componentId],
                                "AND",
                                ["binnumber", "anyof", binNumber],
                                "AND",
                                ["location", "anyof", locationId],
                                "AND",
                                ["status", "anyof", goodStatus],
                                "AND",
                                ["formulanumeric:      Case                  when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available}              when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available}              when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1       when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1             when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0              ELSE {available} END", "notequalto", "0"],
                                "AND",
                                ["available", "greaterthan", "0"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "item", label: "item" }),
                                search.createColumn({ name: "binnumber", label: "bin_number" }),
                                search.createColumn({ name: "inventorynumber", label: "inventory_number" }),
                                search.createColumn({ name: "status", label: "status" }),
                                search.createColumn({ name: "location", label: "location" }),
                                search.createColumn({ name: "available", label: "test_available" }),
                                search.createColumn({ name: "onhand", label: "onhand" }),
                                search.createColumn({ name: "invnumcommitted", label: "committed_quantity" }),
                                search.createColumn({
                                    name: "type",
                                    join: "item",
                                    label: "type"
                                }),
                                search.createColumn({
                                    name: "formulanumeric",
                                    formula: "  Case         when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available}        when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available}        when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1    when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1       when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0        ELSE {available} END",
                                    label: "available"
                                })
                            ]
                    });


                    // Use jjUtil.dataSets to iterate over the search results
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventorybalanceSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorybalanceSearch, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                }
                catch (e) {
                    log.error('error @ listInventoryDetailsForCasting', e.message);
                    return { status: 'ERROR', reason: 'Failed to List Inventory Details: ' + e.message, data: [] };
                }
            },

            getDirectIssueReturnComponents(bagId, operationId) {
                try {
                    log.debug("bagId", bagId);
                    log.debug("operationId", operationId);
                    let directIssueReturnSearch = search.create({
                        type: "customrecord_jj_direct_issue_return",
                        filters:
                            [
                                ["custrecord_jj_bag_generation", "anyof", bagId],
                                "AND",
                                ["custrecord_jj_operations", "anyof", operationId],
                                "AND",
                                ["custrecord_jj_received_quantity", "isempty", "0"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "custrecord_jj_component", label: "Component" }),
                                search.createColumn({ name: "custrecord_jj_metal_actual_quantity", label: "Metal Actual Quantity" }),
                                search.createColumn({ name: "custrecord_jj_issued_quantity", label: "Issued Quantity" }),
                                search.createColumn({ name: "custrecord_jj_dir_loss_quantity", label: "Loss Quantity" }),
                                search.createColumn({ name: "custrecord_jj_work_order", label: "Work Order" }),
                                search.createColumn({ name: "custrecord_jj_wo_line_no", label: "Work Order Line Number" }),
                                search.createColumn({ name: "custrecord_jj_operations", label: "Operations" }),
                                search.createColumn({ name: "custrecord_jj_department", label: "Department" }),
                                search.createColumn({ name: "custrecord_jj_bag_generation", label: "Bag Generation" }),
                                search.createColumn({ name: "custrecord_jj_bag_core_tracking_record", label: "Bag Core Tracking" }),
                                search.createColumn({ name: "custrecord_jj_bag_core_material_record", label: "Bag Core Material" }),
                            ]
                    });

                    let componentsArray = []; // Initialize an array to store the results.

                    directIssueReturnSearch.run().each(result => {
                        let componentId = result.getValue({ name: "custrecord_jj_component" });
                        let componentName = result.getText({ name: "custrecord_jj_component" });
                        let actualQuantity = result.getValue({ name: "custrecord_jj_metal_actual_quantity" });
                        let issuedQuantity = result.getValue({ name: "custrecord_jj_issued_quantity" });
                        let workOrderId = result.getValue({ name: "custrecord_jj_work_order" });
                        let workOrderName = result.getText({ name: "custrecord_jj_work_order" });
                        let workOrderLine = result.getValue({ name: "custrecord_jj_wo_line_no" });
                        let operations = result.getValue({ name: "custrecord_jj_operations" });
                        let departmentId = result.getValue({ name: "custrecord_jj_department" });
                        let bagGenerationId = result.getValue({ name: "custrecord_jj_bag_generation" });
                        let bagGenerationName = result.getText({ name: "custrecord_jj_bag_generation" });
                        let bagCoreTracking = result.getValue({ name: "custrecord_jj_bag_core_tracking_record" });
                        let bagCoreMaterial = result.getValue({ name: "custrecord_jj_bag_core_material_record" });

                        componentsArray.push({
                            directIssueReturnId: result.id,
                            componentId: componentId,
                            componentName: componentName,
                            actualQuantity: parseFloat(actualQuantity),
                            issuedQuantity: parseFloat(issuedQuantity),
                            workOrderId: workOrderId,
                            workOrderName: workOrderName,
                            workOrderLine: workOrderLine,
                            operations: operations,
                            departmentId: departmentId,
                            bagGenerationId: bagGenerationId,
                            bagGenerationName: bagGenerationName,
                            bagCoreTracking: bagCoreTracking,
                            bagCoreMaterial: bagCoreMaterial,

                        });
                        log.debug("componentsArray", componentsArray);

                        return true; // Return true to continue iteration
                    });
                    return { status: 'SUCCESS', reason: 'Direct Issue Return Components Listed', data: componentsArray };
                } catch (e) {
                    log.error('error @ getDirectIssueReturnComponents', e.message);
                    return {}
                }
            },
            getOpertationsArray(uniqueBagNos, deptId) {
                try {
                    let operationArray = [];
                    let operationsRecordSearch = search.create({
                        type: "customrecord_jj_operations",
                        filters:
                            [
                                ["custrecord_jj_oprtns_bagno", "anyof", uniqueBagNos],
                                "AND",
                                ["custrecord_jj_oprtns_exit", "isempty", ""],
                                "AND",
                                ["custrecord_jj_oprtns_department", "anyof", deptId]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "custrecord_jj_oprtns_bagno", label: "Bag Name/Number" }),
                                search.createColumn({ name: "internalid", label: "Internal ID" })
                            ]
                    });
                    operationsRecordSearch.run().each(result => {
                        let bagNo = result.getValue({ name: "custrecord_jj_oprtns_bagno" });
                        let operationId = result.getValue({ name: "internalid" });
                        operationArray.push({
                            bagNo: bagNo,
                            operationId: operationId
                        });
                        return true; // Return true to continue iteration
                    });
                    return operationArray;
                } catch (e) {
                    log.error('error @ getOpertationsArray', e.message);
                    return {}
                }
            },

            listBagsForAssemblyBuild(isAssemblyBuild, locationId) {
                try {
                    let searchFilters = [
                        // ["custrecord_jj_oprtns_department", "anyof", BARCODING_AND_FG_DEPT_ID],
                        ["custrecord_jj_oprtns_department.custrecord_jj_mandept_is_build_dept", "is", "T"],
                        "AND", ["custrecord_jj_oprtns_entry", "isnotempty", ""],
                        // "AND", ["custrecord_jj_oprtns_exit", "isempty", ""],
                        "AND", ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_wo.status", "noneof", "WorkOrd:H", "WorkOrd:C"],
                        "AND", ["custrecord_jj_oprtns_wo.mainline", "is", "T"],
                        "AND", ["custrecord_jj_oprtns_bagno.isinactive", "is", "F"],
                        // "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_present_dept", "anyof", BARCODING_AND_FG_DEPT_ID],
                        "AND", ["formulanumeric: CASE WHEN {custrecord_jj_oprtns_department} = {custrecord_jj_oprtns_bagno.custrecord_jj_baggen_present_dept} THEN 1 ELSE 0 END", "equalto", "1"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_merge", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_baggen_split", "is", "F"],
                        "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_is_rejected", "is", "F"],
                    ];
                    if (isAssemblyBuild == true) {
                        searchFilters.push(
                            "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "anyof", "@NONE@"],
                            "AND", ["custrecord_jj_oprtns_wo.status", "noneof", "WorkOrd:G"],
                            "AND", ["custrecord_jj_oprtns_exit", "isempty", ""],
                        );
                    }
                    else if (isAssemblyBuild == false) {
                        searchFilters.push(
                            "AND", ["custrecord_jj_oprtns_bagno.custrecord_jj_associated_assembly_build", "noneof", "@NONE@"],
                            "AND", ["custrecord_jj_oprtns_end", "is", "T"],
                        );
                    }

                    if (locationId) {
                        searchFilters.push(
                            "AND", ["custrecord_jj_oprtns_wo.location", "anyof", locationId],
                            "AND", ["custrecord_jj_oprtns_department.custrecord_jj_mandept_location", "anyof", locationId],
                        );
                    }

                    let bagDetailsArray = [];
                    let operationsRecordSearch = search.create({
                        type: "customrecord_jj_operations",
                        filters: searchFilters,
                        columns: [
                            search.createColumn({ name: "custrecord_jj_oprtns_bagno", label: "bag_no_id" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagcore", label: "bag_core_tracking_id" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "customer_id" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "work_order_id", sort: search.Sort.DESC }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "quantity_per_bag" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "style_no" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_duedate", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "delivery_date" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_so", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "sales_order_id" }),
                            search.createColumn({ name: "status", join: "CUSTRECORD_JJ_OPRTNS_WO", label: "status" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "order_type" }),
                            search.createColumn({ name: "custbody_jj_so_date", join: "CUSTRECORD_JJ_OPRTNS_WO", label: "sales_order_date" }),
                        ]
                    });

                    let result = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: operationsRecordSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(operationsRecordSearch, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    log.debug("result", result);

                    bagDetailsArray = result.map(r => ({
                        bagNoId: r.bag_no_id?.value || '',
                        bagNoName: r.bag_no_id?.text || '',
                        bagCoreTrackingId: r.bag_core_tracking_id?.value || '',
                        customerId: r.customer_id?.value || '',
                        customerName: r.customer_id?.text || '',
                        workOrderId: r.work_order_id?.value || '',
                        workOrderName: r.work_order_id?.text || '',
                        orderedQuantity: r.quantity_per_bag?.value || '',
                        design: r.style_no?.value || '',
                        deliveryDate: r.delivery_date?.value || '',
                        salesOrderId: r.sales_order_id?.value || '',
                        salesOrderName: r.sales_order_id?.text || '',
                        status: r.status?.value || '',
                        orderTypeId: r.order_type?.value || '',
                        OrderTypeName: r.order_type?.text || '',
                        salesOrderDate: r.sales_order_date?.value || ''
                    }));

                    // operationsRecordSearch.run().each(result => {
                    //     let bagNoId = result.getValue({ name: "custrecord_jj_oprtns_bagno" });
                    //     let bagNoName = result.getText({ name: "custrecord_jj_oprtns_bagno" });
                    //     let bagCoreTrackingId = result.getValue({ name: "custrecord_jj_oprtns_bagcore" });
                    //     let customerId = result.getValue({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer" });
                    //     let customerName = result.getText({ name: "custrecord_jj_bagcore_customer", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Customer" });
                    //     let workOrderId = result.getValue({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Work Order" });
                    //     let workOrderName = result.getText({ name: "custrecord_jj_bagcore_wo", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Work Order" });
                    //     let orderedQuantity = result.getValue({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_OPRTNS_BAGNO", label: "Quantity Per Bag" });
                    //     let design = result.getValue({ name: "custrecord_jj_bagcore_design", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Design" });
                    //     let deliveryDate = result.getValue({ name: "custrecord_jj_bagcore_duedate", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Delivery Date" });
                    //     let salesOrderId = result.getValue({ name: "custrecord_jj_bagcore_so", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Sales Order" });
                    //     let salesOrderName = result.getText({ name: "custrecord_jj_bagcore_so", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Sales Order" });
                    //     let status = result.getValue({ name: "status", join: "CUSTRECORD_JJ_OPRTNS_WO", label: "Status" });

                    //     let orderTypeId = result.getValue({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Order Type" });

                    //     let OrderTypeName = result.getText({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_OPRTNS_BAGCORE", label: "Order Type" });
                    //     let salesOrderDate = result.getValue({ name: "custbody_jj_so_date", join: "CUSTRECORD_JJ_OPRTNS_WO", label: "SO Date" });

                    //     bagDetailsArray.push({
                    //         bagNoId: bagNoId,
                    //         bagNoName: bagNoName,
                    //         bagCoreTrackingId: bagCoreTrackingId,
                    //         customerId: customerId,
                    //         customerName: customerName,
                    //         workOrderId: workOrderId,
                    //         workOrderName: workOrderName,
                    //         orderedQuantity: orderedQuantity,
                    //         design: design,
                    //         deliveryDate: deliveryDate,
                    //         salesOrderId: salesOrderId,
                    //         salesOrderName: salesOrderName,
                    //         status: status,
                    //         orderTypeId: orderTypeId,
                    //         OrderTypeName: OrderTypeName,
                    //         salesOrderDate: salesOrderDate,
                    //     });
                    //     return true; // Return true to continue iteration
                    // });
                    return { status: 'SUCCESS', reason: 'Bag Details Listed', data: bagDetailsArray };

                } catch (e) {
                    log.error('error @ listBagsForAssemblyBuild', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            getWaxTreeUsedBin(locations) {
                try {
                    if (!locations) {
                        return { status: 'ERROR', reason: "Missing mandatory parameter location", data: [] };
                    }
                    let waxTreeUsedBinSearchObj = search.create({
                        type: "customrecord_jj_wax_tree",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND",
                            ["custrecord_jj_used_lot", "noneof", "@NONE@"],
                            "AND",
                            ["custrecord_jj_metal_issue", "is", "T"],
                            "AND",
                            ["custrecord_jj_moved_to_next_dept", "is", "F"],
                            "AND",
                            ["custrecord_jj_load_list.custrecord_jj_bag_tree_location", "anyof", locations]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_used_lot", summary: "GROUP", label: "inventory_number" }),
                            search.createColumn({ name: "custrecord_jj_metal_issue_weight", summary: "SUM", label: "metal_issue_weight" })
                        ]
                    });

                    // Use jjUtil.dataSets to iterate over the search results
                    let waxTreeUsedBinSearchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: waxTreeUsedBinSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(waxTreeUsedBinSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    return { status: 'SUCCESS', reason: 'Wax Tree Used Bin Listed', data: waxTreeUsedBinSearchResult };
                } catch (e) {
                    log.error('error @ cm_savedsearches @ getWaxTreeUsedBin', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            /**
             * Fetches item classes and metal purity for given item IDs.
             *
             * @param {Array<number|string>} itemIds - Array of item internal IDs.
             * @returns {Object} - Mapping of item IDs to their class and purity.
             */
            getItemClassesAndPurity(itemIds) {
                try {
                    let classAndPurityMapping = {};

                    // Create item search
                    let itemSearch = search.create({
                        type: search.Type.ITEM,
                        filters: [['internalid', 'anyof', itemIds]],
                        columns: [
                            search.createColumn({ name: "internalid", label: "internalid" }),
                            search.createColumn({ name: "class", label: "class" }),
                            search.createColumn({ name: "custrecord_jj_dd_metal_quality_purity", join: "CUSTITEM_JJ_METAL_QUALITY", label: "quality_purity" })
                        ]
                    });

                    // Process search results
                    itemSearch.run().each(function (result) {
                        let itemId = result.getValue({ name: 'internalid' });
                        let classId = result.getValue({ name: 'class' });
                        let purityText = result.getText({ name: 'custrecord_jj_dd_metal_quality_purity', join: 'CUSTITEM_JJ_METAL_QUALITY' }) || 0;

                        // Ensure purity is a valid number
                        let purity = isNaN(Number(purityText)) ? 0 : Number(purityText);

                        classAndPurityMapping[itemId] = { classId: classId, purityValue: purity };
                        return true; // Continue iterating
                    });

                    return classAndPurityMapping;
                } catch (error) {
                    log.error('Error Fetching Item Classes And Purity', error.message);
                    return {};
                }
            },

            getInventoryNumberRecords(serialArray, serialId) {
                try {
                    let filters = [];
                    if (serialId) {
                        filters.push(["internalid", "anyof", serialId]);
                    } else {
                        serialArray.forEach((serial, index) => {
                            if (index > 0) {
                                filters.push('OR');
                            }
                            filters.push(['inventorynumber', 'is', serial]);
                        });
                    }
                    let inventoryNumberSearch = search.create({
                        type: 'inventorynumber',
                        filters: filters,
                        columns: [
                            'internalid',
                            'inventorynumber',
                            'custitemnumber_jj_serial_num_net_weight',
                            'custitemnumber_jj_serial_num_diamond_weight',
                            'custitemnumber_jj_serial_num_cs_weight',
                            'custitemnumber_jj_serial_num_gross_weight',
                            'custitemnumber_jj_serial_num_pure_weight',
                            'custitemnumber_jj_serial_num_item_size',
                            'custitemnumber_jj_serial_num_shop_code',

                            'custitemnumber_jj_cost_party_diamond',
                            'custitemnumber_jj_cost_making_charge',
                            'custitemnumber_jj_cost_color_stone',
                            'custitemnumber_jj_cost_diamond',
                            'custitemnumber_jj_cost_gold',

                            'custitemnumber_jj_cost_alloy', // added for alloy qty calculation
                            'custitemnumber_jj_serial_num_alloy_weight', // added for alloy qty calculation

                            'custitemnumber_jj_total_labour_overhead_char',
                            'custitemnumber_jj_total_net_loss_charge',
                            'custitemnumber_jj_finding_item_service_chrg',

                            // ---- FG Stone / Metal attributes ----
                            'custitemnumber_jj_fg_stone_color',
                            'custitemnumber_jj_fg_stone_quality',

                            'custitemnumber_jj_fg_metal_colour',
                            'custitemnumber_jj_fg_metal_quality',
                            'custitemnumber_jj_fg_metal_purity',

                            'custitemnumber_jj_fg_cs_stone_color',
                            'custitemnumber_jj_fg_cs_stone_shape',
                        ]
                    });
                    let inventoryNumberSearchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventoryNumberSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventoryNumberSearch, 'name'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    log.debug("inventorySearchResult", inventoryNumberSearchResult);
                    return inventoryNumberSearchResult;
                } catch (error) {
                    log.error('Error getInventoryNumberRecords', error.message);
                }
            },

            listSerials(bagId) {
                try {
                    let bagGeneration = search.lookupFields({
                        type: 'customrecord_jj_bag_generation',
                        id: bagId,
                        columns: [
                            'custrecord_jj_associated_assembly_build'
                        ]
                    });
                    let assemblyBuildId = bagGeneration.custrecord_jj_associated_assembly_build?.[0]?.value || null;
                    log.debug("assemblyBuildId", assemblyBuildId);

                    let assemblybuildSearchObj = search.create({
                        type: "assemblybuild",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters:
                            [
                                ["type", "anyof", "Build"],
                                "AND",
                                ["internalid", "anyof", assemblyBuildId],
                                "AND",
                                ["mainline", "is", "T"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "Internal ID" }),
                                search.createColumn({
                                    name: "inventorynumber",
                                    join: "inventoryDetail",
                                    label: " Number"
                                })
                            ]
                    });

                    let inventoryNumberId = [];
                    assemblybuildSearchObj.run().each(function (result) {
                        inventoryNumberId.push(result.getValue({
                            name: "inventorynumber",
                            join: "inventoryDetail"
                        })
                        );
                        return true; // Continue iteration
                    });
                    log.debug("inventoryNumberId", inventoryNumberId);

                    if (inventoryNumberId.length == 0) {
                        return { status: 'ERROR', reason: 'No Inventory related to Assembly Built Details Found', data: {} };
                    }

                    let serialNumberDetails = [];
                    let inventorynumberSearchObj = search.create({
                        type: "inventorynumber",
                        filters:
                            [
                                ["internalid", "anyof", inventoryNumberId]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "Internal ID" }),
                                search.createColumn({ name: "item", label: "Item" }),
                                search.createColumn({ name: "inventorynumber", label: "Number" }),
                                search.createColumn({ name: "custitemnumber_jj_serial_num_net_weight", label: "Net Weight (NWT)" }),
                                search.createColumn({ name: "custitemnumber_jj_serial_num_diamond_weight", label: "Diamond Weight (DWT)" }),
                                search.createColumn({ name: "custitemnumber_jj_serial_num_cs_weight", label: "Color Stone Weight (CSWT)" }),
                                search.createColumn({ name: "custitemnumber_jj_serial_num_gross_weight", label: "Gross Weight (GWT)" }),
                                search.createColumn({ name: "custitemnumber_jj_serial_num_alloy_weight", label: "Alloy Weight (AWT)" })
                            ]
                    });

                    inventorynumberSearchObj.run().each(function (result) {
                        serialNumberDetails.push({
                            serialNumberId: result.getValue({ name: "internalid" }),
                            itemId: result.getValue({ name: "item" }),
                            itemName: result.getText({ name: "item" }),
                            serialNumber: result.getValue({ name: "inventorynumber" }),
                            netWeight: result.getValue({ name: "custitemnumber_jj_serial_num_net_weight" }),
                            diamondWeight: result.getValue({ name: "custitemnumber_jj_serial_num_diamond_weight" }),
                            colorStoneWeight: result.getValue({ name: "custitemnumber_jj_serial_num_cs_weight" }),
                            grossWeight: result.getValue({ name: "custitemnumber_jj_serial_num_gross_weight" }),
                            alloyWeight: result.getValue({ name: "custitemnumber_jj_serial_num_alloy_weight" })
                        })
                        return true; // Continue iteration
                    });
                    log.debug("serialNumberDetails", serialNumberDetails);

                    // Group by serialNumberId
                    let groupedDetails = {};
                    serialNumberDetails.forEach(detail => {
                        let serialNumberId = detail.serialNumberId;
                        if (!groupedDetails[serialNumberId]) {
                            groupedDetails[serialNumberId] = [];
                        }
                        groupedDetails[serialNumberId].push({
                            itemId: detail.itemId,
                            itemName: detail.itemName,
                            serialNumber: detail.serialNumber,
                            netWeight: detail.netWeight,
                            diamondWeight: detail.diamondWeight,
                            colorStoneWeight: detail.colorStoneWeight,
                            grossWeight: detail.grossWeight,
                            alloyWeight: detail.alloyWeight
                        });
                    });

                    // Format groupedDetails into an array if needed
                    let formattedDetails = Object.keys(groupedDetails).map(serialNumberId => ({
                        serialNumberId: serialNumberId,
                        details: groupedDetails[serialNumberId]
                    }));
                    log.debug("formattedDetails", formattedDetails);
                    return { status: 'SUCCESS', reason: 'Inventory Number Found', data: formattedDetails };

                } catch (e) {
                    log.error('Error listSerials', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            // getBagCoreMaterialsDetail(bagNo) {
            //     try {
            //         let bagCoreMaterialsSearch = search.create({
            //             type: "customrecord_jj_bagcore_materials",
            //             filters:
            //                 [
            //                     ["custrecord_jj_bagcoremat_bag_name", "anyof", bagNo],
            //                     "AND",
            //                     ["isinactive", "is", "F"],
            //                     "AND",
            //                     ["custrecord_jj_bag_core_material.custrecord_jj_quantity", "greaterthan", "0"],
            //                     "AND",
            //                     ["custrecord_jj_bag_core_material.custrecord_jj_lot_number", "noneof", "@NONE@"]

            //                 ],
            //             columns:
            //                 [
            //                     search.createColumn({ name: "custrecord_jj_bagcoremat_item", label: "Item" }),
            //                     search.createColumn({
            //                         name: "custrecord_jj_lot_number",
            //                         join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL",
            //                         label: "Lot Number"
            //                     }),
            //                     search.createColumn({
            //                         name: "custrecord_jj_quantity",
            //                         join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL",
            //                         label: "Quantity"
            //                     })
            //                 ]
            //         });
            //         let lotDetails = [];
            //         bagCoreMaterialsSearch.run().each(function (result) {
            //             lotDetails.push({
            //                 itemId: result.getValue({ name: "custrecord_jj_bagcoremat_item" }),
            //                 itemName: result.getText({ name: "custrecord_jj_bagcoremat_item" }),
            //                 lotNumber: result.getValue({ name: "custrecord_jj_lot_number", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
            //                 lotNumberName: result.getText({ name: "custrecord_jj_lot_number", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
            //                 quantity: result.getValue({ name: "custrecord_jj_quantity", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" })
            //             });
            //             return true;
            //         });

            //         return lotDetails;

            //     } catch (e) {
            //         log.error('Error getBagCoreMaterialsDetail', e.message);
            //         return { status: 'ERROR', reason: e.message, data: [] };
            //     }
            // },

            getWorkOrderInventoryDetails(workorder, lineNumber, totalIssue) {
                try {
                    // log.debug("workorder 1", workorder);
                    // log.debug("workorder 2", typeof workorder);
                    // log.debug("lineNumber 1", lineNumber);
                    // log.debug("totalIssue 1", totalIssue);
                    let workorderSearchObj = search.create({
                        type: "workorder",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters:
                            [
                                ["type", "anyof", "WorkOrd"],
                                "AND",
                                ["internalid", "anyof", workorder],
                                "AND",
                                ["mainline", "is", "F"],
                                "AND",
                                ["line", "equalto", lineNumber]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "Internal ID" }),
                                search.createColumn({
                                    name: "internalid",
                                    join: "item",
                                    label: "Item Id"
                                }),
                                search.createColumn({ name: "item", label: "Item" }),
                                search.createColumn({
                                    name: "inventorynumber",
                                    join: "inventoryDetail",
                                    label: " Number"
                                }),
                                search.createColumn({
                                    name: "quantity",
                                    join: "inventoryDetail",
                                    label: "Quantity"
                                })
                            ]
                    });

                    let serialNumberDetails = [];
                    let totalQuantity = 0;

                    workorderSearchObj.run().each(function (result) {
                        serialNumberDetails.push({
                            serialNumberId: result.getValue({ name: "inventorynumber", join: "inventoryDetail" }),
                            componentId: result.getValue({ name: "internalid", join: "item" }),
                            quantity: result.getValue({ name: "quantity", join: "inventoryDetail" })
                        });

                        totalQuantity += result.getValue({ name: "quantity", join: "inventoryDetail" });

                        if (totalQuantity < totalIssue) {
                            return true; // Continue iteration
                        }
                        else {
                            return false;
                        }
                    });
                    return serialNumberDetails;

                } catch (e) {
                    log.error('Error getWorkOrderInventoryDetails', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },



            /**
            * @description function for handling the escape characters
            * @param unsafe Data
            * @return {*}
            */
            escapeXml(unsafe) {
                try {
                    if (unsafe) {
                        return unsafe.replace(/[<>&'"]/g, function (c) {
                            switch (c) {
                                case '<':
                                    return '&lt;';
                                case '>':
                                    return '&gt;';
                                case '&':
                                    return '&amp;';
                                case '\'':
                                    return '&apos;';
                                case '"':
                                    return '&quot;';
                            }
                        });
                    }
                }
                catch (e) {
                    log.error({ title: "error@unsafe", details: e });
                }
            },

            getBagCoreMaterialRecord(bagCoreMaterialId, bagId, params) {
                try {
                    let aggregatedResult = [];

                    let filter = [
                        ["isinactive", "is", "F"],
                        // "AND",
                        // ["custrecord_jj_bag_core_material.isinactive", "is", "F"],
                    ];

                    if (bagCoreMaterialId != null) {
                        log.debug("Filtered added bagCoreMaterialId", bagCoreMaterialId);
                        filter.push("AND", ["internalid", "anyof", bagCoreMaterialId]);
                    }
                    else if (bagId) {
                        log.debug("Filter added: bagId");
                        filter.push("AND", ["custrecord_jj_bagcoremat_bag_name", "anyof", bagId],
                            // "AND", ["custrecord_jj_bag_core_material.custrecord_jj_quantity", "greaterthan", "0"], 
                            // "AND", ["custrecord_jj_bag_core_material.custrecord_jj_lot_number", "noneof", "@NONE@"]
                        );
                    }

                    let bagcoreMaterialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: filter,
                        columns: [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_qty", label: "actual_quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_bag_name", label: "Bag Name/Number" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_item", label: "Item" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_issue", label: "Total Issue" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_to_issue", label: "To Be Issued" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_loss", label: "Total Loss" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_total_receive", label: "Total Receive" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_wo_line_no", label: "Work Order Line Number" }),
                            search.createColumn({ name: "custrecord_jj_actual_pieces", label: "Actual Pieces" }),
                            search.createColumn({ name: "custrecord_jj_issued_pieces", label: "Issued Pieces" }),
                            search.createColumn({ name: "custrecord_jj_to_be_issued_pieces", label: "To Be Issued Pieces" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_additional_qty", label: "Balance Quantity" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_loss_pieces", label: "Loss Pieces" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_balance_pieces", label: "Balance Pieces" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_wo", label: "Work Order" }),
                            search.createColumn({ name: "custrecord_jj_lot_number", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Lot Number" }),
                            search.createColumn({ name: "custrecord_jj_quantity", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Quantity" }),
                            search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Material Lot Details ID" }),
                            search.createColumn({ name: "isinactive", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "Inactive" }),
                            search.createColumn({ name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME", label: "department" }),
                            search.createColumn({ name: "isserialitem", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "is_serial" }),
                            search.createColumn({ name: "class", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "item_class" }),
                            search.createColumn({ name: "custrecord_jj_to_be_issued_pieces_info", label: "To Be Issued Pieces Info" }),
                            search.createColumn({ name: "custrecord_jj_balance_pieces_info", label: "Total Balance Pieces Info" }),
                            search.createColumn({ name: "custrecord_jj_issued_pieces_info", label: "Total Issued Pieces Info" }),
                            search.createColumn({ name: "custrecord_jj_loss_pieces_info", label: "Total Loss Pieces Info" }),

                            search.createColumn({ name: "custrecord_jj_bagcoremat_scrap_qty", label: "Scrap Quantity" }),
                            // search.createColumn({ name: "custrecord_jj_bagcoremat_scrap_pieces", label: "Scrap Pieces" }),
                            search.createColumn({ name: "custrecord_jj_scrap_pieces_info", label: "Total Scrap Pieces Info" }),


                            search.createColumn({ name: "custrecord_jj_last_issue_date", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "last_issue_date" }),
                            search.createColumn({ name: "custrecord_jj_newly_issue_qty", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "new_qty" }),
                            search.createColumn({ name: "custrecord_jj_pieces", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "pieces" }),
                            search.createColumn({ name: "custrecord_jj_newly_issue_pieces", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "new_pieces" }),
                            search.createColumn({ name: "type", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "type" }),
                            search.createColumn({ name: "cost", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "cost" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "order_type" }),
                            search.createColumn({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "serial_repair" }),
                            search.createColumn({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE", label: "serial_repair_wt" }),
                            search.createColumn({ name: "custitem_jj_metal_quality", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "metal_quality" }),
                            search.createColumn({ name: "averagecost", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "averagecost" }),
                            search.createColumn({ name: "custrecord_jj_related_lot", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL", label: "related_lot" }),
                            search.createColumn({ name: "custitem_jj_relate_item_reference", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM", label: "related_item" }),
                        ]
                    });

                    let groupedResults = {};

                    bagcoreMaterialsSearchObj.run().each(function (result) {
                        const internalId = result.getValue({ name: "internalid" });
                        const materialLotDetailsEntry = {
                            lotNumber: result.getValue({ name: "custrecord_jj_lot_number", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            lotNumberName: result.getText({ name: "custrecord_jj_lot_number", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            quantity: result.getValue({ name: "custrecord_jj_quantity", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            relatedLot: result.getValue({ name: "custrecord_jj_related_lot", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            materialLotDetailsId: result.getValue({ name: "internalid", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            isInactive: result.getValue({ name: "isinactive", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            lastIssueDate: result.getValue({ name: "custrecord_jj_last_issue_date", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            latestQty: result.getValue({ name: "custrecord_jj_newly_issue_qty", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            pieces: result.getValue({ name: "custrecord_jj_pieces", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                            latestPieces: result.getValue({ name: "custrecord_jj_newly_issue_pieces", join: "CUSTRECORD_JJ_BAG_CORE_MATERIAL" }),
                        };
                        // const isNotEmpty = Object.values(materialLotDetailsEntry).every(value => value !== null && value !== undefined && value !== '' && value !== true && value !== 'T');
                        const isNotEmpty = Object.entries(materialLotDetailsEntry)
                            .filter(([key]) => key !== 'latestQty' && key !== 'lastIssueDate' && key !== 'pieces' && key !== 'latestPieces' && key !== 'relatedLot') // Exclude these fields
                            .every(([, value]) => value !== null && value !== undefined && value !== '');

                        if (!groupedResults[internalId]) {
                            groupedResults[internalId] = {
                                bagCoreMaterialId: internalId,
                                bagNo: result.getValue({ name: "custrecord_jj_bagcoremat_bag_name" }),
                                bagName: result.getText({ name: "custrecord_jj_bagcoremat_bag_name" }),
                                department: result.getValue({ name: "custrecord_jj_baggen_present_dept", join: "CUSTRECORD_JJ_BAGCOREMAT_BAG_NAME" }),
                                itemId: result.getValue({ name: "custrecord_jj_bagcoremat_item" }),
                                itemName: result.getText({ name: "custrecord_jj_bagcoremat_item" }),
                                actualQuantity: result.getValue({ name: "custrecord_jj_bagcoremat_qty" }),
                                totalIssue: result.getValue({ name: "custrecord_jj_bagcoremat_total_issue" }),
                                toBeIssued: result.getValue({ name: "custrecord_jj_bagcoremat_to_issue" }),
                                totalLoss: result.getValue({ name: "custrecord_jj_bagcoremat_total_loss" }),
                                totalReceive: result.getValue({ name: "custrecord_jj_bagcoremat_total_receive" }),
                                workOrderLine: result.getValue({ name: "custrecord_jj_bagcoremat_wo_line_no" }),
                                issuedPieces: result.getValue({ name: "custrecord_jj_issued_pieces" }),
                                toBeIssuedPieces: result.getValue({ name: "custrecord_jj_to_be_issued_pieces" }),
                                balanceQty: result.getValue({ name: "custrecord_jj_bagcoremat_additional_qty" }),
                                totalLossPieces: result.getValue({ name: "custrecord_jj_bagcoremat_loss_pieces" }),
                                totalBalancePieces: result.getValue({ name: "custrecord_jj_bagcoremat_balance_pieces" }),
                                work_order_id: result.getValue({ name: "custrecord_jj_bagcoremat_wo" }),
                                isSerialized: result.getValue({ name: "isserialitem", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),
                                item_class: result.getValue({ name: "class", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),
                                metal_quality: result.getValue({ name: "custitem_jj_metal_quality", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),

                                actualPiecesInfo: result.getValue({ name: "custrecord_jj_actual_pieces_info" }),
                                toBeIssuedPiecesInfo: result.getValue({ name: "custrecord_jj_to_be_issued_pieces_info" }),
                                totalBalancePiecesInfo: result.getValue({ name: "custrecord_jj_balance_pieces_info" }),
                                totalIssuedPiecesInfo: result.getValue({ name: "custrecord_jj_issued_pieces_info" }),
                                totalLossPiecesInfo: result.getValue({ name: "custrecord_jj_loss_pieces_info" }),

                                scrapQty: result.getValue({ name: "custrecord_jj_bagcoremat_scrap_qty" }),
                                // totalScrapPieces: result.getValue({ name: "custrecord_jj_bagcoremat_scrap_pieces" }),
                                totalScrapPiecesInfo: result.getValue({ name: "custrecord_jj_scrap_pieces_info" }),

                                isOthCharge: result.getValue({ name: "type" }) === 'OthCharge',
                                isServiceItem: result.getValue({ name: "type" }) === 'Service',
                                purchasePrice: result.getValue({ name: "cost", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),
                                averagecost: result.getValue({ name: "averagecost", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),

                                isRepair: result.getValue({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" }) == REPAIR_ORDER_TYPE_ID,
                                repairSerial: result.getValue({ name: "custrecord_jj_serial_to_repair", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" }),
                                repairSerialWt: result.getValue({ name: "custrecord_jj_gwt_of_repair_serial", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" }),

                                isJobwork: result.getValue({ name: "custrecord_jj_bagcore_order_type", join: "CUSTRECORD_JJ_BAGCOREMAT_BAGCORE" }) == JOB_WORK_ORDER_TYPE_ID,
                                relatedItem: result.getValue({ name: "custitem_jj_relate_item_reference", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),
                                relatedItemName: result.getText({ name: "custitem_jj_relate_item_reference", join: "CUSTRECORD_JJ_BAGCOREMAT_ITEM" }),

                                materialLotDetails: []
                            };
                        }
                        if (isNotEmpty && (materialLotDetailsEntry.isInactive == false || (params && params == 'lot_create_update'))) {
                            groupedResults[internalId].materialLotDetails.push(materialLotDetailsEntry);
                        }
                        return true; // Continue iterating through results
                    });

                    // Convert grouped results to an array
                    aggregatedResult = Object.values(groupedResults);
                    // log.debug("aggregatedResult", aggregatedResult);

                    // const grouped = {};
                    // aggregatedResult.forEach((item) => {
                    //     const { itemId, totalIssue, toBeIssued, totalLoss, totalReceive, materialLotDetails } = item;

                    //     if (!grouped[itemId]) {
                    //         grouped[itemId] = {
                    //             itemId,
                    //             totalIssue: parseFloat(totalIssue),
                    //             toBeIssued: parseFloat(toBeIssued),
                    //             totalLoss: parseFloat(totalLoss),
                    //             totalReceive: parseFloat(totalReceive),
                    //             materialLotDetails: {}
                    //         };
                    //     } else {
                    //         grouped[itemId].totalIssue += parseFloat(totalIssue);
                    //         grouped[itemId].toBeIssued += parseFloat(toBeIssued);
                    //         grouped[itemId].totalLoss += parseFloat(totalLoss);
                    //         grouped[itemId].totalReceive += parseFloat(totalReceive);
                    //     }

                    //     materialLotDetails.forEach(({ lotNumber, quantity }) => {
                    //         if (!grouped[itemId].materialLotDetails[lotNumber]) {
                    //             grouped[itemId].materialLotDetails[lotNumber] = parseFloat(quantity);
                    //         } else {
                    //             grouped[itemId].materialLotDetails[lotNumber] += parseFloat(quantity);
                    //         }
                    //     });
                    // });
                    // let final = Object.values(grouped).map((group) => ({
                    //     itemId: group.itemId,
                    //     totalIssue: group.totalIssue,
                    //     toBeIssued: group.toBeIssued,
                    //     totalLoss: group.totalLoss,
                    //     totalReceive: group.totalReceive,
                    //     materialLotDetails: Object.entries(group.materialLotDetails).map(([lotNumber, quantity]) => ({
                    //         lotNumber,
                    //         quantity: quantity.toFixed(5) // Keep five decimal places for consistency
                    //     }))
                    // }));
                    // log.debug("final", final);
                    // return final;

                    return aggregatedResult;
                } catch (e) {
                    log.error('error @ getBagCoreMaterialRecord', e.message);
                    return [];
                }
            },

            /**
             * @description Function to get the wax tree details for bulk movement
             * @returns {Array} - Array of wax tree search object
             */
            getWaxTreesForBulkMovement() {
                try {
                    // Get wax trees for bulk movement
                    let waxTreeSearchObjForMR = search.create({
                        type: "customrecord_jj_wax_tree",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", [
                                [
                                    ["custrecord_jj_moved_to_next_dept", "is", "F"],
                                    "AND", ["custrecord_jj_to_tree_cutting_status", "anyof", PROCESS_STATUS_READY_TO_PROCESS]
                                ],
                                "OR", [
                                    ["custrecord_jj_moved_to_next_dept", "is", "T"],
                                    "AND", ["custrecord_jj_moved_to_grinding", "is", "F"],
                                    "AND", ["custrecord_jj_to_grinding_status", "anyof", PROCESS_STATUS_READY_TO_PROCESS]
                                ],
                                "OR", [
                                    ["custrecord_jj_moved_to_grinding", "is", "T"],
                                    "AND", ["custrecord_jj_moved_to_bagging", "is", "F"],
                                    "AND", ["custrecord_jj_to_bagging_status", "anyof", PROCESS_STATUS_READY_TO_PROCESS]
                                ]
                            ],
                            "AND", ["custrecord_jj_metal_issue", "is", "T"],
                            "AND", ["custrecord_jj_bags.custrecord_jj_baggen_merge", "is", "F"],
                            "AND", ["custrecord_jj_bags.custrecord_jj_baggen_split", "is", "F"],
                            "AND", ["custrecord_jj_bags.custrecord_jj_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_bags.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_metal_list.isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "internalid" }),
                            search.createColumn({ name: "custrecord_jj_load_list", label: "custrecord_jj_load_list" }),
                            search.createColumn({ name: "custrecord_jj_metal_list", label: "custrecord_jj_metal_list" }),
                            search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_BAGS", label: "bag_id" }),
                            search.createColumn({ name: "custrecord_jj_baggen_bagcore", join: "CUSTRECORD_JJ_BAGS", label: "bag_core_id" }),
                            // search.createColumn({ name: "custrecord_jj_total_weight_needed", label: "Total Weight Needed" }),
                            search.createColumn({ name: "custrecord_jj_metal_issue_weight", label: "custrecord_jj_metal_issue_weight" }),
                            // search.createColumn({ name: "custrecord_jj_wax_weight", label: "Wax Weight" }),
                            search.createColumn({ name: "custrecord_jj_used_lot", label: "custrecord_jj_used_lot" }),
                            search.createColumn({ name: "custrecord_jj_bag_components_wt", label: "custrecord_jj_bag_components_wt" }),
                            search.createColumn({ name: "custrecord_jj_bag_tree_location", join: "CUSTRECORD_JJ_LOAD_LIST", label: "custrecord_jj_bag_tree_location" }),

                            // casting to cutting
                            search.createColumn({ name: "custrecord_jj_moved_to_next_dept", label: "custrecord_jj_moved_to_next_dept" }),
                            search.createColumn({ name: "custrecord_jj_final_tree_weight", label: "custrecord_jj_final_tree_weight" }),
                            search.createColumn({ name: "custrecord_jj_casting_loss", label: "custrecord_jj_casting_loss" }),
                            search.createColumn({ name: "custrecord_jj_metal_moved_to_next_dept", label: "custrecord_jj_metal_moved_to_next_dept" }),
                            search.createColumn({ name: "custrecord_jj_casting_loss_transfer", label: "custrecord_jj_casting_loss_transfer" }),
                            search.createColumn({ name: "custrecord_jj_comp_moved_to_cutting", label: "custrecord_jj_comp_moved_to_cutting" }),

                            // cutting to grinding
                            search.createColumn({ name: "custrecord_jj_moved_to_grinding", label: "custrecord_jj_moved_to_grinding" }),
                            search.createColumn({ name: "custrecord_jj_received_yield_weight", label: "custrecord_jj_received_yield_weight" }),
                            search.createColumn({ name: "custrecord_jj_cutting_loss_weight", label: "custrecord_jj_cutting_loss_weight" }),
                            search.createColumn({ name: "custrecord_jj_tree_weight", label: "custrecord_jj_tree_weight" }),
                            search.createColumn({ name: "custrecord_jj_metal_moved_to_grinding", label: "custrecord_jj_metal_moved_to_grinding" }),
                            search.createColumn({ name: "custrecord_jj_cutting_loss_transfer", label: "custrecord_jj_cutting_loss_transfer" }),
                            search.createColumn({ name: "custrecord_jj_wax_weight_transferred", label: "custrecord_jj_wax_weight_transferred" }),
                            search.createColumn({ name: "custrecord_jj_is_loss_confirmed", label: "custrecord_jj_is_loss_confirmed" }),
                            search.createColumn({ name: "custrecord_jj_comp_moved_to_grinding", label: "custrecord_jj_comp_moved_to_grinding" }),

                            // grinding to bagging
                            search.createColumn({ name: "custrecord_jj_received_weight", label: "custrecord_jj_received_weight" }),
                            search.createColumn({ name: "custrecord_jj_loss_weight", label: "custrecord_jj_loss_weight" }),
                            search.createColumn({ name: "custrecord_jj_metal_moved_to_bagging", label: "custrecord_jj_metal_moved_to_bagging" }),
                            search.createColumn({ name: "custrecord_jj_loss_transferred", label: "custrecord_jj_loss_transferred" }),
                            search.createColumn({ name: "custrecord_jj_comp_moved_to_bagging", label: "custrecord_jj_comp_moved_to_bagging" }),
                        ]
                    });

                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: waxTreeSearchObjForMR,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(waxTreeSearchObjForMR, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                } catch (e) {
                    log.error('error @ getWaxTreesForBulkMovement', e.message);
                    return [];
                }
            },

            getDepartmentFields(department) {
                try {
                    let departmentFields = search.lookupFields({
                        type: 'customrecord_jj_manufacturing_dept',
                        id: department,
                        columns: [
                            'custrecord_jj_mandept_location',
                            'custrecord_jj_mandept_bin_no',
                            'custrecord_jj_mandept_good_status',
                            'custrecord_jj_mandept_hod',
                            'custrecord_jj_mandept_loss_record_bin',
                            'custrecord_jj_mandept_loss_status',
                            'custrecord_jj_mandept_wip_status',
                            'custrecord_jj_mandept_damaged_status',
                            'custrecord_jj_mandept_wt_status',
                            'custrecord_jj_mandept_missed_status',
                            'custrecord_jj_mandept_broken_status',
                            'custrecord_jj_mandept_burnt_status',
                            'custrecord_jj_mandept_memo_qa_status',
                            'custrecord_jj_mandept_certific_status',
                            'custrecord_jj_mandept_rejection_status',
                            'custrecord_jj_mandept_qc_pending_status',
                            'custrecord_jj_mandept_label_pend_status',
                            'custrecord_jj_mandept_laser_pend_status',
                            'custrecord_jj_mandept_hm_pend_status',
                            'custrecord_jj_mandept_unbilled_status',
                            'custrecord_jj_mandept_loss_outsourced',
                            'custrecord_jj_mandept_has_bulk_movement',
                            'custrecord_jj_mandept_has_bulk_acknowled'
                        ]
                    });

                    // Extract values with error handling in case fields are null or undefined
                    let result = {
                        location: departmentFields.custrecord_jj_mandept_location?.[0]?.value || null,
                        bin: departmentFields.custrecord_jj_mandept_bin_no?.[0]?.value || null,
                        binName: departmentFields.custrecord_jj_mandept_bin_no?.[0]?.text || null,
                        goodStatus: departmentFields.custrecord_jj_mandept_good_status?.[0]?.value || null,
                        hod: departmentFields.custrecord_jj_mandept_hod?.[0]?.value || null,
                        lossRecordBin: departmentFields.custrecord_jj_mandept_loss_record_bin?.[0]?.value || null,
                        lossStatus: departmentFields.custrecord_jj_mandept_loss_status?.[0]?.value || null,
                        wipStatus: departmentFields.custrecord_jj_mandept_wip_status?.[0]?.value || null,
                        damagedStatus: departmentFields.custrecord_jj_mandept_damaged_status?.[0]?.value || null,
                        waxTreeStatus: departmentFields.custrecord_jj_mandept_wt_status?.[0]?.value || null,
                        diamondMissedStatus: departmentFields.custrecord_jj_mandept_missed_status?.[0]?.value || null,
                        diamondBrokenStatus: departmentFields.custrecord_jj_mandept_broken_status?.[0]?.value || null,
                        diamondBurntStatus: departmentFields.custrecord_jj_mandept_burnt_status?.[0]?.value || null,
                        goodStatusName: departmentFields.custrecord_jj_mandept_good_status?.[0]?.text || null,
                        waxTreeStatusName: departmentFields.custrecord_jj_mandept_wt_status?.[0]?.text || null,
                        memoQAStatus: departmentFields.custrecord_jj_mandept_memo_qa_status?.[0]?.value || null,
                        memoUnbilledStatus: departmentFields.custrecord_jj_mandept_unbilled_status?.[0]?.value || null,
                        memoUnbilledStatusName: departmentFields.custrecord_jj_mandept_unbilled_status?.[0]?.text || null,

                        lossOutsourcedStatus: departmentFields.custrecord_jj_mandept_loss_outsourced?.[0]?.value || null,
                        lossOutsourcedStatusName: departmentFields.custrecord_jj_mandept_loss_outsourced?.[0]?.text || null,

                        certificPendStatus: departmentFields.custrecord_jj_mandept_certific_status?.[0]?.value || null,
                        rejectionStatus: departmentFields.custrecord_jj_mandept_rejection_status?.[0]?.value || null,
                        qcPendStatus: departmentFields.custrecord_jj_mandept_qc_pending_status?.[0]?.value || null,
                        labelPendStatus: departmentFields.custrecord_jj_mandept_label_pend_status?.[0]?.value || null,
                        laserPendStatus: departmentFields.custrecord_jj_mandept_laser_pend_status?.[0]?.value || null,
                        hallmarkingPendStatus: departmentFields.custrecord_jj_mandept_hm_pend_status?.[0]?.value || null,

                        hasBulkMovement: departmentFields.custrecord_jj_mandept_has_bulk_movement || false,
                        hasBulkAcknowled: departmentFields.custrecord_jj_mandept_has_bulk_acknowled || false,
                    };

                    return result;
                } catch (e) {
                    log.error('getDepartmentFields', e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            getBagCoreForBagRecreation(bagCoreId, params) {
                try {
                    let columns = [];
                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_bagreject_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"],
                        "AND", ["custrecord_jj_bagreject_recreated", "is", "F"],
                        "AND", ["custrecord_jj_bagreject_bagcore.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_bagreject_bagno.custrecord_jj_is_rejected", "is", "T"],
                        "AND", ["custrecord_jj_bagreject_bagno.isinactive", "is", "F"]
                    ];

                    if (params && params == 'recreated') {
                        filters.push("AND", ["custrecord_jj_bagreject_bagno.custrecord_jj_is_recreated", "is", "F"]);
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_bagreject_bagcore", label: "bag_core_tracking_record" }),
                            search.createColumn({ name: "internalid", label: "rejection_record_id" }),
                            search.createColumn({ name: "custrecord_jj_bagreject_bagno", label: "bag_number" }),
                            search.createColumn({ name: "custrecord_jj_baggen_qty", join: "CUSTRECORD_JJ_BAGREJECT_BAGNO", label: "quantity_per_bag" }));
                    } else {
                        columns.push(
                            search.createColumn({ name: "custrecord_jj_bagreject_bagcore", summary: "GROUP", label: "bag_core_tracking_record" }),
                            search.createColumn({ name: "internalid", summary: "GROUP", label: "rejection_record_id" })
                        );
                    }

                    if (bagCoreId) {
                        filters.push("AND", ["custrecord_jj_bagreject_bagcore", "anyof", bagCoreId]);
                    }

                    let bagrejectionSearchObj = search.create({
                        type: "customrecord_jj_bag_rejection",
                        filters: filters,
                        columns: columns
                    });
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: bagrejectionSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(bagrejectionSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                } catch (e) {
                    log.error('error @ getBagCoreForBagRecreation', e.message);
                    return [];
                }
            },

            getBagCoreMaterialItemsForRecreation(bagCoreId) {
                try {
                    if (!bagCoreId) {
                        return { status: "ERROR", reason: "Bag Core ID is required", data: [] };
                    }

                    // Define the search object for bag core materials
                    let bagCoreMaterialsSearchObj = search.create({
                        type: "customrecord_jj_bagcore_materials",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_is_rejected", "is", "T"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_merge", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_baggen_split", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bagcore.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bagcore.custrecord_jj_bagcore_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_bagcore.internalid", "anyof", bagCoreId],
                            "AND", ["custrecord_jj_bagcoremat_bag_name.custrecord_jj_is_recreated", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_wo.mainline", "is", "T"],
                            "AND", ["custrecord_jj_bagcoremat_wo.cogs", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_wo.shipping", "is", "F"],
                            "AND", ["custrecord_jj_bagcoremat_wo.taxline", "is", "F"],
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_bagcoremat_item", summary: "GROUP", label: "Item" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_wo_line_no", summary: "GROUP", label: "Work Order Line Number" }),
                            search.createColumn({ name: "custrecord_jj_bagcoremat_qty", summary: "SUM", label: "Quantity" }),
                            search.createColumn({ name: "custrecord_jj_actual_pieces", summary: "SUM", label: "Actual Pieces" }),
                            search.createColumn({ name: "custrecord_jj_actual_pieces_info", summary: "SUM", label: "Actual Pieces Info" }),
                            search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_BAGCOREMAT_WO", summary: "GROUP", label: "Internal ID" })
                        ]
                    });

                    // Run the search and process results
                    let items = [];
                    bagCoreMaterialsSearchObj.run().each(result => {
                        items.push({
                            item: result.getValue({ name: "custrecord_jj_bagcoremat_item", summary: "GROUP" }),
                            quantity: parseFloat(result.getValue({ name: "custrecord_jj_bagcoremat_qty", summary: "SUM" })) || 0,
                            actualPieces: parseFloat(result.getValue({ name: "custrecord_jj_actual_pieces", summary: "SUM" })) || 0,
                            actualPiecesInfo: parseFloat(result.getValue({ name: "custrecord_jj_actual_pieces_info", summary: "SUM" })) || 0,
                            workOrderLine: result.getValue({ name: "custrecord_jj_bagcoremat_wo_line_no", summary: "GROUP" }) || '',
                            workOrderId: result.getValue({ name: "internalid", join: "CUSTRECORD_JJ_BAGCOREMAT_WO", summary: "GROUP" }) || ''
                        });
                        return true; // Continue iteration
                    });

                    log.debug("Bag Core Materials Search Results", items);

                    return { status: "SUCCESS", data: items };
                } catch (error) {
                    log.error("Error in getBagCoreMaterialItemsForRecreation", error);
                    return { status: "ERROR", reason: error.message, data: [] };
                }
            },

            fetchItemImage(bagId) {
                try {
                    let bagGenerationSearchObj = search.create({
                        type: "customrecord_jj_bag_generation",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["internalid", "anyof", bagId]
                        ],
                        columns: [
                            search.createColumn({
                                name: "custrecord_jj_bagcore_style",
                                join: "CUSTRECORD_JJ_BAGGEN_BAGCORE",
                                label: "Style "
                            })
                        ]
                    });

                    let imageURL = "";
                    bagGenerationSearchObj.run().each(function (result) {
                        imageURL = result.getText({ name: "custrecord_jj_bagcore_style", join: "CUSTRECORD_JJ_BAGGEN_BAGCORE" });
                        return true;
                    });
                    log.debug("imageURL", imageURL);
                    return { status: 'SUCCESS', reason: 'Image Found', data: imageURL };
                } catch (error) {
                    log.error('error @ fetchItemImage', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            listComponentsForSerial(inventories) {
                try {
                    let serialNumber = [];
                    inventories.forEach(inventory => {
                        serialNumber.push(inventory.lotNumber?.value);
                    });

                    //let filters = [];
                    let inventoryNumberSearch = search.create({
                        type: "customrecord_jj_fg_serial_components",
                        filters: [
                            ["custrecord_jj_fsc_serial_number.custrecord_jj_fgs_serial", "anyof", serialNumber],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_fsc_item", label: "Item" }),
                            search.createColumn({ name: "custrecord_jj_fsc_quantity", label: "Quantity" }),
                            search.createColumn({ name: "custrecord_jj_fsc_barcode_quantity", label: "Barcode Quantity" }),
                            search.createColumn({ name: "custrecord_jj_fsc_cost", label: "Cost" }),
                            search.createColumn({ name: "custrecord_jj_fsc_serial_number", label: "FG Serial" }),
                            search.createColumn({ name: "saleunit", join: "CUSTRECORD_JJ_FSC_ITEM", label: "Primary Sale Unit" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_lot_number", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "Lot Number" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_quantity", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "Quantity" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_pieces", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "Pieces" }),
                            search.createColumn({ name: "custrecord_jj_fgs_serial", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "Serial" }),
                            search.createColumn({ name: "custrecord_jj_fsc_pieces_value", label: "Pieces" }),
                            search.createColumn({ name: "parent", join: "CUSTRECORD_JJ_FSC_ITEM", label: "Parent" }),
                            search.createColumn({ name: "class", join: "CUSTRECORD_JJ_FSC_ITEM", label: "class" }),
                        ]
                    });
                    let inventoryNumberSearchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventoryNumberSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventoryNumberSearch, 'name'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    log.debug("inventorySearchResult", inventoryNumberSearchResult);
                    let componentInventoryDetails = {};
                    let finalResult = [];

                    // inventoryNumberSearchResult.forEach(result => {

                    //     if (!componentInventoryDetails[result.custrecord_jj_fsc_item?.value]) {
                    //         componentInventoryDetails[result.custrecord_jj_fsc_item?.value] = {
                    //             itemId: result.custrecord_jj_fsc_item?.value || '',
                    //             itemName: result.custrecord_jj_fsc_item?.text || '',
                    //             quantity: result.custrecord_jj_fsc_quantity?.value || '',
                    //             uom: result.saleunit?.value || '',
                    //             pieces: result.pieces?.value || '',
                    //             inventoryDetails: []
                    //         };
                    //     }
                    //     componentInventoryDetails[result.custrecord_jj_fsc_item?.value].inventoryDetails.push({
                    //         lotNumber: result.custrecord_jj_fg_cit_lot_number?.value || '',
                    //         quantity: result.custrecord_jj_fg_cit_quantity?.value || ''
                    //     });

                    // });
                    inventoryNumberSearchResult.forEach(result => {
                        result.custrecord_jj_fsc_item.text = result.parent?.text ? result.custrecord_jj_fsc_item.text.replace(result.parent.text + " : ", '') : result.custrecord_jj_fsc_item.text;
                        const fgSerial = result.custrecord_jj_fgs_serial?.text || '';

                        if (!componentInventoryDetails[fgSerial]) {
                            componentInventoryDetails[fgSerial] = [];
                        }

                        const item = {
                            itemId: result.custrecord_jj_fsc_item?.value || '',
                            itemName: result.custrecord_jj_fsc_item?.text || '',
                            quantity: result.custrecord_jj_fsc_quantity?.value || '',
                            uom: result.saleunit?.text || '',
                            uomId: result.saleunit?.value || '',
                            pieces: result.custrecord_jj_fsc_pieces_value?.value || '',
                            serialId: result.custrecord_jj_fgs_serial?.value || '',
                            barcodeQuantity: result.custrecord_jj_fsc_barcode_quantity?.value || '',
                            itemClassId: result.class?.value || '',
                            inventoryDetails: [
                                {
                                    lotNumber: result.custrecord_jj_fg_cit_lot_number?.value || '',
                                    quantity: result.custrecord_jj_fg_cit_quantity?.value || '',
                                    pieces: result.custrecord_jj_fg_cit_pieces?.value || ''
                                }
                            ]
                        };

                        // Check if the item already exists for this serial number
                        const existingItem = componentInventoryDetails[fgSerial].find(
                            existingItem => existingItem.itemId === item.itemId
                        );

                        if (existingItem) {
                            // Sum main quantities safely
                            existingItem.quantity =
                                parseFloat(existingItem.quantity || 0) +
                                parseFloat(result.custrecord_jj_fsc_quantity?.value || 0);

                            existingItem.barcodeQuantity =
                                parseFloat(existingItem.barcodeQuantity || 0) +
                                parseFloat(result.custrecord_jj_fsc_barcode_quantity?.value || 0);

                            existingItem.pieces =
                                parseFloat(existingItem.pieces || 0) +
                                parseFloat(result.custrecord_jj_fsc_pieces_value?.value || 0);

                            // Add inventory detail row
                            existingItem.inventoryDetails.push({
                                lotNumber: result.custrecord_jj_fg_cit_lot_number?.value || '',
                                quantity: result.custrecord_jj_fg_cit_quantity?.value || '',
                                pieces: result.custrecord_jj_fg_cit_pieces?.value || ''
                            });
                        } else {
                            // If the item doesn't exist, add it to the serial number's array
                            componentInventoryDetails[fgSerial].push(item);
                        }
                    });
                    if (componentInventoryDetails) {
                        finalResult.push(componentInventoryDetails);
                    }

                    log.debug("componentInventoryDetails", componentInventoryDetails);
                    return finalResult;
                } catch (e) {
                    log.error('error @ listComponentsForSerial', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            getSpecificMaterialDetailsQuery(materialTypeId, departmentId, bagSearchKey) {
                try {
                    return `
                        SELECT 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item) AS itemId, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_qty) AS quantity, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_issue) AS totalIssue, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_to_issue) AS toIssue, 
                            BUILTIN_RESULT.TYPE_FLOAT(ROUND(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_qty - CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_to_issue, 4)) AS quantityInBag, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_receive) AS totalReceive, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_additional_qty) AS balanceQty, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_total_loss) AS totalLossQty, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_issued_quantity) AS departmentIssuedQty, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_additional_quantity) AS departmentBalanceQty, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_dir_loss_quantity) AS departmentLossQty,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.fullname) AS fullname,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_baggen_present_dept) AS presentDepartment,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.itemid) AS itemid,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_actual_pieces_info) AS pieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_issued_pieces_info) AS totalIssuePieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_to_be_issued_pieces_info) AS toIssuePieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_actual_pieces_info - CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_to_be_issued_pieces_info) AS piecesInBag, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_received_pieces_info) AS totalReceivePieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_balance_pieces_info) AS balancePieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_loss_pieces_info) AS totalLossPieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_dir_issued_pieces_info) AS departmentIssuedPieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_dir_balance_pieces_info) AS departmentBalancePieces, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_dir_loss_pieces_info) AS departmentLossPieces,
                            BUILTIN_RESULT.TYPE_INTEGER(item_SUB.cseg_jj_raw_type) AS cseg_jj_raw_type,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bag_name) AS bagId, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.name) AS bagName, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.name_0) AS departmentName
                        FROM 
                            CUSTOMRECORD_JJ_BAGCORE_MATERIALS, 
                            (
                                SELECT 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_bag_core_material_record AS custrecord_jj_bag_core_material_record, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_bag_core_material_record AS custrecord_jj_bag_core_material_record_join, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_issued_quantity AS custrecord_jj_issued_quantity, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_additional_quantity AS custrecord_jj_additional_quantity, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_dir_loss_quantity AS custrecord_jj_dir_loss_quantity, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_dir_issued_pieces_info AS custrecord_jj_dir_issued_pieces_info, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_dir_balance_pieces_info AS custrecord_jj_dir_balance_pieces_info, 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_dir_loss_pieces_info AS custrecord_jj_dir_loss_pieces_info, 
                                    CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_exit AS custrecord_jj_oprtns_exit_crit
                                FROM 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN, 
                                    CUSTOMRECORD_JJ_OPERATIONS
                                WHERE 
                                    CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN.custrecord_jj_operations = CUSTOMRECORD_JJ_OPERATIONS.ID(+)
                            ) CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB, 
                            (
                                SELECT 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.ID AS ID, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.ID AS id_join, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.name AS name, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_present_dept AS custrecord_jj_baggen_present_dept,
                                    CUSTOMRECORD_JJ_MANUFACTURING_DEPT.name AS name_0, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.name AS name_crit,
                                    CUSTOMRECORD_JJ_MANUFACTURING_DEPT.isinactive AS isinactive_crit, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.isinactive AS isinactive_crit_0, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_merge AS custrecord_jj_baggen_merge_crit, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_is_rejected AS custrecord_jj_is_rejected_crit, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_split AS custrecord_jj_baggen_split_crit, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_present_dept AS custrecord_jj_baggen_present_dept_crit
                                FROM 
                                    CUSTOMRECORD_JJ_BAG_GENERATION, 
                                    CUSTOMRECORD_JJ_MANUFACTURING_DEPT
                                WHERE 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_present_dept = CUSTOMRECORD_JJ_MANUFACTURING_DEPT.ID(+)
                            ) CUSTOMRECORD_JJ_BAG_GENERATION_SUB, 
                            (
                                SELECT 
                                    CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID AS ID, 
                                    CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID AS id_join, 
                                    transaction_0.tranid AS tranid_crit, 
                                    TRANSACTION.tranid AS tranid_crit_0, 
                                    CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive AS isinactive_crit, 
                                    CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_is_rejected AS custrecord_jj_bagcore_is_rejected_crit
                                FROM 
                                    CUSTOMRECORD_JJ_BAG_CORE_TRACKING, 
                                    TRANSACTION, 
                                    TRANSACTION transaction_0
                                WHERE 
                                    CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_so = TRANSACTION.ID(+)
                                    AND CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = transaction_0.ID(+)
                            ) CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB, 
                            (
                                SELECT 
                                    item.ID AS ID, 
                                    item.ID AS id_join, 
                                    item.fullname AS fullname, 
                                    item.itemid AS itemid, 
                                    ACCOUNT.cseg_jj_raw_type AS cseg_jj_raw_type, 
                                    ACCOUNT.cseg_jj_raw_type AS cseg_jj_raw_type_crit
                                FROM 
                                    item, 
                                    ACCOUNT   WHERE 
                                    item.assetaccount = ACCOUNT.ID(+)
                            ) item_SUB
                        WHERE 
                            (
                                (   
                                    (
                                        (
                                            CUSTOMRECORD_JJ_BAGCORE_MATERIALS.ID = CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_bag_core_material_record(+) 
                                            AND CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bag_name = CUSTOMRECORD_JJ_BAG_GENERATION_SUB.ID(+)
                                        ) 
                                        AND CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_bagcore = CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.ID(+)
                                    ) 
                                    AND CUSTOMRECORD_JJ_BAGCORE_MATERIALS.custrecord_jj_bagcoremat_item = item_SUB.ID(+)
                                )
                            )
                            AND (
                                (
                                    NVL(CUSTOMRECORD_JJ_BAGCORE_MATERIALS.isinactive, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.isinactive_crit, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.isinactive_crit_0, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.isinactive_crit, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_baggen_merge_crit, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_is_rejected_crit, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_baggen_split_crit, 'F') = 'F' 
                                    AND NVL(CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.custrecord_jj_bagcore_is_rejected_crit, 'F') = 'F' 
                                    AND CUSTOMRECORD_JJ_DIRECT_ISSUE_RETURN_SUB.custrecord_jj_oprtns_exit_crit IS NULL 
                                    ${materialTypeId ? "AND item_SUB.cseg_jj_raw_type_crit IN ('" + materialTypeId + "')" : ""}
                                    ${departmentId?.length > 0 ? "AND CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_baggen_present_dept_crit IN (" + departmentId + ")" : ""}
                                    ${bagSearchKey ? `AND (
                                        UPPER(CUSTOMRECORD_JJ_BAG_GENERATION_SUB.name_crit) LIKE UPPER('%${bagSearchKey}%') ESCAPE '\\'
                                        OR UPPER(CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.tranid_crit) LIKE UPPER('%${bagSearchKey}%') ESCAPE '\\'
                                        OR UPPER(CUSTOMRECORD_JJ_BAG_CORE_TRACKING_SUB.tranid_crit_0) LIKE UPPER('%${bagSearchKey}%') ESCAPE '\\'
                                    )` : ""}
                                )
                            )
                    `;
                } catch (e) {
                    log.error('error @ getSpecificMaterialDetailsQuery', e.message);
                    return null;
                }
            },

            // For Bag Summmary
            getSpecificMaterialDetails(materialType, departmentId, bagSearchKey) {
                try {
                    log.debug("getSpecificMaterialDetails", { materialType, departmentId });
                    let materialTypeId = "";
                    if (materialType == 'gold_type') {
                        materialTypeId = MATERIAL_TYPE_ID_GOLD;
                    } else if (materialType == 'diamond_type') {
                        materialTypeId = MATERIAL_TYPE_ID_DIAMOND;
                    } else if (materialType == 'color_stone_type') {
                        materialTypeId = MATERIAL_TYPE_ID_COLOR_STONE;
                    } else {
                        return { status: "ERROR", reason: 'Invalid Material Type', data: [] };
                    }

                    bagSearchKey = bagSearchKey?.replace(/'/g, "''").replace(/[%_]/g, ch => '\\' + ch) || '';
                    let sqlQuery = this.getSpecificMaterialDetailsQuery(materialTypeId, departmentId, bagSearchKey);
                    log.debug("sqlQuery", sqlQuery);

                    // Run the query as a paged query
                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    // Retrieve the query results using an iterator
                    let resultIterator = results.iterator();

                    // Initialize an object to group and sum the data
                    let groupedData = {};

                    resultIterator.each(function (page) {
                        // log.debug(page.value.pageRange.index, page.value.pageRange.size);
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;
                            // log.debug("rowData", rowData);
                            let itemId = rowData[0];

                            if (!groupedData[itemId]) {
                                groupedData[itemId] = {
                                    itemId: itemId,
                                    // itemName: rowData[11], // Fullname
                                    itemName: rowData[13], // itemName
                                    quantity: 0,
                                    totalIssue: 0,
                                    toIssue: 0,
                                    quantityInBag: 0,
                                    totalReceive: 0,
                                    balanceQty: 0,
                                    totalLossQty: 0,
                                    departmentIssuedQty: 0,
                                    departmentBalanceQty: 0,
                                    departmentLossQty: 0,
                                    pieces: 0,
                                    piecesIssued: 0,
                                    piecesToIssue: 0,
                                    piecesInBag: 0,
                                    piecesReceived: 0,
                                    balancepieces: 0,
                                    piecesLoss: 0,
                                };
                            }
                            // Aggregate the fields
                            groupedData[itemId].quantity = Number(parseFloat(groupedData[itemId].quantity + parseFloat(rowData[1] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].totalIssue = Number(parseFloat(groupedData[itemId].totalIssue + parseFloat(rowData[2] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].toIssue = Number(parseFloat(groupedData[itemId].toIssue + parseFloat(rowData[3] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].quantityInBag = Number(parseFloat(groupedData[itemId].quantityInBag + parseFloat(rowData[4] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].totalReceive = Number(parseFloat(groupedData[itemId].totalReceive + parseFloat(rowData[5] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].balanceQty = Number(parseFloat(groupedData[itemId].balanceQty + parseFloat(rowData[6] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].totalLossQty = Number(parseFloat(groupedData[itemId].totalLossQty + parseFloat(rowData[7] || 0)).toFixed(4)) || 0;

                            groupedData[itemId].departmentIssuedQty = Number(parseFloat(groupedData[itemId].departmentIssuedQty + parseFloat(rowData[8] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].departmentBalanceQty = Number(parseFloat(groupedData[itemId].departmentBalanceQty + parseFloat(rowData[9] || 0)).toFixed(4)) || 0;
                            groupedData[itemId].departmentLossQty = Number(parseFloat(groupedData[itemId].departmentLossQty + parseFloat(rowData[10] || 0)).toFixed(4)) || 0;

                            groupedData[itemId].pieces = parseInt(groupedData[itemId].pieces + parseInt(rowData[14] || 0)) || 0;
                            groupedData[itemId].piecesIssued = parseInt(groupedData[itemId].piecesIssued + parseInt(rowData[15] || 0)) || 0;
                            groupedData[itemId].piecesToIssue = parseInt(groupedData[itemId].piecesToIssue + parseInt(rowData[16] || 0)) || 0;
                            groupedData[itemId].piecesInBag = parseInt(groupedData[itemId].piecesInBag + parseInt(rowData[17] || 0)) || 0;
                            groupedData[itemId].piecesReceived = parseInt(groupedData[itemId].piecesReceived + parseInt(rowData[18] || 0)) || 0;
                            groupedData[itemId].balancepieces = parseInt(groupedData[itemId].balancepieces + parseInt(rowData[19] || 0)) || 0;
                            groupedData[itemId].piecesLoss = parseInt(groupedData[itemId].piecesLoss + parseInt(rowData[20] || 0)) || 0;

                            // Optional department-level details
                            groupedData[itemId].departmentIssuedPieces = parseInt(groupedData[itemId].departmentIssuedPieces + parseInt(rowData[21] || 0)) || 0;
                            groupedData[itemId].departmentBalancePieces = parseInt(groupedData[itemId].departmentBalancePieces + parseInt(rowData[22] || 0)) || 0;
                            groupedData[itemId].departmentLossPieces = parseInt(groupedData[itemId].departmentLossPieces + parseInt(rowData[23] || 0)) || 0;

                            return true;
                        });
                        return true;
                    });

                    // Convert grouped data to an array
                    let groupedArray = Object.values(groupedData);
                    log.debug('Grouped Data', groupedArray);

                    return { status: "SUCCESS", reason: 'Result Found', data: groupedArray };
                } catch (error) {
                    log.error('error @ getSpecificMaterialDetails', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Retrieves and summarizes inventory quantity details for items based on material type, bin, location, and status filters.
             * Aggregates quantities by item and inventory status, and computes total and pure weights for gold-type materials.
             *
             * @param {string} materialType - The material category (`gold_type`, `diamond_type`, or `color_stone_type`).
             * @param {string} binNumber - Comma-separated internal IDs of bin numbers to filter inventory.
             * @param {string} locationId - Comma-separated internal IDs of locations to filter inventory.
             * @param {string} [statusId] - Optional comma-separated inventory status IDs to include in the results.
             *
             * @returns {Object} Result object containing:
             *  - `status` {string} - "SUCCESS" or "ERROR"
             *  - `reason` {string} - Descriptive message
             *  - `data` {Array<Object>} - List of grouped inventory results with totals
             */
            getItemInventoryDetails(materialType, binNumber, locationId, statusId) {
                try {
                    log.debug("getItemInventoryDetails", { materialType, binNumber, locationId });
                    let materialTypeId = "";
                    if (materialType == 'gold_type') {
                        materialTypeId = MATERIAL_TYPE_ID_GOLD;
                    } else if (materialType == 'diamond_type') {
                        materialTypeId = MATERIAL_TYPE_ID_DIAMOND;
                    } else if (materialType == 'color_stone_type') {
                        materialTypeId = MATERIAL_TYPE_ID_COLOR_STONE;
                    } else {
                        return { status: "ERROR", reason: 'Invalid Material Type', data: [] }
                    }

                    let sqlQuery = `SELECT 
                        BUILTIN_RESULT.TYPE_INTEGER(InventoryBalance.item) AS itemId, 
                        BUILTIN_RESULT.TYPE_STRING(item_SUB.fullname) AS itemFullName, 
                        BUILTIN_RESULT.TYPE_INTEGER(InventoryBalance.inventorynumber) AS inventoryNumber, 
                        BUILTIN_RESULT.TYPE_STRING(inventoryNumber.inventorynumber) AS inventoryName, 
                        BUILTIN_RESULT.TYPE_FLOAT(InventoryBalance.quantityavailable) AS quantityAvailable, 
                        BUILTIN_RESULT.TYPE_INTEGER(InventoryBalance.inventorystatus) AS inventoryStatus,
                        BUILTIN_RESULT.TYPE_DATETIME(InventoryBalance.createddate) AS createddate,
                        BUILTIN_RESULT.TYPE_STRING(item_SUB.itemid) AS itemName,
                        BUILTIN_RESULT.TYPE_STRING(item_SUB.name_0) AS name,
                        BUILTIN_RESULT.TYPE_STRING(item_SUB.itemQuality) AS itemQuality
                        FROM 
                        InventoryBalance, 
                        bin, 
                        inventoryNumber, 
                        (
                            SELECT 
                                item.ID AS id_0, 
                                item.ID AS id_join, 
                                item.fullname AS fullname, 
                                item.itemid AS itemid, 
                                CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.name AS name_0, 
                                item.CLASS AS class_crit, 
                                ACCOUNT.cseg_jj_raw_type AS cseg_jj_raw_type_crit, 
                                item.isinactive AS isinactive_crit,
                                item.isserialitem AS isserialitem_crit,
                                item.custitem_jj_metal_quality AS itemQuality
                            FROM 
                                item, 
                                ACCOUNT,
                                (
                                    SELECT 
                                        CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS ID, 
                                        CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS id_join, 
                                        CUSTOMLIST_JJ_METAL_PURITY_LIST.name AS name
                                    FROM 
                                        CUSTOMRECORD_JJ_DD_METAL_QUALITY, 
                                        CUSTOMLIST_JJ_METAL_PURITY_LIST
                                    WHERE 
                                        CUSTOMRECORD_JJ_DD_METAL_QUALITY.custrecord_jj_dd_metal_quality_purity = CUSTOMLIST_JJ_METAL_PURITY_LIST.ID(+)
                                ) CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB
                            WHERE 
                                item.assetaccount = ACCOUNT.ID(+)
                                AND item.custitem_jj_metal_quality = CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.ID(+)
                        ) item_SUB
                        WHERE 
                        (
                            (
                                (
                                    InventoryBalance.binnumber = bin.ID(+) 
                                    AND InventoryBalance.inventorynumber = inventoryNumber.ID(+)
                                ) AND InventoryBalance.item = item_SUB.id_0(+)
                            )
                        ) AND (
                            (
                                item_SUB.cseg_jj_raw_type_crit IN (${materialTypeId}) 
                                AND NVL(bin.isinactive, 'F') = 'F' 
                                AND InventoryBalance.LOCATION IN (${locationId}) 
                                AND NVL(item_SUB.isinactive_crit, 'F') = 'F' 
                                AND InventoryBalance.binnumber IN (${binNumber})
                                ${statusId ? "AND InventoryBalance.inventorystatus IN (" + statusId + ")" : ""}
                                AND NVL(item_SUB.isserialitem_crit, 'F') = 'F'
                            )
                        )
                    `;

                    // log.debug("sqlQuery", sqlQuery);

                    // Run the query as a paged query
                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    // Retrieve the query results using an iterator
                    let resultIterator = results.iterator();

                    // Initialize an object to group and sum the data
                    let groupedData = {};

                    const departmentDetails = searchResults.getDepartmentFields(FIRST_DEPARTMENT_ID);

                    // Status mapping for the required fields
                    const statusMapping = {
                        [departmentDetails.goodStatus]: "goodQty",
                        [departmentDetails.lossStatus]: "lossQty",
                        [departmentDetails.damagedStatus]: "dammagedQty",
                        [departmentDetails.wipStatus]: "wipBagQty",
                        [departmentDetails.waxTreeStatus]: "wipWTQty",
                        [departmentDetails.diamondBrokenStatus]: "brokenQty",
                        [departmentDetails.diamondMissedStatus]: "missingQty",
                        [departmentDetails.diamondBurntStatus]: "burnedQty",
                        [departmentDetails.lossOutsourcedStatus]: "lossOutsourcedQty",
                    };

                    log.debug("statusMapping", statusMapping);

                    // // Status mapping for the required fields
                    // const statusMapping = {
                    //     1: "goodQty",
                    //     2: "lossQty",
                    //     3: "dammagedQty",
                    //     11: "wipBagQty",
                    //     12: "wipWTQty",
                    //     13: "brokenQty",
                    //     14: "missingQty",
                    //     15: "burnedQty",
                    // };

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;

                            // Extract data from the row
                            let itemId = rowData[0];
                            // let itemName = rowData[1];
                            let itemName = rowData[7];
                            let itemQuality = rowData[9]; // Added itemQuality
                            let inventoryNumber = rowData[2];
                            let inventoryName = rowData[3];
                            let quantityAvailable = parseFloat(rowData[4]) || 0;
                            let inventoryStatus = parseInt(rowData[5], 10);
                            let createdDate = rowData[6];
                            let purity = parseFloat(rowData[8] || 0) / 100;
                            // log.debug("itemName, purity, rowData[8]", { purity, itemName, rowData: rowData[8] });

                            // Initialize the grouped item if not already done
                            if (!groupedData[itemId]) {
                                groupedData[itemId] = {
                                    itemId: itemId,
                                    itemName: itemName,
                                    itemQuality: itemQuality, // Initialize itemQuality
                                    purity: purity,
                                    goodQty: 0,
                                    wipBagQty: 0,
                                    wipWTQty: 0,
                                    lossQty: 0,
                                    dammagedQty: 0,
                                    brokenQty: 0,
                                    missingQty: 0,
                                    burnedQty: 0,
                                    lossOutsourcedQty: 0,
                                    pureWeight: 0,
                                    totalQty: 0,
                                    inventoryDetails: {
                                        goodQty: [],
                                        wipBagQty: [],
                                        wipWTQty: [],
                                        lossQty: [],
                                        dammagedQty: [],
                                        brokenQty: [],
                                        missingQty: [],
                                        burnedQty: [],
                                        lossOutsourcedQty: [],
                                    }
                                };
                            }

                            // Sum quantities based on inventoryStatus
                            let statusField = statusMapping[inventoryStatus];

                            // log.debug("createdDate", createdDate);

                            if (statusField) {
                                // Add inventory details
                                groupedData[itemId].inventoryDetails[statusField].push({
                                    inventoryNumber: inventoryNumber,
                                    inventoryName: inventoryName,
                                    quantityAvailable: quantityAvailable,
                                    inventoryStatus: inventoryStatus,
                                    createdDate: createdDate,
                                    createdDateObj: createdDate ? format.parse({ value: createdDate, type: format.Type.DATETIME }) : "",
                                    pureWeight: materialType == 'gold_type' ? Number(parseFloat(quantityAvailable * (purity ? purity : 1)).toFixed(4)) : "",
                                    purity: purity,
                                });

                                if (statusField) {
                                    groupedData[itemId][statusField] = Number(parseFloat(groupedData[itemId][statusField] + quantityAvailable).toFixed(4));
                                }

                                if (materialType == 'gold_type') {
                                    groupedData[itemId].pureWeight = Number(parseFloat(groupedData[itemId].pureWeight + (quantityAvailable * (purity ? purity : 1))).toFixed(4));
                                }

                                // Update totalQty
                                groupedData[itemId].totalQty = Number(
                                    (groupedData[itemId].totalQty + quantityAvailable).toFixed(4)
                                );
                            }

                            return true;
                        });
                        return true;
                    });

                    // Convert grouped data to an array
                    let groupedArray = Object.values(groupedData);

                    if (groupedArray.length === 0) {
                        return { status: "SUCCESS", reason: 'No Result Found', data: [] };
                    }

                    // Create a total row
                    let totalRow = {
                        itemId: "",
                        itemName: "Total",
                        totals: true,
                        goodQty: 0,
                        wipBagQty: 0,
                        wipWTQty: 0,
                        lossQty: 0,
                        dammagedQty: 0,
                        brokenQty: 0,
                        missingQty: 0,
                        burnedQty: 0,
                        lossOutsourcedQty: 0,
                        pureWeight: 0,
                        totalQty: 0,
                    };

                    // Sum up all items to create the total row
                    groupedArray.forEach(item => {
                        totalRow.goodQty += item.goodQty;
                        totalRow.wipBagQty += item.wipBagQty;
                        totalRow.wipWTQty += item.wipWTQty;
                        totalRow.lossQty += item.lossQty;
                        totalRow.dammagedQty += item.dammagedQty;
                        totalRow.brokenQty += item.brokenQty;
                        totalRow.missingQty += item.missingQty;
                        totalRow.burnedQty += item.burnedQty;
                        totalRow.lossOutsourcedQty += item.lossOutsourcedQty;
                        totalRow.pureWeight += item.pureWeight;
                        totalRow.totalQty += item.totalQty;
                    });

                    // Round final totals to 4 decimal places
                    Object.keys(totalRow).forEach(key => {
                        if (typeof totalRow[key] === "number") {
                            totalRow[key] = Number(totalRow[key].toFixed(4));
                        }
                    });

                    // Append total row at the end of groupedArray
                    groupedArray.push(totalRow);

                    // Log the result
                    log.debug('Grouped Data', JSON.stringify(groupedArray, null, 2));

                    return { status: "SUCCESS", reason: 'Result Found', data: groupedArray };
                } catch (error) {
                    log.error('error @ getItemInventoryDetails', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Retrieves and summarizes piece-wise inventory details for items based on material type, bin, location, and status filters.
             * Groups by item and inventory number, summing pieces by status, and returns totals per item and overall.
             *
             * @param {string} materialType - The material category (`gold_type`, `diamond_type`, or `color_stone_type`).
             * @param {string} binNumber - Comma-separated internal IDs of bin numbers to filter pieces.
             * @param {string} locationId - Comma-separated internal IDs of locations to filter pieces.
             * @param {string} [statusId] - Optional comma-separated inventory status IDs to include in the results.
             *
             * @returns {Object} Result object containing:
             *  - `status` {string} - "SUCCESS" or "ERROR"
             *  - `reason` {string} - Descriptive message
             *  - `data` {Array<Object>} - List of grouped item piece details with summarized counts and totals
             */
            getItemInventoryPiecesDetails(materialType, binNumber, locationId, statusId) {
                try {
                    log.debug("getItemInventoryPiecesDetails", { materialType, binNumber, locationId });
                    let materialTypeId = "";
                    if (materialType == 'gold_type') {
                        materialTypeId = MATERIAL_TYPE_ID_GOLD;
                    } else if (materialType == 'diamond_type') {
                        materialTypeId = MATERIAL_TYPE_ID_DIAMOND;
                    } else if (materialType == 'color_stone_type') {
                        materialTypeId = MATERIAL_TYPE_ID_COLOR_STONE;
                    } else {
                        return { status: "ERROR", reason: 'Invalid Material Type', data: [] }
                    }

                    let sqlQuery = `SELECT 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_item) AS itemId, 
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.fullname) AS itemFullName, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_lot) AS inventoryNumber, 
                            BUILTIN_RESULT.TYPE_STRING(inventoryNumber.inventorynumber) AS inventoryName, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_value) AS piecesAvailable, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_status) AS inventoryStatus, 
                            BUILTIN_RESULT.TYPE_DATETIME(CUSTOMRECORD_JJ_INV_PCS_DETAIL.created) AS createddate,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.itemid) AS itemName
                        FROM 
                            CUSTOMRECORD_JJ_INV_PCS_DETAIL, 
                            bin, 
                            (
                                SELECT 
                                    item.ID AS ID, 
                                    item.ID AS id_join, 
                                    item.fullname AS fullname, 
                                    item.itemid AS itemid, 
                                    item.isinactive AS isinactive_crit, 
                                    ACCOUNT.cseg_jj_raw_type AS cseg_jj_raw_type_crit,
                                    item.isserialitem AS isserialitem_crit
                                FROM 
                                    item, 
                                    ACCOUNT   WHERE 
                                    item.assetaccount = ACCOUNT.ID(+)
                            ) item_SUB, 
                            inventoryNumber, 
                            CUSTOMRECORD_JJ_INV_PCS_TRANSACTION
                        WHERE 
                            (
                                (
                                    (
                                        (
                                            CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_bin = bin.ID(+) 
                                            AND CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_item = item_SUB.ID(+)
                                        ) AND CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_lot = inventoryNumber.ID(+)
                                    ) AND CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_transaction = CUSTOMRECORD_JJ_INV_PCS_TRANSACTION.ID(+)
                                )
                            ) AND (
                                (
                                    NVL(CUSTOMRECORD_JJ_INV_PCS_DETAIL.isinactive, 'F') = 'F'
                                    AND NVL(CUSTOMRECORD_JJ_INV_PCS_TRANSACTION.isinactive, 'F') = 'F'
                                    AND NVL(item_SUB.isinactive_crit, 'F') = 'F'
                                    AND NVL(bin.isinactive, 'F') = 'F'
                                    AND item_SUB.cseg_jj_raw_type_crit IN (${materialTypeId})  
                                    AND CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_location IN (${locationId})  
                                    AND CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_bin IN (${binNumber}) 
                                    AND NVL(item_SUB.isserialitem_crit, 'F') = 'F'
                                    ${statusId ? "AND CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_status IN (" + statusId + ")" : ""}
                                )
                            )  
                        ORDER BY CUSTOMRECORD_JJ_INV_PCS_DETAIL.custrecord_jj_inv_pcs_lot ASC
                    `;
                    // Run the query as a paged query
                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    // Retrieve the query results using an iterator
                    let resultIterator = results.iterator();

                    // Initialize an object to group and sum the data
                    let groupedData = {};

                    const departmentDetails = searchResults.getDepartmentFields(FIRST_DEPARTMENT_ID);

                    // Status mapping for the required fields
                    const statusMapping = {
                        [departmentDetails.goodStatus]: "goodPieces",
                        [departmentDetails.lossStatus]: "lossPieces",
                        [departmentDetails.damagedStatus]: "dammagedPieces",
                        [departmentDetails.wipStatus]: "wipBagPieces",
                        [departmentDetails.waxTreeStatus]: "wipWTPieces",
                        [departmentDetails.diamondBrokenStatus]: "brokenPieces",
                        [departmentDetails.diamondMissedStatus]: "missingPieces",
                        [departmentDetails.diamondBurntStatus]: "burnedPieces",
                        [departmentDetails.lossOutsourcedStatus]: "lossOutsourcedPieces",
                    };
                    log.debug("statusMapping", statusMapping);

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;

                            // Extract data from the row
                            let itemId = rowData[0];
                            // let itemName = rowData[1];
                            let itemName = rowData[7];
                            let inventoryNumber = rowData[2];
                            let inventoryName = rowData[3];
                            let piecesAvailable = parseInt(rowData[4]) || 0;
                            let inventoryStatus = parseInt(rowData[5], 10);
                            let piecesCreatedDate = rowData[6];

                            // Initialize the grouped item if not already done
                            if (!groupedData[itemId]) {
                                groupedData[itemId] = {
                                    itemId: itemId,
                                    itemName: itemName,
                                    goodPieces: 0,
                                    wipBagPieces: 0,
                                    wipWTPieces: 0,
                                    lossPieces: 0,
                                    dammagedPieces: 0,
                                    brokenPieces: 0,
                                    missingPieces: 0,
                                    burnedPieces: 0,
                                    lossOutsourcedPieces: 0,
                                    pureWeight: 0,
                                    totalPieces: 0,
                                    inventoryDetails: {
                                        goodPieces: [],
                                        wipBagPieces: [],
                                        wipWTPieces: [],
                                        lossPieces: [],
                                        dammagedPieces: [],
                                        brokenPieces: [],
                                        missingPieces: [],
                                        burnedPieces: [],
                                        lossOutsourcedPieces: [],
                                    }
                                };
                            }

                            // Sum quantities based on inventoryStatus
                            let statusField = statusMapping[inventoryStatus];

                            // log.debug("piecesCreatedDate", piecesCreatedDate);

                            if (statusField) {
                                // Initialize the grouping if it doesn't exist
                                if (!groupedData[itemId].inventoryDetails[statusField]) {
                                    groupedData[itemId].inventoryDetails[statusField] = [];
                                }

                                // Try to find an existing entry for the same inventoryNumber
                                let existingInventory = groupedData[itemId].inventoryDetails[statusField].find(entry => entry.inventoryNumber === inventoryNumber);

                                if (existingInventory) {
                                    // Sum the piecesAvailable if already exists
                                    existingInventory.piecesAvailable += Number(piecesAvailable);
                                } else {
                                    // Add new entry if inventoryNumber not found
                                    groupedData[itemId].inventoryDetails[statusField].push({
                                        inventoryNumber: inventoryNumber,
                                        inventoryName: inventoryName,
                                        piecesAvailable: Number(piecesAvailable),
                                        inventoryStatus: inventoryStatus,
                                        piecesCreatedDate: piecesCreatedDate,
                                        piecesCreatedDateObj: piecesCreatedDate ? format.parse({ value: piecesCreatedDate, type: format.Type.DATETIME }) : ""
                                    });
                                }

                                // Update the total count by statusField
                                groupedData[itemId][statusField] = Number(groupedData[itemId][statusField] || 0) + Number(piecesAvailable);

                                // Update overall totalPieces
                                groupedData[itemId].totalPieces = Number(groupedData[itemId].totalPieces || 0) + Number(piecesAvailable);
                            }

                            return true;
                        });
                        return true;
                    });

                    // Convert grouped data to an array
                    let groupedArray = Object.values(groupedData);

                    if (groupedArray.length === 0) {
                        return { status: "SUCCESS", reason: 'No Result Found', data: [] };
                    }

                    // Create a total row
                    let totalRow = {
                        itemId: "",
                        itemName: "Total",
                        totals: true,
                        goodPieces: 0,
                        wipBagPieces: 0,
                        wipWTPieces: 0,
                        lossPieces: 0,
                        dammagedPieces: 0,
                        brokenPieces: 0,
                        missingPieces: 0,
                        burnedPieces: 0,
                        lossOutsourcedPieces: 0,
                        pureWeight: 0,
                        totalPieces: 0,
                    };

                    // Sum up all items to create the total row
                    groupedArray.forEach(item => {
                        totalRow.goodPieces += item.goodPieces;
                        totalRow.wipBagPieces += item.wipBagPieces;
                        totalRow.wipWTPieces += item.wipWTPieces;
                        totalRow.lossPieces += item.lossPieces;
                        totalRow.dammagedPieces += item.dammagedPieces;
                        totalRow.brokenPieces += item.brokenPieces;
                        totalRow.missingPieces += item.missingPieces;
                        totalRow.burnedPieces += item.burnedPieces;
                        totalRow.lossOutsourcedPieces += item.lossOutsourcedPieces;
                        totalRow.pureWeight += item.pureWeight;
                        totalRow.totalPieces += item.totalPieces;
                    });

                    // Round final totals to 4 decimal places
                    Object.keys(totalRow).forEach(key => {
                        if (typeof totalRow[key] === "number") {
                            totalRow[key] = Number(totalRow[key].toFixed(4));
                        }
                    });

                    // Append total row at the end of groupedArray
                    groupedArray.push(totalRow);

                    // Log the result
                    log.debug('Grouped Data', JSON.stringify(groupedArray, null, 2));

                    return { status: "SUCCESS", reason: 'Result Found', data: groupedArray };
                } catch (error) {
                    log.error('error @ getItemInventoryPiecesDetails', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            getBagGenReport(workOrder) {
                try {

                    log.debug("workOrder", workOrder);
                    let sql = `
                    SELECT 
                        CORE_TRACKING.name AS name,
                        BAG_GENERATION.id AS ID,
                        BAG_GENERATION.name as bag_name,
                        BAG_GENERATION.custrecord_jj_baggen_time,
                        BAG_GENERATION.custrecord_jj_baggen_dept,
                        BAG_GENERATION.custrecord_jj_baggen_qty,
                        BAG_GENERATION.custrecord_jj_baggen_present_dept,
                        BAG_GENERATION.custrecord_jj_associated_assembly_build,
                        BAG_GENERATION.custrecord_jj_baggen_split AS is_split,
                        BAG_GENERATION.custrecord_jj_baggen_merge AS is_merge,
                        BAG_GENERATION.custrecord_jj_is_rejected AS is_rejected,
                        BAG_MATERIALS.id AS id_1,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_uom AS uom,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_qty AS actualQuantity,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_total_issue AS total_issue,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_total_receive AS total_receive,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_total_loss AS total_loss,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_additional_qty AS balance_quantity,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_to_issue AS to_be_issued_qty,
                        BAG_MATERIALS.custrecord_jj_actual_pieces AS actual_pieces,
                        BAG_MATERIALS.custrecord_jj_issued_pieces AS issued_pieces,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_received_pieces AS received_pieces,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_loss_pieces AS loss_pieces,
                        BAG_MATERIALS.custrecord_jj_to_be_issued_pieces AS to_be_issued_pieces,
                        BAG_MATERIALS.custrecord_jj_bagcoremat_balance_pieces AS balance_pieces,
                        ITEM.itemid AS item_name,
                        MANUFACT_DEPT.name AS present_dept_name,
                        MANUFACT_DEPT_DEPT.name AS created_dept_name
                    FROM 
                        customrecord_jj_bag_core_tracking AS CORE_TRACKING
                    LEFT JOIN 
                        transaction AS TRANS 
                        ON CORE_TRACKING.custrecord_jj_bagcore_wo = TRANS.id
                    LEFT JOIN 
                        customrecord_jj_bag_generation AS BAG_GENERATION 
                        ON CORE_TRACKING.id = BAG_GENERATION.custrecord_jj_baggen_bagcore
                    LEFT JOIN 
                        customrecord_jj_bagcore_materials AS BAG_MATERIALS 
                        ON CORE_TRACKING.id = BAG_MATERIALS.custrecord_jj_bagcoremat_bagcore
                        AND BAG_GENERATION.id = BAG_MATERIALS.custrecord_jj_bagcoremat_bag_name -- Added condition
                    LEFT JOIN
                        item AS ITEM
                        ON ITEM.id = BAG_MATERIALS.custrecord_jj_bagcoremat_item
                    LEFT JOIN 
                        customrecord_jj_manufacturing_dept AS MANUFACT_DEPT 
                        ON BAG_GENERATION.custrecord_jj_baggen_present_dept = MANUFACT_DEPT.id -- Join for present department
                    LEFT JOIN 
                        customrecord_jj_manufacturing_dept AS MANUFACT_DEPT_DEPT 
                        ON BAG_GENERATION.custrecord_jj_baggen_dept = MANUFACT_DEPT_DEPT.id 
                    WHERE 
                        COALESCE(BAG_GENERATION.isinactive, 'F') = 'F'
                        AND COALESCE(CORE_TRACKING.isinactive, 'F') = 'F'
                        AND (TRANS.tranid) = ?;
               
                    `;

                    // Run the SuiteQL query
                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();

                    // const transformData = (data) => {
                    //     const groupedData = data.reduce((acc, row) => {
                    //         // Group by Bag ID (name)
                    //         if (!acc[row.id]) {
                    //             acc[row.id] = {
                    //                 label: row.bag_name,
                    //                 expand: false,
                    //                 color: 'blue',
                    //                 children: [
                    //                     {
                    //                         label: "Bag Details",
                    //                         expand: false,
                    //                         color: 'blue',
                    //                         children: [
                    //                             {
                    //                                 lines: [
                    //                                     `Created Date: ${row.custrecord_jj_baggen_time}`,
                    //                                     `Created Dept: ${row.created_dept_name}`,
                    //                                     `Bag Qty: ${row.custrecord_jj_baggen_qty}`,
                    //                                     `Present Dept: ${row.present_dept_name}`,
                    //                                     `Asso. Build: ${row.custrecord_jj_associated_assembly_build}`,
                    //                                 ],
                    //                                 color: 'blue'
                    //                             },
                    //                         ],
                    //                     },
                    //                     {
                    //                         label: "Material Details",
                    //                         expand: false,
                    //                         color: 'blue',
                    //                         children: [],
                    //                     },
                    //                 ],
                    //             };
                    //         }

                    //         // Add material details
                    //         acc[row.id].children[1].children.push({
                    //             label: `${row.item_name}`,
                    //             expand: false,
                    //             color: 'blue',
                    //             children: [
                    //                 {
                    //                     lines: [
                    //                         // `UOM: ${row.uom}`,
                    //                         `Actual Qty: ${row.actualquantity || 0}`,
                    //                         `Issued Qty: ${row.total_issue || 0}`,
                    //                         `Received Qty: ${row.total_receive || 0}`,
                    //                         `Loss Qty: ${row.total_loss || 0}`,
                    //                         `Balance Qty: ${row.balance_quantity || 0}`,
                    //                         `To Be Issued Qty: ${row.to_be_issued_qty || 0}`,
                    //                         `Actual Pieces: ${row.actual_pieces || 0}`,
                    //                         `Issued Pieces: ${row.issued_pieces || 0}`,
                    //                         `Received Pieces: ${row.received_pieces || 0}`,
                    //                         `Loss Pieces: ${row.loss_pieces || 0}`,
                    //                         `To Be Issued Pieces: ${row.to_be_issued_pieces || 0}`,
                    //                         `Balance Pieces: ${row.balance_pieces || 0}`,
                    //                     ],
                    //                 },
                    //             ],
                    //         });

                    //         return acc;
                    //     }, {});

                    //     // Convert grouped object to array
                    //     return {
                    //         label: "Bags Generated",
                    //         color: "blue",
                    //         expand: true,
                    //         children: Object.values(groupedData),
                    //     };
                    // };

                    log.debug("queryResults", queryResults);
                    // let data = transformData(queryResults);
                    // log.debug("data", data);
                    return queryResults;

                } catch (error) {
                    log.error('error @ getBagGenReport', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },
            getSplitReport(workOrder) {
                try {
                    // let sql = `
                    //     SELECT 
                    //         CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name AS name,
                    //         CUSTOMRECORD_JJ_BAG_GENERATION.id AS generation_id,
                    //         CUSTOMRECORD_JJ_BAG_SPLIT.id AS split_id,
                    //         CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_date AS bagsplit_date,
                    //         CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno AS parent_bag_id,
                    //         CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_childs AS split_childs,
                    //         CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_qty AS split_count,
                    //         CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_dept AS department_id
                    //     FROM 
                    //         customrecord_jj_bag_core_tracking AS CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                    //     LEFT JOIN 
                    //         transaction AS TRANSACTION 
                    //         ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.id
                    //     LEFT JOIN 
                    //         customrecord_jj_bag_generation AS CUSTOMRECORD_JJ_BAG_GENERATION 
                    //         ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.id = CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore
                    //     LEFT JOIN 
                    //         customrecord_jj_bag_split AS CUSTOMRECORD_JJ_BAG_SPLIT 
                    //         ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.id = CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_bagcore
                    //         AND CUSTOMRECORD_JJ_BAG_GENERATION.id = CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno
                    //     WHERE 
                    //         COALESCE(CUSTOMRECORD_JJ_BAG_SPLIT.isinactive, 'F') = 'F'
                    //         AND COALESCE(CUSTOMRECORD_JJ_BAG_GENERATION.isinactive, 'F') = 'F'
                    //         AND COALESCE(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive, 'F') = 'F'
                    //         AND UPPER(TRANSACTION.tranid) = ?
                    //         AND CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno IS NOT NULL;
                    // `;
                    let sql = `
                         SELECT 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name AS name,
                            CUSTOMRECORD_JJ_BAG_GENERATION.id AS generation_id,
                            CUSTOMRECORD_JJ_BAG_GENERATION.name AS bag_name,
                            CUSTOMRECORD_JJ_BAG_SPLIT.id AS split_id,
                            CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_date AS bagsplit_date,
                            CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno AS parent_bag_id,
                            CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_qty AS split_count,
                            CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_dept AS department_id,
                            PARENT_BAG.name AS parent_bag_name,
                            CHILD_BAG.name AS child_bag_name,
                        DEPARTMENT.name AS department_name
                        FROM 
                            customrecord_jj_bag_core_tracking AS CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                        LEFT JOIN 
                            transaction AS TRANSACTION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.id
                        LEFT JOIN 
                            customrecord_jj_bag_generation AS CUSTOMRECORD_JJ_BAG_GENERATION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.id = CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore
                        LEFT JOIN 
                            customrecord_jj_bag_split AS CUSTOMRECORD_JJ_BAG_SPLIT 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.id = CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_bagcore
                            AND CUSTOMRECORD_JJ_BAG_GENERATION.id = CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno
                        LEFT JOIN
                            customrecord_jj_bag_generation AS PARENT_BAG
                            ON CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno = PARENT_BAG.id
                        LEFT JOIN customrecord_jj_manufacturing_dept AS DEPARTMENT
                        ON CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_dept = DEPARTMENT.id
                        LEFT JOIN 
                            (
                                SELECT 
                                    MAP_customrecord_jj_bag_split_custrecord_jj_bagsplit_childs.mapone AS split_id,
                                    CUSTOMRECORD_JJ_BAG_GENERATION.name AS name,
                                    CUSTOMRECORD_JJ_BAG_GENERATION.id AS child_bag_id
                                FROM 
                                    MAP_customrecord_jj_bag_split_custrecord_jj_bagsplit_childs
                                LEFT JOIN 
                                    customrecord_jj_bag_generation AS CUSTOMRECORD_JJ_BAG_GENERATION
                                ON 
                                    MAP_customrecord_jj_bag_split_custrecord_jj_bagsplit_childs.maptwo = CUSTOMRECORD_JJ_BAG_GENERATION.id
                            ) AS CHILD_BAG
                        ON 
                            CUSTOMRECORD_JJ_BAG_SPLIT.id = CHILD_BAG.split_id
                        WHERE 
                            CUSTOMRECORD_JJ_BAG_SPLIT.isinactive = 'F'
                            AND CUSTOMRECORD_JJ_BAG_GENERATION.isinactive = 'F'
                            AND CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive = 'F'
                            AND UPPER(TRANSACTION.tranid) = ?
                            AND CUSTOMRECORD_JJ_BAG_SPLIT.custrecord_jj_bagsplit_par_bagno IS NOT NULL;
                    `
                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();
                    log.debug("getSplitReport queryResults", queryResults);

                    return queryResults;

                } catch (error) {
                    log.error('error @ getSplitReport', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }

            },
            getMoveReports(workOrder) {
                try {
                    let sql = `
                        SELECT 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name AS name, 
                            CUSTOMRECORD_JJ_BAG_GENERATION.id AS ID, 
                            CUSTOMRECORD_JJ_BAG_GENERATION.name AS bag_name,
                            CUSTOMRECORD_JJ_BAG_MOVEMENT.id AS id_1, 
                            CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_date AS custrecord_jj_bagmov_date, 
                            CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_from_dept AS custrecord_jj_bagmov_from_dept, 
                            CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_to_dept AS custrecord_jj_bagmov_to_dept, 
                            CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_from_man AS custrecord_jj_bagmov_from_man, 
                            CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_to_man AS custrecord_jj_bagmov_to_man,
                        TO_DEPT.name AS to_dept_name,
                        FROM_DEPT.name AS from_dept_name,
                        FROM_MANUFACTURER.entityid AS from_manufacturer,
                        TO_MANUFACTURER.entityid AS to_manufacturer,
                        FROM 
                            customrecord_jj_bag_core_tracking AS CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                        LEFT JOIN 
                            transaction AS TRANSACTION ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.id
                        LEFT JOIN 
                            customrecord_jj_bag_generation AS CUSTOMRECORD_JJ_BAG_GENERATION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.id = CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore
                        LEFT JOIN 
                            customrecord_jj_bag_movement AS CUSTOMRECORD_JJ_BAG_MOVEMENT  
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.id = CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_bagcore    
                            AND CUSTOMRECORD_JJ_BAG_GENERATION.id = CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_bagno

                        LEFT JOIN
                        employee AS FROM_MANUFACTURER
                        ON  CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_from_man = FROM_MANUFACTURER.id

                        LEFT JOIN
                        employee AS TO_MANUFACTURER
                        ON  CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_to_man  = TO_MANUFACTURER.id

                        LEFT JOIN 
                        customrecord_jj_manufacturing_dept AS FROM_DEPT
                        ON  CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_from_dept = FROM_DEPT.id

                        LEFT JOIN 
                        customrecord_jj_manufacturing_dept AS TO_DEPT
                        ON  CUSTOMRECORD_JJ_BAG_MOVEMENT.custrecord_jj_bagmov_to_dept = TO_DEPT.id


                        WHERE 
                            COALESCE(CUSTOMRECORD_JJ_BAG_MOVEMENT.isinactive, 'F') = 'F'  
                            AND COALESCE(CUSTOMRECORD_JJ_BAG_GENERATION.isinactive, 'F') = 'F'  
                            AND COALESCE(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive, 'F') = 'F'  
                            AND UPPER(TRANSACTION.tranid) = ? 
                            AND CUSTOMRECORD_JJ_BAG_MOVEMENT.id IS NOT NULL;
                    `;
                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();
                    log.debug("getMergeReports queryResults", queryResults);
                    return queryResults;
                } catch (error) {
                    log.error('error @ getMergeReports', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            getOperationReports(workOrder) {
                try {
                    let sql = `
                        SELECT 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name AS name, 
                            CUSTOMRECORD_JJ_BAG_GENERATION.ID AS ID, 
                            CUSTOMRECORD_JJ_BAG_GENERATION.name AS bag_name,
                            CUSTOMRECORD_JJ_OPERATIONS.id AS operation_id,
                            CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_status AS custrecord_jj_oprtns_status, 
                            CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_entry AS custrecord_jj_oprtns_entry, 
                            CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_exit AS custrecord_jj_oprtns_exit, 
                            CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_employee AS custrecord_jj_oprtns_employee, 
                            CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_start AS custrecord_jj_oprtns_start, 
                            CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_end AS custrecord_jj_oprtns_end,
                            STATUS.NAME AS status_name,
                            EMPLOYEE.entityid AS employee_name,
                            DEPARTMENT.name AS dept_name,
                        FROM 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING 
                            LEFT JOIN TRANSACTION 
                                ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.ID 
                            LEFT JOIN CUSTOMRECORD_JJ_BAG_GENERATION 
                                ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID = CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore 
                            LEFT JOIN CUSTOMRECORD_JJ_OPERATIONS 
                                ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID = CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_bagcore 
                                AND CUSTOMRECORD_JJ_BAG_GENERATION.ID = CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_bagno 
                            LEFT JOIN customlist_jj_operation_status AS STATUS
                                ON CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_status = STATUS.ID
                            LEFT JOIN employee AS EMPLOYEE
                                ON CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_employee = EMPLOYEE.ID
                            LEFT JOIN customrecord_jj_manufacturing_dept AS DEPARTMENT
                                ON CUSTOMRECORD_JJ_OPERATIONS.custrecord_jj_oprtns_department = DEPARTMENT.ID
                        WHERE 
                            NVL(CUSTOMRECORD_JJ_BAG_GENERATION.isinactive, 'F') = 'F' 
                            AND NVL(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive, 'F') = 'F' 
                            AND UPPER(TRANSACTION.tranid) = ? 
                            AND NVL(CUSTOMRECORD_JJ_OPERATIONS.isinactive, 'F') = 'F'
                            ORDER BY CUSTOMRECORD_JJ_OPERATIONS.id DESC;
                    `;

                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();
                    log.debug("getOperationReports queryResults", queryResults);
                    return queryResults;
                } catch (error) {
                    log.error('error @ getOperationReports', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },
            getRejectionReports(workOrder) {
                try {
                    let sql = `
                    SELECT 
                        CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name AS name, 
                        CUSTOMRECORD_JJ_BAG_GENERATION.ID AS ID,
                        CUSTOMRECORD_JJ_BAG_GENERATION.name AS bag_name, 
                        CUSTOMRECORD_JJ_BAG_REJECTION.ID AS id_1, 
                        CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_createdby AS custrecord_jj_bagreject_createdby, 
                        CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_reason AS custrecord_jj_bagreject_reason, 
                        CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_recreated AS custrecord_jj_bagreject_recreated,
                        employee.entityid AS emp_name,
                        DEPARTMENT.name AS dept_name
                    FROM 
                        CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                        LEFT JOIN TRANSACTION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.ID
                        LEFT JOIN CUSTOMRECORD_JJ_BAG_GENERATION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID = CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore
                        LEFT JOIN CUSTOMRECORD_JJ_BAG_REJECTION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID = CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_bagcore
                            AND CUSTOMRECORD_JJ_BAG_GENERATION.ID = CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_bagno

                        LEFT JOIN employee
                            ON  CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_createdby = employee.id
                        
                        LEFT JOIN customrecord_jj_manufacturing_dept AS DEPARTMENT
                            ON CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_dept = DEPARTMENT.ID

                    WHERE 
                        NVL(CUSTOMRECORD_JJ_BAG_GENERATION.isinactive, 'F') = 'F' 
                        AND NVL(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive, 'F') = 'F' 
                        AND UPPER(TRANSACTION.tranid) = ? 
                        AND NVL(CUSTOMRECORD_JJ_BAG_REJECTION.isinactive, 'F') = 'F' 
                        AND CUSTOMRECORD_JJ_BAG_REJECTION.custrecord_jj_bagreject_bagno IS NOT NULL

                    ORDER BY CUSTOMRECORD_JJ_BAG_REJECTION.id DESC;

                `;
                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();

                    return queryResults;
                } catch (error) {
                    log.error('error @ getRejectionReports', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },
            getMergeReports(workOrder) {
                try {
                    let sql = `
                        SELECT 
                            core_tracking.name AS bag_core_name, 
                            bag_generation.ID AS bag_generation_id, 
                            bag_generation.name AS bag_name,
                            bag_merge.ID AS bag_merge_id, 
                            bag_merge.custrecord_jj_bagmerge_date AS merge_date, 
                            bag_merge.custrecord_jj_bagmerge_qty AS merge_qty, 
                            bag_merge.custrecord_jj_bagmerge_dept AS merge_dept,
                            created_bag_gen.name AS created_bag_name,  -- Bag created name

                            created_bag_gen.custrecord_jj_baggen_split AS is_split,  -- Is Split
                            created_bag_gen.custrecord_jj_baggen_merge AS is_merge,  -- Is Merge
                            created_bag_gen.custrecord_jj_is_rejected AS is_rejected,  -- Is Rejected

                            used_bags.bag_name AS used_bag_name,  -- Multi-select Used Bags
                            department.name AS department_name
                        FROM 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING core_tracking
                            LEFT JOIN TRANSACTION txn 
                                ON core_tracking.custrecord_jj_bagcore_wo = txn.ID
                            LEFT JOIN CUSTOMRECORD_JJ_BAG_GENERATION bag_generation 
                                ON core_tracking.ID = bag_generation.custrecord_jj_baggen_bagcore
                            LEFT JOIN CUSTOMRECORD_JJ_BAG_MERGE bag_merge 
                                ON core_tracking.ID = bag_merge.custrecord_jj_bagmerge_bagcore
                                AND bag_generation.ID = bag_merge.custrecord_jj_bagmerge_bagcreated
                            -- Join again to get the name of the created bags
                            LEFT JOIN CUSTOMRECORD_JJ_BAG_GENERATION created_bag_gen
                                ON bag_merge.custrecord_jj_bagmerge_bagcreated = created_bag_gen.ID
                            -- Join department
                            LEFT JOIN CUSTOMRECORD_JJ_MANUFACTURING_DEPT department
                                ON bag_merge.custrecord_jj_bagmerge_dept = department.ID
                            -- Handle Multi-Select Used Bags
                            LEFT JOIN (
                                SELECT 
                                    map_table.mapone AS merge_id, 
                                    bag_gen.name AS bag_name, 
                                    bag_gen.ID AS bag_id
                                FROM 
                                    MAP_customrecord_jj_bag_merge_custrecord_jj_bagmerge_bagsused map_table
                                LEFT JOIN 
                                    CUSTOMRECORD_JJ_BAG_GENERATION bag_gen
                                ON 
                                    map_table.maptwo = bag_gen.ID
                            ) AS used_bags
                            ON bag_merge.ID = used_bags.merge_id
                        WHERE 
                            NVL(bag_generation.isinactive, 'F') = 'F' 
                            AND NVL(core_tracking.isinactive, 'F') = 'F' 
                            AND UPPER(txn.tranid) = ? 
                            AND NVL(bag_merge.isinactive, 'F') = 'F' 
                            AND bag_merge.custrecord_jj_bagmerge_bagcreated IS NOT NULL;
                    `;
                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();
                    log.debug("getMergeReports queryResults", queryResults);
                    return queryResults;

                } catch (error) {
                    log.error('error @ getMergeReports', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            getBuiltSerials(workOrder) {
                try {
                    let sql = `
                        SELECT 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name AS name, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.name AS name_1, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.inventorynumber AS inventorynumber, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.custrecord_jj_fgs_serial AS custrecord_jj_fgs_serial, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.itemid AS itemid, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.custrecord_jj_fgs_diamond_weight AS custrecord_jj_fgs_diamond_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.custrecord_jj_fgs_clr_stone_weight AS custrecord_jj_fgs_clr_stone_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.custrecord_jj_fgs_gold_weight AS custrecord_jj_fgs_gold_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS_SUB.custrecord_jj_fgs_gross_weight AS custrecord_jj_fgs_gross_weight
                        FROM 
                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                        LEFT JOIN TRANSACTION 
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.ID
                        LEFT JOIN (
                            SELECT 
                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_bag_core_tracking, 
                            CUSTOMRECORD_JJ_FG_SERIALS.name, 
                            inventoryNumber.inventorynumber, 
                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial, 
                            item.itemid, 
                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_diamond_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_clr_stone_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_gold_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_gross_weight, 
                            CUSTOMRECORD_JJ_FG_SERIALS.isinactive AS isinactive_crit
                            FROM CUSTOMRECORD_JJ_FG_SERIALS
                            LEFT JOIN item 
                            ON CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item = item.ID
                            LEFT JOIN inventoryNumber 
                            ON CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial = inventoryNumber.ID
                        ) CUSTOMRECORD_JJ_FG_SERIALS_SUB
                            ON CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID = CUSTOMRECORD_JJ_FG_SERIALS_SUB.custrecord_jj_fgs_bag_core_tracking
                        WHERE 
                            COALESCE(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive, 'F') = 'F'
                            AND UPPER(TRANSACTION.tranid) = ?
                            AND COALESCE(CUSTOMRECORD_JJ_FG_SERIALS_SUB.isinactive_crit, 'F') = 'F'
                            AND  CUSTOMRECORD_JJ_FG_SERIALS_SUB.name IS NOT NULL
                    `;

                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();

                    return queryResults;
                } catch (error) {
                    log.error('error @ getBuiltSerials', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            getBagTreeLoads(workOrder) {
                try {
                    let sql = `
                            SELECT 
                                BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.name) AS name, 
                                BUILTIN_RESULT.TYPE_DATE(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.custrecord_jj_bag_tree_date_0) AS custrecord_jj_bag_tree_date, 
                                BUILTIN_RESULT.TYPE_STRING(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.altname_0) AS altname, 
                                BUILTIN_RESULT.TYPE_INTEGER(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.custrecord_jj_bag_tree_item_0) AS custrecord_jj_bag_tree_item, 
                                BUILTIN_RESULT.TYPE_STRING(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.itemid_0) AS itemid, 
                                BUILTIN_RESULT.TYPE_INTEGER(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.custrecord_jj_bag_tree_bag_count_0) AS custrecord_jj_bag_tree_bag_count, 
                                BUILTIN_RESULT.TYPE_STRING(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.custrecord_jj_bag_tree_bag_list_0) AS custrecord_jj_bag_tree_bag_list, 
                                BUILTIN_RESULT.TYPE_STRING(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.name_0_0) AS name_1, 
                                BUILTIN_RESULT.TYPE_INTEGER(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.custrecord_jj_bag_load_status_0) AS custrecord_jj_bag_load_status, 
                                BUILTIN_RESULT.TYPE_STRING(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.name_1_0) AS name_2
                            FROM 
                                CUSTOMRECORD_JJ_BAG_CORE_TRACKING, 
                                (SELECT 
                                    MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking.maptwo AS maptwo, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.custrecord_jj_bag_tree_date AS custrecord_jj_bag_tree_date_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.altname AS altname_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.custrecord_jj_bag_tree_item AS custrecord_jj_bag_tree_item_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.itemid AS itemid_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.custrecord_jj_bag_tree_bag_count AS custrecord_jj_bag_tree_bag_count_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.custrecord_jj_bag_tree_bag_list AS custrecord_jj_bag_tree_bag_list_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.name_0 AS name_0_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.altname_0 AS altname_0_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.custrecord_jj_bag_load_status AS custrecord_jj_bag_load_status_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.name_1 AS name_1_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.isinactive_crit AS isinactive_crit_0, 
                                    CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.id_crit AS id_crit_0
                                FROM 
                                MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking, 
                                (SELECT 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.ID AS ID, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.ID AS id_join, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_tree_date AS custrecord_jj_bag_tree_date, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.altname AS altname, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_tree_item AS custrecord_jj_bag_tree_item, 
                                item.itemid AS itemid, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_tree_bag_count AS custrecord_jj_bag_tree_bag_count, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_tree_bag_list AS custrecord_jj_bag_tree_bag_list, 
                                MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list_SUB.name AS name_0, 
                                MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list_SUB.altname AS altname_0, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_load_status AS custrecord_jj_bag_load_status, 
                                CUSTOMLIST_JJ_LOAD_STATUS_LIST.name AS name_1, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.isinactive AS isinactive_crit, 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD.ID AS id_crit
                                FROM 
                                CUSTOMRECORD_JJ_BAG_TREE_LOAD, 
                                CUSTOMLIST_JJ_LOAD_STATUS_LIST, 
                                (SELECT 
                                    MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list.mapone AS mapone, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.name AS name, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION.altname AS altname
                                FROM 
                                    MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION
                                WHERE 
                                    MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list.maptwo = CUSTOMRECORD_JJ_BAG_GENERATION.ID
                                ) MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list_SUB, 
                                item
                                WHERE 
                                ((CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_load_status = CUSTOMLIST_JJ_LOAD_STATUS_LIST.ID(+) AND CUSTOMRECORD_JJ_BAG_TREE_LOAD.ID = MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_tree_bag_list_SUB.mapone(+)))
                                AND CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_tree_item = item.ID(+)
                                ) CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB
                            WHERE 
                                MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking.mapone = CUSTOMRECORD_JJ_BAG_TREE_LOAD_SUB.ID
                            ) MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB, 
                            TRANSACTION WHERE 
                            ((CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID = MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.maptwo(+) AND CUSTOMRECORD_JJ_BAG_CORE_TRACKING.custrecord_jj_bagcore_wo = TRANSACTION.ID(+)))
                            AND ((NVL(CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive, 'F') = 'F' AND UPPER(TRANSACTION.tranid) = ? AND NVL(MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.isinactive_crit_0, 'F') = 'F' AND NOT(
                                MAP_customrecord_jj_bag_tree_load_custrecord_jj_bag_load_core_tracking_SUB.id_crit_0 IS NULL
                            )))
                        `;
                    let queryResults = query.runSuiteQL({
                        query: sql,
                        params: [workOrder]
                    }).asMappedResults();
                    log.debug("getBagTreeLoadList queryResults", queryResults);

                    const groupedData = {};

                    queryResults.forEach(item => {
                        const key = item.name; // Grouping by 'name'

                        if (!groupedData[key]) {
                            groupedData[key] = {
                                name: item.name,
                                custrecord_jj_bag_tree_date: item.custrecord_jj_bag_tree_date,
                                altname: item.altname,
                                custrecord_jj_bag_tree_item: item.custrecord_jj_bag_tree_item,
                                itemid: item.itemid,
                                custrecord_jj_bag_tree_bag_count: item.custrecord_jj_bag_tree_bag_count,
                                custrecord_jj_bag_tree_bag_list: item.custrecord_jj_bag_tree_bag_list,
                                custrecord_jj_bag_load_status: item.custrecord_jj_bag_load_status,
                                name_2: item.name_2,
                                bag_names: []
                            };
                        }

                        // Push bag name into the array
                        groupedData[key].bag_names.push(item.name_1);
                    });

                    // Convert grouped object into an array
                    return Object.values(groupedData).map(item => ({
                        ...item,
                        bag_names: item.bag_names.join(", ") // Convert array to comma-separated string
                    }));

                } catch (error) {
                    log.error('error @ getBagTreeLoadList', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            listInventoryForBinTransfer(itemId, locationId) {
                try {
                    let inventorySearch = search.create({
                        type: "inventorybalance",
                        filters:
                            [
                                ["item.type", "anyof", "Assembly", "InvtPart"],
                                "AND",
                                ["location", "anyof", locationId],
                                "AND",
                                ["status", "anyof", GOOD_STATUS_ID],
                                "AND",
                                ["formulanumeric: Case when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='F' AND {item.isserialitem}='F' THEN {available} when {item.type} IN ('Inventory Item',' Assembly') AND {item.islotitem}='T' THEN {available} when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} IS NULL THEN 1 when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 0 THEN 1 when {item.type} IN ('Inventory Item',' Assembly') AND {item.isserialitem}='T' AND {invnumcommitted} = 1 THEN 0 ELSE {available} END", "notequalto", "0"],
                                "AND",
                                ["available", "greaterthan", "0"],
                                "AND",
                                ["item", "anyof", itemId]
                            ],
                        // columns:
                        //     [
                        //         search.createColumn({
                        //             name: "item",
                        //             summary: "GROUP",
                        //             label: "item"
                        //         }),
                        //         search.createColumn({
                        //             name: "inventorynumber",
                        //             summary: "GROUP",
                        //             label: "inventory_number"
                        //         }),
                        //         search.createColumn({
                        //             name: "formulatext",
                        //             summary: "MAX",
                        //             formula: "MAX({binnumber.internalid})",
                        //             label: "bin_number"
                        //         }),
                        //         search.createColumn({
                        //             name: "formulatext",
                        //             summary: "MAX",
                        //             formula: "MAX({binnumber})",
                        //             label: "bin_name"
                        //         }),
                        //         search.createColumn({
                        //             name: "formulanumeric",
                        //             summary: "MAX",
                        //             formula: "MAX({available})",
                        //             label: "available"
                        //         }),
                        //         search.createColumn({
                        //             name: "formulanumeric",
                        //             summary: "MAX",
                        //             formula: "SUM( {available} )",
                        //             label: "total_available"
                        //         }),
                        //         search.createColumn({
                        //             name: "formulanumeric",
                        //             summary: "MAX",
                        //             formula: "MAX({invnumcommitted})",
                        //             label: "total_committed"
                        //         }),
                        //         search.createColumn({
                        //             name: "formulanumeric",
                        //             summary: "MAX",
                        //             formula: "SUM(NVL({available}, 0)) - MAX(NVL({invnumcommitted}, 0))",
                        //             label: "calculated_available"
                        //         }),
                        //         search.createColumn({
                        //             name: "status",
                        //             summary: "GROUP",
                        //             label: "status"
                        //         })
                        //     ]

                        columns:
                            [
                                search.createColumn({
                                    name: "item",
                                    summary: "GROUP",
                                    label: "item"
                                }),
                                search.createColumn({
                                    name: "inventorynumber",
                                    summary: "GROUP",
                                    label: "inventory_number"
                                }),
                                search.createColumn({
                                    name: "binnumber",
                                    join: "binNumber",
                                    summary: "GROUP",
                                    label: "bin_name"
                                }),
                                search.createColumn({
                                    name: "binnumber",
                                    summary: "GROUP",
                                    label: "bin_number"
                                }),
                                search.createColumn({
                                    name: "available",
                                    summary: "GROUP",
                                    label: "available"
                                }),
                                search.createColumn({
                                    name: "formulanumeric",
                                    summary: "MAX",
                                    formula: "SUM( {available} )",
                                    label: "total_available"
                                }),
                                search.createColumn({
                                    name: "formulanumeric",
                                    summary: "MAX",
                                    formula: "MAX({invnumcommitted})",
                                    label: "total_committed"
                                }),
                                search.createColumn({
                                    name: "formulanumeric",
                                    summary: "MAX",
                                    formula: "SUM(NVL({available}, 0)) - MAX(NVL({invnumcommitted}, 0))",
                                    label: "calculated_available"
                                }),
                                search.createColumn({
                                    name: "status",
                                    summary: "GROUP",
                                    label: "status"
                                }),
                                search.createColumn({
                                    name: "class",
                                    join: "item",
                                    summary: "GROUP",
                                    label: "class"
                                }),
                                search.createColumn({
                                    name: "isserialitem",
                                    join: "item",
                                    summary: "GROUP",
                                    label: "isSerialized"
                                })
                            ]
                    });
                    let searchresult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventorySearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorySearch, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    log.debug("searchresult", searchresult);
                    searchresult = searchresult.filter(result => {
                        if (parseFloat(result.calculated_available.value) > 0 && parseFloat(result.available.value) > 0) {
                            result.available.value = Math.min(result.calculated_available.value, result.available.value);
                            return true;
                        }
                    });

                    // Grouping by bin number
                    let groupedResults = {};

                    searchresult.forEach(result => {
                        let binId = result.bin_number.value;
                        let binText = result.bin_name.value; // Fetch bin number text
                        let lotNumber = result.inventory_number.value;
                        let lotName = result.inventory_number.text;
                        let quantity = result.available.value;
                        let isSerialized = result.isSerialized.value;
                        let classId = result.class.value;

                        if (binId) {

                            if (!groupedResults[binId]) {
                                groupedResults[binId] = {
                                    bin_text: binText,
                                    lots: [],
                                };
                            }

                            groupedResults[binId].lots.push({
                                lotnumber: lotNumber,
                                quantity: quantity,
                                lotname: lotName,
                                isSerialized: isSerialized,
                                classId: classId
                            });
                        }
                    });

                    // Transforming the grouped results into an array
                    let formattedResults = Object.entries(groupedResults).map(([binId, binData]) => ({
                        bin_id: binId,
                        bin_text: binData.bin_text,
                        lots: binData.lots,
                    }));

                    return { status: 'SUCCESS', reason: 'Result Found', data: formattedResults };
                } catch (error) {
                    log.error('error @ listInventoryForBinTransfer', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /** 
             * Get the sub-locations of the given locations
             * @param {Array} locations - The list of location IDs
             * @returns {Object} - The sub-locations of the given locations
             */
            getSubLocations(locations) {
                try {
                    let sqlQuery = `SELECT 
                        BUILTIN_RESULT.TYPE_INTEGER(LOCATION.ID) AS location_id, 
                        BUILTIN_RESULT.TYPE_STRING(LOCATION.name) AS location_name, 
                        BUILTIN_RESULT.TYPE_INTEGER(Location_0.ID) AS parent_id
                        FROM 
                            LOCATION, 
                            LOCATION Location_0
                        WHERE 
                            LOCATION.PARENT = Location_0.ID(+)
                            AND (
                                (
                                    NVL(Location_0.isinactive, 'F') = 'F' 
                                    AND LOCATION.makeinventoryavailable = 'T' 
                                    AND Location_0.ID IN (${locations.join(',')}) 
                                    AND NVL(LOCATION.isinactive, 'F') = 'F'
                                )
                            )
                    `;

                    // Run the SuiteQL query
                    let queryResults = query.runSuiteQL({ query: sqlQuery }).asMappedResults();

                    return { status: 'SUCCESS', reason: 'Result Found', data: queryResults };
                } catch (error) {
                    log.error('error @ getSubLocations', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },
            listBinsForBinTransfer(locationId) {
                try {
                    let binArray = [];
                    let binSearchObj = search.create({
                        type: "bin",
                        filters:
                            [
                                ["location", "anyof", locationId]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "binnumber", label: "bin_text" }),
                                search.createColumn({ name: "location", label: "Location" }),
                                search.createColumn({ name: "internalid", label: "bin_id" }),
                            ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: binSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(binSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    searchResult.forEach(result => {
                        binArray.push({
                            bin_id: result.bin_id.value,
                            bin_text: result.bin_text.value
                        });
                    });
                    log.debug("searchResult", searchResult);
                    return { status: 'SUCCESS', reason: 'Result Found', data: binArray };

                } catch (error) {
                    log.error('error @ listBinsForBinTransfer', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            // /**
            //  * Get the list of FG Serials for the given assembly builds
            //  * @param {Array} assemblyBuilds - The list of assembly build IDs
            //  * @returns {Object} - The list of FG Serials for the given assembly builds
            //  */
            // getFGSerialComponents(assemblyBuilds) {
            //     try {
            //         let groupedResults = {};
            //         let fgSerialsSearchObj = search.create({
            //             type: "customrecord_jj_fg_serials",
            //             filters: [
            //                 ["isinactive", "is", "F"],
            //                 "AND", ["custrecord_jj_fgs_assembly_build", "anyof", assemblyBuilds],
            //                 "AND", ["custrecord_jj_fgs_serial.isonhand", "is", "T"],
            //                 "AND", ["custrecord_jj_fgs_serial.quantityavailable", "greaterthan", "0"]
            //             ],
            //             columns: [
            //                 search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_FGS_ASSEMBLY_BUILD", summary: "GROUP", label: "assembly_build" }),
            //                 search.createColumn({ name: "custrecord_jj_fgs_serial", summary: "GROUP", label: "serial_number" }),
            //                 search.createColumn({ name: "custrecord_jj_fgs_gold_weight", summary: "GROUP", label: "gold_weight" }),
            //                 search.createColumn({ name: "custrecord_jj_fgs_diamond_weight", summary: "GROUP", label: "diamond_weight" }),
            //                 search.createColumn({ name: "custrecord_jj_fgs_clr_stone_weight", summary: "GROUP", label: "color_stone_weight" }),
            //                 search.createColumn({ name: "custrecord_jj_fgs_gross_weight", summary: "GROUP", label: "gross_weight" }),
            //                 search.createColumn({ name: "custrecord_jj_fsc_item", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", summary: "GROUP", label: "item" }),
            //                 search.createColumn({ name: "custrecord_jj_fsc_quantity", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", summary: "GROUP", label: "quantity" }),
            //                 search.createColumn({ name: "custrecord_jj_fsc_pieces_value", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", summary: "GROUP", label: "actual_pieces_info" }),
            //                 search.createColumn({ name: "custrecord_jj_fsc_item_units", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", summary: "GROUP", label: "uom" }),
            //                 search.createColumn({ name: "isinactive", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", summary: "GROUP", label: "is_component_inactive" }),
            //                 search.createColumn({ name: "location", join: "CUSTRECORD_JJ_FGS_SERIAL", summary: "GROUP", label: "location" })
            //             ]
            //         });

            //         let searchResult = jjUtil.dataSets.iterateSavedSearch({
            //             searchObj: fgSerialsSearchObj,
            //             columns: jjUtil.dataSets.fetchSavedSearchColumn(fgSerialsSearchObj, 'label'),
            //             PAGE_INDEX: null,
            //             PAGE_SIZE: 1000
            //         });

            //         searchResult.forEach((result) => {
            //             const assemblyId = result.assembly_build?.value;
            //             const fgSeries = result.serial_number?.value;
            //             const isComponentInactive = result.is_component_inactive;

            //             // Initialize the assembly group if it doesn't exist
            //             if (!groupedResults[assemblyId]) {
            //                 groupedResults[assemblyId] = {
            //                     assembly_build: result.assembly_build,
            //                     fg_series_groups: {}
            //                 };
            //             }

            //             // Initialize the FG series group within the assembly if it doesn't exist
            //             if (!groupedResults[assemblyId].fg_series_groups[fgSeries]) {
            //                 groupedResults[assemblyId].fg_series_groups[fgSeries] = {
            //                     serial_number: result.serial_number,
            //                     gold_weight: result.gold_weight,
            //                     diamond_weight: result.diamond_weight,
            //                     color_stone_weight: result.color_stone_weight,
            //                     gross_weight: result.gross_weight,
            //                     location: result.location,
            //                     componentDetails: []
            //                 };
            //             }

            //             // Add component details to the FG series group if the component is active
            //             if (!isComponentInactive?.value) {
            //                 groupedResults[assemblyId].fg_series_groups[fgSeries].componentDetails.push({
            //                     item: result.item,
            //                     quantity: result.quantity,
            //                     actual_pieces_info: result.actual_pieces_info,
            //                     uom: result.uom
            //                 });
            //             }
            //         });

            //         // Convert grouped results to an array
            //         const formattedResults = Object.values(groupedResults).map(assembly => {
            //             return {
            //                 assembly_build: assembly.assembly_build,
            //                 fg_series_groups: Object.values(assembly.fg_series_groups)
            //             };
            //         });

            //         return { status: 'SUCCESS', reason: 'Result Found', data: formattedResults };

            //     } catch (error) {
            //         log.error('error @ getFGSerialComponents', error.message);
            //         return { status: 'ERROR', reason: error.message, data: [] };
            //     }
            // },

            /**
             * Retrieves all unique locations available for FG serials in Direct Repair
             * @returns {Object} { status, reason, data: [{ value: location_id, label: location_name }, ...] }
             */
            getAvailableLocationsForDirectRepair() {
                try {
                    log.debug('getAvailableLocationsForDirectRepair - START');

                    // Use simple location search to get all active locations
                    let locationSearchObj = search.create({
                        type: "location",
                        filters: [
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "location_id" }),
                            search.createColumn({ name: "name", label: "location_name" })
                        ]
                    });

                    let locations = [];
                    locationSearchObj.run().each(function (result) {
                        locations.push({
                            value: result.getValue('internalid'),
                            label: result.getValue('name') || 'Unknown Location'
                        });
                        return true;
                    });

                    log.debug('getAvailableLocationsForDirectRepair - SUCCESS', {
                        locationsCount: locations.length,
                        locations: locations
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Locations retrieved',
                        data: locations
                    };

                } catch (error) {
                    log.error('getAvailableLocationsForDirectRepair ERROR', {
                        error: error.message || String(error),
                        stack: error.stack
                    });
                    return {
                        status: 'ERROR',
                        reason: error.message || String(error),
                        data: []
                    };
                }
            },

            /**
             * Retrieves FG serials filtered by location for Direct Repair
             * @param {String} locationId - The location ID to filter by
             * @returns {Object} { status, reason, data: [...serials] }
             */
            listFGSerialsByLocationForDirectRepair(locationId) {
                try {
                    log.debug('listFGSerialsByLocationForDirectRepair - START', { locationId: locationId });

                    if (!locationId) {
                        return {
                            status: 'ERROR',
                            reason: 'Location ID is required',
                            data: []
                        };
                    }

                    sqlQuery = `
                        SELECT 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIALS.name) AS fg_serial_id, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_build) AS assembly_build_id, 
                            BUILTIN_RESULT.TYPE_STRING(transaction_SUB.transactionnumber) AS assembly_build_name, 
                            BUILTIN_RESULT.TYPE_DATE(transaction_SUB.trandate) AS assembly_build_date,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item) AS assembly_item_id, 
                            BUILTIN_RESULT.TYPE_STRING(item.itemid) AS assembly_item_name, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial) AS serial_id, 
                            BUILTIN_RESULT.TYPE_STRING(inventoryNumber_SUB.inventorynumber_0) AS serial_name, 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.location_0) AS location_id, 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.binnumber_0) AS bin_id, 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.inventorystatus_0) AS status_id, 
                            BUILTIN_RESULT.TYPE_STRING(inventoryNumber_SUB.name_0) AS status_name, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_gold_weight) AS gold_weight, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_diamond_weight) AS diamond_weight, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_clr_stone_weight) AS clr_stone_weight, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_gross_weight) AS gross_weight, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_item) AS item_id, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.itemid) AS item_name, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_quantity) AS quantity, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_pieces_value) AS actual_pieces_info, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_item_units) AS uom_id, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.unitname) AS uom_name, 
                            BUILTIN_RESULT.TYPE_BOOLEAN(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.isinactive) AS is_component_inactive, 
                            BUILTIN_RESULT.TYPE_INTEGER(transaction_SUB.id_0) AS bag_no_id, 
                            BUILTIN_RESULT.TYPE_STRING(transaction_SUB.name_0) AS bag_no_name,
                            BUILTIN_RESULT.TYPE_INTEGER(transaction_SUB.custrecord_jj_baggen_bagcore_0) AS bag_core_tracking
                        FROM 
                            CUSTOMRECORD_JJ_FG_SERIALS, 
                            (
                                SELECT 
                                    TRANSACTION.ID AS ID, 
                                    TRANSACTION.ID AS id_join, 
                                    TRANSACTION.transactionnumber AS transactionnumber, 
                                    TRANSACTION.trandate AS trandate,
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.ID AS id_0, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.name AS name_0,
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_baggen_bagcore AS custrecord_jj_baggen_bagcore_0, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.isinactive_crit AS isinactive_crit_0
                                FROM 
                                    TRANSACTION, 
                                    (
                                        SELECT 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_associated_assembly_build AS custrecord_jj_associated_assembly_build, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_associated_assembly_build AS custrecord_jj_associated_assembly_build_join, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.ID AS ID, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.name AS name, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore AS custrecord_jj_baggen_bagcore, 
                                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive AS isinactive_crit
                                        FROM 
                                            CUSTOMRECORD_JJ_BAG_GENERATION, 
                                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                                        WHERE 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore = CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID(+)
                                    ) CUSTOMRECORD_JJ_BAG_GENERATION_SUB
                                WHERE 
                                    TRANSACTION.ID = CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_associated_assembly_build(+)
                            ) transaction_SUB, 
                            item, 
                            (
                                SELECT 
                                    inventoryNumber.ID AS ID, 
                                    inventoryNumber.ID AS id_join, 
                                    inventoryNumber.inventorynumber AS inventorynumber_0, 
                                    InventoryNumberInventoryBalance_SUB.LOCATION AS location_0, 
                                    InventoryNumberInventoryBalance_SUB.binnumber AS binnumber_0, 
                                    InventoryNumberInventoryBalance_SUB.inventorystatus AS inventorystatus_0, 
                                    InventoryNumberInventoryBalance_SUB.name AS name_0, 
                                    InventoryNumberInventoryBalance_SUB.quantityavailable_crit AS quantityavailable_crit_0, 
                                    InventoryNumberInventoryBalance_SUB.quantityonhand_crit AS quantityonhand_crit_0
                                FROM 
                                    inventoryNumber, 
                                    (
                                        SELECT 
                                            InventoryNumberInventoryBalance.inventorynumber AS inventorynumber, 
                                            InventoryNumberInventoryBalance.inventorynumber AS inventorynumber_join, 
                                            InventoryNumberInventoryBalance.LOCATION AS LOCATION, 
                                            InventoryNumberInventoryBalance.binnumber AS binnumber, 
                                            InventoryNumberInventoryBalance.inventorystatus AS inventorystatus, 
                                            inventoryStatus.name AS name, 
                                            InventoryNumberInventoryBalance.quantityavailable AS quantityavailable_crit, 
                                            InventoryNumberInventoryBalance.quantityonhand AS quantityonhand_crit
                                        FROM 
                                            InventoryNumberInventoryBalance, 
                                            inventoryStatus
                                        WHERE 
                                            InventoryNumberInventoryBalance.inventorystatus = inventoryStatus.ID(+)
                                    ) InventoryNumberInventoryBalance_SUB
                                WHERE 
                                    inventoryNumber.ID = InventoryNumberInventoryBalance_SUB.inventorynumber(+)
                            ) inventoryNumber_SUB, 
                            (
                                SELECT 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_serial_number AS custrecord_jj_fsc_serial_number, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_serial_number AS custrecord_jj_fsc_serial_number_join, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item AS custrecord_jj_fsc_item, 
                                    item_0.itemid AS itemid, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_quantity AS custrecord_jj_fsc_quantity, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_pieces_value AS custrecord_jj_fsc_pieces_value, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item_units AS custrecord_jj_fsc_item_units, 
                                    unitsTypeUom.unitname AS unitname, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.isinactive AS isinactive
                                FROM 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS, 
                                    item item_0, 
                                    unitsTypeUom
                                WHERE 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item = item_0.ID(+)
                                    AND CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item_units = unitsTypeUom.internalid(+)
                            ) CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB
                        WHERE 
                            (
                                (
                                    (
                                        (
                                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_build = transaction_SUB.ID(+) 
                                            AND CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item = item.ID(+)
                                        ) AND CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial = inventoryNumber_SUB.ID(+)
                                    ) AND CUSTOMRECORD_JJ_FG_SERIALS.ID = CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_serial_number(+)
                                )
                            ) AND (
                                (
                                    NVL(CUSTOMRECORD_JJ_FG_SERIALS.isinactive, 'F') = 'F' 
                                    AND inventoryNumber_SUB.quantityavailable_crit_0 > 0 
                                    AND inventoryNumber_SUB.quantityonhand_crit_0 > 0
                                    AND NOT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item IS NULL)
                                    AND NVL(transaction_SUB.isinactive_crit_0, 'F') = 'F'
                                    AND inventoryNumber_SUB.location_0 = ${locationId}
                                    -- AND inventoryNumber_SUB.name_0 = 'Label Pending'
                                )
                            )
                        ORDER BY CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial DESC
                    `;

                    let formattedResults = [];
                    let tempMap = {};

                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    let resultIterator = results.iterator();

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;
                            let fgSerialId = rowData[0];

                            if (!tempMap[fgSerialId]) {
                                tempMap[fgSerialId] = {
                                    fg_serial_id: rowData[0],
                                    assembly_build_id: rowData[1],
                                    assembly_build_name: rowData[2],
                                    assembly_build_date: rowData[3],
                                    assembly_item_id: rowData[4],
                                    assembly_item_name: rowData[5],
                                    serial_number_id: rowData[6],
                                    serial_number_name: rowData[7],
                                    location_id: rowData[8],
                                    bin_number_id: rowData[9],
                                    status_id: rowData[10],
                                    status_name: rowData[11],
                                    gold_weight: Number(parseFloat(rowData[12]).toFixed(4)),
                                    diamond_weight: Number(parseFloat(rowData[13]).toFixed(4)),
                                    color_stone_weight: Number(parseFloat(rowData[14]).toFixed(4)),
                                    gross_weight: Number(parseFloat(rowData[15]).toFixed(4)),
                                    componentDetails: [],
                                    bag_no_id: rowData[23],
                                    bag_no_name: rowData[24],
                                    bag_core_tracking: rowData[25],
                                };
                            }

                            if (rowData[22] != 'T') {
                                tempMap[fgSerialId].componentDetails.push({
                                    item_id: rowData[16],
                                    item_name: rowData[17],
                                    quantity: Number(parseFloat(rowData[18]).toFixed(4)),
                                    actual_pieces_info: parseInt(rowData[19]),
                                    uom_id: rowData[20],
                                    uom_name: rowData[21],
                                });
                            }
                            return true;
                        });
                        return true;
                    });

                    formattedResults = Object.values(tempMap);

                    formattedResults.sort((a, b) => {
                        if (a.serial_number_name < b.serial_number_name) return 1;
                        if (a.serial_number_name > b.serial_number_name) return -1;
                        return 0;
                    });

                    log.debug('listFGSerialsByLocationForDirectRepair - SUCCESS', {
                        locationId: locationId,
                        serialsCount: formattedResults.length,
                        serials: formattedResults
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Serials retrieved for location',
                        data: formattedResults
                    };

                } catch (error) {
                    log.error('listFGSerialsByLocationForDirectRepair ERROR', {
                        error: error.message || String(error),
                        stack: error.stack,
                        locationId: locationId
                    });
                    return {
                        status: 'ERROR',
                        reason: error.message || String(error),
                        data: []
                    };
                }
            },

            listFGSerialForLocationTransfer(fromBinId) {
                try {
                    sqlQuery = `
                        SELECT 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIALS.name) AS fg_serial_id, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_build) AS assembly_build_id, 
                            BUILTIN_RESULT.TYPE_STRING(transaction_SUB.transactionnumber) AS assembly_build_name, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item) AS assembly_item_id, 
                            BUILTIN_RESULT.TYPE_STRING(item.itemid) AS assembly_item_name, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial) AS serial_id, 
                            BUILTIN_RESULT.TYPE_STRING(inventoryNumber_SUB.inventorynumber_0) AS serial_name, 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.location_0) AS location_id, 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.binnumber_0) AS bin_id, 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.inventorystatus_0) AS status_id, 
                            BUILTIN_RESULT.TYPE_STRING(inventoryNumber_SUB.name_0) AS status_name, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_gold_weight) AS gold_weight, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_diamond_weight) AS diamond_weight, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_clr_stone_weight) AS clr_stone_weight, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_gross_weight) AS gross_weight, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_item) AS item_id, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.itemid) AS item_name, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_quantity) AS quantity, 
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_pieces_value) AS actual_pieces_info, 
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_item_units) AS uom_id, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.unitname) AS uom_name, 
                            BUILTIN_RESULT.TYPE_BOOLEAN(CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.isinactive) AS is_component_inactive, 
                            BUILTIN_RESULT.TYPE_INTEGER(transaction_SUB.id_0) AS bag_no_id, 
                            BUILTIN_RESULT.TYPE_STRING(transaction_SUB.name_0) AS bag_no_name,
                            BUILTIN_RESULT.TYPE_INTEGER(transaction_SUB.custrecord_jj_baggen_bagcore_0) AS bag_core_tracking,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_metal_quality) AS metal_quality_id,
                            BUILTIN.DF(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_metal_quality) AS metal_quality_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_stone_color) AS stone_color_id,
                            BUILTIN.DF(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_stone_color) AS stone_color_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fg_subcategory) AS subcategory_id,
                            BUILTIN_RESULT.TYPE_INTEGER(fg_subcategory_SUB.custrecord_jj_sub_cate_types) AS subcategory_type_id,
                            BUILTIN_RESULT.TYPE_STRING(fg_subcategory_SUB.subcategory_type_name) AS subcategory_type_name,
                            BUILTIN.DF(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fg_subcategory) AS subcategory_name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_category) AS category_id,
                            BUILTIN.DF(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_category) AS category_name,
                            BUILTIN.DF(salesOrder_SUB.custbody_jj_customer_shop_code) AS shop_code,
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber_SUB.diamond_pieces) AS dia_pieces
                        FROM 
                            CUSTOMRECORD_JJ_FG_SERIALS, 
                            (
                                SELECT 
                                    TRANSACTION.ID AS ID, 
                                    TRANSACTION.ID AS id_join, 
                                    TRANSACTION.transactionnumber AS transactionnumber, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.ID AS id_0, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.name AS name_0,
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_baggen_bagcore AS custrecord_jj_baggen_bagcore_0, 
                                    CUSTOMRECORD_JJ_BAG_GENERATION_SUB.isinactive_crit AS isinactive_crit_0
                                FROM 
                                    TRANSACTION, 
                                    (
                                        SELECT 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_associated_assembly_build AS custrecord_jj_associated_assembly_build, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_associated_assembly_build AS custrecord_jj_associated_assembly_build_join, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.ID AS ID, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.name AS name, 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore AS custrecord_jj_baggen_bagcore, 
                                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING.isinactive AS isinactive_crit
                                        FROM 
                                            CUSTOMRECORD_JJ_BAG_GENERATION, 
                                            CUSTOMRECORD_JJ_BAG_CORE_TRACKING
                                        WHERE 
                                            CUSTOMRECORD_JJ_BAG_GENERATION.custrecord_jj_baggen_bagcore = CUSTOMRECORD_JJ_BAG_CORE_TRACKING.ID(+)
                                    ) CUSTOMRECORD_JJ_BAG_GENERATION_SUB
                                WHERE 
                                    TRANSACTION.ID = CUSTOMRECORD_JJ_BAG_GENERATION_SUB.custrecord_jj_associated_assembly_build(+)
                            ) transaction_SUB, 
                            item, 
                            (
                                SELECT 
                                    inventoryNumber.ID AS ID, 
                                    inventoryNumber.ID AS id_join, 
                                    inventoryNumber.inventorynumber AS inventorynumber_0, 
                                    InventoryNumberInventoryBalance_SUB.LOCATION AS location_0, 
                                    InventoryNumberInventoryBalance_SUB.binnumber AS binnumber_0, 
                                    InventoryNumberInventoryBalance_SUB.inventorystatus AS inventorystatus_0, 
                                    InventoryNumberInventoryBalance_SUB.name AS name_0, 
                                    InventoryNumberInventoryBalance_SUB.quantityavailable_crit AS quantityavailable_crit_0, 
                                    InventoryNumberInventoryBalance_SUB.quantityonhand_crit AS quantityonhand_crit_0,
                                    inventoryNumber.custitemnumber_jj_serial_num_diamond_pieces AS diamond_pieces
                                FROM 
                                    inventoryNumber, 
                                    (
                                        SELECT 
                                            InventoryNumberInventoryBalance.inventorynumber AS inventorynumber, 
                                            InventoryNumberInventoryBalance.inventorynumber AS inventorynumber_join, 
                                            InventoryNumberInventoryBalance.LOCATION AS LOCATION, 
                                            InventoryNumberInventoryBalance.binnumber AS binnumber, 
                                            InventoryNumberInventoryBalance.inventorystatus AS inventorystatus, 
                                            inventoryStatus.name AS name, 
                                            InventoryNumberInventoryBalance.quantityavailable AS quantityavailable_crit, 
                                            InventoryNumberInventoryBalance.quantityonhand AS quantityonhand_crit
                                        FROM 
                                            InventoryNumberInventoryBalance, 
                                            inventoryStatus
                                        WHERE 
                                            InventoryNumberInventoryBalance.inventorystatus = inventoryStatus.ID(+)
                                    ) InventoryNumberInventoryBalance_SUB
                                WHERE 
                                    inventoryNumber.ID = InventoryNumberInventoryBalance_SUB.inventorynumber(+)
                            ) inventoryNumber_SUB, 
                            (
                                SELECT 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_serial_number AS custrecord_jj_fsc_serial_number, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_serial_number AS custrecord_jj_fsc_serial_number_join, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item AS custrecord_jj_fsc_item, 
                                    item_0.itemid AS itemid, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_quantity AS custrecord_jj_fsc_quantity, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_pieces_value AS custrecord_jj_fsc_pieces_value, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item_units AS custrecord_jj_fsc_item_units, 
                                    unitsTypeUom.unitname AS unitname, 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.isinactive AS isinactive
                                FROM 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS, 
                                    item item_0, 
                                    unitsTypeUom
                                WHERE 
                                    CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item = item_0.ID(+)
                                    AND CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS.custrecord_jj_fsc_item_units = unitsTypeUom.internalid(+)
                            ) CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB,
                            (
                                SELECT 
                                    customrecord_jj_sub_category.ID AS ID,
                                    customrecord_jj_sub_category.ID AS id_join,
                                    customrecord_jj_sub_category.custrecord_jj_sub_cate_types AS custrecord_jj_sub_cate_types,
                                    BUILTIN.DF(customrecord_jj_sub_category.custrecord_jj_sub_cate_types) AS subcategory_type_name
                                FROM 
                                    customrecord_jj_sub_category
                            ) fg_subcategory_SUB,
                            (
                                SELECT 
                                    salesOrder.ID AS ID,
                                    salesOrder.ID AS id_join,
                                    salesOrder.custbody_jj_customer_shop_code AS custbody_jj_customer_shop_code
                                FROM 
                                    salesOrder
                            ) salesOrder_SUB
                        WHERE 
                            (
                                (
                                    (
                                        (
                                            CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_build = transaction_SUB.ID(+) 
                                            AND CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item = item.ID(+)
                                        ) AND CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial = inventoryNumber_SUB.ID(+)
                                    ) AND CUSTOMRECORD_JJ_FG_SERIALS.ID = CUSTOMRECORD_JJ_FG_SERIAL_COMPONENTS_SUB.custrecord_jj_fsc_serial_number(+)
                                ) AND CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fg_subcategory = fg_subcategory_SUB.ID(+)
                            ) AND CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_related_so = salesOrder_SUB.ID(+) AND (
                                (
                                    NVL(CUSTOMRECORD_JJ_FG_SERIALS.isinactive, 'F') = 'F' 
                                    AND inventoryNumber_SUB.quantityavailable_crit_0 > 0 
                                    AND inventoryNumber_SUB.quantityonhand_crit_0 > 0
                                    AND NOT(CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_assembly_item IS NULL)
                                    AND NVL(transaction_SUB.isinactive_crit_0, 'F') = 'F'
                                    ${fromBinId ? `AND inventoryNumber_SUB.binnumber_0 = ${fromBinId}` : ''}
                                )
                            )
                        ORDER BY CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial DESC
                        `;

                    let formattedResults = [];
                    // Temporary map for grouping by FG Serial ID
                    let tempMap = {};

                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    let resultIterator = results.iterator();
                    // Simulated result parsing logic (you would replace this with your query parsing logic)
                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;
                            let fgSerialId = rowData[0];

                            // If FG Serial ID does not exist in the map, initialize it
                            if (!tempMap[fgSerialId]) {
                                tempMap[fgSerialId] = {
                                    fg_serial_id: rowData[0],                                       // Finished Goods Serial ID
                                    assembly_build_id: rowData[1],                                  // Assembly Build ID
                                    assembly_build_name: rowData[2],                                // Assembly Build Name
                                    assembly_item_id: rowData[3],                                   // Assembly Item ID
                                    assembly_item_name: rowData[4],                                 // Assembly Item Name
                                    serial_number_id: rowData[5],                                   // Serial ID
                                    serial_number_name: rowData[6],                                 // Serial Name
                                    location_id: rowData[7],                                        // Location ID
                                    bin_id: rowData[8],                                             // Bin ID (included for client-side filtering)
                                    status_id: rowData[9],                                          // Inventory Status ID
                                    status_name: rowData[10],                                       // Inventory Status Name
                                    gold_weight: Number(parseFloat(rowData[11]).toFixed(4)),        // Gold Weight
                                    diamond_weight: Number(parseFloat(rowData[12]).toFixed(4)),     // Diamond Weight
                                    color_stone_weight: Number(parseFloat(rowData[13]).toFixed(4)), // Clear Stone Weight
                                    gross_weight: Number(parseFloat(rowData[14]).toFixed(4)),       // Gross Weight
                                    componentDetails: [],                                           // Array to store multiple components
                                    bag_no_id: rowData[22],                                         // Bag Number ID
                                    bag_no_name: rowData[23],                                       // Bag Number Name
                                    bag_core_tracking: rowData[24],                                 // Bag Core Tracking
                                    metal_quality_name: rowData[26],                                // Metal Quality Name
                                    stone_color_name: rowData[28],                                  // Stone Color Name
                                    subcategory_id: rowData[29],                                    // Subcategory ID
                                    subcategory_type_id: rowData[30],                               // Subcategory Type ID
                                    subcategory_type_name: rowData[31],                             // Subcategory Type Name
                                    subcategory_name: rowData[32],                                  // Subcategory Name
                                    category_id: rowData[33],                                       // Category ID
                                    category_name: rowData[34],                                     // Category Name
                                    shop_code: rowData[35],                                          // Shop Code from Sales Order
                                    dia_pieces: rowData[36],                                          // Diamond Pieces from Inventory Number record
                                };
                            }

                            if (rowData[21] != 'T') { // Is Component Inactive
                                // Add the component information to the componentDetails array of the FG Serial
                                tempMap[fgSerialId].componentDetails.push({
                                    item_id: rowData[15],                                        // Component Item ID
                                    item_name: rowData[16],                                      // Component Item Name
                                    quantity: Number(parseFloat(rowData[17]).toFixed(4)),        // Component Quantity
                                    actual_pieces_info: parseInt(rowData[18]),                   // Actual Pieces Info
                                    uom_id: rowData[19],                                         // Unit of Measure ID
                                    uom_name: rowData[20],                                       // Unit of Measure Name
                                });
                            }
                            return true;
                        });
                        return true;
                    });

                    // Convert the temporary map to an array
                    formattedResults = Object.values(tempMap);

                    formattedResults.sort((a, b) => {
                        if (a.serial_number_name < b.serial_number_name) return 1;
                        if (a.serial_number_name > b.serial_number_name) return -1;
                        return 0;
                    });

                    log.debug('Formatted Results with Grouped Components', formattedResults);
                    return { status: 'SUCCESS', reason: 'Result Found', data: formattedResults };
                } catch (error) {
                    log.error('error @ listFGSerialForLocationTransfer', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            // listSalesOrders() {
            //     try {
            //         let salesorderSearchObj = search.create({
            //             type: "salesorder",
            //             settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            //             filters: [
            //                 ["type", "anyof", "SalesOrd"],
            //                 "AND", ["status", "noneof", "SalesOrd:H", "SalesOrd:C", "SalesOrd:G"],
            //                 "AND", ["location.isinactive", "is", "F"],
            //                 "AND", ["location.usesbins", "is", "T"],
            //                 "AND", ["custbody_jj_order_type", "anyof", STOCK_ORDER_ID],
            //                 "AND", ["mainline", "is", "T"],
            //                 "AND", ["taxline", "is", "F"],
            //                 "AND", ["cogs", "is", "F"],
            //                 "AND", ["location", "noneof", "@NONE@"]
            //             ],
            //             columns: [
            //                 search.createColumn({ name: "internalid", label: "internalid" }),
            //                 search.createColumn({ name: "tranid", label: "document_number" }),
            //                 search.createColumn({ name: "location", label: "location" })
            //             ]
            //         });

            //         let searchResult = jjUtil.dataSets.iterateSavedSearch({
            //             searchObj: salesorderSearchObj,
            //             columns: jjUtil.dataSets.fetchSavedSearchColumn(salesorderSearchObj, 'label'),
            //             PAGE_INDEX: null,
            //             PAGE_SIZE: 1000
            //         });

            //         log.debug("searchResult", searchResult);

            //         let formattedResults = searchResult.map(result => ({
            //             salesOrder: { value: result.internalid?.value, text: result.document_number?.value },
            //             location: result.location
            //         }));

            //         log.debug("formattedResults", formattedResults);
            //         return { status: 'SUCCESS', reason: 'Result Found', data: formattedResults };
            //     } catch (error) {
            //         log.error('error @ listSalesOrders', error.message);
            //         return { status: 'ERROR', reason: error.message, data: [] };
            //     }
            // },

            getWorkOrderofBag(bagId) {
                try {
                    log.debug("bagId", bagId);
                    log.debug("bagId type", typeof bagId);
                    let getWorkOrderofBagSearch = search.create({
                        type: "customrecord_jj_bag_generation",
                        filters:
                            [
                                ["idtext", "is", bagId]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "Internal ID" }),
                                search.createColumn({ name: "custrecord_jj_baggen_time", label: "Date" }),
                                search.createColumn({ name: "name", label: "ID" }),
                                search.createColumn({
                                    name: "custrecord_jj_bagcore_wo",
                                    join: "CUSTRECORD_JJ_BAGGEN_BAGCORE",
                                    label: "Work Order"
                                }),
                            ]
                    });
                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: getWorkOrderofBagSearch,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(getWorkOrderofBagSearch, 'name'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    log.debug("searchResult", searchResult);
                    return searchResult[0]?.custrecord_jj_bagcore_wo?.text.split("#")[1] || '';
                } catch (error) {
                    log.error('error @ getWorkOrderofBag', error.message);
                    return []
                }


            },

            getWaxTreeCountForLoad(loadId) {
                try {
                    let customrecord_jj_wax_treeSearchObj = search.create({
                        type: "customrecord_jj_wax_tree",
                        filters: [
                            ["custrecord_jj_load_list", "anyof", loadId],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "Internal ID" })
                        ]
                    });
                    return customrecord_jj_wax_treeSearchObj.runPaged().count;

                } catch (error) {
                    log.error('error @ getTodaysLatestWaxTree', error.message);
                    return []
                }
            },

            getTodaysLatestWaxTree() {
                try {
                    let latestName = "";
                    let customrecord_jj_wax_treeSearchObj = search.create({
                        type: "customrecord_jj_wax_tree",
                        filters: [
                            ["created", "on", "today"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "Internal ID" }),
                            search.createColumn({ name: "altname", label: "Name" })
                        ]
                    });

                    customrecord_jj_wax_treeSearchObj.run().each(function (result) {
                        latestName = result.getValue({ name: "altname" });
                        return false;
                    });
                    return latestName;
                } catch (error) {
                    log.error('error @ getTodaysLatestWaxTree', error.message);
                    return "";
                }
            },

            /**  
             * Retrieves today's wax trees from the custom record, filtered by specific criteria.  
             *   
             * @returns {Array<Object>} An object containing the status, reason, and data (Wax Tree casting loss details).
             */
            getTodaysWaxTreeLoss(locations) {
                try {
                    // // Create the search object for the custom record type 'customrecord_jj_wax_tree'  
                    // let waxTreeSearchObj = search.create({
                    //     type: "customrecord_jj_wax_tree",
                    //     filters: [
                    //         ["isinactive", "is", "F"],
                    //         "AND", ["custrecord_jj_casting_loss", "isnotempty", ""],
                    //         "AND", ["formulanumeric: CASE WHEN NVL({custrecord_jj_casting_loss}, 0) != NVL({custrecord_jj_scrap_recovered}, 0) THEN 1 ELSE 0 END", "equalto", "1"],
                    //         "AND", ["custrecord_jj_to_cutting_date", "within", "today"]
                    //     ],
                    //     columns: [
                    //         search.createColumn({ name: "internalid", label: "Internal ID" }),
                    //         search.createColumn({ name: "altname", label: "Name" }),
                    //         search.createColumn({ name: "name", label: "ID" }),
                    //         search.createColumn({ name: "custrecord_jj_metal_list", label: "Metal" }),
                    //         search.createColumn({ name: "custrecord_jj_used_lot", label: "Lot" }),
                    //         search.createColumn({ name: "custrecord_jj_casting_loss", label: "Casting Loss" }),
                    //         search.createColumn({ name: "custrecord_jj_scrap_recovered", label: "Scrap Recovered" }),
                    //         search.createColumn({ name: "formulanumeric", formula: "NVL({custrecord_jj_casting_loss}, 0) - NVL({custrecord_jj_scrap_recovered}, 0)", label: "Formula (Numeric)" }),
                    //         search.createColumn({ name: "parent", join: "CUSTRECORD_JJ_METAL_LIST", label: "Parent" })
                    //     ]
                    // });

                    // // Initialize an array to hold wax tree details  
                    // let waxTrees = [];

                    // // Run the search and process each result  
                    // waxTreeSearchObj.run().each(function (result) {
                    //     let itemName = result.getText({ name: "custrecord_jj_metal_list" });
                    //     let parentName = result.getText({ name: "parent", join: "CUSTRECORD_JJ_METAL_LIST" });
                    //     let formattedName = parentName ? itemName?.split(parentName + " : ")?.pop() : itemName;
                    //     // Create an object for the current result  
                    //     let waxTreeDetails = {
                    //         waxTreeInternalId: result.getValue({ name: "internalid" }),
                    //         waxTreeName: result.getValue({ name: "altname" }),
                    //         waxTreeId: result.getValue({ name: "name" }),
                    //         itemId: result.getValue({ name: "custrecord_jj_metal_list" }),
                    //         itemName: formattedName,
                    //         lotId: result.getValue({ name: "custrecord_jj_used_lot" }),
                    //         // CastingLoss: result.getValue({ name: "custrecord_jj_casting_loss" }),
                    //         scrapRecovered: result.getValue({ name: "custrecord_jj_scrap_recovered" }),
                    //         recoveredQty: "",
                    //         lossQty: Number(parseFloat(result.getValue({ name: "formulanumeric" }) || 0).toFixed(4))
                    //     };

                    //     // Push the current wax tree details to the array  
                    //     waxTrees.push(waxTreeDetails);
                    //     return true; // Continue to the next result  
                    // });

                    let sqlQuery = `SELECT
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_WAX_TREE.ID) AS ID,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_WAX_TREE.altname) AS altname,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_WAX_TREE.name) AS name,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_metal_list) AS custrecord_jj_metal_list,
                            BUILTIN_RESULT.TYPE_INTEGER(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_used_lot) AS custrecord_jj_used_lot,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_casting_loss) AS custrecord_jj_casting_loss,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_scrap_recovered) AS custrecord_jj_scrap_recovered,
                            BUILTIN_RESULT.TYPE_FLOAT(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_scrap_write_off) AS custrecord_jj_scrap_write_off,
                            BUILTIN_RESULT.TYPE_FLOAT(
                                NVL(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_casting_loss, 0) -
                                (NVL(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_scrap_recovered, 0) + NVL(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_scrap_write_off, 0))
                            ) AS loss_remaining,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.itemid) AS itemid,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.name_0) AS purity,
                            BUILTIN_RESULT.TYPE_INTEGER(item_SUB.metal_quality_id) AS metal_quality_id
                        FROM 
                            CUSTOMRECORD_JJ_WAX_TREE
                            LEFT JOIN CUSTOMRECORD_JJ_BAG_TREE_LOAD ON CUSTOMRECORD_JJ_WAX_TREE.CUSTRECORD_JJ_LOAD_LIST = CUSTOMRECORD_JJ_BAG_TREE_LOAD.ID
                            LEFT JOIN (
                                SELECT
                                    item.ID AS id_0,
                                    item.ID AS id_join,
                                    item.itemid AS itemid,
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.name AS name_0,
                                    item.custitem_jj_metal_quality AS metal_quality_id
                                FROM 
                                    item
                                    LEFT JOIN (
                                        SELECT
                                        CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS ID,
                                        CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS id_join,
                                        CUSTOMLIST_JJ_METAL_PURITY_LIST.name AS name
                                        FROM 
                                            CUSTOMRECORD_JJ_DD_METAL_QUALITY
                                            LEFT JOIN CUSTOMLIST_JJ_METAL_PURITY_LIST ON CUSTOMRECORD_JJ_DD_METAL_QUALITY.custrecord_jj_dd_metal_quality_purity = CUSTOMLIST_JJ_METAL_PURITY_LIST.ID
                                    ) CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB
                                        ON item.custitem_jj_metal_quality = CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.ID
                            ) item_SUB
                            ON CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_metal_list = item_SUB.id_0
                        WHERE
                            CUSTOMRECORD_JJ_BAG_TREE_LOAD.custrecord_jj_bag_tree_location IN (${locations})
                            AND NVL(CUSTOMRECORD_JJ_WAX_TREE.isinactive, 'F') = 'F'
                            AND CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_casting_loss IS NOT NULL
                            -- AND CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_to_cutting_date BETWEEN BUILTIN.RELATIVE_RANGES('TODAY', 'START', 'DATETIME_AS_DATE')
                            -- AND BUILTIN.RELATIVE_RANGES('TODAY', 'END', 'DATETIME_AS_DATE')
                            AND CASE WHEN
                                    ROUND(NVL(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_scrap_recovered, 0) + NVL(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_scrap_write_off, 0), 6)
                                    < ROUND(NVL(CUSTOMRECORD_JJ_WAX_TREE.custrecord_jj_casting_loss, 0), 6) THEN 1 ELSE 0 END IN ('1')
                    `;

                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    let resultIterator = results.iterator();
                    // Simulated result parsing logic (you would replace this with your query parsing logic)
                    let waxTrees = [];

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;

                            let waxTreeDetails = {
                                waxTreeInternalId: rowData[0],  // ID
                                waxTreeName: rowData[1],        // altname
                                waxTreeId: rowData[2],          // name
                                itemId: rowData[3],             // custrecord_jj_metal_list
                                itemName: rowData[9],           // itemid (already clean)
                                lotId: rowData[4],              // custrecord_jj_used_lot
                                scrapRecovered: rowData[6],     // custrecord_jj_scrap_recovered
                                scrapWriteOff: rowData[7],      // custrecord_jj_scrap_write_off
                                recoveredQty: 0,               // to be filled in gold recovery
                                writeOffQty: 0,                // to be filled in gold write off
                                lossQty: Number(parseFloat(rowData[8] || 0).toFixed(4)), // Remaining Loss
                                purity: Number((Number(rowData[10] || 0) / 100).toFixed(4)),             // purity
                                pureWeight: Number((Number(rowData[8] || 0) * (Number(rowData[10] || 0) / 100)).toFixed(4)), // Pure Weight Calculation
                                metalQualityId: rowData[11]    // custitem_jj_metal_quality
                            };

                            waxTrees.push(waxTreeDetails);
                            return true;
                        });
                        return true;
                    });

                    return { status: 'SUCCESS', reason: 'Result Found', data: waxTrees };


                } catch (error) {
                    // Log any error that occurs during the execution  
                    log.error('Error @ getTodaysWaxTreeLoss', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            checkRepairOrder(departmentId, employeeId, bagId, bagCoreTrackingId, bagList) {
                try {
                    // If bagList is provided, process multiple bags (batch mode - for page load)
                    if (bagList && Array.isArray(bagList) && bagList.length > 0) {
                        let repairOrderMap = {};

                        // Extract all bag IDs and core tracking IDs
                        let bagIds = [];
                        let bagCoreIds = [];

                        bagList.forEach(bag => {
                            if (bag.bag_id) bagIds.push(bag.bag_id);
                            if (bag.bag_core_tracking_id) bagCoreIds.push(bag.bag_core_tracking_id);
                        });

                        // Single search to get all COMPLETED operations for this department
                        // Only count operations that have an exit date (meaning they completed in this department)
                        let operationsSearchObj = search.create({
                            type: "customrecord_jj_operations",
                            filters: [
                                ["isinactive", "is", "F"],
                                "AND",
                                ["custrecord_jj_oprtns_department", "anyof", departmentId],
                                "AND",
                                // Only include operations with an exit date (completed)
                                ["custrecord_jj_oprtns_exit", "isnotempty", ""],
                                "AND",
                                [["custrecord_jj_oprtns_bagcore", "anyof", bagCoreIds], "OR", ["custrecord_jj_oprtns_bagno", "anyof", bagIds]]
                            ],
                            columns: [
                                search.createColumn({ name: "internalid", label: "Internal ID" }),
                                search.createColumn({ name: "custrecord_jj_oprtns_bagcore", label: "Bag Core Tracking" }),
                                search.createColumn({ name: "custrecord_jj_oprtns_bagno", label: "Bag Name/Number" })
                            ]
                        });

                        // Build a map of bag IDs that have been COMPLETED in this department
                        let processedBagIds = new Set();
                        operationsSearchObj.run().each(function (result) {
                            let bagIdInResult = result.getValue({ name: "custrecord_jj_oprtns_bagno" });
                            if (bagIdInResult) {
                                processedBagIds.add(bagIdInResult);
                            }
                            return true;
                        });

                        // Map repair order status for each bag
                        // Only mark as repair if bag was PREVIOUSLY processed and completed in this department
                        bagList.forEach(bag => {
                            repairOrderMap[bag.bag_id] = processedBagIds.has(bag.bag_id);
                        });

                        return { status: 'SUCCESS', reason: 'Batch repair order check completed', data: { repair_order_map: repairOrderMap } };
                    }

                    // DEPRECATED: Employee-based repair order check - no longer needed
                    // Keeping department-based auto-check (Search 1) for backward compatibility
                    // 
                    // let operationsSearchObj = search.create({
                    //     type: "customrecord_jj_operations",
                    //     filters: [
                    //         ["isinactive", "is", "F"],
                    //         "AND",
                    //         ["custrecord_jj_oprtns_department", "anyof", departmentId],
                    //         "AND",
                    //         ["custrecord_jj_oprtns_employee", "anyof", employeeId],
                    //         "AND",
                    //         [["custrecord_jj_oprtns_bagcore", "anyof", bagCoreTrackingId], "OR", ["custrecord_jj_oprtns_bagno", "anyof", bagId]]
                    //     ],
                    //     columns: [
                    //         search.createColumn({ name: "internalid", label: "Internal ID" }),
                    //         search.createColumn({ name: "custrecord_jj_oprtns_bagcore", label: "Bag Core Tracking" }),
                    //         search.createColumn({ name: "custrecord_jj_oprtns_bagno", label: "Bag Name/Number" }),
                    //         search.createColumn({ name: "custrecord_jj_oprtns_employee", label: "Employee" })
                    //     ]
                    // });
                    // let searchResultCount = operationsSearchObj.runPaged().count;
                    // log.debug("operationsSearchObj result count", searchResultCount);
                    // let sameBagInOperation = false;
                    // operationsSearchObj.run().each(function (result) {
                    //     let bagIdInResult = result.getValue({ name: "custrecord_jj_oprtns_bagno" });
                    //     if (bagIdInResult == bagId) {
                    //         sameBagInOperation = true;
                    //         return false;
                    //     }
                    //     return true;
                    // });
                    //
                    // if (sameBagInOperation) {
                    //     return { status: 'SUCCESS', reason: 'Its a Repair Order', data: { repair_order: true } };
                    // } else if (searchResultCount > 0) {
                    //     return { status: 'SUCCESS', reason: 'Some Related bag is already proccessed by the employee.', data: { repair_order: false } };
                    // } else {
                    //     return { status: 'SUCCESS', reason: 'No related bags found with the employee.', data: { repair_order: false } };
                    // }

                    // Return default response - employee-based check disabled (no toast message)
                    return { status: 'SUCCESS', data: { repair_order: false } };
                } catch (error) {
                    log.error('error @ checkRepairOrder', error.message);
                    return { status: 'ERROR', reason: error.message, data: {} };
                }
            },

            /**
             * Get the list of assembly items
             * @returns {Object} - The list of assembly items
             */
            listAssemblyItems() {
                try {
                    let assemblyitemSearchObj = search.create({
                        type: "assemblyitem",
                        filters: [
                            ["type", "anyof", "Assembly"],
                            "AND", ["isinactive", "is", "F"],
                            "AND", ["isserialitem", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({ name: "itemid", label: "name" }),
                            search.createColumn({ name: "internalid", label: "internal_id" })
                        ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: assemblyitemSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(assemblyitemSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    let assemblyItemArrayObj = searchResult.map(result => ({
                        value: result.internal_id?.value,
                        text: result.name?.value
                    }));

                    return { status: 'SUCCESS', reason: 'Result Found', data: assemblyItemArrayObj };
                } catch (e) {
                    log.error("Error in listAssemblyItems", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listSerialLots(itemId) {
                try {
                    let assemblybuildSearchObj = search.create({
                        type: "assemblybuild",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters: [
                            ["type", "anyof", "Build"],
                            "AND", ["mainline", "is", "T"],
                            "AND", ["item", "anyof", itemId]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "build_id" }),
                            search.createColumn({ name: "tranid", label: "build_name" }),
                            search.createColumn({ name: "serialnumbers", label: "build_serial_number" }),
                            search.createColumn({ name: "custrecord_jj_fgs_serial", join: "CUSTRECORD_JJ_FGS_ASSEMBLY_BUILD", label: "fg_serial_number" }),
                            search.createColumn({ name: "quantity", label: "build_quantity" }),
                            search.createColumn({ name: "createdfrom", label: "work_order" }),
                            search.createColumn({ name: "internalid", join: "bomRevision", label: "bom_revision_id" }),
                            search.createColumn({ name: "custbody_jj_from_so", join: "createdFrom", label: "sales_order" }),
                            // search.createColumn({
                            //     name: "formulatext",
                            //     formula: "CASE WHEN {custrecord_jj_fgs_assembly_build.isinactive} = 'T' THEN NULL ELSE {custrecord_jj_fgs_assembly_build.custrecord_jj_fgs_serial} END",
                            //     label: "fg_serial_number_text"
                            // }),
                        ]
                    });
                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: assemblybuildSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(assemblybuildSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    let groupedData = {};

                    // Grouping by build_id
                    searchResult.forEach(item => {
                        const buildId = item.build_id.value;
                        const buildName = item.build_name.value;
                        const serialNumbers = item.build_serial_number?.value
                            ? item.build_serial_number.value.split("\n").filter(Boolean) // Ensure valid array
                            : [];
                        const fgSerialNumber = item.fg_serial_number.text ? item.fg_serial_number.text : null;
                        // const fgSerialNumber = item.fg_serial_number_text.value ? item.fg_serial_number_text.value : null;
                        const workOrderName = item.work_order?.text ? item.work_order.text.split("#")?.pop() : null;
                        const workOrderId = item.work_order?.value ? item.work_order.value : null;
                        const buildQuantity = item.build_quantity.value;
                        const bomRevisionId = item.bom_revision_id.value;
                        const salesOrderName = item.sales_order?.text ? item.sales_order.text.split("#")?.pop() : null;
                        const salesOrderId = item.sales_order?.value ? item.sales_order.value : null;

                        if (!groupedData[buildId]) {
                            groupedData[buildId] = {
                                build_id: buildId,
                                build_name: buildName,
                                work_order_name: workOrderName,
                                work_order_id: workOrderId,
                                build_quantity: buildQuantity,
                                bom_revision_id: bomRevisionId,
                                build_serial_number: new Set(serialNumbers),
                                sales_order_name: salesOrderName,
                                sales_order_id: salesOrderId
                            };
                        }

                        // Remove fg_serial_number if it exists in build_serial_number
                        if (fgSerialNumber && groupedData[buildId].build_serial_number.has(fgSerialNumber)) {
                            groupedData[buildId].build_serial_number.delete(fgSerialNumber);
                        }
                    });

                    // Flatten the list to include build_id in each object
                    let flattenedList = [];
                    Object.entries(groupedData).forEach(([buildId, data]) => {
                        let remainingCount = data.build_serial_number ? data.build_serial_number.size : 0;
                        // log.debug("remainingCount", remainingCount);
                        if (data.build_serial_number) {
                            [...data.build_serial_number].forEach(serial => {
                                flattenedList.push({
                                    build_id: buildId,
                                    build_name: data.build_name,
                                    work_order_name: data.work_order_name,
                                    work_order_id: data.work_order_id,
                                    build_quantity: data.build_quantity,
                                    bom_revision_id: data.bom_revision_id,
                                    build_serial_number: serial,
                                    remaining: remainingCount,
                                    sales_order_name: data.sales_order_name,
                                    sales_order_id: data.sales_order_id
                                });
                            });
                        }
                    });

                    return { status: 'SUCCESS', reason: 'Result Found', data: flattenedList };
                } catch (e) {
                    log.error("Error in listSerialLots", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            getDepartmentIssues(bagCoreMaterialId) {
                try {

                    let departmentIssuesSearchObj = search.create({
                        type: "customrecord_jj_direct_issue_return",
                        filters:
                            [
                                ["isinactive", "is", "F"],
                                "AND",
                                ["custrecord_jj_bag_core_material_record", "anyof", bagCoreMaterialId],
                                "AND",
                                ["custrecord_jj_operations.isinactive", "is", "F"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "custrecord_jj_operations", label: "Operations" }),
                                search.createColumn({ name: "custrecord_jj_oprtns_department", join: "CUSTRECORD_JJ_OPERATIONS", label: "department" }),
                                search.createColumn({ name: "custrecord_jj_component", label: "component" }),
                                search.createColumn({ name: "custrecord_jj_bag_core_material_record", label: "bag_core_material" }),
                                search.createColumn({ name: "custrecord_jj_metal_actual_quantity", label: "actual_qty" }),
                                search.createColumn({ name: "custrecord_jj_issued_quantity", label: "issued_qty" }),
                                search.createColumn({ name: "custrecord_jj_dir_loss_quantity", label: "loss_qty" }),
                                search.createColumn({ name: "custrecord_jj_additional_quantity", label: "balance_qty" }),

                                search.createColumn({ name: "custrecord_jj_dir_actual_pieces", label: "actual_pcs" }),
                                search.createColumn({ name: "custrecord_jj_dir_issued_pieces", label: "issued_pcs" }),
                                search.createColumn({ name: "custrecord_jj_dir_loss_pieces", label: "loss_pcs" }),
                                search.createColumn({ name: "custrecord_jj_dir_balance_pieces", label: "balance_pcs" }),
                                search.createColumn({ name: "custrecord_jj_dir_actual_pieces_info", label: "actual_pcs_info" }),
                                search.createColumn({ name: "custrecord_jj_dir_issued_pieces_info", label: "issued_pcs_info" }),
                                search.createColumn({ name: "custrecord_jj_dir_loss_pieces_info", label: "loss_pcs_info" }),
                                search.createColumn({ name: "custrecord_jj_dir_balance_pieces_info", label: "balance_pcs_info" }),

                                search.createColumn({ name: "isserialitem", join: "CUSTRECORD_JJ_COMPONENT", label: "is_serialized" }),
                                search.createColumn({ name: "class", join: "CUSTRECORD_JJ_COMPONENT", label: "class" }),
                                search.createColumn({ name: "custrecord_jj_dir_starting_qty", label: "starting_qty" }),
                                search.createColumn({ name: "custrecord_jj_dir_starting_pcs_info", label: "starting_pcs_info" }),
                                search.createColumn({ name: "custrecord_jj_scrap_quantity", label: "scrap_quantity" }),
                                search.createColumn({ name: "custrecord_jj_dir_scrap_pieces_info", label: "scrap_pieces_info" }),
                            ]
                    });
                    let searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: departmentIssuesSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(departmentIssuesSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    // Initialize an object to store summed data by department
                    let departmentSummary = {};

                    // Process each result
                    searchResults.forEach(result => {

                        let departmentId = result.department?.value
                        let departmentName = result.department?.text;

                        // Get quantity and piece values
                        let startingQty = parseFloat(result.starting_qty?.value) || 0;
                        let issuedQty = parseFloat(result.issued_qty?.value) || 0;
                        let lossQty = parseFloat(result.loss_qty?.value) || 0;
                        let balanceQty = parseFloat(result.balance_qty?.value) || 0;
                        let scrapQty = parseFloat(result.scrap_quantity?.value) || 0;
                        let receivedQty = parseFloat((startingQty + issuedQty) - (lossQty + balanceQty + scrapQty)) || 0;

                        let issuedPcs = parseFloat(result.issued_pcs?.value) || 0;
                        let lossPcs = parseFloat(result.loss_pcs?.value) || 0;
                        let balancePcs = parseFloat(result.balance_pcs?.value) || 0;
                        let receivedPcs = parseFloat(issuedPcs - lossPcs - balancePcs) || 0;

                        let startingPcsInfo = parseFloat(result.starting_pcs_info?.value) || 0;
                        let issuedPcsInfo = parseFloat(result.issued_pcs_info?.value) || 0;
                        let lossPcsInfo = parseFloat(result.loss_pcs_info?.value) || 0;
                        let balancePcsInfo = parseFloat(result.balance_pcs_info?.value) || 0;
                        let scrapPcsInfo = parseFloat(result.scrap_pieces_info?.value) || 0;
                        let receivedPcsInfo = parseFloat((startingPcsInfo + issuedPcsInfo) - (lossPcsInfo + balancePcsInfo + scrapPcsInfo)) || 0;

                        let isSerialized = result.is_serialized?.value;
                        // let classId = result.class?.value;

                        if (isSerialized) {
                            issuedPcs = issuedQty;
                            lossPcs = lossQty;
                            balancePcs = balanceQty;
                            receivedPcs = receivedQty;
                        }
                        else {
                            issuedPcs = issuedPcsInfo;
                            lossPcs = lossPcsInfo;
                            balancePcs = balancePcsInfo;
                            receivedPcs = receivedPcsInfo;
                        }

                        // If department already exists in the summary, sum the values
                        if (!departmentSummary[departmentId]) {
                            departmentSummary[departmentId] = {
                                departmentName: departmentName,
                                totalIssuedQty: 0,
                                totalLossQty: 0,
                                totalBalanceQty: 0,
                                totalReceivedQty: 0,
                                totalIssuedPcs: 0,
                                totalLossPcs: 0,
                                totalBalancePcs: 0,
                                totalReceivedPcs: 0,
                            };
                        }

                        // Summing up values for each department
                        departmentSummary[departmentId].totalIssuedQty += issuedQty;
                        departmentSummary[departmentId].totalLossQty += lossQty;
                        departmentSummary[departmentId].totalBalanceQty += balanceQty;
                        departmentSummary[departmentId].totalReceivedQty += receivedQty;

                        departmentSummary[departmentId].totalIssuedPcs += issuedPcs;
                        departmentSummary[departmentId].totalLossPcs += lossPcs;
                        departmentSummary[departmentId].totalBalancePcs += balancePcs;
                        departmentSummary[departmentId].totalReceivedPcs += receivedPcs;
                    });

                    // Convert the department summary to an array for the response
                    let departmentIssuesArrayObj = Object.keys(departmentSummary).map(department => {
                        return {
                            departmentId: department,
                            departmentName: departmentSummary[department].departmentName,
                            totalIssuedQty: parseFloat(departmentSummary[department].totalIssuedQty).toFixed(4),
                            totalLossQty: parseFloat(departmentSummary[department].totalLossQty).toFixed(4),
                            totalBalanceQty: parseFloat(departmentSummary[department].totalBalanceQty).toFixed(4),
                            totalReceivedQty: parseFloat(departmentSummary[department].totalReceivedQty).toFixed(4),
                            totalIssuedPcs: parseFloat(departmentSummary[department].totalIssuedPcs).toFixed(4),
                            totalLossPcs: parseFloat(departmentSummary[department].totalLossPcs).toFixed(4),
                            totalBalancePcs: parseFloat(departmentSummary[department].totalBalancePcs).toFixed(4),
                            totalReceivedPcs: parseFloat(departmentSummary[department].totalReceivedPcs).toFixed(4),
                        };
                    });
                    log.debug("departmentIssuesArrayObj", departmentIssuesArrayObj);
                    return { status: 'SUCCESS', reason: 'Result Found', data: departmentIssuesArrayObj };
                } catch (e) {
                    log.error("Error in getDepartmentIssues", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listBuildComponents(buildId) {
                try {
                    let assemblybuildSearchObj = search.create({
                        type: "assemblybuild",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters: [
                            ["type", "anyof", "Build"],
                            "AND", ["internalid", "anyof", buildId],
                            // "AND", ["mainline", "is", "F"],
                            "AND", ["mainline", "any", ""],
                            "AND", ["cogs", "is", "F"],
                            "AND", ["taxline", "is", "F"],
                            "AND", ["item.type", "noneof", "OthCharge", "Service"]
                        ],
                        columns: [
                            search.createColumn({ name: "line", label: "line_id" }),
                            search.createColumn({ name: "item", label: "item" }),
                            search.createColumn({ name: "quantity", label: "quantity" }),
                            search.createColumn({ name: "isserialitem", join: "item", label: "is_serialized" }),
                            search.createColumn({ name: "class", join: "item", label: "class" }),
                            search.createColumn({ name: "unit", label: "units_name" }),
                            search.createColumn({ name: "custitem_jj_stone_quality_group", join: "item", label: "stone_quality_group" }),
                            search.createColumn({ name: "unitid", label: "unit_id" }),
                            search.createColumn({ name: "inventorynumber", join: "inventoryDetail", label: "inventory_number" }),
                            search.createColumn({ name: "quantity", join: "inventoryDetail", label: "inventory_quantity" }),
                            search.createColumn({ name: "cseg_jj_raw_type", join: "account", label: "material_type" }),
                            search.createColumn({ name: "parent", join: "item", label: "parent" }),
                            search.createColumn({ name: "createdfrom", label: "work_order" }),
                            search.createColumn({ name: "tranid", label: "build_name" }),
                            search.createColumn({ name: "internalid", join: "bomRevision", label: "bom_revision_id" }),
                            search.createColumn({ name: "custbody_jj_wo_ring_size", label: "ring_size" }),
                            search.createColumn({ name: "custbody_jj_customer_shop_code", label: "shop_code" }),
                            search.createColumn({ name: "custbody_jj_from_so", join: "createdFrom", label: "sales_order" }),
                            search.createColumn({ name: "custitem_jj_metal_color", join: "item", label: "metal_color" }),
                            search.createColumn({ name: "custitem_jj_metal_purity_percent", join: "item", label: "purity" }),

                            search.createColumn({ name: "custitem_jj_metal_quality", join: "item", label: "metal_quality" }),
                            search.createColumn({ name: "custitem_jj_stone_color", join: "item", label: "stone_color" }),
                            search.createColumn({ name: "custitem_jj_stone_quality", join: "item", label: "stone_quality" }),
                            search.createColumn({ name: "custitem_jj_colorstonecolour", join: "item", label: "color_stone_colour" }),
                            search.createColumn({ name: "custitem_jj_color_stone_shape", join: "item", label: "color_stone_shape" }),
                            search.createColumn({ name: "entity", join: "createdFrom", label: "customer" }),
                            search.createColumn({ name: "custbody_jj_pieces_tracking_json", label: "pieces_json" }),
                        ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: assemblybuildSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(assemblybuildSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    let groupedResults = {};
                    let commonDetails = {};
                    let qualityIdSet = new Set();

                    searchResult.forEach(result => {
                        if (result.metal_quality?.value) {
                            qualityIdSet.add(result.metal_quality.value);
                        }
                    });

                    const purityMap = this.getMetalQualityPurityMap([...qualityIdSet]);

                    searchResult.forEach(result => {
                        let lineId = result.line_id?.value; // Unique key

                        if (lineId == 0) { // assembly item
                            if (!commonDetails[lineId]) {
                                commonDetails[lineId] = {
                                    line_id: lineId,
                                    item: { value: result.item?.value, text: result.parent?.text ? result.item?.text?.replace(result.parent?.text + " : ", "") : result.item?.text },
                                    workOrder: { value: result.work_order?.value, text: result.work_order?.text?.split("#").pop() },
                                    build: { value: buildId, text: result.build_name?.value },
                                    quantity: { value: Math.abs(Number(result.quantity.value || 0)) },
                                    bomRevisionId: result.bom_revision_id?.value,
                                    ringSize: result.ring_size?.value || '',
                                    salesOrderId: result.sales_order?.value,
                                    shopCode: result.shop_code?.value,
                                    metalColor: result.metal_color?.value,
                                    purity: result.purity?.value,
                                    customerId: result.customer?.value,
                                    piecesJson: result.pieces_json?.value,
                                    serialNumbers: [],
                                };
                            }

                            // Add inventory details to the array
                            commonDetails[lineId].serialNumbers.push({
                                lotNumber: { value: result.inventory_number?.value, text: result.inventory_number?.text },
                                quantity: { value: Number(parseFloat(result.inventory_quantity.value || 0).toFixed(4)) },
                                pieces: { value: Number(parseInt(result.inventory_quantity.value || 0)) } // Assuming pieces is same as quantity
                            });
                        } else {
                            if (!groupedResults[lineId]) {
                                groupedResults[lineId] = {
                                    line_id: lineId,
                                    item: { value: result.item?.value, text: result.parent?.text ? result.item?.text?.replace(result.parent?.text + " : ", "") : result.item?.text },
                                    quantity: { value: Math.abs(Number(result.quantity.value || 0)) },
                                    pieces: { value: 0 }, // Initialize pieces to 0
                                    isSerialized: result.is_serialized,
                                    itemClass: result.class,
                                    stoneQualityGroup: result.stone_quality_group,
                                    uom: { value: result.unit_id.value, text: result.units_name.value },
                                    material_type: result.material_type,
                                    metalColor: result.metal_color?.value,
                                    purity: result.purity?.value || Number(purityMap[result.metal_quality?.value]?.purityText || 0),
                                    metalColorName: result.metal_color?.text,
                                    metalQualityName: result.metal_quality?.text,
                                    metalQualityId: result.metal_quality?.value,
                                    stoneColorName: result.stone_color?.text,
                                    stoneColorId: result.stone_color?.value,
                                    stoneQualityName: result.stone_quality?.text,
                                    stoneQualityId: result.stone_quality?.value,
                                    csColorName: result.color_stone_colour?.text,
                                    csColorId: result.color_stone_colour?.vaue,
                                    csShapeName: result.color_stone_shape?.text,
                                    csShapeId: result.color_stone_shape?.vaue,
                                    goldPurityId: result.metal_quality?.value ? purityMap[result.metal_quality?.value]?.purityId || "" : "",

                                    isGold: (Number(result.material_type?.value) == MATERIAL_TYPE_ID_GOLD) ? true : false,
                                    isDiamond: (Number(result.material_type?.value) == MATERIAL_TYPE_ID_DIAMOND) ? true : false,
                                    isColorStone: (Number(result.material_type?.value) == MATERIAL_TYPE_ID_COLOR_STONE) ? true : false,
                                    isAlloy: (Number(result.material_type?.value) == MATERIAL_TYPE_ID_ALLOY) ? true : false,
                                    isPartyDiamond: (Number(result.stone_quality_group?.value) == PARTY_DIAMOND_QUALITY) ? true : false,

                                    inventory: [] // Initialize inventory array
                                };
                            }

                            // Add inventory details to the array
                            groupedResults[lineId].inventory.push({
                                lotNumber: { value: result.inventory_number?.value, text: result.inventory_number?.text },
                                quantity: { value: Number(parseFloat(result.inventory_quantity.value || 0).toFixed(4)) },
                                pieces: { value: 0 } // Initialize pieces to 0
                            });
                        }
                    });

                    // Convert grouped results to an array
                    let buildComponentsArrayObj = Object.values(groupedResults);
                    let commonDetailsArrayObj = Object.values(commonDetails);

                    return { status: 'SUCCESS', reason: 'Result Found', data: { buildComponentsArrayObj, commonDetailsArrayObj } };
                } catch (e) {
                    log.error("Error in listBuildComponents", e);
                    return { status: 'ERROR', reason: e.message, data: {} };
                }
            },

            /**
             * Retrieves and groups inventory piece transaction data by inventory number.
             * 
             * @function listBuildPieces
             * @param {string|number} buildId - The internal ID of the build transaction to search for.
             * @returns {Object} Returns an object containing grouped inventory numbers and their total pieces,
             *                   or an error object if the process fails.
             */
            listBuildPieces(buildId) {
                try {
                    let invPcsTransactionSearchObj = search.create({
                        type: "customrecord_jj_inv_pcs_transaction",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_inv_pcs_trans_transaction", "anyof", buildId]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "inv_pcs_transaction_id" }),
                            // search.createColumn({ name: "custrecord_jj_inv_pcs_bin", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "bin" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_item", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "item" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_lot", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "inventory_number" }),
                            search.createColumn({ name: "custrecord_jj_inv_pcs_value", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "inventory_pieces" }),
                            // search.createColumn({ name: "custrecord_jj_inv_pcs_qty", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "inventory_quantity" }),
                            // search.createColumn({ name: "custrecord_jj_inv_pcs_location", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "location" }),
                            // search.createColumn({ name: "custrecord_jj_inv_pcs_status", join: "CUSTRECORD_JJ_INV_PCS_TRANSACTION", label: "status" })
                        ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: invPcsTransactionSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(invPcsTransactionSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    log.debug("searchResult", searchResult);

                    let groupedResult = {};
                    searchResult.forEach(result => {
                        let item = result['item']?.value;
                        let lot = result['inventory_number']?.value;
                        let pieces = parseInt(result['inventory_pieces']?.value || 0, 10);

                        if (!groupedResult[item]) {
                            groupedResult[item] = {
                                totalPieces: 0,
                                lots: {}
                            };
                        }

                        if (!groupedResult[item].lots[lot]) {
                            groupedResult[item].lots[lot] = {
                                pieces: 0
                            };
                        }

                        groupedResult[item].lots[lot].pieces += Math.abs(pieces || 0);
                        groupedResult[item].totalPieces += Math.abs(pieces || 0);
                    });

                    log.debug("Grouped Inventory by Item and Lot", groupedResult);
                    return { status: 'SUCCESS', data: groupedResult };

                } catch (e) {
                    log.error("Error in listBuildPieces", e);
                    return { status: 'ERROR', reason: e.message, data: {} };
                }
            },

            getFGSerialComponentsWithInventory(buildId, serialNumber) {
                try {
                    let fgSerialComponentsSearchObj = search.create({
                        type: "customrecord_jj_fg_serial_components",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_fg_cit_serial_component.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_fsc_serial_number.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_fsc_serial_number.custrecord_jj_fgs_assembly_build", "anyof", buildId]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_fsc_build_item_line_id", label: "line_id" }),
                            // search.createColumn({ name: "custrecord_jj_fsc_item", label: "item" }),
                            search.createColumn({ name: "custrecord_jj_fsc_quantity", label: "quantity" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_quantity", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "lot_quantity" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_lot_number", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "lot_number" }),
                            search.createColumn({ name: "custrecord_jj_fsc_pieces_value", label: "Pieces" }),
                            search.createColumn({ name: "custrecord_jj_fgs_serial", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "serial_number" }),

                            search.createColumn({ name: "class", join: "CUSTRECORD_JJ_FSC_ITEM", label: "class" }),
                            search.createColumn({ name: "isserialitem", join: "CUSTRECORD_JJ_FSC_ITEM", label: "is_serialized" }),
                            search.createColumn({ name: "internalid", label: "internal_id" }),

                            search.createColumn({ name: "custrecord_jj_fg_cit_pieces", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "lot_pieces" }),
                        ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: fgSerialComponentsSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(fgSerialComponentsSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    log.debug("searchResult length", searchResult.length);

                    // if searchResult has serial_number which is equal to serialNumber then return []
                    let serialDetails = {};
                    if (searchResult.length > 0) {
                        // Get a set of unique serial numbers
                        let uniqueSerialNumbers = new Set(searchResult.map(result => result.serial_number?.text).filter(Boolean));

                        // Check if the serialNumber already exists
                        if (uniqueSerialNumbers.has(serialNumber)) {
                            return { status: 'ERROR', reason: `Barcoding is already completed for: ${serialNumber}`, data: [] };
                        }

                        // Convert Set back to an array
                        let uniqueSerialArray = Array.from(uniqueSerialNumbers);
                        serialDetails = {
                            uniqueSerials: uniqueSerialArray,
                            uniqueSerialCount: uniqueSerialArray.length
                        };
                    }

                    // Group results by 'line_id'
                    let groupedResults = searchResult.reduce((acc, result) => {
                        let lineId = result.line_id?.value;
                        let itemClass = result.class?.value || "";
                        let isSerialized = result.is_serialized?.value; // Convert to boolean

                        if (!acc[lineId]) {
                            acc[lineId] = {
                                line_id: lineId,
                                // item: result.item,
                                quantity: 0, // Sum of quantities
                                pieces: 0, // Sum of pieces
                                itemClass: itemClass,
                                isSerialized: isSerialized,
                                fgc_id: [],
                                lots: {} // Use an object to track lot numbers and sum quantities
                            };
                        }

                        // Sum quantity and pieces
                        if (!acc[lineId].fgc_id.includes(result.internal_id.value)) {
                            acc[lineId].quantity += Number(result.quantity?.value || 0);
                            acc[lineId].pieces += Number(result.Pieces?.value || 0);
                            acc[lineId].fgc_id.push(result.internal_id.value);
                        }

                        if (result.lot_number?.value) {
                            let lotNumber = result.lot_number?.value || "";
                            let lotQuantity = Number(result.lot_quantity?.value || 0);
                            let lotPieces = Number(result.lot_pieces?.value || 0);

                            if (isSerialized) {
                                // If serialized, add is_used flag instead of summing lot quantity
                                acc[lineId].lots[lotNumber] = { lot_number: lotNumber, is_used: true };
                            } else {
                                // If not serialized, sum lot quantities
                                if (!acc[lineId].lots[lotNumber]) {
                                    acc[lineId].lots[lotNumber] = { lot_number: lotNumber, lot_quantity: 0 };
                                    acc[lineId].lots[lotNumber] = { lot_number: lotNumber, lot_pieces: 0 };
                                }
                                acc[lineId].lots[lotNumber].lot_quantity += lotQuantity;
                                acc[lineId].lots[lotNumber].lot_pieces += lotPieces;
                            }
                        }

                        return acc;
                    }, {});

                    // // Convert 'lots' object to an array for each line_id
                    // Object.values(groupedResults).forEach(item => {
                    //     item.lots = Object.values(item.lots);
                    // });

                    // return { status: 'SUCCESS', data: Object.values(groupedResults) };
                    return { status: 'SUCCESS', data: { fgSerialCompInvnt: groupedResults, serialDetails } };
                } catch (e) {
                    log.error("Error in getFGSerialComponentsWithInventory", e);
                    return { status: 'ERROR', reason: e.message, data: {} };
                }
            },

            /**
             * Retrieves all assembly serial numbers for a given item ID.
             *
             * @param {number|string} itemId - The ID of the item for which to fetch serial numbers.
             * @returns {Object} - An object containing the status and an array of serials.
             */
            getAllAssemblySerials(itemId) {
                try {
                    let sqlQuery = `
                        SELECT 
                            BUILTIN_RESULT.TYPE_INTEGER(inventoryNumber.ID) AS ID, 
                            BUILTIN_RESULT.TYPE_STRING(inventoryNumber.inventorynumber) AS inventorynumber
                        FROM 
                            inventoryNumber, 
                            CUSTOMRECORD_JJ_FG_SERIALS, 
                            item
                        WHERE 
                            (
                                (
                                    inventoryNumber.ID = CUSTOMRECORD_JJ_FG_SERIALS.custrecord_jj_fgs_serial(+) 
                                    AND inventoryNumber.item = item.ID(+)
                                )
                            )
                            AND (
                                (
                                    item.itemtype IN ('Assembly') AND item.isserialitem = 'T' 
                                    AND NVL(item.isinactive, 'F') = 'F' 
                                    AND inventoryNumber.item IN (${itemId}) 
                                    AND CUSTOMRECORD_JJ_FG_SERIALS.ID IS NULL
                                )
                            )
                    `;

                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    let resultIterator = results.iterator();
                    let formattedResults = [];

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;
                            formattedResults.push({
                                serialId: rowData[0],            // ID from inventoryNumber
                                serialNumber: rowData[1]         // inventorynumber from inventoryNumber
                            });
                            return true;
                        });
                        return true;
                    });

                    log.debug('Formatted Results', formattedResults);
                    return { status: 'SUCCESS', data: formattedResults };
                } catch (e) {
                    log.error("Error in getAllAssemblySerials", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listBomAndRevisionDetails(assemblyItemId) {
                try {
                    let bomSearchObj = search.create({
                        type: "bom",
                        filters: [
                            ["assemblyitem.assembly", "anyof", assemblyItemId],
                            "AND", ["isinactive", "is", "F"],
                            "AND", ["revision.isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "bom_id" }),
                            search.createColumn({ name: "name", label: "bom_name" }),
                            search.createColumn({ name: "name", join: "revision", label: "revision_name" }),
                            search.createColumn({ name: "internalid", join: "revision", label: "revision_id" }),
                            search.createColumn({ name: "assembly", join: "assemblyItem", label: "assembly_item" })
                        ]
                    });

                    let bomList = [];
                    let bomRevisionsMap = {};
                    let assemblyItem = "";

                    bomSearchObj.run().each(result => {
                        let bomId = result.getValue({ name: "internalid" });
                        let bomName = result.getValue({ name: "name", sort: search.Sort.ASC });
                        let revisionId = result.getValue({ name: "internalid", join: "revision" });
                        let revisionName = result.getValue({ name: "name", join: "revision" });

                        if (!assemblyItem) {
                            assemblyItem = {
                                value: result.getValue({ name: "assembly", join: "assemblyItem" }),
                                text: result.getText({ name: "assembly", join: "assemblyItem" })
                            };
                        }

                        // Add to bomList if not already added
                        if (!bomList.some(bom => bom.value == bomId)) {
                            bomList.push({ value: bomId, text: bomName });
                        }

                        // Add to bomRevisionsMap
                        if (!bomRevisionsMap[bomId]) {
                            bomRevisionsMap[bomId] = [];
                        }
                        bomRevisionsMap[bomId].push({ value: revisionId, text: revisionName });

                        return true; // Continue iteration
                    });

                    log.debug("bomList", bomList);
                    log.debug("bomRevisionsMap", bomRevisionsMap);

                    return { status: 'SUCCESS', reason: "Result Found", data: { bomList, bomRevisionsMap, assemblyItem } };
                } catch (e) {
                    log.error("Error in listBomAndRevisionDetails", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listRevisionComponents(revisionId) {
                try {
                    let sqlQuery = `
                        SELECT
                            BUILTIN_RESULT.TYPE_INTEGER(BomRevisionComponent.item) AS rmCodeId,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.itemid) AS rmCodeName,
                            BUILTIN_RESULT.TYPE_FLOAT(BomRevisionComponent.quantity) AS quantity,
                            BUILTIN_RESULT.TYPE_INTEGER(BomRevisionComponent.custrecord_jj_bom_rev_pieces) AS pieces,
                            BUILTIN_RESULT.TYPE_INTEGER(BomRevisionComponent.units) AS uomId,
                            BUILTIN_RESULT.TYPE_STRING(unitsTypeUom.unitname) AS uomName,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.itemtype) AS itemtype,
                            BUILTIN_RESULT.TYPE_INTEGER(item_SUB.CLASS) AS itemClassId,
                            BUILTIN_RESULT.TYPE_BOOLEAN(item_SUB.isserialitem) AS isSerialized,
                            BUILTIN_RESULT.TYPE_INTEGER(item_SUB.custitem_jj_stone_quality_group) AS stoneQualityGroup,
                            BUILTIN_RESULT.TYPE_CURRENCY_HIGH_PRECISION(item_SUB.COST, BUILTIN.CURRENCY(item_SUB.COST)) AS cost,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.purity_name) AS goldPurity,
                            BUILTIN_RESULT.TYPE_INTEGER(item_SUB.cseg_jj_raw_type) AS materialType,
                            BUILTIN_RESULT.TYPE_CURRENCY(item_SUB.lastpurchaseprice, BUILTIN.CURRENCY(item_SUB.lastpurchaseprice)) AS lastpurchaseprice,

                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item_SUB.custitem_jj_metal_color)) AS custitem_jj_metal_color_name,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.custitem_jj_metal_color) AS custitem_jj_metal_color_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item_SUB.custitem_jj_metal_quality)) AS quality_name,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.custitem_jj_metal_quality) AS quality_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item_SUB.custitem_jj_stone_color)) AS stone_color_name,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.custitem_jj_stone_color) AS stone_color_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item_SUB.custitem_jj_stone_quality)) AS stone_quality_name,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.custitem_jj_stone_quality) AS stone_quality_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item_SUB.custitem_jj_colorstonecolour)) AS cs_color_name,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.custitem_jj_colorstonecolour) AS cs_color_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item_SUB.custitem_jj_color_stone_shape)) AS cs_shape_name,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.custitem_jj_color_stone_shape) AS cs_shape_id,
                            BUILTIN_RESULT.TYPE_STRING(item_SUB.purity_id) AS purity_id
                        FROM
                            BomRevisionComponent,
                            (
                                SELECT
                                    item.ID AS id_0,
                                    item.ID AS id_join,
                                    item.itemid AS itemid,
                                    item.itemtype AS itemtype,
                                    item.CLASS AS CLASS,
                                    item.isserialitem AS isserialitem,
                                    item.custitem_jj_stone_quality_group AS custitem_jj_stone_quality_group,
                                    item.COST AS COST,
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.name AS purity_name,
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.purity_id AS purity_id,
                                    ACCOUNT.cseg_jj_raw_type AS cseg_jj_raw_type,
                                    item.lastpurchaseprice AS lastpurchaseprice,
                                    item.isinactive AS isinactive_crit,
                                    item.itemtype AS itemtype_crit,
                                    item.custitem_jj_metal_color AS custitem_jj_metal_color,
                                    item.custitem_jj_metal_quality AS custitem_jj_metal_quality,
                                    item.custitem_jj_stone_color AS custitem_jj_stone_color,
                                    item.custitem_jj_stone_quality AS custitem_jj_stone_quality,
                                    item.custitem_jj_colorstonecolour AS custitem_jj_colorstonecolour,
                                    item.custitem_jj_color_stone_shape AS custitem_jj_color_stone_shape
                                FROM
                                    item,
                                    ACCOUNT,
                                    (
                                        SELECT
                                            CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS ID,
                                            CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS id_join,
                                            CUSTOMLIST_JJ_METAL_PURITY_LIST.name AS name,
                                            CUSTOMLIST_JJ_METAL_PURITY_LIST.ID AS purity_id
                                        FROM
                                            CUSTOMRECORD_JJ_DD_METAL_QUALITY,
                                            CUSTOMLIST_JJ_METAL_PURITY_LIST
                                        WHERE
                                            CUSTOMRECORD_JJ_DD_METAL_QUALITY.custrecord_jj_dd_metal_quality_purity = CUSTOMLIST_JJ_METAL_PURITY_LIST.ID(+)
                                    ) CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB
                                WHERE
                                    item.assetaccount = ACCOUNT.ID(+)
                                    AND item.custitem_jj_metal_quality = CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.ID(+)
                            ) item_SUB,
                            unitsTypeUom
                        WHERE
                            (
                                (
                                    BomRevisionComponent.item = item_SUB.id_0(+)
                                    AND BomRevisionComponent.units = unitsTypeUom.internalid(+)
                                )
                            ) AND (
                                (
                                    NVL(item_SUB.isinactive_crit, 'F') = 'F'
                                    AND BomRevisionComponent.bomrevision IN (${revisionId})
                                    AND (
                                        NOT (
                                            item_SUB.itemtype_crit IN ('OthCharge', 'Service')
                                        ) OR item_SUB.itemtype_crit IS NULL
                                    )
                                )
                            )
                    `;

                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    let resultIterator = results.iterator();
                    let formattedResults = [];

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;

                            // let itemClassIdRaw = rowData[7];
                            // let itemClassIdNum = Number(itemClassIdRaw);
                            // let itemClassIdStr = String(itemClassIdRaw);
                            formattedResults.push({
                                rmCodeId: rowData[0],
                                rmCodeName: rowData[1],
                                quantity: rowData[2],
                                pieces: rowData[3],
                                uomId: rowData[4],
                                uomName: rowData[5],
                                itemtype: rowData[6],
                                itemClassId: rowData[7],
                                isSerialized: rowData[8],
                                stoneQualityGroup: rowData[9],
                                cost: Number(rowData[10] || rowData[13] || 0),
                                goldPurity: rowData[11],
                                materialType: rowData[12],
                                // isSerialLotItem: rowData[7] == SERIAL_LOT_ITEM_CLASS ? true : false,
                                isGold: rowData[12] == MATERIAL_TYPE_ID_GOLD ? true : false,
                                isDiamond: rowData[12] == MATERIAL_TYPE_ID_DIAMOND ? true : false,
                                isColorStone: rowData[12] == MATERIAL_TYPE_ID_COLOR_STONE ? true : false,
                                isAlloy: rowData[12] == MATERIAL_TYPE_ID_ALLOY ? true : false,
                                isPartyDiamond: rowData[9] == PARTY_DIAMOND_QUALITY ? true : false,

                                // metalColor: rowData[14],
                                metalColorName: rowData[14],
                                metalColor: rowData[15],
                                metalQualityName: rowData[16],
                                metalQualityId: rowData[17],
                                stoneColorName: rowData[18],
                                stoneColorId: rowData[19],
                                stoneQualityName: rowData[20],
                                stoneQualityId: rowData[21],
                                csColorName: rowData[22],
                                csColorId: rowData[23],
                                csShapeName: rowData[24],
                                csShapeId: rowData[25],
                                goldPurityId: rowData[26],

                                // // classification using class IDs
                                // isGold: GOLD_CLASS_IDS.includes(itemClassIdNum),
                                // isDiamond: DIAMOND_CLASSES_IDS.includes(itemClassIdStr),
                                // isColorStone: STONE_CLASSES_IDS.includes(itemClassIdStr),
                                // isJewelry: JEWELRY_CLASSES_IDS.includes(itemClassIdStr),
                                // isAlloy: ALLOY_CLASSES_IDS.includes(itemClassIdStr),
                            });
                            return true;
                        });
                        return true;
                    });

                    log.debug('Formatted Results', formattedResults);
                    return { status: 'SUCCESS', reason: 'Result Found', data: formattedResults };
                } catch (e) {
                    log.error("Error in listRevisionComponents", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            /**
             * @description Retrieves a list of active locations
             * @returns {Array} - Array of location data
             */
            getLocations(isAdmin) {
                try {
                    if (isAdmin === false) {
                        return [];
                    }
                    let locationSearchResult = search.create({
                        type: "location",
                        filters: [
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "namenohierarchy", label: "name" }),
                            search.createColumn({ name: "internalid", label: "internalid", sort: search.Sort.ASC })
                        ]
                    });
                    return jjUtil.dataSets.iterateSavedSearch({
                        searchObj: locationSearchResult,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(locationSearchResult, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                } catch (error) {
                    log.error('error @ listLocations', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            getSpecificMaterialForFG(materialId) {
                try {
                    if (!materialId) {
                        return { status: 'ERROR', reason: 'Material ID is required', data: [] };
                    }

                    let itemDetails = [];

                    let sqlQuery = `
                        SELECT 
                            BUILTIN_RESULT.TYPE_INTEGER(item.ID) AS ID, 
                            BUILTIN_RESULT.TYPE_STRING(item.itemid) AS itemid, 
                            BUILTIN_RESULT.TYPE_BOOLEAN(item.islotitem) AS islotitem, 
                            BUILTIN_RESULT.TYPE_BOOLEAN(item.isserialitem) AS isserialitem, 
                            BUILTIN_RESULT.TYPE_INTEGER(item.CLASS) AS CLASS, 
                            BUILTIN_RESULT.TYPE_INTEGER(item.custitem_jj_stone_quality_group) AS custitem_jj_stone_quality_group, 
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.name) AS name, 
                            BUILTIN_RESULT.TYPE_INTEGER(item.saleunit) AS saleunit, 
                            BUILTIN_RESULT.TYPE_STRING(unitsTypeUom.unitname) AS unitname, 
                            BUILTIN_RESULT.TYPE_INTEGER(ACCOUNT.cseg_jj_raw_type) AS cseg_jj_raw_type, 
                            BUILTIN_RESULT.TYPE_CURRENCY_HIGH_PRECISION(item.COST, BUILTIN.CURRENCY(item.COST)) AS COST,

                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_metal_color)) AS custitem_jj_metal_color_name,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_metal_color) AS custitem_jj_metal_color_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_metal_quality)) AS quality_name,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_metal_quality) AS quality_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_stone_color)) AS stone_color_name,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_stone_color) AS stone_color_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_stone_quality)) AS stone_quality_name,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_stone_quality) AS stone_quality_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_colorstonecolour)) AS cs_color_name,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_colorstonecolour) AS cs_color_id,
                            BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(item.custitem_jj_color_stone_shape)) AS cs_shape_name,
                            BUILTIN_RESULT.TYPE_STRING(item.custitem_jj_color_stone_shape) AS cs_shape_id,
                            BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.purity_id) AS purity_id
                        FROM 
                            item, 
                            ACCOUNT, 
                            unitsTypeUom, 
                            (
                                SELECT 
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS ID, 
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY.ID AS id_join, 
                                    CUSTOMLIST_JJ_METAL_PURITY_LIST.name AS name,
                                    CUSTOMLIST_JJ_METAL_PURITY_LIST.id AS purity_id
                                FROM 
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY, 
                                    CUSTOMLIST_JJ_METAL_PURITY_LIST
                                WHERE 
                                    CUSTOMRECORD_JJ_DD_METAL_QUALITY.custrecord_jj_dd_metal_quality_purity = CUSTOMLIST_JJ_METAL_PURITY_LIST.ID(+)
                            ) CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB
                        WHERE 
                            (
                                (
                                    (
                                        item.assetaccount = ACCOUNT.ID(+) 
                                        AND item.saleunit = unitsTypeUom.internalid(+)
                                    ) 
                                    AND item.custitem_jj_metal_quality = CUSTOMRECORD_JJ_DD_METAL_QUALITY_SUB.ID(+)
                                )
                            ) 
                            AND (
                                (
                                    NVL(item.isinactive, 'F') = 'F' 
                                    AND item.itemtype IN ('InvtPart', 'Assembly') 
                                    AND item.ID IN (${materialId})
                                )
                            )
                    `;

                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    let resultIterator = results.iterator();

                    resultIterator.each(function (page) {
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;
                            itemDetails.push({
                                id: rowData[0],
                                name: rowData[1],
                                isLotItem: rowData[2],
                                isSerialItem: rowData[3],
                                itemClass: rowData[4],
                                stoneQualityGroup: rowData[5],
                                goldPurity: rowData[6],
                                uomId: rowData[7],
                                uomName: rowData[8],
                                materialType: rowData[9],
                                cost: Number(parseFloat(rowData[10] || 0).toFixed(4)),
                                // isSerialLotItem: rowData[4] == SERIAL_LOT_ITEM_CLASS ? true : false,
                                isGold: rowData[9] == MATERIAL_TYPE_ID_GOLD ? true : false,
                                isDiamond: rowData[9] == MATERIAL_TYPE_ID_DIAMOND ? true : false,
                                isColorStone: rowData[9] == MATERIAL_TYPE_ID_COLOR_STONE ? true : false,
                                isAlloy: rowData[9] == MATERIAL_TYPE_ID_ALLOY ? true : false,
                                isPartyDiamond: rowData[5] == PARTY_DIAMOND_QUALITY ? true : false,

                                // metalColor: rowData[11],
                                metalColorName: rowData[11],
                                metalColor: rowData[12],
                                metalQualityName: rowData[13],
                                metalQualityId: rowData[14],
                                stoneColorName: rowData[15],
                                stoneColorId: rowData[16],
                                stoneQualityName: rowData[17],
                                stoneQualityId: rowData[18],
                                csColorName: rowData[19],
                                csColorId: rowData[20],
                                csShapeName: rowData[21],
                                csShapeId: rowData[22],
                                goldPurityId: rowData[23],
                            });
                            return true;
                        });
                        return true;
                    });

                    if (itemDetails.length === 0) {
                        return { status: 'SUCCESS', reason: 'Failed to add component. Please check the component details.', data: [] };
                    }
                    return { status: 'SUCCESS', reason: 'Result Found', data: itemDetails };
                } catch (e) {
                    log.error("Error in getSpecificMaterialForFG", e);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            /**
             * Retrieves inventory adjustments within a specified date range.
             *
             * @param {string} startDate - The start date for the query in 'YYYY-MM-DD' format.
             * @param {string} endDate - The end date for the query in 'YYYY-MM-DD' format.
             * @returns {Object} - An object containing the status and data of the query.
             * @returns {string} returns.status - The status of the query ('SUCCESS' or 'ERROR').
             * @returns {Array} returns.data - The data retrieved from the query, or an empty array if an error occurred.
             * @returns {string} [returns.reason] - The error message if the status is 'ERROR'.
             */
            getInventoryAdjustments(startDate, endDate) {
                try {
                    log.debug("getInventoryAdjustments@@@@");

                    let sqlQuery = `
                        SELECT 
                            t.custbody_jj_recovery_department AS "custbody_jj_recovery_department",
                            t.custbody_jj_recovered_employee AS "custbody_jj_recovered_employee",
                            tl.quantity AS "quantity"
                        FROM 
                            transaction t
                        JOIN 
                            transactionLine tl ON t.id = tl.transaction
                        WHERE 
                            t.type = 'InvAdjst' 
                            AND t.custbody_jj_is_recovery = 'T'
                            AND tl.quantity > 0
                            AND t.createddate BETWEEN TO_DATE(?, 'YYYY-MM-DD HH24:MI:SS') 
                                                AND TO_DATE(?, 'YYYY-MM-DD HH24:MI:SS')
                        GROUP BY 
                            t.custbody_jj_recovery_department,
                            t.custbody_jj_recovered_employee,
                            tl.quantity
                    `;

                    let pagedResults = query.runSuiteQLPaged({
                        query: sqlQuery,
                        params: [startDate + ' 00:00:00', endDate + ' 23:59:59'], // Dynamic date binding
                        pageSize: 1000  // Max page size
                    });

                    let allResults = [];

                    if (pagedResults.count > 0) {
                        let pageIterator = pagedResults.iterator(); // Get the iterator

                        pageIterator.each(function (page) {
                            let pageData = page.value.data.asMappedResults();
                            allResults = allResults.concat(pageData);
                            return true; // Continue iteration
                        });
                    }

                    log.debug("allResults", allResults);
                    return { status: 'SUCCESS', data: allResults };

                } catch (error) {
                    log.error('error @ getInventoryAdjustments', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },


            /**
             * Retrieves details of the scrap item.
             * 
             * @returns {Object} An object containing the status, reason, and data of the scrap item details.
             */
            getScrapItemDetails(quality) {
                try {
                    let filters = [["isinactive", "is", "F"]];

                    if (quality) {
                        filters.push("AND", ["custitem_jj_metal_quality", "anyof", quality]);
                        filters.push("AND", ["parent", "anyof", SCRAP_ITEM_PARENT_ID]);
                    } else {
                        filters.push("AND");
                        filters.push(["internalid", "anyof", GOLD_SCRAP_ITEM_ID]);
                    }
                    let itemSearchObj = search.create({
                        type: "item",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", label: "ID" }),
                            search.createColumn({ name: "itemid", label: "Name" }),
                            search.createColumn({ name: "parent", label: "Parent" })
                        ]
                    });

                    // let now = new Date();
                    // // Extract date components directly in UTC
                    // let utcYear = now.getUTCFullYear();
                    // let utcMonth = (now.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
                    // let utcDay = now.getUTCDate().toString().padStart(2, '0'); // Ensures two-digit day
                    // let formattedDate = `${utcDay}/${utcMonth}/${utcYear}`;

                    // let goldScrapItemName = GOLD_SCRAP_ITEM_LOT_NAME + "_" + formattedDate;

                    let scrapItemDetails = [];
                    itemSearchObj.run().each(function (result) {
                        let id = result.getValue({ name: "internalid" });
                        let name = result.getValue({ name: "itemid" });
                        let parent = result.getValue({ name: "parent" });

                        scrapItemDetails.push({
                            id: id,
                            name: parent ? name.replace(parent + " : ", "") : name,
                            // lotName: goldScrapItemName
                            lotName: GOLD_SCRAP_ITEM_LOT_NAME
                        });
                        return false;
                    });
                    return { status: 'SUCCESS', reason: 'Result Found', data: scrapItemDetails };
                } catch (error) {
                    log.error('error @ getScrapItemDetails', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Retrieves the current gold rate from a custom saved search.
             * 
             * @returns {Object} An object containing the status, reason, and data of the gold rate.
             * @returns {string} return.status - The status of the operation ('SUCCESS' or 'ERROR').
             * @returns {string} return.reason - The reason for the status, especially in case of an error.
             * @returns {Object} return.data - The data object containing gold rate information.
             * @returns {string} return.data.currencyId - The ID of the currency.
             * @returns {string} return.data.currencyName - The name of the currency.
             * @returns {string} return.data.symbol - The symbol of the currency.
             * @returns {string} return.data.goldPrice - The gold price.
             */
            getCurrentGoldRate() {
                try {
                    let customrecord_jj_daily_good_priceSearchObj = search.create({
                        type: "customrecord_jj_daily_good_price",
                        filters: [
                            ["custrecord_jj_dgp_currency", "anyof", CURRENCY_INR_ID],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_dgp_currency", label: "Currency" }),
                            search.createColumn({ name: "symbol", join: "CUSTRECORD_JJ_DGP_CURRENCY", label: "Symbol" }),
                            search.createColumn({ name: "custrecord_jj_dgp_gold_price", label: "Gold Price" }),
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC }) // Sorting by internal ID (latest first)
                        ]
                    });

                    let searchResult = customrecord_jj_daily_good_priceSearchObj.run().getRange({ start: 0, end: 1 }); // Get only the first record

                    if (searchResult.length > 0) {
                        let result = searchResult[0];

                        let goldRateData = {
                            currencyId: result.getValue("custrecord_jj_dgp_currency"),
                            currencyName: result.getText("custrecord_jj_dgp_currency"),
                            symbol: result.getValue({ name: "symbol", join: "CUSTRECORD_JJ_DGP_CURRENCY" }),
                            goldPrice: result.getValue("custrecord_jj_dgp_gold_price"),
                        };

                        return { status: 'SUCCESS', reason: '', data: goldRateData };
                    }

                    return { status: 'ERROR', reason: 'No gold rate found', data: [] };

                } catch (error) {
                    log.error('Error @ getCurrentGoldRate', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Retrieves a list of inventory statuses.
             * 
             * @returns {Object} An object containing the status, reason, and data of the inventory statuses.
             */
            listStatuses() {
                try {
                    let inventorystatusSearchObj = search.create({
                        type: "inventorystatus",
                        filters: [["isinactive", "is", "F"]],
                        columns: [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "name", label: "Name" })
                        ]
                    });

                    let listStatuses = [];
                    // Run the search and process results
                    inventorystatusSearchObj.run().each(function (result) {
                        listStatuses.push({
                            value: result.getValue({ name: "internalid" }),
                            text: result.getValue({ name: "name" })
                        });
                        return true;
                    });
                    return { status: 'SUCCESS', reason: 'Result Found', data: listStatuses };
                } catch (error) {
                    log.error('error @ listStatuses', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            getItemMaterialTypes(assemblyBuildId) {
                try {
                    let assemblybuildSearchObj = search.create({
                        type: "assemblybuild",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters:
                            [
                                ["type", "anyof", "Build"],
                                "AND",
                                ["internalid", "anyof", assemblyBuildId],
                                "AND",
                                ["mainline", "is", "F"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "item", label: "item" }),
                                search.createColumn({ name: "line", label: "line" }),
                                search.createColumn({ name: "quantity", label: "quantity" }),
                                search.createColumn({
                                    name: "cseg_jj_raw_type",
                                    join: "account",
                                    label: "material_type"
                                }),
                                search.createColumn({
                                    name: "custitem_jj_stone_quality_group",
                                    join: "item",
                                    label: "quality_group"
                                })
                            ]
                    });

                    let searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: assemblybuildSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(assemblybuildSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });
                    return searchResult;

                } catch {
                    log.error("Error in getItemMaterialTypes", e);
                }
            },

            impactAccountDetailsSearch(assemblyBuildId) {
                let groupedAmount = {};
                try {
                    let impactSearch = search.create({
                        type: "assemblybuild",
                        filters: [
                            ["type", "anyof", "Build"],
                            "AND",
                            ["internalid", "anyof", assemblyBuildId],
                            "AND",
                            ["creditamount", "isnotempty", ""],
                            "AND",
                            ["mainline", "is", "F"]
                        ],
                        columns: [
                            "account",
                            "creditamount",
                            search.createColumn({ name: "cseg_jj_raw_type", join: "account" }),
                            search.createColumn({ name: "custitem_jj_stone_quality_group", join: "item", label: "Stone Quality Group" }),
                        ]
                    });

                    impactSearch.run().each(result => {
                        let materialTypeId = result.getValue({ name: "cseg_jj_raw_type", join: "account" }) || "Unknown";
                        let creditAmount = parseFloat(result.getValue("creditamount")) || 0;
                        let stoneQualityGroup = result.getValue({ name: "custitem_jj_stone_quality_group", join: "item" }) || "";

                        if (!groupedAmount[materialTypeId]) {
                            groupedAmount[materialTypeId] = { totalCreditAmount: 0 };
                        }

                        groupedAmount[materialTypeId].totalCreditAmount += creditAmount;

                        if (stoneQualityGroup == PARTY_DIAMOND_QUALITY) {
                            if (!groupedAmount["party_diamond"]) {
                                groupedAmount["party_diamond"] = { totalCreditAmount: 0 };
                            }

                            groupedAmount["party_diamond"].totalCreditAmount += creditAmount;
                        }

                        return true;
                    });

                    return groupedAmount;

                } catch (error) {
                    log.error("Error in impactAccountDetailsSearch", error);
                    return groupedAmount;
                }
            },

            // componentDetailsSearch(assemblyBuild, groupedAmount) {
            //     try {
            //         let serialLotArray = [];
            //         // log.debug("Component Details groupedAmount", groupedAmount);
            //         let assemblyBuildId = assemblyBuild.id;
            //         let componentSearch = search.create({
            //             type: "assemblybuild",
            //             filters: [
            //                 ["type", "anyof", "Build"],
            //                 "AND",
            //                 ["internalid", "anyof", assemblyBuildId],
            //                 "AND",
            //                 ["mainline", "is", "F"]
            //             ],
            //             columns: [
            //                 "quantity",
            //                 search.createColumn({ name: "cseg_jj_raw_type", join: "account" }),
            //                 search.createColumn({ name: "custitem_jj_stone_quality_group", join: "item", label: "Stone Quality Group" }),
            //                 "line",

            //             ]
            //         });

            //         componentSearch.run().each(result => {
            //             // log.debug("result", result);
            //             let materialTypeId = result.getValue({ name: "cseg_jj_raw_type", join: "account" }) || "Unknown";
            //             log.debug("Material Type ID", materialTypeId);

            //             let quantity = Math.abs(parseFloat(result.getValue("quantity")) || 0);
            //             log.debug("Quantity", quantity);

            //             let stoneQualityGroup = result.getValue({ name: "custitem_jj_stone_quality_group", join: "item" }) || "";
            //             log.debug("stoneQualityGroup", stoneQualityGroup);

            //             let lineNum = result.getValue("line");

            //             if (materialTypeId == JEWELRY_TYPE_ID) {

            //                 let index = assemblyBuild.getSublistLineWithValue({
            //                     sublistId: 'component',
            //                     fieldId: 'linenumber',
            //                     value: lineNum
            //                 });

            //                 let hasSubrecord = assemblyBuild.hasSublistSubrecord({
            //                     sublistId: 'component',
            //                     fieldId: 'componentinventorydetail',
            //                     line: index
            //                 });
            //                 log.debug("Has Subrecord", hasSubrecord);
            //                 if (hasSubrecord) {
            //                     let componentInventoryDetail = assemblyBuild.getSublistSubrecord({
            //                         sublistId: 'component',
            //                         fieldId: 'componentinventorydetail',
            //                         line: index
            //                     });
            //                     log.debug("Component Inventory Detail", componentInventoryDetail);
            //                     let inventoryAssignmentCount = componentInventoryDetail.getLineCount({ sublistId: 'inventoryassignment' });
            //                     log.debug("Inventory Assignment Count", inventoryAssignmentCount);
            //                     for (let i = 0; i < inventoryAssignmentCount; i++) {
            //                         let lotNumber = componentInventoryDetail.getSublistValue({
            //                             sublistId: 'inventoryassignment',
            //                             fieldId: 'issueinventorynumber',
            //                             line: i
            //                         }) || "";
            //                         log.debug("Lot Number", lotNumber);
            //                         serialLotArray.push(lotNumber);
            //                     }
            //                 }
            //             }

            //             if (!groupedAmount[materialTypeId]) {
            //                 groupedAmount[materialTypeId] = { totalQuantity: 0 };
            //                 // log.debug("Grouped Amount Before Component Details", groupedAmount);
            //                 [materialTypeId].totalQuantity = 0;
            //             }

            //             groupedAmount[materialTypeId].totalQuantity = parseFloat(groupedAmount[materialTypeId].totalQuantity || 0) + parseFloat(quantity || 0);

            //             if (stoneQualityGroup == PARTY_DIAMOND_QUALITY) {
            //                 if (!groupedAmount["party_diamond"]) {
            //                     groupedAmount["party_diamond"] = { totalQuantity: 0 };
            //                     groupedAmount["party_diamond"].totalQuantity = 0;
            //                 }

            //                 groupedAmount["party_diamond"].totalQuantity = parseFloat(groupedAmount["party_diamond"].totalQuantity || 0) + parseFloat(quantity || 0);
            //             }
            //             log.debug("Grouped Amount after Component Details", groupedAmount);

            //             return true;
            //         });

            //         if (serialLotArray.length > 0) {
            //             let totalGoldWeight = 0, totalDiamondWeight = 0, totalColorStoneWeight = 0, totalPartyDiamondWeight = 0;
            //             let totalGoldAmount = 0, totalDiamondAmount = 0, totalColorStoneAmount = 0, totalPartyDiamondAmount = 0, totalMakingChargeAmount = 0;

            //             let lotSearch = search.create({
            //                 type: "inventorynumber", // Use custom type if applicable
            //                 filters: [["internalid", "anyof", serialLotArray]],
            //                 columns: [
            //                     "custitemnumber_jj_serial_num_net_weight",
            //                     "custitemnumber_jj_serial_num_diamond_weight",
            //                     "custitemnumber_jj_serial_num_cs_weight",
            //                     "custitemnumber_jj_serial_num_partydiamond_wt",
            //                     "custitemnumber_jj_cost_gold",
            //                     "custitemnumber_jj_cost_diamond",
            //                     "custitemnumber_jj_cost_color_stone",
            //                     "custitemnumber_jj_cost_making_charge",
            //                     "custitemnumber_jj_cost_party_diamond",
            //                 ]
            //             });

            //             lotSearch.run().each(res => {
            //                 totalGoldWeight += parseFloat(res.getValue("custitemnumber_jj_serial_num_net_weight") || 0);
            //                 totalDiamondWeight += parseFloat(res.getValue("custitemnumber_jj_serial_num_diamond_weight") || 0) / CARATS_TO_GRAMS_CONST;
            //                 totalColorStoneWeight += parseFloat(res.getValue("custrecord_colorstone_weight") || 0) / CARATS_TO_GRAMS_CONST;
            //                 totalPartyDiamondWeight += parseFloat(res.getValue("custitemnumber_jj_serial_num_partydiamond_wt") || 0) / CARATS_TO_GRAMS_CONST;

            //                 totalGoldAmount += parseFloat(res.getValue("custitemnumber_jj_cost_gold") || 0);
            //                 totalDiamondAmount += parseFloat(res.getValue("custitemnumber_jj_cost_diamond") || 0);
            //                 totalColorStoneAmount += parseFloat(res.getValue("custitemnumber_jj_cost_color_stone") || 0);
            //                 totalMakingChargeAmount = parseFloat(res.getValue("custitemnumber_jj_cost_making_charge") || 0);
            //                 totalPartyDiamondAmount = parseFloat(res.getValue("custitemnumber_jj_cost_party_diamond") || 0);

            //                 return true;
            //             });

            //             groupedAmount[GOLD_TYPE_ID].totalQuantity = (groupedAmount[GOLD_TYPE_ID].totalQuantity || 0) + totalGoldWeight;
            //             groupedAmount[GOLD_TYPE_ID].totalCreditAmount = (groupedAmount[GOLD_TYPE_ID].totalCreditAmount || 0) + totalGoldAmount;

            //             groupedAmount[DIAMOND_TYPE_ID].totalQuantity = (groupedAmount[DIAMOND_TYPE_ID].totalQuantity || 0) + totalDiamondWeight;
            //             groupedAmount[DIAMOND_TYPE_ID].totalCreditAmount = (groupedAmount[DIAMOND_TYPE_ID].totalCreditAmount || 0) + totalDiamondAmount;

            //             groupedAmount[COLORSTONE_TYPE_ID].totalQuantity = (groupedAmount[COLORSTONE_TYPE_ID].totalQuantity || 0) + totalColorStoneWeight;
            //             groupedAmount[COLORSTONE_TYPE_ID].totalCreditAmount = (groupedAmount[COLORSTONE_TYPE_ID].totalCreditAmount || 0) + totalColorStoneAmount;

            //             groupedAmount["party_diamond"].totalQuantity = (groupedAmount["party_diamond"].totalQuantity || 0) + totalPartyDiamondWeight;
            //             groupedAmount["party_diamond"].totalCreditAmount = (groupedAmount["party_diamond"].totalCreditAmount || 0) + totalPartyDiamondAmount;

            //             groupedAmount[MAKING_CHARGE_TYPE_ID].totalCreditAmount = (groupedAmount[MAKING_CHARGE_TYPE_ID].totalCreditAmount || 0) + totalMakingChargeAmount;

            //             if (groupedAmount[JEWELRY_TYPE_ID]) {
            //                 delete groupedAmount[JEWELRY_TYPE_ID];
            //             }

            //         }

            //         return groupedAmount;

            //     } catch (error) {
            //         log.error("Error in componentDetailsSearch", error);
            //     }
            // }

            /**
             * Fetch metal purity details grouped by metal quality ID
             *
             * @param {string|string[]} qualityIds - Metal quality internal IDs
             * @returns {Object} { [qualityId]: { purityId, purityText } }
             */
            getMetalQualityPurityMap(qualityIds) {
                let purityMap = {};

                try {
                    if (!qualityIds || (Array.isArray(qualityIds) && !qualityIds.length)) {
                        return purityMap;
                    }

                    if (!Array.isArray(qualityIds)) {
                        qualityIds = [qualityIds];
                    }

                    const metalQualitySearchObj = search.create({
                        type: "customrecord_jj_dd_metal_quality",
                        filters: [
                            ["internalid", "anyof", qualityIds],
                            "AND", ["isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid" }),
                            search.createColumn({ name: "custrecord_jj_dd_metal_quality_purity" })
                        ]
                    });

                    metalQualitySearchObj.run().each(result => {
                        const qualityId = result.getValue("internalid");

                        purityMap[qualityId] = {
                            purityId: result.getValue("custrecord_jj_dd_metal_quality_purity") || "",
                            purityText: result.getText("custrecord_jj_dd_metal_quality_purity") || ""
                        };

                        return true;
                    });

                } catch (e) {
                    log.error("getMetalQualityPurityMap error", e);
                }

                return purityMap;
            },

            mergeBaseDetails(target, source) {
                Object.keys(source).forEach(key => {
                    if (!target[key] && source[key]) {
                        target[key] = source[key];
                    }
                });
            },

            extractBaseDetails(result, isInventory) {
                return {
                    gold_color: result.getValue({ name: "custitem_jj_metal_color", join: isInventory ? null : "item" }) || "",
                    // gold_quality: result.getValue({ name: "custitem_jj_metal_quality", join: isInventory ? null : "item" }) || "",
                    // gold_purity: result.getValue({ name: "custitem_jj_metal_purity_percent", join: isInventory ? null : "item" }) || "",

                    diamond_color: result.getValue({ name: "custitem_jj_stone_color", join: isInventory ? null : "item" }) || "",
                    diamond_quality: result.getValue({ name: "custitem_jj_stone_quality", join: isInventory ? null : "item" }) || "",

                    cs_color: result.getValue({ name: "custitem_jj_colorstonecolour", join: isInventory ? null : "item" }) || "",
                    cs_shape: result.getValue({ name: "custitem_jj_color_stone_shape", join: isInventory ? null : "item" }) || ""
                };
            },

            extractSerialBaseDetails(result) {
                return {
                    gold_color: result.getValue("custitemnumber_jj_fg_metal_colour") || "",
                    gold_quality: result.getValue("custitemnumber_jj_fg_metal_quality") || "",
                    gold_purity: result.getValue("custitemnumber_jj_fg_metal_purity") || "",

                    diamond_color: result.getValue("custitemnumber_jj_fg_stone_color") || "",
                    diamond_quality: result.getValue("custitemnumber_jj_fg_stone_quality") || "",

                    cs_color: result.getValue("custitemnumber_jj_fg_cs_stone_color") || "",
                    cs_shape: result.getValue("custitemnumber_jj_fg_cs_stone_shape") || ""
                };
            },

            componentDetailsSearch(assemblyBuildId, groupedAmount) {
                try {
                    let serialLotArray = [];
                    let processedLines = new Set();
                    let alloyDetails = {};

                    let itemBaseDetails = {};
                    let serialBase = {};

                    // log.debug("Component Details groupedAmount", groupedAmount);
                    // let assemblyBuildId = assemblyBuild.id;
                    let componentSearch = search.create({
                        type: "assemblybuild",
                        filters: [
                            ["type", "anyof", "Build"],
                            "AND",
                            ["internalid", "anyof", assemblyBuildId],
                            // "AND",
                            // ["mainline", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", join: "item", label: "item id" }),
                            "quantity",
                            search.createColumn({ name: "cseg_jj_raw_type", join: "account" }),
                            search.createColumn({ name: "custitem_jj_stone_quality_group", join: "item", label: "Stone Quality Group" }),
                            "line",
                            search.createColumn({ name: "inventorynumber", join: "inventorydetail" }),
                            search.createColumn({ name: "custitem_jj_metal_purity_percent", join: "item", label: "Metal Quality (Purity) %" }),
                            search.createColumn({ name: "custitem_jj_metal_color", join: "item", label: "Metal Color" }),
                            search.createColumn({ name: "custitem_jj_metal_quality", join: "item", label: "Metal Quality" }),

                            search.createColumn({ name: "custitem_jj_stone_quality", join: "item", label: "Stone Quality (Diamond)" }),
                            search.createColumn({ name: "custitem_jj_stone_color", join: "item", label: "Stone Color (Diamond)" }),

                            search.createColumn({ name: "custitem_jj_color_stone_shape", join: "item", label: "Stone Shape (CS)" }),
                            search.createColumn({ name: "custitem_jj_colorstonecolour", join: "item", label: "Stone Colour (CS)" }),

                            search.createColumn({ name: "custitem_jj_category_group", join: "item", label: "category_group" }),
                            search.createColumn({ name: "location", label: "location" })
                        ]
                    });

                    let metalQualityIds = new Set();
                    let itemCategoryGroup = null;
                    let itemLocation = null;
                    componentSearch.run().each(result => {
                        // skip lines that are 0
                        let lineValue = parseInt(result.getValue("line") || 0, 10);
                        if (lineValue === 0) {
                            // capture category and location for zero lines (first occurrence)
                            if (!itemCategoryGroup) {
                                itemCategoryGroup = result.getValue({ name: "custitem_jj_category_group", join: "item" }) || null;
                            }
                            if (!itemLocation) {
                                itemLocation = result.getValue({ name: "location" }) || null;
                            }
                            return true;
                        }

                        let materialTypeId = result.getValue({ name: "cseg_jj_raw_type", join: "account" }) || "";
                        let quantity = Math.abs(parseFloat(result.getValue("quantity")) || 0);
                        let metalQualityId = result.getValue({ name: "custitem_jj_metal_quality", join: "item" });

                        if (metalQualityId && quantity > 0 && materialTypeId != JEWELRY_TYPE_ID) {
                            metalQualityIds.add(metalQualityId);
                        }

                        return true;
                    });

                    let chargeTypeMap = this.getOtherCharges(itemCategoryGroup, itemLocation);
                    log.debug("chargeTypeMap", chargeTypeMap);

                    const metalQualityIdArray = Array.from(metalQualityIds);
                    log.debug("Metal Quality IDs", metalQualityIdArray);

                    const metalQualityPurityMap = this.getMetalQualityPurityMap(metalQualityIdArray);
                    log.debug("Metal Quality → Purity Map", metalQualityPurityMap);

                    componentSearch.run().each(result => {
                        let lineNum = Number(result.getValue("line"));
                        // skip lines that are 0
                        if (lineNum === 0) {
                            return true;
                        }

                        // log.debug("result", result);
                        let materialTypeId = result.getValue({ name: "cseg_jj_raw_type", join: "account" }) || "Unknown";
                        log.debug("Material Type ID", materialTypeId);

                        let quantity = Math.abs(parseFloat(result.getValue("quantity")) || 0);
                        log.debug("Quantity", quantity);

                        let stoneQualityGroup = result.getValue({ name: "custitem_jj_stone_quality_group", join: "item" }) || "";
                        log.debug("stoneQualityGroup", stoneQualityGroup);

                        let metalQualityId = result.getValue({ name: "custitem_jj_metal_quality", join: "item" }) || "";
                        log.debug("metalQualityId", metalQualityId);

                        let purityText = metalQualityPurityMap[metalQualityId]?.purityText || "";

                        // const purity = (parseFloat(result.getValue({ name: 'custitem_jj_metal_purity_percent', join: 'item' }) || 0) / 100) || 0;
                        const purity = (parseFloat(purityText || 0) / 100) || 0;
                        const itemId = result.getValue({ name: "internalid", join: "item" });

                        if (materialTypeId != JEWELRY_TYPE_ID && Number(quantity || 0) > 0) {
                            if (itemId) {
                                itemBaseDetails[itemId] = itemBaseDetails[itemId] || {
                                    gold_color: "",
                                    gold_quality: "",
                                    gold_purity: "",
                                    diamond_color: "",
                                    diamond_quality: "",
                                    cs_color: "",
                                    cs_shape: ""
                                };

                                itemBaseDetails[itemId].gold_purity = metalQualityPurityMap[metalQualityId]?.purityId || "";
                                itemBaseDetails[itemId].gold_quality = metalQualityId;

                                const extracted = this.extractBaseDetails(result, false);
                                this.mergeBaseDetails(itemBaseDetails[itemId], extracted);
                            }
                        }

                        if (!processedLines.has(lineNum)) {
                            processedLines.add(lineNum);

                            if (purity && Number(quantity || 0)) {
                                let colorId = result.getValue({ name: "custitem_jj_metal_color", join: "item" });
                                if (!alloyDetails[colorId]?.totalQuantity) {
                                    if (!alloyDetails[colorId]) {
                                        alloyDetails[colorId] = {};
                                    }
                                    alloyDetails[colorId].totalQuantity = 0;
                                }
                                alloyDetails[colorId].totalQuantity += Number(quantity || 0) - (Number(quantity || 0) * purity);

                                if (!groupedAmount[MATERIAL_TYPE_ID_ALLOY]?.totalQuantity) {
                                    if (!groupedAmount[MATERIAL_TYPE_ID_ALLOY]) {
                                        groupedAmount[MATERIAL_TYPE_ID_ALLOY] = {};
                                    }
                                    groupedAmount[MATERIAL_TYPE_ID_ALLOY].totalQuantity = 0;
                                }
                                groupedAmount[MATERIAL_TYPE_ID_ALLOY].totalQuantity += Number(quantity || 0) - (Number(quantity || 0) * purity);
                            }

                            groupedAmount[materialTypeId] = groupedAmount[materialTypeId] || { totalQuantity: 0 };
                            // groupedAmount[materialTypeId].totalQuantity = Number(groupedAmount[materialTypeId].totalQuantity || 0) + Number(quantity || 0);
                            groupedAmount[materialTypeId].totalQuantity = Number(groupedAmount[materialTypeId].totalQuantity || 0) + (purity && materialTypeId != JEWELRY_TYPE_ID ? Number(quantity || 0) * purity : Number(quantity || 0));

                            if (stoneQualityGroup == PARTY_DIAMOND_QUALITY) {
                                groupedAmount["party_diamond"] = groupedAmount["party_diamond"] || { totalQuantity: 0 };
                                groupedAmount["party_diamond"].totalQuantity = Number(groupedAmount["party_diamond"].totalQuantity || 0) + Number(quantity || 0);
                            }

                            // if (itemId && Number(itemId) == LABOUR_OVERHEADS_CHARGE_ITEM_ID) {
                            const chargeEntry = chargeTypeMap.find(entry => String(entry.chargeItem) === String(itemId));
                            const chargeType = chargeEntry ? chargeEntry.chargeType : null;
                            if (itemId && chargeType && chargeType == CHARGE_TYPES.LABOUR_OVERHEADS_CHARGE) {
                                groupedAmount["labour_overheads"] = groupedAmount["labour_overheads"] || { totalCreditAmount: quantity, totalQuantity: quantity };
                                // } else if (itemId && Number(itemId) == NET_LOSS_CHARGE_ITEM_ID) {
                            } else if (itemId && chargeType && chargeType == CHARGE_TYPES.NET_LOSS_CHARGE) {
                                groupedAmount["net_loss"] = groupedAmount["net_loss"] || { totalCreditAmount: quantity, totalQuantity: quantity };
                                // } else if (itemId && Number(itemId) == FINDING_ITEM_SERVICE_ID) {
                            } else if (itemId && chargeType && chargeType == CHARGE_TYPES.FINDING_ITEM_SERVICE) {
                                groupedAmount["finding_service"] = groupedAmount["finding_service"] || { totalCreditAmount: quantity, totalQuantity: quantity };
                            }
                        }
                        if (materialTypeId == JEWELRY_TYPE_ID) {
                            let lotNumber = result.getValue({ name: "inventorynumber", join: "inventorydetail" });
                            if (lotNumber) {
                                serialLotArray.push(lotNumber);
                            }
                        }

                        log.debug("Grouped Amount after Component Details", groupedAmount);

                        return true;
                    });

                    if (serialLotArray.length > 0) {
                        const lotSearch = search.create({
                            type: "inventorynumber",
                            filters: [["internalid", "anyof", serialLotArray]],
                            columns: [
                                "internalid",
                                "custitemnumber_jj_serial_num_net_weight",
                                "custitemnumber_jj_serial_num_diamond_weight",
                                "custitemnumber_jj_serial_num_cs_weight",
                                "custitemnumber_jj_serial_num_partydiamond_wt",
                                "custitemnumber_jj_cost_gold",
                                "custitemnumber_jj_cost_diamond",
                                "custitemnumber_jj_cost_color_stone",
                                "custitemnumber_jj_cost_making_charge",
                                "custitemnumber_jj_cost_party_diamond",
                                "custitemnumber_jj_serial_num_diamond_pieces",
                                "custitemnumber_jj_serial_num_pure_weight",
                                "custitemnumber_jj_serial_num_cs_pieces",
                                "custitemnumber_jj_cost_alloy",
                                "custitemnumber_jj_serial_num_alloy_weight",

                                'custitemnumber_jj_total_labour_overhead_char',
                                'custitemnumber_jj_total_net_loss_charge',
                                'custitemnumber_jj_finding_item_service_chrg',

                                // ---- FG Stone / Metal attributes ----
                                'custitemnumber_jj_fg_stone_color',
                                'custitemnumber_jj_fg_stone_quality',

                                'custitemnumber_jj_fg_metal_colour',
                                'custitemnumber_jj_fg_metal_quality',
                                'custitemnumber_jj_fg_metal_purity',

                                'custitemnumber_jj_fg_cs_stone_color',
                                'custitemnumber_jj_fg_cs_stone_shape',
                            ]
                        });

                        groupedAmount[JEWELRY_TYPE_ID] = groupedAmount[JEWELRY_TYPE_ID] || {};
                        const inventoryDetails = groupedAmount[JEWELRY_TYPE_ID].inventoryDetails = {};

                        lotSearch.run().each(res => {
                            const lotNumber = res.getValue("internalid");

                            const goldAmt = parseFloat(res.getValue("custitemnumber_jj_cost_gold") || 0);
                            const diaAmt = parseFloat(res.getValue("custitemnumber_jj_cost_diamond") || 0);
                            const csAmt = parseFloat(res.getValue("custitemnumber_jj_cost_color_stone") || 0);
                            const mcAmt = parseFloat(res.getValue("custitemnumber_jj_cost_making_charge") || 0);
                            const partyDiaAmt = parseFloat(res.getValue("custitemnumber_jj_cost_party_diamond") || 0);
                            const alloyAmt = parseFloat(res.getValue("custitemnumber_jj_cost_alloy") || 0);
                            const labourOverhead = parseFloat(res.getValue("custitemnumber_jj_total_labour_overhead_char") || 0);
                            const netLoss = parseFloat(res.getValue("custitemnumber_jj_total_net_loss_charge") || 0);
                            const findingService = parseFloat(res.getValue("custitemnumber_jj_finding_item_service_chrg") || 0);

                            serialBase[lotNumber] = this.extractSerialBaseDetails(res);

                            // const perPiece = goldAmt + diaAmt + csAmt + mcAmt;
                            const perPiece = goldAmt + diaAmt + csAmt + mcAmt + alloyAmt;

                            inventoryDetails[lotNumber] = {
                                gold: {
                                    totalQuantity: parseFloat(res.getValue("custitemnumber_jj_serial_num_net_weight") || 0),
                                    totalCreditAmount: goldAmt
                                },
                                diamond: {
                                    totalQuantity: (parseFloat(res.getValue("custitemnumber_jj_serial_num_diamond_weight") || 0) / CARATS_TO_GRAMS_CONST),
                                    totalCreditAmount: diaAmt
                                },
                                colorstone: {
                                    totalQuantity: (parseFloat(res.getValue("custitemnumber_jj_serial_num_cs_weight") || 0) / CARATS_TO_GRAMS_CONST),
                                    totalCreditAmount: csAmt
                                },
                                alloy: {
                                    totalQuantity: parseFloat(res.getValue("custitemnumber_jj_serial_num_alloy_weight") || 0),
                                    totalCreditAmount: alloyAmt
                                },
                                party_diamond: {
                                    totalQuantity: (parseFloat(res.getValue("custitemnumber_jj_serial_num_partydiamond_wt") || 0) / CARATS_TO_GRAMS_CONST),
                                    totalCreditAmount: partyDiaAmt
                                },
                                making_charge: {
                                    totalCreditAmount: mcAmt
                                },
                                labour_overheads: {
                                    totalQuantity: labourOverhead,
                                    totalCreditAmount: labourOverhead
                                },
                                net_loss: {
                                    totalQuantity: netLoss,
                                    totalCreditAmount: netLoss
                                },
                                finding_service: {
                                    totalQuantity: findingService,
                                    totalCreditAmount: findingService
                                },
                                pure_weight: parseFloat(res.getValue("custitemnumber_jj_serial_num_pure_weight") || 0),
                                diamondPieces: parseFloat(res.getValue("custitemnumber_jj_serial_num_diamond_pieces") || 0),
                                csPieces: parseFloat(res.getValue("custitemnumber_jj_serial_num_cs_pieces") || 0),
                                perPiece: perPiece
                            };

                            return true;
                        });
                    }

                    log.debug("Grouped Amount after Component Details", { groupedAmount, serialLotArray, alloyDetails });
                    log.debug("Component Base Details", { compBaseDetails: { itemBaseDetails, serialBase } });

                    return { groupedAmount, serialLotArray, alloyDetails, compBaseDetails: { itemBaseDetails, serialBase } };

                } catch (error) {
                    log.error("Error in componentDetailsSearch", error);
                    return { groupedAmount, compBaseDetails: { itemBaseDetails: {}, serialBase: {} } };
                }
            },

            // For Bag Summmary
            getAllBagsData(materialType, departmentId, bagSearchKey) {
                try {
                    log.debug("getSpecificMaterialDetails", { materialType, departmentId });

                    let materialTypeId = "";
                    if (materialType == 'gold_type') {
                        materialTypeId = MATERIAL_TYPE_ID_GOLD;
                    } else if (materialType == 'diamond_type') {
                        materialTypeId = MATERIAL_TYPE_ID_DIAMOND;
                    } else if (materialType == 'color_stone_type') {
                        materialTypeId = MATERIAL_TYPE_ID_COLOR_STONE;
                    } else {
                        materialTypeId = "";
                    }

                    bagSearchKey = bagSearchKey?.replace(/'/g, "''").replace(/[%_]/g, ch => '\\' + ch) || '';
                    let sqlQuery = this.getSpecificMaterialDetailsQuery(materialTypeId, departmentId, bagSearchKey);
                    log.debug("sqlQuery", sqlQuery);

                    // Run the query as a paged query
                    let results = query.runSuiteQLPaged({ query: sqlQuery, pageSize: 1000 });
                    // Retrieve the query results using an iterator
                    let resultIterator = results.iterator();

                    // Retrieve the query results using an iterator
                    let groupedData = {};
                    let finalData = {};

                    resultIterator.each(function (page) {
                        // log.debug(page.value.pageRange.index, page.value.pageRange.size);
                        let pageIterator = page.value.data.iterator();
                        pageIterator.each(function (row) {
                            let rowData = row.value.values;

                            let departmentId = rowData[12];
                            let departmentName = rowData[27];
                            let bagId = rowData[25];
                            let bagName = rowData[26];
                            let materialType = rowData[24];
                            let itemId = rowData[0];
                            let itemName = rowData[13];

                            // Initialize nested hierarchy
                            if (!finalData[departmentId]) {
                                finalData[departmentId] = {
                                    departmentId: departmentId,
                                    departmentName: departmentName,
                                    bags: {}
                                };
                            }

                            let dept = finalData[departmentId];

                            if (!dept.bags[bagId]) {
                                dept.bags[bagId] = {
                                    bagId: bagId,
                                    bagName: bagName,
                                    materials: {
                                        gold: { totalQuantity: 0, items: {} },
                                        diamond: { totalQuantity: 0, items: {} },
                                        colorStone: { totalQuantity: 0, items: {} }
                                    }
                                };
                            }

                            let matKey = '';
                            if (materialType == MATERIAL_TYPE_ID_GOLD) matKey = 'gold';
                            else if (materialType == MATERIAL_TYPE_ID_DIAMOND) matKey = 'diamond';
                            else if (materialType == MATERIAL_TYPE_ID_COLOR_STONE) matKey = 'colorStone';
                            else return true;

                            let bag = dept.bags[bagId];
                            let mat = bag.materials[matKey];

                            // Aggregate quantity
                            let quantity = parseFloat(rowData[1] || 0);
                            let pieces = parseInt(rowData[14] || 0);
                            mat.totalQuantity += quantity;

                            // Initialize item if needed
                            if (!mat.items[itemId]) {
                                mat.items[itemId] = {
                                    itemId: itemId,
                                    itemName: itemName,
                                    quantity: 0,
                                    totalIssue: 0,
                                    toIssue: 0,
                                    quantityInBag: 0,
                                    totalReceive: 0,
                                    balanceQty: 0,
                                    totalLossQty: 0,
                                    pieces: 0,
                                    piecesIssued: 0,
                                    piecesToIssue: 0,
                                    piecesInBag: 0,
                                    piecesReceived: 0,
                                    balancepieces: 0,
                                    piecesLoss: 0
                                };
                            }

                            let item = mat.items[itemId];
                            item.quantity = Number(parseFloat(item.quantity + quantity).toFixed(4)) || 0;
                            item.totalIssue = Number(parseFloat(item.totalIssue + parseFloat(rowData[2] || 0)).toFixed(4)) || 0;
                            item.toIssue = Number(parseFloat(item.toIssue + parseFloat(rowData[3] || 0)).toFixed(4)) || 0;
                            item.quantityInBag = Number(parseFloat(item.quantityInBag + parseFloat(rowData[4] || 0)).toFixed(4)) || 0;
                            item.totalReceive = Number(parseFloat(item.totalReceive + parseFloat(rowData[5] || 0)).toFixed(4)) || 0;
                            item.balanceQty = Number(parseFloat(item.balanceQty + parseFloat(rowData[6] || 0)).toFixed(4)) || 0;
                            item.totalLossQty = Number(parseFloat(item.totalLossQty + parseFloat(rowData[7] || 0)).toFixed(4)) || 0;

                            item.pieces = parseInt(item.pieces + parseInt(rowData[14] || 0)) || 0;
                            item.piecesIssued = parseInt(item.piecesIssued + parseInt(rowData[15] || 0)) || 0;
                            item.piecesToIssue = parseInt(item.piecesToIssue + parseInt(rowData[16] || 0)) || 0;
                            item.piecesInBag = parseInt(item.piecesInBag + parseInt(rowData[17] || 0)) || 0;
                            item.piecesReceived = parseInt(item.piecesReceived + parseInt(rowData[18] || 0)) || 0;
                            item.balancepieces = parseInt(item.balancepieces + parseInt(rowData[19] || 0)) || 0;
                            item.piecesLoss = parseInt(item.piecesLoss + parseInt(rowData[20] || 0)) || 0;

                            return true;
                        });
                        return true;
                    });

                    // Convert nested maps to arrays
                    let structuredOutput = Object.values(finalData).map(dept => ({
                        ...dept,
                        bags: Object.values(dept.bags).map(bag => ({
                            ...bag,
                            materials: {
                                gold: {
                                    totalQuantity: bag.materials.gold.totalQuantity,
                                    items: Object.values(bag.materials.gold.items)
                                },
                                diamond: {
                                    totalQuantity: bag.materials.diamond.totalQuantity,
                                    items: Object.values(bag.materials.diamond.items)
                                },
                                colorStone: {
                                    totalQuantity: bag.materials.colorStone.totalQuantity,
                                    items: Object.values(bag.materials.colorStone.items)
                                }
                            }
                        }))
                    }));

                    log.debug("structuredOutput", structuredOutput);

                    return { status: "SUCCESS", reason: 'Structured Result Ready', data: structuredOutput };

                } catch (error) {
                    log.error('error @ getAllBagsData', error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            getItemPricing(otherChargeItemId, vendorId) {
                try {
                    const searchResult = search.create({
                        type: "otherchargeitem",
                        filters: [
                            ["internalid", "anyof", otherChargeItemId],
                            "AND", ["othervendor", "anyof", vendorId]
                        ],
                        columns: [
                            search.createColumn({ name: "cost" }),         // Purchase Price
                            search.createColumn({ name: "vendorcost" })    // Vendor Price
                        ]
                    }).run().getRange({ start: 0, end: 1 });

                    if (searchResult.length) {
                        return {
                            purchasePrice: parseFloat(searchResult[0].getValue("cost") || 0),
                            vendorPrice: parseFloat(searchResult[0].getValue("vendorcost") || 0)
                        };
                    }

                    return { purchasePrice: 0, vendorPrice: 0 };
                } catch (error) {
                    log.error("Error @getItemPricing", error);
                    return { purchasePrice: 0, vendorPrice: 0 };
                }
            },

            getTotalNetWeight(serialNumbers) {
                try {
                    if (!serialNumbers.length) return 0;

                    const inventorynumberSearch = search.create({
                        type: "inventorynumber",
                        filters: [
                            ["internalid", "anyof", serialNumbers]
                        ],
                        columns: [
                            search.createColumn({
                                name: "custitemnumber_jj_serial_num_net_weight"
                            })
                        ]
                    });

                    let totalNetWeight = 0;
                    inventorynumberSearch.run().each(result => {
                        totalNetWeight += parseFloat(result.getValue({
                            name: "custitemnumber_jj_serial_num_net_weight"
                        }) || 0);
                        return true;
                    });

                    return totalNetWeight;
                } catch (error) {
                    log.error("Error @getTotalNetWeight", error);
                    return 0;
                }
            },

            /**
             * Get the fab outsourcing charge item line and work order assembly quantity.
             * @param {number|string} workOrderId - Internal ID of the work order.
             * @param {number} bagQuantity - Quantity from the bag.
             * @returns {Object|null} - Combined object with charge item and calculated quantities or null if not found.
             */
            getFirstFabOutsourcingLineDetails(workOrderId, bagQuantity) {
                try {
                    let workorderSearchObj = search.create({
                        type: "workorder",
                        settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                        filters: [
                            ["type", "anyof", "WorkOrd"],
                            "AND", ["mainline", "any", ""],
                            "AND", [
                                ["custcol_jj_is_fab_outsourcing_charge", "is", "T"],
                                "OR", ["line", "equalto", "0"]
                            ],
                            "AND", ["internalid", "anyof", workOrderId]
                        ],
                        columns: [
                            search.createColumn({ name: "item", label: "Item" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({ name: "unit", label: "Units" }),
                            search.createColumn({ name: "custcol_jj_pieces", label: "Pieces" }),
                            search.createColumn({ name: "cost", join: "item", label: "Purchase Price" }),
                            search.createColumn({ name: "line", label: "Line ID" })
                        ]
                    });

                    let workOrderQty = 0;
                    let chargeItemLine = null;

                    workorderSearchObj.run().each(function (result) {
                        log.debug("Work Order Search Result", result);
                        const lineId = result.getValue({ name: "line" });

                        if (lineId == 0 || lineId == "0") {
                            // This is the main assembly item line
                            workOrderQty = parseFloat(result.getValue({ name: "quantity" }) || 0);
                        } else {
                            // Assume this is the other charge item line
                            chargeItemLine = {
                                rmCode: result.getText({ name: "item" }) || "",
                                rmCodeId: result.getValue({ name: "item" }) || "",
                                quantity: parseFloat(result.getValue({ name: "quantity" }) || 0),
                                uom: result.getText({ name: "unit" }) || "",
                                uomId: result.getValue({ name: "unit" }) || "",
                                actualPiecesInfo: parseFloat(result.getValue({ name: "custcol_jj_pieces" }) || 0),
                                purchasePrice: parseFloat(result.getValue({ name: "cost", join: "item" }) || 0),
                                woLineNo: result.getValue({ name: "line" }) || '',
                            };
                        }

                        return true;
                    });

                    if (!chargeItemLine) {
                        return null; // No other charge item line found
                    }

                    // Ratio calculation
                    const ratio = workOrderQty > 0 ? bagQuantity / workOrderQty : 1;
                    const revisedQuantity = (chargeItemLine.quantity * ratio).toFixed(4);
                    const updatedQuantity = revisedQuantity;

                    return {
                        ...chargeItemLine,
                        bagQuantity,
                        workOrderQty,
                        revisedQuantity: parseFloat(revisedQuantity),
                        updatedQuantity: parseFloat(updatedQuantity)
                    };

                } catch (e) {
                    log.error("Error in getFirstFabOutsourcingLineDetails", e.message);
                    return null;
                }
            },

            /**
             * Fetches Direct Issue Return details for a specific Bag and Bag Core Material.
             * Assumes there will only be one result line.
             *
             * @param {string} bagId - The internal ID of the Bag.
             * @param {string} bagCoreMaterialId - The internal ID of the Bag Core Material.
             * @returns {Object|null} - Returns the search result object or null if not found.
             */
            getDirectIssueReturnDetails(bagId, bagCoreMaterialId) {
                try {
                    var searchResult = search.create({
                        type: "customrecord_jj_direct_issue_return",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_operations.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_operations.custrecord_jj_oprtns_exit", "isempty", ""],
                            "AND", ["custrecord_jj_operations.custrecord_jj_oprtns_bagno", "anyof", bagId],
                            "AND", ["custrecord_jj_bag_core_material_record", "anyof", bagCoreMaterialId]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "custrecord_jj_metal_actual_quantity", label: "Metal Actual Quantity" }),
                            search.createColumn({ name: "custrecord_jj_issued_quantity", label: "Issued Quantity" })
                        ]
                    }).run().getRange({ start: 0, end: 1 }); // Only fetch one result

                    if (searchResult && searchResult.length > 0) {
                        var result = searchResult[0];
                        return {
                            id: result.getValue({ name: "internalid" }),
                            issuedQty: parseFloat(result.getValue({ name: "custrecord_jj_issued_quantity" }) || 0)
                        };
                    } else {
                        return null;
                    }
                } catch (error) {
                    log.error("getDirectIssueReturnDetails Error", error);
                    return null;
                }
            },

            /**
             * Fetches department-wise employee mapping for the specified manufacturing departments.
             * 
             * @param {Array<string|number>} departmentIds - Array of department internal IDs.
             * @returns {Object} A mapping object with department ID as key and an array of employees (value, name) as value.
             */
            getDepartmentEmployeesMap(departmentIds, allEmployees, locations) {
                try {
                    if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
                        return {};
                    }

                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND", ["internalid", "anyof", departmentIds],
                        "AND", ["custrecord_jj_mandept_employees.isinactive", "is", "F"]
                    ];

                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["custrecord_jj_mandept_location", "anyof", locationArr]);
                        }
                    }

                    let columns = [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }),
                        search.createColumn({ name: "altname", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }),
                        search.createColumn({ name: "firstname", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }),
                        search.createColumn({ name: "middlename", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }),
                        search.createColumn({ name: "lastname", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }),
                    ];

                    if (allEmployees && (allEmployees == true || allEmployees == "true")) {
                        columns.push(search.createColumn({ name: "custrecord_jj_mandept_hod", label: "Head Of Department" }))
                    }

                    let deptSearchObj = search.create({
                        type: "customrecord_jj_manufacturing_dept",
                        filters: filters,
                        columns: columns,
                    });

                    let deptEmployeeMap = {};

                    deptSearchObj.run().each(function (result) {
                        let deptId = result.getValue({ name: "internalid" });
                        let empId = result.getValue({ name: "internalid", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" });

                        let name = result.getValue({ name: "altname", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" });
                        if (!name) {
                            name = result.getValue({ name: "firstname", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }) || "";
                            const middle = result.getValue({ name: "middlename", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }) || "";
                            const last = result.getValue({ name: "lastname", join: "CUSTRECORD_JJ_MANDEPT_EMPLOYEES" }) || "";
                            name = [name, middle, last].filter(Boolean).join(" ").trim();
                        }

                        if (!deptEmployeeMap[deptId]) {
                            deptEmployeeMap[deptId] = [];
                        }

                        if (empId) {
                            deptEmployeeMap[deptId].push({
                                value: empId,
                                text: name,
                                isHod: false
                            });
                        }

                        if (allEmployees && (allEmployees == true || allEmployees == "true")) {
                            const hodId = result.getValue({ name: "custrecord_jj_mandept_hod" });
                            const hodName = result.getText({ name: "custrecord_jj_mandept_hod" });
                            const exists = (deptEmployeeMap[deptId] || []).some(emp => emp.value === hodId);
                            if (!exists && hodId) {
                                if (!deptEmployeeMap[deptId]) {
                                    deptEmployeeMap[deptId] = [];
                                }
                                deptEmployeeMap[deptId].push({ value: hodId, text: hodName, isHod: true });
                            }
                        }

                        return true;
                    });

                    return deptEmployeeMap;
                } catch (error) {
                    log.error('getDepartmentEmployeesMap', error);
                    return {};
                }
            },

            /**
             * Reclass alloy cost from Gold(1) to Alloy(6) using inventoryitem.averagecost
             * @param {Object} alloyDetails - { [itemId]: { totalQuantity: number } }
             * @param {Object} groupedAmountQuantity - e.g. { 1:{totalCreditAmount,...}, 6:{...} }
             * @returns {Object} groupedAmountQuantity (updated)
             */
            applyAlloyCostFromAverageCost(alloyDetails, groupedAmountQuantity) {
                try {
                    // Collect item IDs with positive alloy qty
                    let colorIds = Object.keys(alloyDetails || {}).filter(function (id) {
                        return id && Number(alloyDetails[id]?.totalQuantity || 0) > 0;
                    });
                    if (colorIds.length === 0) return { groupedAmountQuantity };

                    let inventoryitemSearchObj = search.create({
                        type: "inventoryitem",
                        filters: [
                            ["type", "anyof", "InvtPart"], "AND",
                            ["internalid", "anyof", ALLOY_ITEMS],
                            "AND", ["custitem_jj_metal_color", "anyof", colorIds]
                        ],
                        columns: [
                            search.createColumn({ name: "custitem_jj_metal_color", label: "Metal Color" }),
                            search.createColumn({ name: "averagecost" })
                        ]
                    });

                    // Iterate results and compute alloyTotal
                    let alloyTotal = 0;
                    let avgCostMap = {};
                    inventoryitemSearchObj.run().each(function (res) {
                        let id = res.getValue({ name: "custitem_jj_metal_color" });
                        let avg = Number(res.getValue({ name: "averagecost" }) || 0);
                        let qty = Number(alloyDetails[id]?.totalQuantity || 0);
                        alloyTotal += (avg * qty);

                        // store rate in avgCostMap
                        avgCostMap[id] = avg;
                        return true;
                    });

                    log.debug("alloyTotal", { alloyTotal });

                    if (!groupedAmountQuantity[MATERIAL_TYPE_ID_GOLD]?.totalCreditAmount) {
                        if (!groupedAmountQuantity[MATERIAL_TYPE_ID_GOLD]) {
                            groupedAmountQuantity[MATERIAL_TYPE_ID_GOLD] = {};
                        }
                        groupedAmountQuantity[MATERIAL_TYPE_ID_GOLD].totalCreditAmount = 0;
                    }
                    if (!groupedAmountQuantity[MATERIAL_TYPE_ID_ALLOY]?.totalCreditAmount) {
                        if (!groupedAmountQuantity[MATERIAL_TYPE_ID_ALLOY]) {
                            groupedAmountQuantity[MATERIAL_TYPE_ID_ALLOY] = {};
                        }
                        groupedAmountQuantity[MATERIAL_TYPE_ID_ALLOY].totalCreditAmount = 0;
                    }

                    // Update grouped totals
                    groupedAmountQuantity[MATERIAL_TYPE_ID_GOLD].totalCreditAmount -= alloyTotal;
                    groupedAmountQuantity[MATERIAL_TYPE_ID_ALLOY].totalCreditAmount += alloyTotal;

                    return { groupedAmountQuantity, avgCostMap };
                } catch (e) {
                    log.error("Error in applyAlloyCostFromAverageCost", e);
                    return { groupedAmountQuantity, avgCostMap: {} };
                }
            },

            /**
             * Get the average cost of alloys based on their color IDs.
             * @param {Array} colorIds - The color IDs to filter the alloys.
             * @returns {Object} - A map of alloy internal IDs to their average costs.
             */
            getAlloyAvgCost(colorIds) {
                try {
                    let avgCostMap = {};
                    if (!colorIds || colorIds.length === 0) {
                        return avgCostMap;
                    };
                    let inventoryitemSearchObj = search.create({
                        type: "inventoryitem",
                        filters: [
                            ["type", "anyof", "InvtPart"], "AND",
                            ["internalid", "anyof", ALLOY_ITEMS],
                            "AND", ["custitem_jj_metal_color", "anyof", colorIds]
                        ],
                        columns: [
                            search.createColumn({ name: "custitem_jj_metal_color" }),
                            search.createColumn({ name: "averagecost" })
                        ]
                    });

                    inventoryitemSearchObj.run().each(function (res) {
                        let id = res.getValue({ name: "custitem_jj_metal_color" });
                        let avg = Number(res.getValue({ name: "averagecost" }) || 0);
                        avgCostMap[id] = avg;
                        return true;
                    });

                    return avgCostMap;
                } catch (error) {
                    log.error('getAlloyAvgCost', error);
                    return {};
                }
            },

            /**
             * Returns grouped Item Receipt serial data by Transfer Order
             * @returns {Object}
             */
            getTransferOrderSerials(transferOrderIds) {
                const resultObj = {};
                const usedSerials = new Set(); // global duplicate tracker
                log.debug('getTransferOrderSerials - Model Method', {
                    transferOrderIds: transferOrderIds,
                    count: transferOrderIds ? transferOrderIds.length : 0,
                    isArray: Array.isArray(transferOrderIds)
                });

                try {


                    // Build filters
                    let filters = [
                        ["type", "anyof", "ItemRcpt"],
                        "AND", ["createdfrom.type", "anyof", "TrnfrOrd"],
                        "AND", ["mainline", "is", "F"],
                        "AND", ["taxline", "is", "F"],
                        "AND", ["cogs", "is", "F"],
                        "AND", ["inventorydetail.location", "noneof", "@NONE@"]
                    ];

                    // Add filter for specific Transfer Orders if provided
                    if (transferOrderIds && transferOrderIds.length > 0) {
                        filters.push("AND", ["createdfrom", "anyof", transferOrderIds]);
                        log.debug('getTransferOrderSerials - Filtering by specific TOs', transferOrderIds);
                    } else {
                        log.debug('getTransferOrderSerials - No filter, fetching all TOs');
                    }

                    let itemreceiptSearchObj = search.create({
                        type: "itemreceipt",
                        settings: [
                            { name: "consolidationtype", value: "ACCTTYPE" }
                        ],
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "createdfrom", sort: search.Sort.DESC, label: "createdFrom" }),
                            search.createColumn({ name: "inventorynumber", join: "inventoryDetail", label: "inventoryNumber" }),
                            search.createColumn({ name: "binnumber", join: "inventoryDetail", label: "binNumber" }),
                            search.createColumn({ name: "status", join: "inventoryDetail", label: "status" }),
                            search.createColumn({ name: "location", join: "inventoryDetail", label: "location" }),
                            search.createColumn({ name: "custbody_jj_to_department", join: "createdFrom", label: "to_department" })
                        ]
                    });

                    const pagedData = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: itemreceiptSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(itemreceiptSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    pagedData.forEach((row) => {
                        try {
                            const createdFrom = row.createdFrom?.text;
                            const createdFromId = row.createdFrom?.value;
                            if (!createdFromId) return;

                            const serialId = row.inventoryNumber?.value;
                            if (!serialId) return; // already used anywhere else

                            usedSerials.add(serialId); // mark globally locked

                            const serialText = row.inventoryNumber?.text;
                            const binId = row.binNumber?.value;
                            const binText = row.binNumber?.text;
                            const statusId = row.status?.value;
                            const statusText = row.status?.text;
                            const locationId = row.location?.value;
                            const locationText = row.location?.text;
                            const toDepartment = row.to_department?.value;
                            const toDepartmentText = row.to_department?.text;

                            if (!resultObj[createdFromId]) {
                                resultObj[createdFromId] = {
                                    transferOrderText: createdFrom?.split('#')?.pop(),
                                    toDepartment,
                                    toDepartmentText,
                                    serialLines: []
                                };
                            }

                            // Check if this serial already exists in the serialLines for this TO
                            const serialExists = resultObj[createdFromId].serialLines.some(
                                s => s.serialId === serialId
                            );

                            // Only add if not already present for this specific TO
                            if (!serialExists) {
                                resultObj[createdFromId].serialLines.push({
                                    serialId,
                                    serialText,
                                    binId,
                                    binText,
                                    statusId,
                                    statusText,
                                    locationId,
                                    locationText
                                });
                            }

                        } catch (errRow) {
                            log.error("Row Error", errRow);
                        }
                    });

                    // Remove Transfer Orders with no serials after filtering
                    Object.keys(resultObj).forEach(key => {
                        if (!resultObj[key].serialLines.length) {
                            delete resultObj[key];
                        }
                    });

                } catch (error) {
                    log.error("Search Error", error);
                    return {};
                }

                return resultObj;
            },
            /**
            * Returns grouped Bin Transfer serial data
            * @param {Array} binTransferIds - Optional array of Bin Transfer internal IDs to filter
            * @returns {Object}
            */
            getInventoryStatusChangeSerials(inventoryStatusChangeIds) {
                const resultObj = {};
                const usedSerials = new Set(); // global duplicate tracker

                log.debug('getInventoryStatusChangeSerials - Model Method', {
                    inventoryStatusChangeIds: inventoryStatusChangeIds,
                    count: inventoryStatusChangeIds ? inventoryStatusChangeIds.length : 0,
                    isArray: Array.isArray(inventoryStatusChangeIds)
                });

                try {
                    // Build filters
                    let filters = [
                        ["type", "anyof", "StatChng"],
                        "AND", ["custbody_jj_reason_code", "anyof", REASON_CODE_LOC_TRANSFER],
                        "AND", ["mainline", "is", "F"],
                        "AND", ["taxline", "is", "F"],
                        "AND", ["cogs", "is", "F"],
                        "AND", ["inventorydetail.location", "noneof", "@NONE@"],
                        "AND", ["formulanumeric: MOD({linesequencenumber}, 2)", "equalto", "0"]
                    ];

                    // Filter by specific Inventory Status Change records if provided
                    if (inventoryStatusChangeIds && inventoryStatusChangeIds.length > 0) {
                        filters.push("AND", ["internalid", "anyof", inventoryStatusChangeIds]);
                        log.debug('getInventoryStatusChangeSerials - Filtering by specific records', inventoryStatusChangeIds);
                    } else {
                        log.debug('getInventoryStatusChangeSerials - No filter, fetching all Inventory Status Change records');
                    }

                    const inventorystatuschangeSearchObj = search.create({
                        type: "inventorystatuschange",
                        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
                        filters: filters,
                        columns: [
                            search.createColumn({
                                name: "internalid",
                                label: "internalId"
                            }),
                            search.createColumn({
                                name: "inventorynumber",
                                join: "inventoryDetail",
                                label: "serialNumber"
                            }),
                            search.createColumn({
                                name: "location",
                                join: "inventoryDetail",
                                label: "location"
                            }),
                            search.createColumn({
                                name: "binnumber",
                                join: "inventoryDetail",
                                label: "binNumber"
                            }),
                            search.createColumn({
                                name: "status",
                                join: "inventoryDetail",
                                label: "status"
                            })
                        ]
                    });

                    const pagedData = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventorystatuschangeSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorystatuschangeSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    pagedData.forEach((row) => {
                        try {
                            const iscId = row.internalId?.value;
                            if (!iscId) return;

                            const serialId = row.serialNumber?.value;
                            if (!serialId || usedSerials.has(serialId)) return; // skip duplicates

                            usedSerials.add(serialId);

                            const serialText = row.serialNumber?.text;
                            const locationId = row.location?.value;
                            const locationText = row.location?.text;
                            const binId = row.binNumber?.value;
                            const binText = row.binNumber?.text;
                            const statusId = row.status?.value;
                            const statusText = row.status?.text;

                            if (!resultObj[iscId]) {
                                resultObj[iscId] = {
                                    inventoryStatusChangeText: iscId, // replace with tranid/text if needed
                                    serialLines: []
                                };
                            }

                            const serialExists = resultObj[iscId].serialLines.some(
                                s => s.serialId === serialId
                            );

                            if (!serialExists) {
                                resultObj[iscId].serialLines.push({
                                    serialId,
                                    serialText,
                                    locationId,
                                    locationText,
                                    binId,
                                    binText,
                                    statusId,
                                    statusText
                                });
                            }
                        } catch (rowErr) {
                            log.error('getInventoryStatusChangeSerials - Row Processing Error', rowErr);
                        }
                    });

                    log.debug('getInventoryStatusChangeSerials - Final Result', resultObj);
                    return resultObj;

                } catch (e) {
                    log.error('getInventoryStatusChangeSerials - Error', e);
                    return {};
                }
            },

            /**
            * Returns grouped Inventory Status Change serial data
            * @param {Array} invStatusChangeIds - Optional array of Inventory Status Change internal IDs to filter
            * @returns {Object}
            */
            getBinTransferSerials(binTransferIds) {
                const resultObj = {};
                const usedSerials = new Set(); // global duplicate tracker

                log.debug('getBinTransferSerials - Model Method', {
                    binTransferIds: binTransferIds,
                    count: binTransferIds ? binTransferIds.length : 0,
                    isArray: Array.isArray(binTransferIds)
                });

                try {
                    // Build filters
                    let filters = [
                        ["type", "anyof", "BinTrnfr"],
                        "AND", ["mainline", "is", "F"],
                        "AND", ["cogs", "is", "F"],
                        "AND", ["taxline", "is", "F"],
                        "AND", ["location", "noneof", "@NONE@"]
                    ];

                    // Filter by specific Bin Transfers if provided
                    if (binTransferIds && binTransferIds.length > 0) {
                        filters.push("AND", ["internalid", "anyof", binTransferIds]);
                        log.debug('getBinTransferSerials - Filtering by specific BTs', binTransferIds);
                    } else {
                        log.debug('getBinTransferSerials - No filter, fetching all Bin Transfers');
                    }

                    // Even line sequence only
                    filters.push("AND", ["formulanumeric: MOD({linesequencenumber}, 2)", "equalto", "0"]);

                    const bintransferSearchObj = search.create({
                        type: "bintransfer",
                        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
                        filters: filters,
                        columns: [
                            search.createColumn({
                                name: "internalid",
                                label: "internalId"
                            }),
                            search.createColumn({
                                name: "inventorynumber",
                                join: "inventoryDetail",
                                label: "serialNumber"
                            }),
                            search.createColumn({
                                name: "binnumber",
                                join: "inventoryDetail",
                                label: "binNumber"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "inventoryDetail",
                                label: "inventoryDetailId"
                            }),
                            search.createColumn({
                                name: "location",
                                join: "inventoryDetail",
                                label: "location"
                            }),
                            search.createColumn({
                                name: "status",
                                join: "inventoryDetail",
                                label: "status"
                            })
                        ]
                    });

                    const pagedData = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: bintransferSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(bintransferSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    pagedData.forEach((row) => {
                        try {
                            const btId = row.internalId?.value;
                            if (!btId) return;

                            const serialId = row.serialNumber?.value;
                            if (!serialId || usedSerials.has(serialId)) return;

                            usedSerials.add(serialId);

                            const serialText = row.serialNumber?.text;
                            const binId = row.binNumber?.value;
                            const binText = row.binNumber?.text;
                            const inventoryDetailId = row.inventoryDetailId?.value;
                            const statusId = row.status?.value;
                            const statusText = row.status?.text;
                            const locationId = row.location?.value;
                            const locationText = row.location?.text;

                            if (!resultObj[btId]) {
                                resultObj[btId] = {
                                    binTransferText: btId,
                                    serialLines: []
                                };
                            }

                            const serialExists = resultObj[btId].serialLines.some(
                                s => s.serialId === serialId
                            );

                            if (!serialExists) {
                                resultObj[btId].serialLines.push({
                                    serialId,
                                    serialText,
                                    binId,
                                    binText,
                                    inventoryDetailId,
                                    statusId,
                                    statusText,
                                    locationId,
                                    locationText
                                });
                            }

                        } catch (errRow) {
                            log.error("getBinTransferSerials - Row Error", errRow);
                        }
                    });

                    // Remove empty Bin Transfers
                    Object.keys(resultObj).forEach(key => {
                        if (!resultObj[key].serialLines.length) delete resultObj[key];
                    });

                } catch (error) {
                    log.error("getBinTransferSerials - Search Error", error);
                    return {};
                }

                log.debug("Bin Transfer serials", resultObj);
                return resultObj;
            },


            /**
             * Returns inventory number texts from customrecord_jj_fg_serials
             *
             * @param {string[]} inventoryNumbers - Array of inventory number TEXT values
             * @returns {string[]} inventory number text array
             */
            getFGInventoryNumberTexts(inventoryNumbers) {
                try {
                    if (!Array.isArray(inventoryNumbers) || !inventoryNumbers.length) {
                        return [];
                    }

                    // Build OR filter dynamically
                    let invFilters = inventoryNumbers.map(invNo => {
                        return ["custrecord_jj_fgs_serial.inventorynumber", "is", invNo];
                    });

                    // Join OR conditions
                    let filters = [
                        ["isinactive", "is", "F"],
                        "AND",
                        invFilters.reduce((acc, curr) => {
                            if (acc.length) acc.push("OR");
                            acc.push(curr);
                            return acc;
                        }, [])
                    ];

                    let inventoryTexts = [];

                    let searchObj = search.create({
                        type: "customrecord_jj_fg_serials",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "custrecord_jj_fgs_serial", label: "fgs_serial" })
                        ]
                    });

                    let serialsObj = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: searchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(searchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    serialsObj.forEach(row => {
                        const serialText = row.fgs_serial?.text;
                        if (serialText) {
                            inventoryTexts.push(serialText);
                        }
                    });

                    // searchObj.run().each(result => {
                    //     let serialText = result.getText({ name: "custrecord_jj_fgs_serial" });

                    //     if (serialText) {
                    //         inventoryTexts.push(serialText);
                    //     }
                    //     return true;
                    // });

                    log.debug("inventoryTexts", inventoryTexts);
                    return inventoryTexts;

                } catch (e) {
                    log.error({ title: 'Error in getFGInventoryNumberTexts', details: e });
                    return [];
                }
            },

            /**
             * Checks whether a manufacturing department is blocked
             * (Bag Movement or Bag Acknowledgement in progress)
             *
             * @param {number|string} deptId - Manufacturing Department internal ID
             * @returns {boolean}
             */
            isDepartmentBlocked(type, deptId) {
                if (!deptId || !type) {
                    return false;
                }

                try {
                    let processFilter;
                    switch (type) {
                        case 'BAG_MOVEMENT':
                            processFilter = ['custrecord_ongoing_bag_movement', 'is', 'T'];
                            break;

                        case 'BAG_ACKNOWLEDGEMENT':
                            processFilter = ['custrecord_ongoing_bag_acknowledgement', 'is', 'T'];
                            break;

                        case 'BAG_RETURN':
                            processFilter = ['custrecord_jj_ongoing_direct_return', 'is', 'T'];
                            break;

                        case 'BAG_ISSUE':
                            processFilter = ['custrecord_jj_ongoing_direct_issue', 'is', 'T'];
                            break;

                        default:
                            log.error('isDepartmentBlocked', `Invalid type: ${type}`);
                            return false;
                    }

                    let filters = [
                        ['isinactive', 'is', 'F'],
                        'AND', ['internalid', 'anyof', deptId],
                        'AND', processFilter
                    ];
                    const deptSearch = search.create({
                        type: 'customrecord_jj_manufacturing_dept',
                        filters: filters,
                        columns: ['internalid']
                    });

                    let hasResult = false;
                    deptSearch.run().each(() => {
                        hasResult = true;
                        return false; // stop after first match
                    });
                    return hasResult;
                } catch (e) {
                    log.error('Error in isDepartmentBlocked', e);
                    return false; // safe fallback
                }
            },

            /**
             * Get final location for a serial number using Inventory Balance
             * @param {string} serialNumber
             * @returns {object}
             */
            getSerialLocationFromInventoryBalance(serialNumber) {
                try {
                    log.debug('START: getSerialLocationFromInventoryBalance', { input: serialNumber, type: typeof serialNumber });

                    if (!serialNumber || !String(serialNumber).trim()) {
                        log.error('VALIDATION FAILED: Serial number is empty or null', serialNumber);
                        return {
                            status: 'ERROR',
                            reason: 'Serial number is required',
                            data: null
                        };
                    }

                    const cleanSerial = String(serialNumber).trim();
                    log.debug('CLEAN SERIAL', { original: serialNumber, cleaned: cleanSerial, length: cleanSerial.length });

                    // Log the search configuration
                    log.debug('SEARCH CONFIG', {
                        type: 'inventorybalance',
                        filterField: 'inventorynumber.inventorynumber',
                        filterOperator: 'startswith',
                        filterValue: cleanSerial
                    });

                    const inventoryBalanceSearch = search.create({
                        type: 'inventorybalance',
                        filters: [
                            ['inventorynumber.inventorynumber', 'startswith', cleanSerial]
                        ],
                        columns: [
                            search.createColumn({ name: 'item' }),
                            search.createColumn({ name: 'location' }),
                            search.createColumn({ name: 'inventorynumber', join: 'inventorynumber' }),
                            search.createColumn({ name: 'status' })
                        ]
                    });

                    let resultData = null;
                    let searchCount = 0;
                    let allResults = [];

                    inventoryBalanceSearch.run().each(result => {
                        searchCount++;

                        const itemId = result.getValue({ name: 'item' });
                        const itemName = result.getText({ name: 'item' });
                        const locationId = result.getValue({ name: 'location' });
                        const locationName = result.getText({ name: 'location' });
                        const inventoryNumber = result.getValue({ name: 'inventorynumber', join: 'inventorynumber' });
                        const status = result.getText({ name: 'status' });

                        log.debug('Search result #' + searchCount, {
                            item_id: itemId,
                            item_name: itemName,
                            location_id: locationId,
                            location_name: locationName,
                            inventory_number: inventoryNumber,
                            status: status
                        });

                        const currentResult = {
                            item_id: itemId,
                            item_name: itemName,
                            location_id: locationId,
                            location_name: locationName,
                            inventory_number: inventoryNumber,
                            status: status,
                        };

                        allResults.push(currentResult);

                        // Store first result as primary
                        if (!resultData) {
                            resultData = currentResult;
                            log.debug('First result stored as primary', resultData);
                        }

                        return true; // Continue iterating to see all results
                    });

                    log.debug('SEARCH COMPLETE', {
                        totalResultsFound: searchCount,
                        allResults: allResults,
                        primaryResult: resultData
                    });

                    if (!resultData) {
                        log.debug('NO RESULTS FOUND', {
                            serialNumber: cleanSerial,
                            searchType: 'inventorybalance',
                            filterUsed: 'startswith'
                        });
                        return {
                            status: 'WARNING',
                            reason: `No inventory balance found for serial ${cleanSerial}`,
                            data: null
                        };
                    }

                    log.debug('✓ SAVED SEARCH SUCCESS', {
                        status: 'Data found and ready',
                        serialNumber: cleanSerial,
                        totalSearchResults: searchCount,
                        primaryResultData: resultData,
                        timestamp: new Date().toISOString()
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Location resolved from inventory balance',
                        data: resultData
                    };

                } catch (e) {
                    log.error('ERROR getSerialLocationFromInventoryBalance', {
                        error: e.message || String(e),
                        stack: e.stack,
                        serialNumber: serialNumber
                    });
                    return {
                        status: 'ERROR',
                        reason: e.message || String(e),
                        data: null
                    };
                }
            },

            // /**
            //  * Retrieves FG Serial Components for the Direct Repair page
            //  * Takes serial number, fetches from inventorynumber, then FG Serial, then components via joins
            //  * 
            //  * @param {String} serialNumber - The serial number (e.g., "SN-001")
            //  * @returns {Object} - Object containing status, reason, and components data
            //  */
            // getFGSerialComponentsBySerialId(serialNumber) {
            //     try {
            //         log.debug('getFGSerialComponentsBySerialId START', { serialNumber: serialNumber });

            //         if (!serialNumber) {
            //             log.error('VALIDATION FAILED: Serial number is empty or null', serialNumber);
            //             return {
            //                 status: 'ERROR',
            //                 reason: 'Serial number is required',
            //                 data: []
            //             };
            //         }

            //         const cleanSerialNumber = String(serialNumber).trim();
            //         log.debug('Clean serial number', { original: serialNumber, cleaned: cleanSerialNumber });

            //         // Step 1: Fetch FG Serial record using cleanSerialNumber (which is the FG Serial internal ID)
            //         // and get the custrecord_jj_fgs_serial field (inventory number internal ID)
            //         log.debug('STEP 1: Fetching FG Serial record using serial ID', { fgSerialId: cleanSerialNumber });
            //         const fgSerialLookupSearch = search.create({
            //             type: 'customrecord_jj_fg_serials',
            //             filters: [
            //                 ['internalid', 'anyof', cleanSerialNumber],
            //                 'AND',
            //                 ['isinactive', 'is', 'F']
            //             ],
            //             columns: [
            //                 search.createColumn({ name: 'internalid' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_serial' })
            //             ]
            //         });

            //         let fgSerialId = null;
            //         let serialInternalId = null;
            //         let fgSerialFound = false;

            //         fgSerialLookupSearch.run().each(function (result) {
            //             fgSerialId = result.getValue({ name: 'internalid' });
            //             serialInternalId = result.getValue({ name: 'custrecord_jj_fgs_serial' });

            //             log.debug('FG Serial record found', {
            //                 fgSerialId: fgSerialId,
            //                 serialInternalId: serialInternalId
            //             });

            //             fgSerialFound = true;
            //             return false; // Stop after first result
            //         });

            //         if (!fgSerialFound || !fgSerialId || !serialInternalId) {
            //             log.debug('NO FG SERIAL FOUND', {
            //                 cleanSerialNumber: cleanSerialNumber
            //             });
            //             return {
            //                 status: 'WARNING',
            //                 reason: `No FG Serial record found for serial ID: ${cleanSerialNumber}`,
            //                 data: []
            //             };
            //         }

            //         log.debug('STEP 1 COMPLETE', { fgSerialId: fgSerialId, serialInternalId: serialInternalId });

            //         // Step 2: Fetch inventory number details using serialInternalId
            //         log.debug('STEP 2: Fetching inventory number details using serialInternalId', { serialInternalId: serialInternalId });
            //         const inventorynumberSearch = search.create({
            //             type: 'inventorynumber',
            //             filters: [
            //                 ['internalid', 'anyof', serialInternalId]
            //             ],
            //             columns: [
            //                 search.createColumn({ name: 'internalid' }),
            //                 search.createColumn({ name: 'inventorynumber' })
            //             ]
            //         });

            //         let inventorynumberFound = false;

            //         inventorynumberSearch.run().each(function (result) {
            //             const invNumber = result.getValue({ name: 'inventorynumber' });

            //             log.debug('Inventory number record found', {
            //                 serialInternalId: serialInternalId,
            //                 inventorynumber: invNumber
            //             });

            //             inventorynumberFound = true;
            //             return false; // Stop after first result
            //         });

            //         if (!inventorynumberFound) {
            //             log.debug('NO INVENTORY NUMBER FOUND', {
            //                 serialInternalId: serialInternalId
            //             });
            //             return {
            //                 status: 'WARNING',
            //                 reason: `No inventory number found for serial internal ID: ${serialInternalId}`,
            //                 data: []
            //             };
            //         }

            //         log.debug('STEP 2 COMPLETE', { serialInternalId: serialInternalId });

            //         // Step 3: Fetch components from FG Serial record using joins
            //         log.debug('STEP 3: Fetching components from FG Serial record using joins', { fgSerialId: fgSerialId });

            //         const fgSerialWithComponentsSearch = search.create({
            //             type: 'customrecord_jj_fg_serials',
            //             filters: [
            //                 ['internalid', 'anyof', fgSerialId],
            //                 'AND',
            //                 ['isinactive', 'is', 'F']
            //             ],
            //             columns: [
            //                 search.createColumn({ name: 'internalid' }),
            //                 // FG Serial fields - All fields displayed in UI
            //                 search.createColumn({ name: 'created' }),
            //                 search.createColumn({ name: 'custrecord_jj_asm_build_date' }),
            //                 search.createColumn({ name: 'custrecord_jj_asm_unbuild' }),
            //                 search.createColumn({ name: 'custrecord_jj_unbuild_date' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_alloy_cost' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_alloy_weight' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_assembly_build' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_assembly_item' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_bag_core_tracking' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_bom_revision' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_clr_stone_cost' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_clr_stone_weight' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_diamond_cost' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_diamond_weight' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_gold_cost' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_gold_weight' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_gross_weight' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_making_charge_cost' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_pure_weight' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_related_so' }),
            //                 search.createColumn({ name: 'custrecord_jj_fgs_related_so_date' }),
            //                 search.createColumn({ name: 'custrecord_jj_sl_customer' }),
            //                 // Join to get components from the FG Serial record
            //                 search.createColumn({ name: 'custrecord_jj_fsc_item', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' }),
            //                 search.createColumn({ name: 'custrecord_jj_fsc_quantity', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' }),
            //                 search.createColumn({ name: 'custrecord_jj_fsc_barcode_quantity', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' }),
            //                 search.createColumn({ name: 'custrecord_jj_fsc_cost', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' }),
            //                 search.createColumn({ name: 'custrecord_jj_fsc_pieces_value', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' }),
            //                 search.createColumn({ name: 'custrecord_jj_fsc_item_units', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' })
            //             ]
            //         });

            //         let componentsData = [];
            //         let componentCount = 0;
            //         let fgSerialDetails = null;

            //         fgSerialWithComponentsSearch.run().each(function (result) {
            //             // Extract FG Serial details (only once)
            //             if (!fgSerialDetails) {
            //                 fgSerialDetails = {
            //                     created: result.getValue({ name: 'created' }),
            //                     asm_build_date: result.getValue({ name: 'custrecord_jj_asm_build_date' }),
            //                     assembly_unbuild_name: result.getText({ name: 'custrecord_jj_asm_unbuild' }),
            //                     assembly_unbuild_date: result.getValue({ name: 'custrecord_jj_unbuild_date' }),
            //                     assembly_unbuild_id: result.getValue({ name: 'custrecord_jj_asm_unbuild' }),
            //                     alloy_cost: result.getValue({ name: 'custrecord_jj_fgs_alloy_cost' }),
            //                     alloy_weight: result.getValue({ name: 'custrecord_jj_fgs_alloy_weight' }),
            //                     assembly_build_name: result.getText({ name: 'custrecord_jj_fgs_assembly_build' }),
            //                     assembly_build_id: result.getValue({ name: 'custrecord_jj_fgs_assembly_build' }),
            //                     assembly_item_name: result.getText({ name: 'custrecord_jj_fgs_assembly_item' }),
            //                     bag_core_tracking: result.getValue({ name: 'custrecord_jj_fgs_bag_core_tracking' }),
            //                     bom_revision: result.getText({ name: 'custrecord_jj_fgs_bom_revision' }),
            //                     clr_stone_cost: result.getValue({ name: 'custrecord_jj_fgs_clr_stone_cost' }),
            //                     clr_stone_weight: result.getValue({ name: 'custrecord_jj_fgs_clr_stone_weight' }),
            //                     diamond_cost: result.getValue({ name: 'custrecord_jj_fgs_diamond_cost' }),
            //                     diamond_weight: result.getValue({ name: 'custrecord_jj_fgs_diamond_weight' }),
            //                     gold_cost: result.getValue({ name: 'custrecord_jj_fgs_gold_cost' }),
            //                     gold_weight: result.getValue({ name: 'custrecord_jj_fgs_gold_weight' }),
            //                     gross_weight: result.getValue({ name: 'custrecord_jj_fgs_gross_weight' }),
            //                     making_charge_cost: result.getValue({ name: 'custrecord_jj_fgs_making_charge_cost' }),
            //                     pure_weight: result.getValue({ name: 'custrecord_jj_fgs_pure_weight' }),
            //                     related_so: result.getText({ name: 'custrecord_jj_fgs_related_so' }),
            //                     related_so_date: result.getValue({ name: 'custrecord_jj_fgs_related_so_date' }),
            //                     customer_name: result.getText({ name: 'custrecord_jj_sl_customer' })
            //                 };
            //                 log.debug('FG Serial Details extracted', fgSerialDetails);
            //             }

            //             componentCount++;

            //             const itemId = result.getValue({ name: 'custrecord_jj_fsc_item', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const itemText = result.getText({ name: 'custrecord_jj_fsc_item', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const quantity = result.getValue({ name: 'custrecord_jj_fsc_quantity', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const barcodeQuantity = result.getValue({ name: 'custrecord_jj_fsc_barcode_quantity', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const cost = result.getValue({ name: 'custrecord_jj_fsc_cost', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const pieces = result.getValue({ name: 'custrecord_jj_fsc_pieces_value', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const unitsId = result.getValue({ name: 'custrecord_jj_fsc_item_units', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });
            //             const unitsText = result.getText({ name: 'custrecord_jj_fsc_item_units', join: 'CUSTRECORD_JJ_FSC_SERIAL_NUMBER' });

            //             log.debug('Component result #' + componentCount, {
            //                 item_id: itemId,
            //                 item_text: itemText,
            //                 quantity: quantity,
            //                 barcode_quantity: barcodeQuantity,
            //                 cost: cost,
            //                 pieces: pieces,
            //                 units_id: unitsId,
            //                 units_text: unitsText
            //             });

            //             componentsData.push({
            //                 item: itemId,
            //                 item_text: itemText,
            //                 quantity: quantity,
            //                 barcode_quantity: barcodeQuantity,
            //                 cost: cost,
            //                 pieces: pieces,
            //                 units: unitsId,
            //                 units_text: unitsText
            //             });
            //             return true;
            //         });

            //         log.debug('STEP 3 COMPLETE', {
            //             fgSerialId: fgSerialId,
            //             componentCount: componentCount,
            //             componentsData: componentsData,
            //             fgSerialDetails: fgSerialDetails
            //         });

            //         // Step 4: Fetch component inventory tracking data from FG Serial Components linked to assembly build
            //         log.debug('═══════════════════════════════════════════════════════════════', {
            //             message: 'STEP 4 START: Fetching component inventory tracking'
            //         });
            //         log.debug('STEP 4: Input Parameters', {
            //             assemblyBuildId: fgSerialDetails?.assembly_build_id,
            //             fgSerialId: fgSerialId,
            //             hasAssemblyBuild: !!fgSerialDetails?.assembly_build_id,
            //             hasFgSerialId: !!fgSerialId
            //         });

            //         let componentInventoryTrackingData = [];

            //         if (fgSerialDetails?.assembly_build_id && fgSerialId) {
            //             log.debug('✓ STEP 4: Condition passed - proceeding with search');
            //             try {
            //                 // Get FG Serial Component IDs linked to this assembly build
            //                 log.debug('STEP 4: Creating FG Serial Component search', {
            //                     searchType: 'customrecord_jj_fg_serial_components',
            //                     filterFgSerialId: fgSerialId,
            //                     filterAssemblyBuildId: fgSerialDetails.assembly_build_id
            //                 });

            //                 const fgSerialComponentSearch = search.create({
            //                     type: 'customrecord_jj_fg_serial_components',
            //                     filters: [
            //                         ['custrecord_jj_fsc_serial_number', 'anyof', fgSerialId],
            //                         'AND',
            //                         ['isinactive', 'is', 'F']
            //                     ],
            //                     columns: [
            //                         search.createColumn({ name: 'internalid' }),
            //                         search.createColumn({ name: 'custrecord_jj_fsc_item' })
            //                     ]
            //                 });

            //                 let fgSerialComponentIds = [];
            //                 let componentSearchCount = 0;
            //                 fgSerialComponentSearch.run().each(function (result) {
            //                     componentSearchCount++;

            //                     const componentId = result.getValue({ name: 'internalid' });
            //                     const itemId = result.getValue({ name: 'custrecord_jj_fsc_item' });

            //                     log.debug('STEP 4: FG Serial Component found #' + componentSearchCount, {
            //                         componentId: componentId,
            //                         itemId: itemId
            //                     });

            //                     if (componentId) {
            //                         const trackingResult = this.getFGSerialComponentInventoryTracking(componentId);

            //                         if (trackingResult.status === 'SUCCESS' && trackingResult.data.length > 0) {

            //                             componentInventoryTrackingData.push({
            //                                 fgSerialComponentId: componentId,
            //                                 itemId: itemId,
            //                                 inventoryTracking: trackingResult.data
            //                             });

            //                         }
            //                     }

            //                     return true;
            //                 }.bind(this));

            //                 log.debug('✓ STEP 4: FG Serial Component search completed', {
            //                     assemblyBuildId: fgSerialDetails.assembly_build_id,
            //                     fgSerialId: fgSerialId,
            //                     fgSerialComponentIds: fgSerialComponentIds,
            //                     componentCount: fgSerialComponentIds.length,
            //                     totalSearchResults: componentSearchCount
            //                 });

            //                 // Fetch inventory tracking data for each FG Serial Component
            //                 if (fgSerialComponentIds.length > 0) {
            //                     log.debug('╔════════════════════════════════════════════════════════════════════════════════════╗', {
            //                         message: 'STEP 4.2: PRIMARY FOCUS - FETCHING INVENTORY TRACKING DATA FOR EACH COMPONENT'
            //                     });
            //                     log.debug('STEP 4.2: Processing ' + fgSerialComponentIds.length + ' FG Serial Components for inventory tracking', {
            //                         totalComponentsToProcess: fgSerialComponentIds.length,
            //                         componentIds: fgSerialComponentIds
            //                     });

            //                     fgSerialComponentIds.forEach(function (componentId, index) {
            //                         log.debug('╔─────────────────────────────────────────────────────────────────────────────────╗', {
            //                             message: 'STEP 4.2.' + (index + 1) + ': PROCESSING COMPONENT #' + (index + 1) + ' OF ' + fgSerialComponentIds.length
            //                         });

            //                         log.debug('STEP 4.2.' + (index + 1) + ': CALLING getFGSerialComponentInventoryTracking', {
            //                             fgSerialComponentId: componentId,
            //                             componentIndex: index + 1,
            //                             totalComponents: fgSerialComponentIds.length,
            //                             message: 'This function will search for all inventory tracking records linked to this component'
            //                         });

            //                         const trackingResult = this.getFGSerialComponentInventoryTracking(componentId);

            //                         log.debug('STEP 4.2.' + (index + 1) + ': RESULT FROM getFGSerialComponentInventoryTracking', {
            //                             fgSerialComponentId: componentId,
            //                             status: trackingResult.status,
            //                             reason: trackingResult.reason,
            //                             recordCount: trackingResult.data ? trackingResult.data.length : 0,
            //                             message: 'Returned ' + (trackingResult.data ? trackingResult.data.length : 0) + ' inventory tracking records'
            //                         });

            //                         if (trackingResult.status === 'SUCCESS' && trackingResult.data.length > 0) {
            //                             log.debug('STEP 4.2.' + (index + 1) + ': INVENTORY TRACKING DATA DETAILS', {
            //                                 fgSerialComponentId: componentId,
            //                                 recordCount: trackingResult.data.length,
            //                                 trackingRecords: trackingResult.data,
            //                                 message: 'IMPORTANT: These are the lot numbers, quantities, and pieces for this component'
            //                             });

            //                             componentInventoryTrackingData.push({
            //                                 fgSerialComponentId: componentId,
            //                                 itemId: itemId,
            //                                 inventoryTracking: trackingResult.data
            //                             });


            //                             log.debug('✓ STEP 4.2.' + (index + 1) + ': INVENTORY TRACKING SUCCESSFULLY ADDED TO RESULTS', {
            //                                 fgSerialComponentId: componentId,
            //                                 recordCount: trackingResult.data.length,
            //                                 totalTrackingDataCollected: componentInventoryTrackingData.length,
            //                                 message: 'Component tracking data is now part of the final response'
            //                             });
            //                         } else {
            //                             log.debug('⚠ STEP 4.2.' + (index + 1) + ': NO INVENTORY TRACKING DATA FOUND', {
            //                                 fgSerialComponentId: componentId,
            //                                 status: trackingResult.status,
            //                                 reason: trackingResult.reason,
            //                                 message: 'This component has no inventory tracking records'
            //                             });
            //                         }

            //                         log.debug('╚─────────────────────────────────────────────────────────────────────────────────╝', {
            //                             message: 'STEP 4.2.' + (index + 1) + ' COMPLETE'
            //                         });
            //                     }.bind(this));

            //                     log.debug('╚════════════════════════════════════════════════════════════════════════════════════╝', {
            //                         message: 'STEP 4.2 COMPLETE: ALL COMPONENTS PROCESSED'
            //                     });
            //                 } else {
            //                     log.debug('⚠ STEP 4: No FG Serial Components found for assembly build', {
            //                         assemblyBuildId: fgSerialDetails.assembly_build_id,
            //                         fgSerialId: fgSerialId
            //                     });
            //                 }

            //                 log.debug('╔════════════════════════════════════════════════════════════════════════════════════╗', {
            //                     message: 'STEP 4 FINAL RESULTS: COMPONENT INVENTORY TRACKING DATA'
            //                 });
            //                 log.debug('STEP 4 COMPLETE - SUMMARY', {
            //                     totalComponentsProcessed: fgSerialComponentIds.length,
            //                     totalComponentsWithTrackingData: componentInventoryTrackingData.length,
            //                     message: 'Summary of all inventory tracking data collected'
            //                 });
            //                 log.debug('STEP 4 COMPLETE - DETAILED TRACKING DATA', {
            //                     componentInventoryTrackingData: componentInventoryTrackingData,
            //                     message: 'IMPORTANT: This is the primary data - all lot numbers, quantities, and pieces for each component'
            //                 });
            //                 log.debug('╚════════════════════════════════════════════════════════════════════════════════════╝', {
            //                     message: 'STEP 4 COMPLETE'
            //                 });

            //             } catch (trackingError) {
            //                 log.error('✗ STEP 4: ERROR - Exception caught', {
            //                     error: trackingError.message || String(trackingError),
            //                     stack: trackingError.stack,
            //                     assemblyBuildId: fgSerialDetails.assembly_build_id,
            //                     fgSerialId: fgSerialId
            //                 });
            //                 // Continue without tracking data - don't fail the entire operation
            //             }
            //         } else {
            //             log.debug('⚠ STEP 4: Condition NOT met - skipping inventory tracking fetch', {
            //                 hasAssemblyBuildId: !!fgSerialDetails?.assembly_build_id,
            //                 hasFgSerialId: !!fgSerialId,
            //                 assemblyBuildId: fgSerialDetails?.assembly_build_id,
            //                 fgSerialId: fgSerialId
            //             });
            //         }

            //         log.debug('getFGSerialComponentsBySerialId - SUCCESS', {
            //             serialNumber: cleanSerialNumber,
            //             serialInternalId: serialInternalId,
            //             fgSerialId: fgSerialId,
            //             componentsCount: componentsData.length,
            //             componentInventoryTrackingCount: componentInventoryTrackingData.length,
            //             fgSerialDetails: fgSerialDetails
            //         });

            //         return {
            //             status: 'SUCCESS',
            //             reason: 'Components retrieved successfully',
            //             data: componentsData,
            //             fgSerialDetails: fgSerialDetails,
            //             componentInventoryTracking: componentInventoryTrackingData
            //         };

            //     } catch (error) {
            //         log.error('getFGSerialComponentsBySerialId ERROR', {
            //             error: error.message || String(error),
            //             stack: error.stack,
            //             serialNumber: serialNumber
            //         });
            //         return {
            //             status: 'ERROR',
            //             reason: error.message || 'Failed to retrieve components',
            //             data: []
            //         };
            //     }
            // },

            getFGSerialComponentsNested(fgSerialId) {
                try {

                    if (!fgSerialId) {
                        return { status: 'ERROR', reason: 'FG Serial ID is required', data: null };
                    }

                    const customrecord_jj_fg_serial_componentsSearchObj = search.create({
                        type: "customrecord_jj_fg_serial_components",
                        filters: [
                            ["custrecord_jj_fsc_serial_number", "anyof", fgSerialId],
                            "AND", ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_fsc_serial_number.isinactive", "is", "F"],
                            "AND", ["custrecord_jj_fg_cit_serial_component.isinactive", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_jj_fsc_serial_number", label: "fg_serial_id" }),
                            search.createColumn({ name: "created", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "created" }),
                            search.createColumn({ name: "custrecord_jj_fgs_serial", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "serial_number" }),
                            search.createColumn({ name: "custrecord_jj_asm_build_date", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "asm_build_date" }),
                            search.createColumn({ name: "custrecord_jj_asm_unbuild", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "assembly_unbuild" }),
                            search.createColumn({ name: "custrecord_jj_unbuild_date", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "assembly_unbuild_date" }),
                            search.createColumn({ name: "custrecord_jj_fgs_alloy_cost", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "alloy_cost" }),
                            search.createColumn({ name: "custrecord_jj_fgs_alloy_weight", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "alloy_weight" }),
                            search.createColumn({ name: "custrecord_jj_fgs_assembly_build", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "assembly_build" }),
                            search.createColumn({ name: "custrecord_jj_fgs_assembly_item", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "assembly_item" }),
                            search.createColumn({ name: "custrecord_jj_fgs_bag_core_tracking", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "bag_core_tracking" }),
                            search.createColumn({ name: "custrecord_jj_fgs_bom_revision", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "bom_revision" }),
                            search.createColumn({ name: "custrecord_jj_fgs_cs_stone_color", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "clr_stone_color" }),
                            search.createColumn({ name: "custrecord_jj_fgs_cs_stone_shape", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "clr_stone_shape" }),
                            search.createColumn({ name: "custrecord_jj_fgs_clr_stone_cost", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "clr_stone_cost" }),
                            search.createColumn({ name: "custrecord_jj_fgs_clr_stone_weight", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "clr_stone_weight" }),
                            search.createColumn({ name: "custrecord_jj_fgs_diamond_cost", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "diamond_cost" }),
                            search.createColumn({ name: "custrecord_jj_fgs_diamond_weight", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "diamond_weight" }),
                            search.createColumn({ name: "custrecord_jj_stone_color", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "diamond_color" }),
                            search.createColumn({ name: "custrecord_jj_stone_quality", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "diamond_quality" }),
                            search.createColumn({ name: "custrecord_jj_fgs_gold_cost", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "gold_cost" }),
                            search.createColumn({ name: "custrecord_jj_fgs_gold_weight", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "gold_weight" }),
                            search.createColumn({ name: "custrecord_jj_fgs_gross_weight", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "gross_weight" }),
                            search.createColumn({ name: "custrecord_jj_fg_metal_color", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "metal_colour" }),
                            search.createColumn({ name: "custrecord_jj_metal_purity", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "metal_purity" }),
                            search.createColumn({ name: "custrecord_jj_metal_quality", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "metal_quality" }),
                            search.createColumn({ name: "custrecord_jj_fgs_making_charge_cost", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "making_charge_cost" }),
                            search.createColumn({ name: "custrecord_jj_fgs_pure_weight", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "pure_weight" }),
                            search.createColumn({ name: "custrecord_jj_fgs_related_so", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "related_so" }),
                            search.createColumn({ name: "custrecord_jj_fgs_related_so_date", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "related_so_date" }),
                            search.createColumn({ name: "internalid", label: "component_id" }),
                            search.createColumn({ name: "custrecord_jj_fsc_item", label: "item" }),
                            search.createColumn({ name: "custrecord_jj_fsc_barcode_quantity", label: "barcode_quantity" }),
                            search.createColumn({ name: "custrecord_jj_fsc_cost", label: "cost" }),
                            search.createColumn({ name: "custrecord_jj_fsc_quantity", label: "quantity" }),
                            search.createColumn({ name: "custrecord_jj_fsc_pieces_value", label: "pieces" }),
                            search.createColumn({ name: "custrecord_jj_fsc_item_units", label: "units" }),
                            search.createColumn({ name: "custrecord_jj_fsc_build_item_line_id", label: "build_line_id" }),
                            search.createColumn({ name: "internalid", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "tracking_internalid" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_lot_number", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "lot_number" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_quantity", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "lot_quantity" }),
                            search.createColumn({ name: "custrecord_jj_fg_cit_pieces", join: "CUSTRECORD_JJ_FG_CIT_SERIAL_COMPONENT", label: "lot_pieces" }),
                            search.createColumn({ name: "custrecord_jj_sl_customer", join: "CUSTRECORD_JJ_FSC_SERIAL_NUMBER", label: "customer" }),
                        ]
                    });

                    const searchObj = customrecord_jj_fg_serial_componentsSearchObj;

                    const searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: searchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(searchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
                        return { status: 'ERROR', reason: 'No components found', data: null };
                    }

                    let fgSerialObject = null;
                    let componentsMap = {};

                    searchResults.forEach(result => {
                        if (!fgSerialObject) {
                            fgSerialObject = {
                                fg_serial_rec_id: result.fg_serial_id?.value,
                                serial_number_id: result.serial_number?.value,
                                serial_number_name: result.serial_number?.text,
                                created: result.created?.value,
                                asm_build_date: result.asm_build_date?.value,
                                assembly_unbuild_name: result.assembly_unbuild?.text,
                                assembly_unbuild_id: result.assembly_unbuild?.value,
                                assembly_unbuild_date: result.assembly_unbuild_date?.value,
                                alloy_cost: result.alloy_cost?.value,
                                alloy_weight: result.alloy_weight?.value,
                                assembly_build_name: result.assembly_build?.text,
                                assembly_build_id: result.assembly_build?.value,
                                assembly_item_name: result.assembly_item?.text,
                                bag_core_tracking: result.bag_core_tracking?.value,
                                bom_revision: result.bom_revision?.text,
                                clr_stone_cost: result.clr_stone_cost?.value,
                                clr_stone_weight: result.clr_stone_weight?.value,
                                diamond_cost: result.diamond_cost?.value,
                                diamond_weight: result.diamond_weight?.value,
                                gold_cost: result.gold_cost?.value,
                                gold_weight: result.gold_weight?.value,
                                gross_weight: result.gross_weight?.value,
                                making_charge_cost: result.making_charge_cost?.value,
                                pure_weight: result.pure_weight?.value,
                                related_so: result.related_so?.text,
                                related_so_date: result.related_so_date?.value,
                                metal_colour: result.metal_colour || {},
                                metal_purity: result.metal_purity || {},
                                metal_quality: result.metal_quality || {},
                                diamond_color: result.diamond_color || {},
                                diamond_quality: result.diamond_quality || {},
                                clr_stone_color: result.clr_stone_color || {},
                                clr_stone_shape: result.clr_stone_shape || {},
                                customer_id: result.customer?.value || '',
                                customer_name: result.customer?.text || '',
                                components: []
                            };
                        }

                        const componentId = result.component_id?.value;
                        if (!componentId) return;

                        if (!componentsMap[componentId]) {
                            componentsMap[componentId] = {
                                fgSerialComponentId: componentId,
                                item: result.item?.value,
                                item_text: result.item?.text,
                                quantity: result.quantity?.value,
                                barcode_quantity: result.barcode_quantity?.value,
                                cost: result.cost?.value,
                                pieces: result.pieces?.value,
                                units: result.units?.value,
                                units_text: result.units?.text,
                                build_line_id: result.build_line_id?.value,
                                inventoryTracking: []
                            };
                        }

                        if (result.tracking_internalid?.value) {
                            componentsMap[componentId].inventoryTracking.push({
                                internalId: result.tracking_internalid?.value,
                                lotNumberId: result.lot_number?.value,
                                lotNumberText: result.lot_number?.text,
                                quantity: Number(result.lot_quantity?.value || 0),
                                pieces: Number(result.lot_pieces?.value || 0)
                            });
                        }

                    });

                    Object.keys(componentsMap).forEach(componentId => {
                        fgSerialObject.components.push(componentsMap[componentId]);
                    });

                    return { status: 'SUCCESS', reason: 'FG Serial data retrieved successfully', data: fgSerialObject };
                } catch (error) {
                    log.error('getFGSerialComponentsNested ERROR', error);
                    return { status: 'ERROR', reason: error.message || 'Failed to retrieve FG Serial data', data: null };
                }
            },

            /**
             * Fetch manufacturing departments for direct repair unbuild operation
             * Only returns departments where all specified fields are unchecked
             * @returns {array} Array of manufacturing department objects with id and name
             */
            getManufacturingDepartmentsForDirectRepair() {
                try {
                    log.debug('getManufacturingDepartmentsForDirectRepair - START');

                    const manufacturingDeptSearch = search.create({
                        type: 'customrecord_jj_manufacturing_dept',
                        filters: [
                            ['isinactive', 'is', 'F'],
                            'AND',
                            ['custrecord_jj_mandept_has_bulk_movement', 'is', 'F'],
                            'AND',
                            ['custrecord_jj_mandept_has_bulk_acknowled', 'is', 'F'],
                            'AND',
                            ['custrecord_jj_mandept_is_build_dept', 'is', 'F'],
                            'AND',
                            ['custrecord_jj_mandept_is_outward_dept', 'is', 'F'],
                            'AND',
                            ['custrecord_jj_mandept_is_final_outw_dept', 'is', 'F'],
                            'AND',
                            ['custrecord_jj_mandept_initial_bulk', 'is', 'F']
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid' }),
                            search.createColumn({ name: 'name' }),
                            search.createColumn({ name: 'custrecord_jj_mandept_bin_no' })
                        ]
                    });

                    let departmentsData = [];

                    manufacturingDeptSearch.run().each(function (result) {
                        const deptId = result.getValue({ name: 'internalid' });
                        const deptName = result.getValue({ name: 'name' });
                        const binId = result.getValue({ name: 'custrecord_jj_mandept_bin_no' });

                        log.debug('Manufacturing department found', {
                            deptId: deptId,
                            deptName: deptName,
                            binId: binId
                        });

                        let binName = '-';
                        let binNumber = '-';

                        // Fetch bin details from NetSuite if bin ID exists
                        if (binId) {
                            try {
                                const binRec = record.load({
                                    type: 'bin',
                                    id: binId,
                                    isDynamic: false
                                });

                                // Try different field names for bin name
                                binName = binRec.getValue({ fieldId: 'name' }) ||
                                    binRec.getText({ fieldId: 'name' }) ||
                                    binRec.getValue({ fieldId: 'binname' }) ||
                                    binRec.getText({ fieldId: 'binname' }) ||
                                    '-';

                                // Try different field names for bin number
                                binNumber = binRec.getValue({ fieldId: 'binnumber' }) ||
                                    binRec.getText({ fieldId: 'binnumber' }) ||
                                    binRec.getValue({ fieldId: 'number' }) ||
                                    binRec.getText({ fieldId: 'number' }) ||
                                    '-';

                                log.debug('✓ Bin details fetched from NetSuite', {
                                    binId: binId,
                                    binName: binName,
                                    binNumber: binNumber,
                                    binNameType: typeof binName,
                                    binNumberType: typeof binNumber
                                });

                            } catch (binErr) {
                                log.debug('⚠ Failed to load bin record', {
                                    binId: binId,
                                    error: binErr.message,
                                    errorName: binErr.name,
                                    stack: binErr.stack
                                });

                                // Try to fetch bin info via search as fallback
                                try {
                                    const binSearch = search.create({
                                        type: 'bin',
                                        filters: [['internalid', 'is', binId]],
                                        columns: [
                                            search.createColumn({ name: 'name' }),
                                            search.createColumn({ name: 'binnumber' })
                                        ]
                                    });

                                    binSearch.run().each(function (binResult) {
                                        binName = binResult.getValue({ name: 'name' }) || '-';
                                        binNumber = binResult.getValue({ name: 'binnumber' }) || '-';

                                        log.debug('✓ Bin details fetched via search fallback', {
                                            binId: binId,
                                            binName: binName,
                                            binNumber: binNumber
                                        });

                                        return false; // Stop after first result
                                    });
                                } catch (searchErr) {
                                    log.debug('⚠ Fallback search also failed', {
                                        binId: binId,
                                        error: searchErr.message
                                    });
                                }
                            }
                        }

                        log.debug('Department with bin info', {
                            deptId: deptId,
                            deptName: deptName,
                            binId: binId,
                            binName: binName,
                            binNumber: binNumber
                        });

                        departmentsData.push({
                            value: deptId,
                            label: deptName,
                            bin_id: binId || '-',
                            bin_number: binNumber
                        });

                        return true;
                    });

                    log.debug('getManufacturingDepartmentsForDirectRepair - SUCCESS', {
                        departmentsCount: departmentsData.length,
                        departments: departmentsData
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Manufacturing departments retrieved successfully',
                        data: departmentsData
                    };

                } catch (error) {
                    log.error('getManufacturingDepartmentsForDirectRepair ERROR', {
                        error: error.message || String(error),
                        stack: error.stack
                    });
                    return {
                        status: 'ERROR',
                        reason: error.message || 'Failed to retrieve manufacturing departments',
                        data: []
                    };
                }
            },

            /**
             * Fetch all inventory statuses from NetSuite
             * @returns {object} Object containing status, reason, and array of inventory statuses
             */
            getInventoryStatuses() {
                try {
                    log.debug('getInventoryStatuses - START');

                    const inventoryStatusSearch = search.create({
                        type: 'inventorystatus',
                        filters: [
                            ['isinactive', 'is', 'F']
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid' }),
                            search.createColumn({ name: 'name' })
                        ]
                    });

                    let statusesData = [];

                    inventoryStatusSearch.run().each(function (result) {
                        const statusId = result.getValue({ name: 'internalid' });
                        const statusName = result.getValue({ name: 'name' });

                        log.debug('Inventory status found', {
                            statusId: statusId,
                            statusName: statusName
                        });

                        statusesData.push({
                            value: statusId,
                            label: statusName
                        });

                        return true;
                    });

                    log.debug('getInventoryStatuses - SUCCESS', {
                        statusesCount: statusesData.length,
                        statuses: statusesData
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Inventory statuses retrieved successfully',
                        data: statusesData
                    };

                } catch (error) {
                    log.error('getInventoryStatuses ERROR', {
                        error: error.message || String(error),
                        stack: error.stack
                    });
                    return {
                        status: 'ERROR',
                        reason: error.message || 'Failed to retrieve inventory statuses',
                        data: []
                    };
                }
            },

            /**
             * Fetch FG Serial Component Inventory Tracking records for a given serial component
             * Retrieves lot numbers, quantities, and pieces from the Fg Serial Inv Tracking subtab
             * @param {number} serialComponentId - Internal ID of the FG Serial Component
             * @returns {object} Object containing status, reason, and array of inventory tracking data
             */
            /**
             * Fetch FG Serial Component Inventory Tracking records for a given serial component
             * Retrieves lot numbers, quantities, and pieces from the Fg Serial Inv Tracking subtab
             * @param {number} serialComponentId - Internal ID of the FG Serial Component
             * @returns {object} Object containing status, reason, and array of inventory tracking data
             */
            getFGSerialComponentInventoryTracking(serialComponentId) {
                try {
                    log.debug('getFGSerialComponentInventoryTracking - START', {
                        serialComponentId: serialComponentId,
                        type: typeof serialComponentId,
                        message: 'Received FG Serial Component ID from getFGSerialComponentsBySerialId Step 4'
                    });

                    // VALIDATION: Check if serialComponentId is provided and valid
                    if (!serialComponentId || String(serialComponentId).trim() === '') {
                        log.error('VALIDATION FAILED: Serial Component ID is empty or null', {
                            input: serialComponentId,
                            type: typeof serialComponentId,
                            message: 'Connection broken: No FG Serial Component ID provided'
                        });
                        return {
                            status: 'ERROR',
                            reason: 'Serial Component ID is required',
                            data: []
                        };
                    }

                    const cleanSerialComponentId = String(serialComponentId).trim();
                    log.debug('✓ VALIDATION PASSED - Clean Serial Component ID', {
                        original: serialComponentId,
                        cleaned: cleanSerialComponentId,
                        message: 'FG Serial Component ID validated and ready for search'
                    });

                    // SEARCH: Fetch inventory tracking records
                    // This searches in customrecord_jj_fg_comp_inv_track where custrecord_jj_fg_cit_serial_component matches the FG Serial Component ID
                    const customrecordJjFgCompInvTrackSearchFilters = [
                        ['custrecord_jj_fg_cit_serial_component', 'anyof', cleanSerialComponentId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ];

                    log.debug('✓ SEARCH FILTER PREPARED', {
                        searchType: 'customrecord_jj_fg_comp_inv_track',
                        filterField: 'custrecord_jj_fg_cit_serial_component',
                        filterValue: cleanSerialComponentId,
                        message: 'Searching for inventory tracking records linked to this FG Serial Component'
                    });

                    const customrecordJjFgCompInvTrackSearch = search.create({
                        type: 'customrecord_jj_fg_comp_inv_track',
                        filters: customrecordJjFgCompInvTrackSearchFilters,
                        columns: [
                            search.createColumn({
                                name: 'custrecord_jj_fg_cit_lot_number',
                                label: 'Lot Number'
                            }),
                            search.createColumn({
                                name: 'custrecord_jj_fg_cit_quantity',
                                label: 'Quantity'
                            })
                        ]
                    });

                    let inventoryTrackingData = [];
                    let recordCount = 0;
                    let searchExecuted = false;

                    // EXECUTE SEARCH
                    try {
                        customrecordJjFgCompInvTrackSearch.run().each(function (result) {
                            recordCount++;
                            searchExecuted = true;

                            // EXTRACT: Get all required fields
                            const internalId = result.getValue({
                                name: 'internalid'
                            });

                            const lotNumberId = result.getValue({
                                name: 'custrecord_jj_fg_cit_lot_number'
                            });

                            const lotNumberText = result.getText({
                                name: 'custrecord_jj_fg_cit_lot_number'
                            });

                            const quantity = result.getValue({
                                name: 'custrecord_jj_fg_cit_quantity'
                            });

                            const pieces = result.getValue({
                                name: 'custrecord_jj_fg_cit_pieces'
                            });

                            const inventoryNumber = result.getValue({
                                name: 'inventorynumber',
                                join: 'CUSTRECORD_JJ_FG_CIT_LOT_NUMBER'
                            });

                            const itemId = result.getValue({
                                name: 'item',
                                join: 'CUSTRECORD_JJ_FG_CIT_LOT_NUMBER'
                            });

                            // VALIDATION: Ensure lot number exists (required for inventory detail)
                            if (!lotNumberId) {
                                log.debug('Skipping record with missing lot number', {
                                    internalId: internalId,
                                    quantity: quantity,
                                    pieces: pieces
                                });
                                return true; // Continue to next record
                            }

                            log.debug('Inventory tracking record #' + recordCount, {
                                internalId: internalId,
                                lotNumberId: lotNumberId,
                                lotNumberText: lotNumberText,
                                quantity: quantity,
                                pieces: pieces,
                                inventoryNumber: inventoryNumber,
                                itemId: itemId
                            });

                            // TRANSFORM: Convert to proper format for inventory detail addition
                            const trackingRecord = {
                                internalId: internalId,
                                lotNumberId: lotNumberId,
                                lotNumberText: lotNumberText || inventoryNumber,
                                quantity: quantity ? parseFloat(quantity) : 0,
                                pieces: pieces ? parseInt(pieces) : 0,
                                inventoryNumber: inventoryNumber,
                                itemId: itemId
                            };

                            // VALIDATION: Ensure at least quantity or pieces is greater than 0
                            if (trackingRecord.quantity <= 0 && trackingRecord.pieces <= 0) {
                                log.debug('Skipping record with zero quantity and pieces', {
                                    internalId: internalId,
                                    quantity: trackingRecord.quantity,
                                    pieces: trackingRecord.pieces
                                });
                                return true; // Continue to next record
                            }

                            inventoryTrackingData.push(trackingRecord);
                            return true;
                        });
                    } catch (searchError) {
                        log.error('Search execution error', {
                            error: searchError.message || String(searchError),
                            stack: searchError.stack,
                            serialComponentId: cleanSerialComponentId
                        });
                        return {
                            status: 'ERROR',
                            reason: 'Error executing inventory tracking search: ' + (searchError.message || String(searchError)),
                            data: []
                        };
                    }

                    // VALIDATION: Check if search was executed and records found
                    if (!searchExecuted) {
                        log.debug('Search did not execute properly', {
                            serialComponentId: cleanSerialComponentId
                        });
                        return {
                            status: 'WARNING',
                            reason: `Search execution failed for serial component ID: ${cleanSerialComponentId}`,
                            data: []
                        };
                    }

                    if (inventoryTrackingData.length === 0) {
                        log.debug('No valid inventory tracking records found', {
                            serialComponentId: cleanSerialComponentId,
                            totalRecordsProcessed: recordCount
                        });
                        return {
                            status: 'WARNING',
                            reason: `No valid inventory tracking records found for serial component ID: ${cleanSerialComponentId}. Processed ${recordCount} records.`,
                            data: []
                        };
                    }

                    log.debug('getFGSerialComponentInventoryTracking - SUCCESS', {
                        serialComponentId: cleanSerialComponentId,
                        validRecordsCount: inventoryTrackingData.length,
                        totalRecordsProcessed: recordCount,
                        data: inventoryTrackingData
                    });

                    return {
                        status: 'SUCCESS',
                        reason: `Retrieved ${inventoryTrackingData.length} valid inventory tracking records`,
                        data: inventoryTrackingData
                    };

                } catch (error) {
                    log.error('getFGSerialComponentInventoryTracking - FATAL ERROR', {
                        error: error.message || String(error),
                        stack: error.stack,
                        serialComponentId: serialComponentId,
                        type: typeof serialComponentId
                    });
                    return {
                        status: 'ERROR',
                        reason: error.message || 'Failed to retrieve inventory tracking records',
                        data: []
                    };
                }
            },

            /**
             * Checks whether an operation is closed (exit time is present)
             *
             * @param {number|string} operationId - Internal ID of the operation record
             * @returns {boolean}
             */
            isOperationClosed(operationId) {
                try {
                    if (!operationId) {
                        return false;
                    }

                    let operationSearch = search.create({
                        type: "customrecord_jj_operations",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["internalid", "anyof", operationId],
                            "AND", ["custrecord_jj_oprtns_exit", "isnotempty", ""]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid" })
                        ]
                    });

                    let resultCount = operationSearch.runPaged().count;
                    log.debug("isOperationClosed resultCount", { operationId, resultCount });

                    return resultCount > 0;

                } catch (error) {
                    log.error("isOperationClosed error", error);
                    return false;
                }
            },

            /**
             * Checks whether a bag has any un-acknowledged bag movement
             *
             * @param {number|string} bagInternalId - Internal ID of the bag record
             * @returns {boolean}
             */
            hasPendingBagMovement(bagInternalId) {
                try {
                    if (!bagInternalId) {
                        return false;
                    }

                    let bagMovementSearch = search.create({
                        type: "customrecord_jj_bag_movement",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagmov_is_acknowledged", "is", "F"],
                            "AND", ["custrecord_jj_bagmov_bagno", "anyof", bagInternalId]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid" })
                        ]
                    });

                    let resultCount = bagMovementSearch.runPaged().count;

                    log.debug("hasPendingBagMovement resultCount", { bagInternalId, resultCount });

                    return resultCount > 0;

                } catch (error) {
                    log.error("hasPendingBagMovement error", error);
                    return false;
                }
            },

            /**
             * Checks whether a bag has multiple open (non-exited) operations
             *
             * @param {number|string} bagInternalId - Internal ID of the bag
             * @param {number|string} operationId - Internal ID of the operation
             * @returns {boolean}
             */
            hasDuplicateOperations(bagInternalId, operationId) {
                try {
                    if (!bagInternalId) {
                        return false;
                    }

                    let operationSearch = search.create({
                        type: "customrecord_jj_operations",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_oprtns_bagno", "anyof", bagInternalId],
                            "AND", ["custrecord_jj_oprtns_exit", "isempty", ""]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_status" })
                        ]
                    });

                    let results = operationSearch.run().getRange({ start: 0, end: 10 }) || [];
                    let resultCount = results.length;

                    log.debug("hasDuplicateOperations resultCount", { bagInternalId, resultCount });

                    // Case 1: Only one record exists
                    if (resultCount == 1) {
                        let record = results[0];
                        let recordId = record.getValue({ name: "internalid" });
                        let status = record.getValue({ name: "custrecord_jj_oprtns_status" });

                        log.debug("Single Operation Check", { recordId, operationId, status });

                        if (
                            recordId == operationId &&
                            status == OPERATION_STATUS_IN_PROGRESS
                        ) {
                            return false; // valid case
                        }
                    }

                    // All other cases → duplicate/problem
                    return true;

                } catch (error) {
                    log.error("hasDuplicateOperations error", error);
                    return false;
                }
            },

            /**
             * Returns closed operation internal IDs and their bag numbers (internal IDs) as separate arrays
             *
             * @param {Array<number|string>} operationIds - Internal IDs of operation records
             * @returns {{ operationIds: number[], bagNos: number[] }}
             */
            getClosedOperationIdsAndBagNos(operationIds) {
                try {
                    if (!Array.isArray(operationIds) || operationIds.length === 0) {
                        return { operationIds: [], bagNos: [] };
                    }

                    let operationSearch = search.create({
                        type: "customrecord_jj_operations",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["internalid", "anyof", operationIds],
                            "AND", ["custrecord_jj_oprtns_exit", "isnotempty", ""]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid" }),
                            search.createColumn({ name: "custrecord_jj_oprtns_bagno" })
                        ]
                    });

                    let closedOperationIdSet = new Set();
                    let bagNoSet = new Set();

                    operationSearch.run().each(result => {
                        let opId = result.getValue({ name: "internalid" });
                        let bagNo = result.getValue({ name: "custrecord_jj_oprtns_bagno" });

                        if (opId) closedOperationIdSet.add(Number(opId));
                        if (bagNo) bagNoSet.add(Number(bagNo));

                        return true;
                    });

                    let response = {
                        operationIds: Array.from(closedOperationIdSet),
                        bagNos: Array.from(bagNoSet)
                    };

                    log.debug("getClosedOperationIdsAndBagNos result", response);
                    return response;

                } catch (error) {
                    log.error("getClosedOperationIdsAndBagNos error", error);
                    return { operationIds: [], bagNos: [] };
                }
            },

            /**
             * Get inventory balance details for a specific serial (inventory number internal ID)
             *
             * @param {string|number} serialInternalId
             * @returns {Object} { status, reason, data }
             */
            getSerialInventoryDetails(serialInternalId) {
                try {

                    if (!serialInternalId) {
                        return { status: 'ERROR', reason: 'Serial internal ID is required', data: null };
                    }

                    const serialDetails = [];

                    const inventoryBalanceSearch = search.create({
                        type: 'inventorybalance',
                        filters: [
                            ['inventorynumber', 'anyof', serialInternalId]
                        ],
                        columns: [
                            search.createColumn({ name: 'item' }),
                            search.createColumn({ name: 'location' }),
                            search.createColumn({ name: 'inventorynumber' }),
                            search.createColumn({ name: 'binnumber' }),
                            search.createColumn({ name: 'status' }),
                            search.createColumn({ name: 'onhand' }),
                            search.createColumn({ name: 'available' })
                        ]
                    });

                    inventoryBalanceSearch.run().each(result => {
                        serialDetails.push({
                            item: { value: result.getValue('item'), text: result.getText('item') },
                            location: { value: result.getValue('location'), text: result.getText('location') },
                            inventorynumber: { value: result.getValue('inventorynumber'), text: result.getText('inventorynumber') },
                            binNumber: { value: result.getValue('binnumber'), text: result.getText('binnumber') },
                            status: { value: result.getValue('status'), text: result.getText('status') },
                            onhand: Number(result.getValue('onhand') || 0),
                            available: Number(result.getValue('available') || 0)
                        });

                        return true; // continue
                    });

                    if (serialDetails.length === 0) {
                        return { status: 'ERROR', reason: 'No inventory balance found for this serial', data: [] };
                    }

                    return {
                        status: 'SUCCESS', reason: `Found ${serialDetails.length} inventory balance record(s)`, data: serialDetails
                    };

                } catch (e) {
                    log.error('getSerialInventoryDetails ERROR', e);
                    return { status: 'ERROR', reason: e.message || 'Failed to retrieve serial inventory details', data: null };
                }
            },

            getSerialsType() {
                try {

                    const serialTypes = [];

                    const serialTypeSearch = search.create({
                        type: 'customlist_jj_serial_type',
                        filters: [
                            ['isinactive', 'is', 'F']
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid' }),
                            search.createColumn({ name: 'name' })
                        ]
                    });

                    serialTypeSearch.run().each(result => {

                        serialTypes.push({
                            internalid: result.getValue({ name: 'internalid' }),
                            name: result.getValue({ name: 'name' })
                        });

                        return true; // continue iteration
                    });

                    if (serialTypes.length === 0) {
                        return {
                            status: 'ERROR',
                            reason: 'No active serial types found',
                            data: []
                        };
                    }

                    return {
                        status: 'SUCCESS',
                        reason: `Found ${serialTypes.length} serial type record(s)`,
                        data: serialTypes
                    };

                } catch (e) {
                    log.error('getSerialsType ERROR', e);
                    return {
                        status: 'ERROR',
                        reason: e.message || 'Failed to retrieve serial types',
                        data: null
                    };
                }
            },
            getInvAdjCreatedDate(empId) {
                try {
                    const invAdjDates = [];

                    const inventoryAdjustmentSearchObj = search.create({
                        type: "inventoryadjustment",
                        filters: [
                            ["type", "anyof", "InvAdjst"],
                            "AND",
                            ["custbody_jj_is_recovery", "is", "T"],
                            "AND",
                            ["custbody_jj_recovered_employee", "anyof", empId],
                            "AND",
                            ["mainline", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({ name: "datecreated", label: "Date Created" })
                        ]
                    });

                    const searchResultCount = inventoryAdjustmentSearchObj.runPaged().count;
                    log.debug("Inventory Adjustment Search Result Count", searchResultCount);

                    inventoryAdjustmentSearchObj.run().each(function (result) {
                        invAdjDates.push(result.getValue({ name: "datecreated" }));
                        return true; // continue iteration
                    });

                    if (invAdjDates.length === 0) {
                        return {
                            status: 'ERROR',
                            reason: `No inventory adjustments found for employee ID ${empId}`,
                            data: []
                        };
                    }
                    log.debug("Exit time", invAdjDates);
                    return {
                        status: 'SUCCESS',
                        reason: `Found ${invAdjDates.length} inventory adjustment record(s)`,
                        data: invAdjDates
                    };

                } catch (e) {
                    log.error('getInvAdjCreatedDate ERROR', e);
                    return {
                        status: 'ERROR',
                        reason: e.message || 'Failed to retrieve inventory adjustments',
                        data: null
                    };
                }
            },

            /**
             * Get loss transaction date range for filtering employee loss data.
             * 
             * LOGIC:
             * - Multiple transactions: Returns start date (previous transaction + 1 second) and end date (current transaction)
             * - Single transaction (first only): Returns startDate = null and end date (current transaction)
             *   This ensures ALL loss data from initial time is included for the first transaction
             * 
             * @param {string|number} lossTransactionId - Internal ID of the selected loss transaction
             * @param {number} departmentId - Department ID
             * @returns {Object} { status, startDate, endDate, selectedTranDate, previousTranDate, reason }
             * 
             * Examples:
             * 
             * Multiple Transactions:
             * - Previous transaction: 10-May-2026 2:30:45 pm
             * - Selected transaction: 17-May-2026 3:15:20 pm
             * - Result: startDate = 10-May-2026 2:30:46 pm (next second), endDate = 17-May-2026 3:15:20 pm
             * 
             * Single Transaction (First Only):
             * - No previous transaction found
             * - Selected transaction: 17-May-2026 3:15:20 pm
             * - Result: startDate = null, endDate = 17-May-2026 3:15:20 pm
             * - Includes all loss data from initial time to selected transaction date
             */
            getLossTransactionDateRange(lossTransactionId, departmentId) {
                try {
                    if (!lossTransactionId || !departmentId) {
                        return {
                            status: 'ERROR',
                            reason: 'Missing required parameters: lossTransactionId and departmentId',
                            startDate: null,
                            endDate: null
                        };
                    }

                    // Step 1: Get the selected loss transaction's created date
                    const selectedTranSearchObj = search.create({
                        type: "inventorystatuschange",
                        filters: [
                            ["internalid", "anyof", lossTransactionId],
                            "AND",
                            ["type", "anyof", "StatChng"],
                            "AND",
                            ["custbody_jj_loss_transferred", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({ name: "datecreated", label: "Date Created" })
                        ]
                    });

                    let selectedTranDate = null;
                    selectedTranSearchObj.run().each(function (result) {
                        selectedTranDate = result.getValue({ name: "datecreated" });
                        return false;
                    });

                    if (!selectedTranDate) {
                        return {
                            status: 'ERROR',
                            reason: `No loss transaction found with ID ${lossTransactionId}`,
                            startDate: null,
                            endDate: null
                        };
                    }

                    // Step 2: Get all loss transactions for this department, ordered by date descending
                    const allTransactionsSearchObj = search.create({
                        type: "inventorystatuschange",
                        filters: [
                            ["type", "anyof", "StatChng"],
                            "AND",
                            ["custbody_jj_loss_transferred", "is", "T"],
                            "AND",
                            ["custbody_jj_loss_transferred_dept", "anyof", departmentId]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC }),
                            search.createColumn({ name: "datecreated" })
                        ]
                    });

                    let previousTranDate = null;
                    let foundSelected = false;

                    allTransactionsSearchObj.run().each(function (result) {
                        const tranId = result.getValue({ name: "internalid" });
                        const tranDate = result.getValue({ name: "datecreated" });

                        if (tranId === lossTransactionId) {
                            foundSelected = true;
                            return true;
                        }

                        if (foundSelected && !previousTranDate) {
                            previousTranDate = tranDate;
                            return false;
                        }

                        return true;
                    });

                    // Step 3: Calculate start date and end date
                    let startDate;
                    if (previousTranDate) {
                        const prevDate = new Date(previousTranDate);
                        startDate = new Date(prevDate.getTime() + 1000);
                    } else {
                        startDate = null;
                    }

                    const endDate = new Date(selectedTranDate);
                    const startDateFormatted = startDate ? this._formatDateForSearch(startDate) : null;
                    const endDateFormatted = this._formatDateForSearch(endDate);

                    log.debug('getLossTransactionDateRange', { startDate: startDateFormatted, endDate: endDateFormatted });

                    return {
                        status: 'SUCCESS',
                        reason: 'Loss transaction date range calculated successfully',
                        startDate: startDateFormatted,
                        endDate: endDateFormatted,
                        selectedTranDate: selectedTranDate,
                        previousTranDate: previousTranDate
                    };

                } catch (e) {
                    log.error('getLossTransactionDateRange ERROR', e);
                    return {
                        status: 'ERROR',
                        reason: e.message || 'Failed to get loss transaction date range',
                        startDate: null,
                        endDate: null
                    };
                }
            },

            /**
             * Helper function to format JavaScript Date to NetSuite search format.
             * Converts to format like "17-May-2026 2:23 pm"
             * 
             * @param {Date} date - JavaScript Date object
             * @returns {string} Formatted date string for NetSuite searches
             * @private
             */
            _formatDateForSearch(date) {
                if (!date || !(date instanceof Date)) {
                    return null;
                }

                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const day = String(date.getDate()).padStart(2, '0');
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                let hours = date.getHours();
                let minutes = String(date.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12; // 12-hour format

                return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
            },
            /**
             * Get direct issue loss components for an employee within a date range.
             * UPDATED LOGIC: When lossTransactionId is provided, uses date range between 
             * previous and selected loss transactions to filter loss quantities.
             * 
             * @param {string|number} empId - Employee ID
             * @param {number} departmentId - Department ID
             * @param {string} exitTime - Deprecated: exit time from inventory adjustments (kept for backward compatibility)
             * @param {string} latestInventoryDate - Latest inventory date or loss transaction date
             * @param {string|number} lossTransactionId - (Optional) Loss transaction ID for date range filtering
             * @returns {Object} { status, data: [ { component, lossQuantity, metalQuality, metalPurityPercent } ] }
             */
            directIssueLossComponents(empId, departmentId, exitTime, latestInventoryDate, lossTransactionId) {
                try {
                    let componentsList = [];

                    // Step 1: Determine the date range for filtering
                    let filterStartDate = null;
                    let filterEndDate = latestInventoryDate;

                    // If lossTransactionId is provided, get the date range between previous and selected transactions
                    if (lossTransactionId) {
                        const dateRangeResult = this.getLossTransactionDateRange(lossTransactionId, departmentId);

                        if (dateRangeResult.status === 'SUCCESS') {
                            // filterStartDate = dateRangeResult.startDate;
                            // filterEndDate = dateRangeResult.endDate;
                            filterStartDate = dateRangeResult.previousTranDate;
                            filterEndDate = dateRangeResult.selectedTranDate;
                        }
                    } else {
                        if (exitTime) {
                            filterStartDate = exitTime;
                        }
                    }

                    if (!filterEndDate) {
                        filterEndDate = this.getLatestInventoryStatusChangeDate(departmentId);
                    }

                    const filters = [
                        ["custrecord_jj_operations.custrecord_jj_oprtns_employee", "anyof", empId],
                        "AND",
                        ["custrecord_jj_department", "anyof", departmentId],
                        "AND",
                        ["custrecord_jj_component.class", "anyof", GOLD_CLASS_IDS],
                        "AND",
                        ["custrecord_jj_dir_loss_quantity", "greaterthan", "0"]
                    ];

                    // Add date range filter based on available dates
                    if (filterStartDate && filterEndDate) {
                        // Multiple transactions: Use date range between start and end
                        filters.push("AND");
                        filters.push(["custrecord_jj_loss_entered_date", "within", filterStartDate, filterEndDate]);
                    } else if (!filterStartDate && filterEndDate) {
                        // Single transaction: Fetch all loss data till the end date (no start date)
                        filters.push("AND");
                        filters.push(["custrecord_jj_loss_entered_date", "onorbefore", filterEndDate]);
                    } else if (filterEndDate) {
                        // Fallback: Fetch loss till the end date
                        filters.push("AND");
                        filters.push(["custrecord_jj_loss_entered_date", "onorbefore", filterEndDate]);
                    }

                    const directIssueSearch = search.create({
                        type: "customrecord_jj_direct_issue_return",
                        filters: filters,
                        columns: [
                            search.createColumn({
                                name: "custrecord_jj_component",
                                label: "component"
                            }),
                            search.createColumn({
                                name: "custrecord_jj_dir_loss_quantity",
                                label: "lossQuantity"
                            }),
                            search.createColumn({
                                name: "custitem_jj_metal_quality",
                                join: "CUSTRECORD_JJ_COMPONENT",
                                label: "metalQuality"
                            }),
                            search.createColumn({
                                name: "custitem_jj_metal_purity_percent",
                                join: "CUSTRECORD_JJ_COMPONENT",
                                label: "metalPurityPercent"
                            })
                        ]
                    });

                    const searchColumns = jjUtil.dataSets.fetchSavedSearchColumn(directIssueSearch, 'label');

                    const paginatedResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: directIssueSearch,
                        columns: searchColumns,
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    componentsList = (paginatedResults || []).map(line => ({
                        component: line['component']?.text || '',
                        lossQuantity: parseFloat(line['lossQuantity']?.value) || 0,
                        metalQuality: line['metalQuality']?.text || '',
                        metalPurityPercent: parseFloat(line['metalPurityPercent']?.value) || 0
                    }));

                    if (componentsList.length === 0) {
                        return {
                            status: 'ERROR',
                            reason: `No direct issue loss components found for employee ${empId} in department ${departmentId}${exitTime ? ` after ${exitTime}` : ''}`,
                            data: []
                        };
                    }

                    return {
                        status: 'SUCCESS',
                        reason: `Found ${componentsList.length} direct issue loss record(s)`,
                        data: componentsList
                    };

                } catch (e) {
                    log.error('directIssueLossComponents ERROR', e);
                    return {
                        status: 'ERROR',
                        reason: e.message || 'Failed to retrieve direct issue loss components',
                        data: null
                    };
                }
            },
            /**
             * Aggregate employee loss data by grouping and summing components.
             * UPDATED: Now accepts optional lossTransactionId for date range filtering.
             * 
             * @param {string|number} empId - Employee ID
             * @param {number} departmentId - Department ID
             * @param {string} exitTime - Exit time from inventory adjustments (kept for backward compatibility)
             * @param {string} latestInventoryDate - Latest inventory date or loss transaction date
             * @param {string|number} lossTransactionId - (Optional) Loss transaction ID for date range filtering
             * @returns {Object} { status, data: { totalLoss, totalPureLoss, components, lossLastTransferred }, reason }
             */
            aggregateEmployeeLossData(empId, departmentId, exitTime, latestInventoryDate, lossTransactionId) {
                try {
                    if (!latestInventoryDate) {
                        latestInventoryDate = this.getLatestInventoryStatusChangeDate(departmentId);
                    }

                    const rawDataResult = this.directIssueLossComponents(empId, departmentId, exitTime, latestInventoryDate, lossTransactionId);

                    if (rawDataResult.status !== 'SUCCESS' || !rawDataResult.data || rawDataResult.data.length === 0) {
                        return {
                            status: 'SUCCESS',
                            reason: 'No loss components found for this employee',
                            data: {
                                totalLoss: 0,
                                totalPureLoss: 0,
                                components: {},
                                lossLastTransferred: latestInventoryDate
                            }
                        };
                    }

                    // Step 1: Group components by name and aggregate
                    const componentMap = {};

                    rawDataResult.data.forEach(item => {
                        const componentName = item.component;
                        const lossQty = parseFloat(item.lossQuantity) || 0;
                        const purityPercent = parseFloat(item.metalPurityPercent) || 0;

                        if (!componentMap[componentName]) {
                            componentMap[componentName] = {
                                loss: 0,
                                pureLoss: 0,
                                purityPercent: purityPercent,
                                metalQuality: item.metalQuality
                            };
                        }

                        // Sum loss quantities
                        componentMap[componentName].loss += lossQty;

                        // Calculate pure loss: lossQuantity * (purityPercent / 100)
                        const pureLossForItem = lossQty * (purityPercent / 100);
                        componentMap[componentName].pureLoss += pureLossForItem;
                    });

                    // Step 2: Calculate totals
                    let totalLoss = 0;
                    let totalPureLoss = 0;

                    Object.values(componentMap).forEach(comp => {
                        totalLoss += comp.loss;
                        totalPureLoss += comp.pureLoss;
                    });

                    // Step 3: Format response with rounded values
                    const formattedComponents = {};
                    Object.keys(componentMap).forEach(key => {
                        formattedComponents[key] = {
                            loss: parseFloat(componentMap[key].loss.toFixed(4)),
                            pureLoss: parseFloat(componentMap[key].pureLoss.toFixed(4)),
                            purityPercent: componentMap[key].purityPercent,
                            metalQuality: componentMap[key].metalQuality
                        };
                    });

                    return {
                        status: 'SUCCESS',
                        reason: 'Employee loss data aggregated successfully',
                        data: {
                            totalLoss: parseFloat(totalLoss.toFixed(4)),
                            totalPureLoss: parseFloat(totalPureLoss.toFixed(4)),
                            components: formattedComponents,
                            lossLastTransferred: latestInventoryDate
                        }
                    };

                } catch (e) {
                    log.error('aggregateEmployeeLossData ERROR', e);
                    return {
                        status: 'ERROR',
                        reason: e.message || 'Failed to aggregate employee loss data',
                        data: null
                    };
                }
            },

            /**
             * Get service item lines for a Work Order.
             *
             * @param {number|string} workOrderId - Work Order internal ID
             * @returns {Array<{internalId: string, itemId: string, itemText: string, quantity: number, itemType: string}>}
             */
            getWorkOrderServiceLines(workOrderId) {
                try {
                    const results = [];

                    const workorderSearchObj = search.create({
                        type: "workorder",
                        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
                        filters: [
                            ["type", "anyof", "WorkOrd"],
                            "AND", ["internalid", "anyof", workOrderId],
                            "AND", ["item.type", "anyof", "Service"],
                            "AND", ["mainline", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "internal_id" }),
                            search.createColumn({ name: "item", label: "item" }),
                            search.createColumn({ name: "quantity", label: "quantity" }),
                            search.createColumn({ name: "type", join: "item", label: "type" }),
                            search.createColumn({ name: "cost", join: "item", label: "purchase_price" }),
                            search.createColumn({ name: "line", label: "line_id" }),
                            search.createColumn({ name: "custcol_jj_charge_type", label: "charge_type" })
                        ]
                    });

                    let searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: workorderSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(workorderSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    searchResults.forEach(row => {
                        results.push({
                            internalId: row.internal_id?.value || '',
                            itemId: row.item?.value || '',
                            itemText: row.item?.text || '',
                            quantity: Number(row.quantity?.value || 0),
                            updatedQuantity: Number(row.quantity?.value || 0),
                            itemType: row.type?.value || '',
                            purchasePrice: row.purchase_price?.value || '',
                            woLineNo: row.line_id?.value || '',
                            chargeType: Number(row.charge_type?.value || 0)
                        });
                    });

                    return results;

                } catch (e) {
                    log.error('Error in getWorkOrderServiceLines', e);
                    return [];
                }
            },

            /**
             * Returns true if matching operations exist
             * @param {Array} ids - array of internal IDs
             * @returns {boolean}
             */
            hasOperationResults(ids = []) {
                try {
                    if (!ids || !ids.length) return false;
                    const searchObj = search.create({
                        type: "customrecord_jj_operations",
                        filters: [
                            ["internalid", "anyof", ids],
                            "AND", [
                                ["custrecord_jj_oprtns_load_created", "is", "T"],
                                "OR", ["custrecord_jj_oprtns_exit", "isnotempty", ""],
                                "OR", ["isinactive", "is", "T"]
                            ]
                        ],
                        columns: ["internalid"]
                    });
                    // Efficient existence check
                    const result = searchObj.run().getRange({ start: 0, end: 1 });
                    return result && result.length > 0;
                } catch (error) {
                    log.error({ title: "Error in hasOperationResults", details: error });
                    return false; // safe fallback
                }
            },

            /**
             * Returns true if any active wax tree exists for given bag IDs
             * @param {Array} bagIds
             * @returns {boolean}
             */
            hasActiveWaxTree(bagIds = []) {
                try {
                    if (!bagIds || !bagIds.length) return false;
                    const searchObj = search.create({
                        type: "customrecord_jj_wax_tree",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bags", "anyof", bagIds],
                            "AND", ["custrecord_jj_moved_to_bagging", "is", "F"]
                        ],
                        columns: ["internalid"]
                    });
                    // Efficient check (only fetch 1 record)
                    const result = searchObj.run().getRange({ start: 0, end: 1 });
                    log.debug("hasActiveWaxTree result", result);
                    return result && result.length > 0;
                } catch (error) {
                    log.error({
                        title: "Error in hasActiveWaxTree",
                        details: JSON.stringify({ error, bagIds })
                    });

                    return false; // safe fallback
                }
            },

            getMakingChargeFromItem(goldFindingIds) {
                try {
                    let transactionIds = [];
                    let itemObjectMap = {};
                    const stringGF = goldFindingIds.map(String)
                    const itemSearchObj = search.create({
                        type: "item",
                        filters: [
                            ["internalid", "anyof", stringGF],
                            // "AND",
                            // ["transaction.type", "anyof", "VendBill"],
                            // "AND",
                            // ["transaction.mainline", "is", "F"],
                            // "AND",
                            // ["transaction.taxline", "is", "F"],
                            // "AND",
                            // ["transaction.cogs", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", summary: "GROUP", label: "item_id" }),
                            search.createColumn({ name: "custitem_jj_making_charge", summary: "MAX", label: "item_mc" }),
                            search.createColumn({ name: "internalid", join: "transaction", summary: "MAX", label: "tran_id" }),
                            search.createColumn({ name: "type", join: "transaction", summary: "GROUP", label: "tran_type" })
                        ]
                    });
                    let searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: itemSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(itemSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });


                    // searchResults is already an array from iterateSavedSearch, iterate directly
                    searchResults.forEach(function (result) {
                        const itemId = result?.item_id?.value;
                        const itemMC = result?.item_mc?.value;
                        const tranId = result?.tran_id?.value;
                        const tranType = result?.tran_type?.value;
                        log.debug("Item search results", { itemId, itemMC, tranId, tranType });

                        if (tranType == "VendBill") {
                            transactionIds.push(tranId);
                        }

                        if (!itemObjectMap[itemId]) {
                            itemObjectMap[itemId] = {
                                item_mc: itemMC || 0,
                                tran_qty: 0,
                                tran_mc: 0,
                                rate: itemMC || 0
                            };
                        }
                    });
                    return { transactionIds: transactionIds, itemObjectMap: itemObjectMap };

                } catch (error) {
                    log.error({
                        title: "Error in finding transaction ids",
                        details: "Error finding latest transaction ids"
                    });
                    return false;

                }

            },

            getMakingChargeFromBill(transactionIds, goldFindingIds, itemObjectMap) {
                try {

                    let processedItemIds = new Set();
                    const stringGF = goldFindingIds.map(String)
                    const vendorbillSearchObj = search.create({
                        type: "vendorbill",
                        filters: [
                            ["internalid", "anyof", transactionIds],
                            "AND",
                            ["type", "anyof", "VendBill"],
                            "AND",
                            ["item.internalid", "anyof", stringGF],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "internalid",
                                summary: "GROUP",
                                sort: search.Sort.DESC,
                                label: "tran_id"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "item",
                                summary: "GROUP",
                                label: "item_id"
                            }),
                            search.createColumn({
                                name: "custcol_jj_making_charge_amount",
                                summary: "MAX",
                                label: "making_charge_amount"
                            }),
                            search.createColumn({
                                name: "quantity",
                                summary: "MAX",
                                label: "quantity"
                            })
                        ]
                    });
                    let searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: vendorbillSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(vendorbillSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    if (searchResults.length > 0) {
                        log.debug("First Result Keys", Object.keys(searchResults[0]));
                        log.debug("First Result Full", JSON.stringify(searchResults[0]));
                    }

                    // searchResults is already an array from iterateSavedSearch, iterate directly
                    searchResults.forEach(function (result) {
                        const itemId = result?.item_id?.value;
                        const makingChargeAmount = result?.making_charge_amount?.value;
                        const quantity = result?.quantity?.value;


                        if (itemId && !processedItemIds.has(itemId)) {
                            // Update itemObjectMap with Vendor Bill data
                            if (itemObjectMap[itemId]) {
                                itemObjectMap[itemId].tran_mc = makingChargeAmount || itemObjectMap[itemId].tran_mc;
                                itemObjectMap[itemId].tran_qty = Math.abs(quantity || 0);
                                itemObjectMap[itemId].rate = itemObjectMap[itemId].tran_qty > 0 ? itemObjectMap[itemId].tran_mc / itemObjectMap[itemId].tran_qty : 0;
                            }

                            processedItemIds.add(itemId);
                        }
                    });

                    return itemObjectMap;
                } catch (error) {
                    log.error({
                        title: "Error in get making charge for gold finding item",
                        details: error.message || error.toString()
                    });
                    // Return the original itemObjectMap on error to prevent undefined
                    return itemObjectMap;
                }
            },

            /**
             * Get departments that have actual loss items in inventory
             * @param {string} materialType - Material type (gold_type, diamond_type, color_stone_type)
             * @param {boolean} isInProgress - Whether to check loss or loss outsourced status
             * @param {string} userId - User ID for filtering departments
             * @param {boolean} isAdmin - Whether user is admin (sees all departments)
             * @returns {Array} Array of departments with loss items
             */
            getDepartmentsWithLoss(materialType, isInProgress, userId, isAdmin, locations) {
                try {
                    log.debug('getDepartmentsWithLoss', { materialType, isInProgress, userId, isAdmin });

                    // Step 1: Get all active departments with their configurations
                    let allDepartments = searchResults.getAllManufacturingDepartments(null, null, null, null, locations);
                    log.debug('All departments count', allDepartments.length);

                    if (!allDepartments || allDepartments.length === 0) {
                        return [];
                    }

                    // Step 2: Build department mapping by bin+location
                    let departmentMap = {}; // { "bin_location": { deptId, deptName, statusId, hod } }
                    let allStatusIds = []; // Collect all loss status IDs

                    allDepartments.forEach(dept => {
                        try {
                            let deptFields = searchResults.getDepartmentFields(dept.value); // TODO: can get details from getAllManufacturingDepartments

                            if (!deptFields || !deptFields.bin || !deptFields.location) {
                                return; // Skip departments without proper configuration
                            }

                            let statusId = null;

                            // Determine which status to use based on material type and progress state
                            if (materialType === 'gold_type') {
                                statusId = isInProgress ? deptFields.lossOutsourcedStatus : deptFields.lossStatus;
                            } else if (materialType === 'diamond_type') {
                                // For diamonds, combine missed, burnt, and broken statuses
                                let statuses = [];
                                if (deptFields.diamondMissedStatus) statuses.push(deptFields.diamondMissedStatus);
                                if (deptFields.diamondBurntStatus) statuses.push(deptFields.diamondBurntStatus);
                                if (deptFields.diamondBrokenStatus) statuses.push(deptFields.diamondBrokenStatus);
                                if (statuses.length > 0) {
                                    statusId = statuses.join(',');
                                }
                            }

                            if (statusId) {
                                let key = deptFields.bin + '_' + deptFields.location; // TODO: Need key to get unique department
                                // log.debug('Department HOD check', { dept: dept.value, deptName: dept.name, hod: deptFields.hod });
                                departmentMap[key] = {
                                    deptId: dept.value,
                                    deptName: dept.name,
                                    bin: deptFields.bin,
                                    location: deptFields.location,
                                    statusId: statusId,
                                    hod: deptFields.hod,
                                    isCastingDept: deptFields.hasBulkMovement && !deptFields.hasBulkAcknowled
                                };

                                // Collect all status IDs for the search
                                let statusArray = statusId.split(',');
                                statusArray.forEach(s => {
                                    if (s && !allStatusIds.includes(s)) {
                                        allStatusIds.push(s);
                                    }
                                });
                            }
                        } catch (e) {
                            log.error('Error processing department', { dept: dept.value, error: e.message });
                        }
                    });

                    // log.debug('Department map created', { count: Object.keys(departmentMap).length, statusIds: allStatusIds });

                    if (allStatusIds.length === 0) {
                        log.debug('No valid status IDs found', 'Returning empty array');
                        return [];
                    }

                    // Step 3: Search for inventory with loss status across all departments
                    let filters = [
                        ["status", "anyof", allStatusIds],
                        "AND", ["available", "greaterthan", "0"],
                        "AND", ["binnumber", "noneof", "@NONE@"],
                        "AND", ["location", "noneof", "@NONE@"]
                    ];

                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["location", "anyof", locationArr]);
                        }
                    }

                    // Add material type filters
                    if (materialType === 'gold_type') {
                        filters.push("AND", ["item.class", "anyof", GOLD_CLASS_IDS]);
                    } else if (materialType === 'diamond_type') {
                        filters.push("AND", ["item.class", "anyof", DIAMOND_CLASSES_IDS]);
                    } else if (materialType === 'color_stone_type') {
                        filters.push("AND", ["item.class", "anyof", STONE_CLASSES_IDS]);
                    }

                    let columns = [
                        search.createColumn({ name: "binnumber", summary: "GROUP" }),
                        search.createColumn({ name: "location", summary: "GROUP" }),
                        search.createColumn({ name: "available", summary: "SUM" })
                    ];

                    let inventorySearch = search.create({
                        type: "inventorybalance",
                        filters: filters,
                        columns: columns
                    });

                    // Step 4: Match inventory results to departments
                    let departmentsWithLoss = [];
                    let departmentIdsWithLoss = new Set();

                    inventorySearch.run().each(function (result) {
                        let bin = result.getValue({ name: "binnumber", summary: "GROUP" });
                        let location = result.getValue({ name: "location", summary: "GROUP" });
                        let quantity = result.getValue({ name: "available", summary: "SUM" });

                        let key = bin + '_' + location; // TODO: Need key to get unique department

                        if (departmentMap[key] && parseFloat(quantity) > 0) {
                            let deptInfo = departmentMap[key];

                            // Avoid duplicates
                            if (!departmentIdsWithLoss.has(deptInfo.deptId)) {
                                departmentIdsWithLoss.add(deptInfo.deptId);

                                // Fetch HOD employee name if HOD exists
                                let hodData = null;
                                if (deptInfo.hod) {
                                    try {
                                        let hodFields = search.lookupFields({ // TODO: can do it pitside the loop with a search by passing the employee ids to it or can use exisitng search
                                            type: 'employee',
                                            id: deptInfo.hod,
                                            columns: ['altname', 'firstname', 'middlename', 'lastname']
                                        });
                                        let hodName = hodFields.altname || '';
                                        if (!hodName) {
                                            let first = hodFields.firstname || '';
                                            let middle = hodFields.middlename || '';
                                            let last = hodFields.lastname || '';
                                            hodName = [first, middle, last].filter(Boolean).join(' ').trim();
                                        }
                                        hodData = { value: deptInfo.hod, text: hodName };
                                        // log.debug('HOD fetched', { hodId: deptInfo.hod, hodName: hodName });
                                    } catch (e) {
                                        log.error('Error fetching HOD name', { hodId: deptInfo.hod, error: e.message });
                                        hodData = { value: deptInfo.hod, text: deptInfo.hod };
                                    }
                                }

                                // log.debug('Adding department with HOD', { deptId: deptInfo.deptId, deptName: deptInfo.deptName, hod: hodData });

                                departmentsWithLoss.push({
                                    value: deptInfo.deptId,
                                    name: deptInfo.deptName,
                                    hod: hodData,
                                    isCastingDept: deptInfo.isCastingDept
                                });
                            }
                        }

                        return true; // Continue iteration
                    });

                    // log.debug('Departments with loss found', { count: departmentsWithLoss.length, departments: departmentsWithLoss });

                    // Step 5: Filter by user permissions if not admin
                    // if (!isAdmin && userId) {
                    //     try {
                    //         // Get user's assigned departments
                    //         let userDeptFilters = [
                    //             ["isinactive", "is", "F"],
                    //             "AND", ["custrecord_jj_mandept_employees", "anyof", userId]
                    //         ];

                    //         let userDeptSearch = search.create({
                    //             type: "customrecord_jj_manufacturing_dept",
                    //             filters: userDeptFilters,
                    //             columns: [search.createColumn({ name: "internalid" })]
                    //         });

                    //         let userDepartmentIds = [];
                    //         userDeptSearch.run().each(function (result) {
                    //             userDepartmentIds.push(result.getValue('internalid'));
                    //             return true;
                    //         });

                    //         log.debug('User departments', userDepartmentIds);

                    //         // Filter departments with loss to only those user has access to
                    //         departmentsWithLoss = departmentsWithLoss.filter(dept =>
                    //             userDepartmentIds.includes(dept.value)
                    //         );

                    //         log.debug('Departments after user filter', departmentsWithLoss.length);
                    //     } catch (e) {
                    //         log.error('Error filtering by user', e.message);
                    //     }
                    // }

                    return departmentsWithLoss;

                } catch (error) {
                    log.error('getDepartmentsWithLoss error', error);
                    return [];
                }
            },

            /**
             * Returns: { <oldLotId>: <newLotId> }
             *
             * @param {string|number|[string|number]} adjustmentId
             * @param {Object} itemMap { <oldItemId>: <newItemId> }
             * @return {Object}
             */
            jobWorkLotMapping(adjustmentId, itemMap) {
                try {
                    log.debug("adjustmentId, itemMap", { adjustmentId, itemMap });
                    if (!adjustmentId) {
                        log.debug("Error jobWorkLotMapping", "Empty adjustment ID");
                        return {};
                    }
                    const adjustmentIds = Array.isArray(adjustmentId) ? adjustmentId : [adjustmentId];

                    if (!adjustmentIds?.length) {
                        log.debug("Error jobWorkLotMapping", "Empty adjustment Array");
                        return {};
                    }

                    const inventoryadjustmentSearchObj = search.create({
                        type: search.Type.INVENTORY_ADJUSTMENT,
                        filters: [
                            ['type', 'anyof', 'InvAdjst'],
                            'AND', ['custbody_jj_is_jobwork', 'is', 'T'],
                            'AND', ['internalid', 'anyof', adjustmentIds],
                            'AND', ['mainline', 'is', 'F']
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid', label: 'internal_id' }),
                            search.createColumn({ name: 'tranid', label: 'tran_id' }),
                            search.createColumn({ name: 'item', join: 'inventoryDetail', label: 'item' }),
                            search.createColumn({ name: 'binnumber', join: 'inventoryDetail', label: 'bin_number' }),
                            search.createColumn({ name: 'inventorynumber', join: 'inventoryDetail', label: ' lot_number' }),
                            //  search.createColumn({ name: 'status', join: 'inventoryDetail', label: 'status' }),
                            //  search.createColumn({ name: 'quantity', join: 'inventoryDetail', label: 'quantity' })
                        ]
                    });

                    const lotMap = {}; // oldLotId → newLotId
                    const fromLines = {}; // key → { lot, item, qty }
                    const toLines = {}; // key → { lot, item, qty }

                    // Use keys & values sets
                    const newItemKeys = new Set(Object.keys(itemMap).map(Number));   // old items
                    const newItemValues = new Set(Object.values(itemMap).map(Number)); // new items

                    log.debug("newItemKeys (old items)", [...newItemKeys]);
                    log.debug("newItemValues (new items)", [...newItemValues]);

                    inventoryadjustmentSearchObj.run().each(function (searchResult) {
                        const adjId = searchResult.getValue({ name: 'internalid', label: 'internal_id' });
                        const itemId = Number(searchResult.getValue({ name: 'item', join: 'inventoryDetail', label: 'item' }));
                        const bin = searchResult.getValue({ name: 'binnumber', join: 'inventoryDetail', label: 'bin_number' });
                        const invNum = searchResult.getValue({ name: 'inventorynumber', join: 'inventoryDetail', label: ' lot_number' });
                        const invText = searchResult.getText({ name: 'inventorynumber', join: 'inventoryDetail', label: ' lot_number' });
                        // const status = searchResult.getValue({ name: 'status', join: 'inventoryDetail', label: 'status' });
                        // const qty = Number(searchResult.getValue({ name: 'quantity', join: 'inventoryDetail', label: 'quantity' }));

                        log.debug("adjId, itemId, bin, invNum, invText", { adjId, itemId, bin, invNum, invText })

                        // Identify old vs new using sets
                        const isOld = newItemKeys.has(itemId);
                        const isNew = newItemValues.has(itemId);

                        if (!isOld && !isNew) return true;

                        // Normalized key (always based on NEW item)
                        let key = '';
                        if (isOld) {
                            key = `${adjId}|${itemMap[itemId]}|${invText}`;
                        } else if (isNew) {
                            key = `${adjId}|${itemId}|${invText}`;
                        }

                        const lineData = {
                            lot: invNum,
                            item: itemId,
                            invText: invText
                        };

                        log.debug("Processed Line", { key, isOld, isNew, lineData });

                        if (isOld) {
                            fromLines[key] = lineData;
                        } else if (isNew) {
                            toLines[key] = lineData;
                        }
                        return true;
                    });

                    log.debug("fromLines", fromLines);
                    log.debug("toLines", toLines);

                    // Direct key-based mapping
                    Object.keys(fromLines).forEach(key => {
                        const from = fromLines[key];
                        const to = toLines[key];
                        log.debug("Pairing lines", { key, from, to });

                        if (to) {
                            lotMap[Number(from.lot)] = Number(to.lot);
                        }
                    });

                    log.debug("Final lotMap", lotMap);

                    return lotMap;
                } catch (e) {
                    log.error("Error in jobWorkLotMapping", e);
                    return {};
                }
            },

            getLatestInventoryStatusChangeDate(departmentId) {
                try {
                    const inventorystatuschangeSearchObj = search.create({
                        type: "inventorystatuschange",
                        filters: [
                            ["type", "anyof", "StatChng"],
                            "AND",
                            ["custbody_jj_loss_transferred_dept", "anyof", departmentId],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["custbody_jj_loss_transferred", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "datecreated",
                                summary: "MAX",
                                label: "date_created"
                            })
                        ]
                    });

                    let searchResults = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: inventorystatuschangeSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(inventorystatuschangeSearchObj, 'label'),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000,
                    });

                    if (searchResults.length > 0) {
                        log.debug("First Result Keys", Object.keys(searchResults[0]));
                        log.debug("First Result Full", JSON.stringify(searchResults[0]));
                    }

                    return searchResults?.[0]?.date_created?.value || null;

                } catch (error) {
                    log.error({
                        title: "Error in getLatestInventoryStatusChangeDate",
                        details: error.message || error.toString()
                    });
                    return null;
                }
            },

            /**
             * Retrieves inventory status change records where the loss transferred checkbox is checked.
             * Used to populate the "Loss Transactions" dropdown in the recovery gold detail page.
             *
             * @returns {Array} Array of { value: internalId, text: tranid, trandate: trandate }
             */
            getLossTransactions(departmentId, locations) {
                try {
                    let filters = [
                        ["type", "anyof", "StatChng"],
                        "AND", ["mainline", "is", "F"],
                        "AND", ["taxline", "is", "F"],
                        "AND", ["custbody_jj_loss_transferred", "is", "T"],
                        "AND", ["inventorydetail.status", "anyof", "25"]
                    ];

                    if (departmentId) {
                        filters.push("AND", ["custbody_jj_loss_transferred_dept", "anyof", [departmentId]]);
                    }

                    if (locations) {
                        const locationArr = Array.isArray(locations) ? locations : [locations];
                        if (locationArr.length > 0) {
                            filters.push("AND", ["location", "anyof", locationArr]);
                        }
                    }

                    // log.debug('getLossTransactions filters', JSON.stringify(filters));

                    let inventorystatuschangeSearchObj = search.create({
                        type: "inventorystatuschange",
                        filters: filters,
                        columns: [
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "internal_id" }),
                            search.createColumn({ name: "tranid", label: "tran_id" }),
                            search.createColumn({ name: "datecreated", label: "tran_date" }),
                            search.createColumn({ name: "item", label: "item" }),
                            search.createColumn({ name: "quantity", label: "quantity" }),
                            search.createColumn({ name: "line", label: "line" }),
                            search.createColumn({ name: "inventorynumber", join: "inventoryDetail", label: "inventory_number" }),
                            search.createColumn({ name: "quantity", join: "inventoryDetail", label: "lot_quantity" }),
                            search.createColumn({ name: "lineid", join: "inventoryDetail", label: "Line ID" }),
                            search.createColumn({ name: "lineuniquekey", label: "line_unique_key" }),
                            search.createColumn({ name: "custitem_jj_metal_purity_percent", join: "item", label: "purity" }),
                            search.createColumn({ name: "custbody_jj_recovered_pure_qty", label: "recovered_pure_qty" })
                        ]
                    });

                    // Group by transaction, then by item within each transaction
                    let transactionMap = {};

                    inventorystatuschangeSearchObj.run().each(function (result) {
                        const tranId = result.getValue({ name: "internalid" });
                        const tranName = result.getValue({ name: "tranid" });
                        const createdDate = result.getValue({ name: "datecreated" });
                        const itemId = result.getValue({ name: "item" });
                        const itemName = result.getText({ name: "item" });
                        const lineNum = result.getValue({ name: "line", join: "inventoryDetail" });
                        const lineUniqueKey = result.getValue({ name: "lineuniquekey" });
                        const lineQuantity = Math.abs(parseFloat(result.getValue({ name: "quantity" }) || 0));
                        const lotQuantityRaw = result.getValue({ name: "quantity", join: "inventoryDetail" });
                        const quantity = lotQuantityRaw !== null && lotQuantityRaw !== ''
                            ? Math.abs(parseFloat(lotQuantityRaw))
                            : lineQuantity;
                        const invNumId = result.getValue({ name: "inventorynumber", join: "inventoryDetail" });
                        const invNumName = result.getText({ name: "inventorynumber", join: "inventoryDetail" });
                        const purityRaw = parseFloat(result.getValue({ name: "custitem_jj_metal_purity_percent", join: "item" }) || 0);
                        const purity = purityRaw / 100;

                        if (!tranId || !itemId) return true;

                        // Init transaction
                        if (!transactionMap[tranId]) {
                            transactionMap[tranId] = {
                                value: tranId,
                                text: tranName,
                                trandate: createdDate,
                                recoveredPureQty: Number(parseFloat(result.getValue({ name: "custbody_jj_recovered_pure_qty" }) || 0).toFixed(4)),
                                items: {}
                            };
                        }

                        // Init item within transaction
                        if (!transactionMap[tranId].items[itemId]) {
                            transactionMap[tranId].items[itemId] = {
                                itemId: itemId,
                                itemName: itemName,
                                purity: purity,
                                lossQty: 0,
                                lossOutsourcedQty: 0,
                                pureWeight: 0,
                                pureRecovered: 0,
                                recoveredQty: 0,
                                lossPieces: 0,
                                lossOutsourcedPieces: 0,
                                inventoryDetails: {
                                    lossQty: [],
                                    lossOutsourcedQty: [],
                                    lossPieces: [],
                                    lossOutsourcedPieces: []
                                }
                            };
                        }

                        const pureQty = Number(parseFloat(quantity * (purity || 1)).toFixed(4));

                        // Lot-level entry
                        const lotEntry = {
                            inventoryNumber: invNumId,
                            inventoryName: invNumName,
                            quantityAvailable: quantity,
                            createdDate: createdDate,
                            pureWeight: pureQty,
                            purity: purity,
                            pureRecoveredPerLot: 0,
                            recoveredQtyPerLot: 0
                        };

                        // Deduplicate by line number — each transaction line should only be counted once
                        // (status change returns from-row and to-row for the same line)
                        // const lineKey = tranId + '_' + lineNum;
                        // const alreadyAdded = transactionMap[tranId].items[itemId].processedLines &&
                        //     transactionMap[tranId].items[itemId].processedLines.indexOf(lineKey) !== -1;

                        // if (!alreadyAdded) {
                        // if (!transactionMap[tranId].items[itemId].processedLines) {
                        //     transactionMap[tranId].items[itemId].processedLines = [];
                        // }
                        // transactionMap[tranId].items[itemId].processedLines.push(lineKey);

                        // transactionMap[tranId].items[itemId].lossQty = Number(
                        //     parseFloat(transactionMap[tranId].items[itemId].lossQty + quantity).toFixed(4)
                        // );
                        transactionMap[tranId].items[itemId].lossQty = Number(
                            parseFloat(transactionMap[tranId].items[itemId].lossQty + quantity).toFixed(4)
                        );
                        transactionMap[tranId].items[itemId].lossOutsourcedQty = Number(
                            parseFloat(transactionMap[tranId].items[itemId].lossOutsourcedQty + quantity).toFixed(4)
                        );
                        transactionMap[tranId].items[itemId].pureWeight = Number(
                            parseFloat(transactionMap[tranId].items[itemId].pureWeight + pureQty).toFixed(4)
                        );
                        if (invNumId) {
                            transactionMap[tranId].items[itemId].inventoryDetails.lossQty.push(lotEntry);
                            transactionMap[tranId].items[itemId].inventoryDetails.lossOutsourcedQty.push(Object.assign({}, lotEntry));
                        }
                        // }

                        return true;
                    });

                    // Convert to array, items map → array
                    const lossTransactions = Object.values(transactionMap).map(function (tran) {
                        return {
                            value: tran.value,
                            text: tran.text,
                            trandate: tran.trandate,
                            recoveredPureQty: tran.recoveredPureQty,
                            items: Object.values(tran.items)
                        };
                    });

                    Object.keys(transactionMap).forEach(function (key) {
                        const tran = transactionMap[key];
                        const tableData = Object.values(tran.items).map(function (item) {
                            return {
                                itemName: item.itemName,
                                lossQty: item.lossQty,
                                pureWeight: item.pureWeight,
                                lots: (item.inventoryDetails.lossQty || []).map(function (l) {
                                    return { inventoryNumber: l.inventoryNumber, inventoryName: l.inventoryName, quantityAvailable: l.quantityAvailable };
                                })
                            };
                        });
                        // log.debug('getLossTransactions table data for ' + tran.text, JSON.stringify(tableData));
                    });

                    return { status: 'SUCCESS', reason: 'Loss transactions retrieved', data: lossTransactions };
                } catch (error) {
                    log.error('getLossTransactions error', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            getEmployeeWiseRecoveryByTransaction(lossTranId) {
                try {
                    let results = [];

                    let searchObj = search.create({
                        type: 'customrecord_jj_employee_wise_recovery',
                        filters: [
                            ['isinactive', 'is', 'F'],
                            'AND', ['custrecord_jj_emp_recovery_loss_tran', 'anyof', lossTranId]
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid', label: 'id' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_employee', label: 'employee' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_department', label: 'department' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_loss_tran', label: 'loss_transaction' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_rec_qty', label: 'recovered_qty' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_pure_rec_qty', label: 'pure_recovered_qty' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_touch', label: 'touch' }),
                            search.createColumn({ name: 'custrecord_jj_emp_recovery_percentage', label: 'recovery_percentage' }),
                            search.createColumn({ name: 'custrecord_jj_emp_rec_inv_adjustment', label: 'inventory_adjustment' }),
                        ]
                    });

                    searchObj.run().each(function (result) {
                        results.push({
                            id: result.getValue({ name: 'internalid' }),
                            employee: { value: result.getValue({ name: 'custrecord_jj_emp_recovery_employee' }), text: result.getText({ name: 'custrecord_jj_emp_recovery_employee' }) },
                            department: { value: result.getValue({ name: 'custrecord_jj_emp_recovery_department' }), text: result.getText({ name: 'custrecord_jj_emp_recovery_department' }) },
                            loss_transaction: { value: result.getValue({ name: 'custrecord_jj_emp_recovery_loss_tran' }), text: result.getText({ name: 'custrecord_jj_emp_recovery_loss_tran' }) },
                            recovered_qty: result.getValue({ name: 'custrecord_jj_emp_recovery_rec_qty' }),
                            pure_recovered_qty: result.getValue({ name: 'custrecord_jj_emp_recovery_pure_rec_qty' }),
                            touch: result.getValue({ name: 'custrecord_jj_emp_recovery_touch' }),
                            recovery_percentage: result.getValue({ name: 'custrecord_jj_emp_recovery_percentage' }),
                            inventory_adjustment: { value: result.getValue({ name: 'custrecord_jj_emp_rec_inv_adjustment' }), text: result.getText({ name: 'custrecord_jj_emp_rec_inv_adjustment' }) },
                        });
                        return true;
                    });

                    return { status: 'SUCCESS', reason: 'Records retrieved', data: results };
                } catch (error) {
                    log.error('getEmployeeWiseRecoveryByTransaction error', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

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
                            if (dateTs >= currentTs) {
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

            /**
             * Get Inventory Item Cost Details
             *
             * @param {number|string|Array} itemIds
             * @param {number|string} locationId
             * @returns {Array}
             */
            getInventoryItemCostDetails(itemIds, locationId) {
                try {
                    if (!itemIds || !locationId) {
                        log.error("Invalid Input", { itemIds, locationId });
                        return [];
                    }

                    const itemIdArray = Array.isArray(itemIds) ? itemIds : [itemIds];

                    if (!itemIdArray.length) {
                        log.error("Empty itemIds Array");
                        return [];
                    }

                    const results = [];

                    const inventoryitemSearchObj = search.create({
                        // type: search.Type.INVENTORY_ITEM,
                        type: search.Type.ITEM,
                        filters: [
                            // ["type", "anyof", "InvtPart"],
                            // "AND", 
                            ["internalid", "anyof", itemIdArray],
                            "AND", ["inventorylocation", "anyof", locationId]
                        ],
                        columns: ["internalid", "itemid", "averagecost", "cost", "inventorylocation", "locationaveragecost"]
                    });

                    inventoryitemSearchObj.run().each(result => {
                        try {
                            results.push({
                                itemId: Number(result.getValue({ name: "internalid" })),
                                itemName: result.getValue({ name: "itemid" }),
                                averageCost: Number(result.getValue({ name: "averagecost" })) || 0,
                                purchasePrice: Number(result.getValue({ name: "cost" })) || 0,
                                locationId: result.getValue({ name: "inventorylocation" }),
                                locationAvgCost: Number(result.getValue({ name: "locationaveragecost" })) || 0
                            });
                        } catch (innerError) {
                            log.error("Error processing search result", innerError);
                        }
                        return true;
                    });

                    log.debug("Inventory Item Details Result", results);
                    return results;

                } catch (e) {
                    log.error("Error in getInventoryItemCostDetails", e);
                    return [];
                }
            },

            /**
             * Fetch bag lot details and return summary + grouped data
             *
             * @param {Array<string|number>} lotIds - Array of lot internal IDs
             * @returns {{
             *   summary: Object,
             *   grouped: Object
             * }}
             */
            getBagLotSummary(lotIds) {
                try {

                    if (!lotIds || !Array.isArray(lotIds) || !lotIds.length) {
                        log.error("Invalid lotIds input", { lotIds });
                        return { summary: {}, grouped: {} };
                    }

                    // Initialize overall summary object
                    const summary = {
                        goldQty: 0,
                        goldPieces: 0,
                        diamondQty: 0,
                        diamondPieces: 0,

                        colorStoneQty: 0,
                        colorStonePieces: 0,
                        totalQty: 0,
                        totalPieces: 0,

                        goldReceivedQty: 0,
                        goldReceivedPieces: 0,
                        diamondReceivedQty: 0,
                        diamondReceivedPieces: 0,
                        colorStoneReceivedQty: 0,
                        colorStoneReceivedPieces: 0,
                        totalReceivedQty: 0,
                        totalReceivedPieces: 0
                    };

                    // Grouped structure: quality -> color -> same structure as summary
                    const grouped = {};

                    // Create search
                    const searchObj = search.create({
                        type: "customrecord_jj_bag_lot_details",
                        filters: [
                            ["custrecord_jj_lot_number", "anyof", lotIds],
                            "AND", ["isinactive", "is", "F"]
                        ],
                        columns: [
                            "custrecord_jj_newly_issue_qty",

                            search.createColumn({ name: "custitemnumber_jj_serial_num_diamond_pieces", join: "CUSTRECORD_JJ_LOT_NUMBER" }),
                            search.createColumn({ name: "custitemnumber_jj_serial_num_cs_pieces", join: "CUSTRECORD_JJ_LOT_NUMBER" }),
                            search.createColumn({ name: "custitemnumber_jj_serial_num_cs_weight", join: "CUSTRECORD_JJ_LOT_NUMBER" }),
                            search.createColumn({ name: "custitemnumber_jj_serial_num_diamond_weight", join: "CUSTRECORD_JJ_LOT_NUMBER" }),
                            search.createColumn({ name: "custitemnumber_jj_serial_num_net_weight", join: "CUSTRECORD_JJ_LOT_NUMBER" }),

                            search.createColumn({ name: "custitemnumber_jj_fg_metal_quality", join: "CUSTRECORD_JJ_LOT_NUMBER" }),
                            search.createColumn({ name: "custitemnumber_jj_fg_metal_colour", join: "CUSTRECORD_JJ_LOT_NUMBER" })
                        ]
                    });

                    // Run search
                    searchObj.run().each(result => {

                        // Extract values
                        const diamondPieces = Number(result.getValue({ name: "custitemnumber_jj_serial_num_diamond_pieces", join: "CUSTRECORD_JJ_LOT_NUMBER" })) || 0;
                        const csPieces = Number(result.getValue({ name: "custitemnumber_jj_serial_num_cs_pieces", join: "CUSTRECORD_JJ_LOT_NUMBER" })) || 0;
                        const csWeight = (Number(result.getValue({ name: "custitemnumber_jj_serial_num_cs_weight", join: "CUSTRECORD_JJ_LOT_NUMBER" })) || 0) / CARATS_TO_GRAMS_CONST;
                        const diamondWeight = (Number(result.getValue({ name: "custitemnumber_jj_serial_num_diamond_weight", join: "CUSTRECORD_JJ_LOT_NUMBER" })) || 0) / CARATS_TO_GRAMS_CONST;
                        const netWeight = Number(result.getValue({ name: "custitemnumber_jj_serial_num_net_weight", join: "CUSTRECORD_JJ_LOT_NUMBER" })) || 0;

                        const newlyIssuedQty = Number(result.getValue("custrecord_jj_newly_issue_qty")) || 0;
                        const metalQuality = result.getText({ name: "custitemnumber_jj_fg_metal_quality", join: "CUSTRECORD_JJ_LOT_NUMBER" }) || "UNKNOWN";
                        const metalColor = result.getText({ name: "custitemnumber_jj_fg_metal_colour", join: "CUSTRECORD_JJ_LOT_NUMBER" }) || "UNKNOWN";

                        // Determine if received bucket
                        const isReceived = !newlyIssuedQty || newlyIssuedQty === 0;

                        // Helper to update object
                        const update = (obj, isReceivedFlag) => {

                            if (isReceivedFlag) {
                                obj.goldReceivedQty += netWeight;
                                obj.goldReceivedPieces += 0;

                                obj.diamondReceivedQty += diamondWeight;
                                obj.diamondReceivedPieces += diamondPieces;

                                obj.colorStoneReceivedQty += csWeight;
                                obj.colorStoneReceivedPieces += csPieces;

                                obj.totalReceivedQty += (netWeight + diamondWeight + csWeight);
                                obj.totalReceivedPieces += (diamondPieces + csPieces);
                            }

                            obj.goldQty += netWeight;
                            obj.goldPieces += 0;

                            obj.diamondQty += diamondWeight;
                            obj.diamondPieces += diamondPieces;

                            obj.colorStoneQty += csWeight;
                            obj.colorStonePieces += csPieces;

                            obj.totalQty += (netWeight + diamondWeight + csWeight);
                            obj.totalPieces += (diamondPieces + csPieces);
                        };

                        // Update global summary
                        update(summary, isReceived);

                        // Initialize grouping
                        if (!grouped[metalQuality]) {
                            grouped[metalQuality] = {};
                        }

                        if (!grouped[metalQuality][metalColor]) {
                            grouped[metalQuality][metalColor] = JSON.parse(JSON.stringify(summary)).constructor === Object
                                ? {
                                    goldQty: 0, goldPieces: 0, diamondQty: 0, diamondPieces: 0,
                                    colorStoneQty: 0, colorStonePieces: 0, totalQty: 0, totalPieces: 0,
                                    goldReceivedQty: 0, goldReceivedPieces: 0, diamondReceivedQty: 0, diamondReceivedPieces: 0,
                                    colorStoneReceivedQty: 0, colorStoneReceivedPieces: 0,
                                    totalReceivedQty: 0, totalReceivedPieces: 0
                                }
                                : {};
                        }

                        // Update grouped
                        update(grouped[metalQuality][metalColor], isReceived);

                        return true;
                    });

                    return { summary, grouped };

                } catch (error) {
                    log.error("Error in getBagLotSummary", error);
                    return { summary: {}, grouped: {} };
                }
            },

            /**
             * Get existing active Bag Core Tracking records by Work Orders
             *
             * Active Bag Core = not inactive and not rejected
             *
             * @param {Array} workOrderIds
             * @returns {Object}
             */
            getExistingBagCoreTrackingMap(workOrderIds = []) {
                let existingBagCoreTrackingMap = {};
                try {
                    if (!workOrderIds || !Array.isArray(workOrderIds) || !workOrderIds.length) {
                        return existingBagCoreTrackingMap;
                    }
                    const bagCoreTrackingSearchObj = search.create({
                        type: "customrecord_jj_bag_core_tracking",
                        filters: [
                            ["isinactive", "is", "F"],
                            "AND", ["custrecord_jj_bagcore_wo", "anyof", workOrderIds],
                            "AND", ["custrecord_jj_bagcore_is_rejected", "is", "F"],
                            "AND", ["custrecord_jj_bagcore_wo.mainline", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "bag_core_tracking_id" }),
                            search.createColumn({ name: "custrecord_jj_bagcore_wo", label: "work_order" }),
                            search.createColumn({ name: "custbody_jj_associated_bag_core_record", join: "CUSTRECORD_JJ_BAGCORE_WO", label: "associated_bag_core_id" })
                        ]
                    });

                    const searchResult = jjUtil.dataSets.iterateSavedSearch({
                        searchObj: bagCoreTrackingSearchObj,
                        columns: jjUtil.dataSets.fetchSavedSearchColumn(bagCoreTrackingSearchObj, "label"),
                        PAGE_INDEX: null,
                        PAGE_SIZE: 1000
                    });

                    searchResult.forEach(result => {
                        const woId = result.work_order?.value || null;
                        const bagCoreTrackingId = result.bag_core_tracking_id?.value || null;
                        const existingAssociatedBagCoreId = result.associated_bag_core_id?.value || null;

                        /**
                         * Since search is sorted DESC by internalid,
                         * keep only the latest active Bag Core Tracking record per WO.
                         */
                        if (woId && !existingBagCoreTrackingMap[woId]) {
                            existingBagCoreTrackingMap[woId] = {
                                bagCoreTrackingId,
                                existingAssociatedBagCoreId
                            };
                        }
                    });

                    return existingBagCoreTrackingMap;
                } catch (e) {
                    log.error("Error in getExistingBagCoreTrackingMap", e);
                    return existingBagCoreTrackingMap;
                }
            },

            /**
             * Fetch other charges for the provided category groups
             * @param {Array} categoryGroups - Unique category group IDs
             * @returns {Array} - Other charges with related child record details
             */
            getOtherCharges(categoryGroups, location) {
                if (!categoryGroups || categoryGroups.length === 0) {
                    log.debug('No Category Groups Provided', 'The categoryGroups array is empty.');
                    return [];
                }
                if (!location) {
                    log.debug('No Location Provided', 'The location is empty.');
                    return [];
                }
                const otherChargesSearch = search.create({
                    type: 'customrecord_jj_other_charge_item_map',
                    filters: [
                        ["isinactive", "is", "F"],
                        "AND", ["custrecord_jj_category_other_charges.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_other_charge_item.isinactive", "is", "F"],
                        "AND", ["custrecord_jj_category_other_charges.custrecord_jj_cat_group", "anyof", categoryGroups],
                        "AND", ["custrecord_jj_category_other_charges.custrecord_jj_cat_group_location", "anyof", location]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_jj_other_charge_item", label: "Other Charge Item" }),
                        search.createColumn({ name: "custrecord_jj_charge_hours_worked", label: "Hours Worked" }),
                        search.createColumn({ name: "custrecord_jj_charge_type", label: "Charge Type" }),
                        // search.createColumn({ name: "cost", join: "CUSTRECORD_JJ_OTHER_CHARGE_ITEM", label: "Purchase Price" })
                    ]
                });

                const results = [];
                otherChargesSearch.run().each(result => {
                    results.push({
                        // categoryOtherCharge: result.getValue('custrecord_jj_category_other_charges'),
                        chargeItem: result.getValue('custrecord_jj_other_charge_item'),
                        hoursWorked: parseFloat(result.getValue('custrecord_jj_charge_hours_worked') || 0),
                        chargeType: Number(result.getValue('custrecord_jj_charge_type') || 0),
                        // cost: parseFloat(result.getValue({ name: 'cost', join: 'CUSTRECORD_JJ_OTHER_CHARGE_ITEM' }) || 0)
                    });
                    return true;
                });

                return results;
            }
        };
        jjUtil.applyTryCatch(searchResults, 'searchResults');
        return searchResults;
    }
);