/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * ***********************************************************************************************************************
 * DEWIN-331 Bag Management Solution and Functionality Implementation
 * ***********************************************************************************************************************
 * 
 * Author: Jobin & Jismi IT Services LLP
 *
 * Date Created : 22 - January - 2025
 *  
 * Created By: Jobin and Jismi IT Services LLP
 *
 * Description: This script is used to manage the API's for Reports UI Related to Bag Management Solution.
 * 
 * REVISION HISTORY
 * @version 1.0 created initial build by JJ0312
 *
 * 
 * COPYRIGHT © 2024 Jobin & Jismi.
 * All rights reserved. This script is a proprietary product of Jobin & Jismi IT Services LLP and is protected by copyright
 * law and international treaties. Unauthorized reproduction or distribution of this script, or any portion of it,
 * may result in severe civil and criminal penalties and will be prosecuted to the maximum extent possible under law.
 * **************************************************************************************************************************/
define(['N/runtime', 'N/search', 'N/ui/serverWidget', 'N/file', 'N/format', 'N/https', 'N/record', '../Libraries/jj_cm_ns_utility.js', '../Models/jj_cm_savedsearches.js', './jj_cm_functions.js', '../Models/jj_cm_efficiency_searches.js'],
    /**
 * @param{runtime} runtime
 * @param{search} search
 * @param{serverWidget} serverWidget
 * @param{format} format
 * @param{record} record
 * @param{jj_cm_ns_utility} jj_cm_ns_utility
 * @param{cm_model} cm_model
 * @param{cm_functions} cm_functions
 * @param{cm_efficiency} cm_efficiency
 */
    (runtime, search, serverWidget, file, format, https, record, jj_cm_ns_utility, cm_model, cm_functions, cm_efficiency) => {
        const CASTING_DEPARTMENT_ID = 9;
        const LOC_TRANS_REASON_CODE = 51; // Reason code for Location Transfer operations
        // const TREE_CUTTING_DEPARTMENT_ID = 10;
        // const BARCODING_AND_FG_DEPT_ID = 25;
        // const PAGE_SIZE = 10; // Define page size
        // const SERIAL_LOT_ITEM_CLASS = 25;

        const apiMethods = {

            listDepartments() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('rootContext.body', rootContext.body);
                    let locations = requestBody?.locations || [];
                    let departmentList;
                    // if (requestBody?.department_name == "Casting") {
                    //     departmentList = cm_model.getAllManufacturingDepartments([CASTING_DEPARTMENT_ID], requestBody?.department_name);
                    // } else 
                    if (requestBody?.dept_hod) {
                        departmentList = cm_model.getAllManufacturingDepartments(null, "dept_hod", null, null, locations);
                    } else if (requestBody?.params == "loss_recovery") {
                        // Get only departments that have actual loss items
                        let materialType = requestBody?.material_type || 'gold_type';
                        let isInProgress = requestBody?.isInProgress || false;
                        let includeCastingLoss = requestBody?.include_casting_loss || false;

                        departmentList = cm_model.getDepartmentsWithLoss(
                            materialType,
                            isInProgress,
                            requestBody?.user_id,
                            requestBody?.all_department,
                            locations
                        );

                        // When write-off page requests, also include departments with lossStatus inventory
                        // (e.g. Casting which bypasses In Progress and recovers directly from Loss)
                        if (includeCastingLoss && isInProgress) {
                            let lossModeDepts = cm_model.getDepartmentsWithLoss(
                                materialType,
                                false, // lossStatus
                                requestBody?.user_id,
                                requestBody?.all_department,
                                locations
                            );
                            // Merge — add any loss-mode dept not already in the list
                            let existingIds = new Set(departmentList.map(d => d.value));
                            lossModeDepts.forEach(d => {
                                if (!existingIds.has(d.value)) {
                                    departmentList.push(d);
                                }
                            });
                        }
                    } else if (requestBody?.params == "user_specific") {
                        departmentList = cm_model.getAllManufacturingDepartments(null, requestBody?.params, requestBody?.all_department, requestBody?.user_id, locations);
                    } else if (requestBody?.params == "location_transfer") {
                        departmentList = cm_model.getAllManufacturingDepartments(null, requestBody?.params, requestBody?.all_department, requestBody?.user_id);
                        // Extract locations IDs from departments
                        let locationIds = departmentList.map(dept => dept.locations[0]?.value).filter(id => id); // Filter out undefined/null IDs

                        if (locationIds.length > 0) {
                            // Fetch sub-locations for the extracted locations IDs
                            let subLocationobj = cm_model.getSubLocations(locationIds);

                            if (subLocationobj && subLocationobj.status != 'SUCCESS') {
                                return subLocationobj;
                            }

                            let subLocations = subLocationobj.data;
                            // Merge sub-locations into the department's locations array
                            departmentList = departmentList.map(dept => {
                                const parentLocation = dept.locations[0];
                                const matchingSubLocations = subLocations.filter(subLoc => subLoc.parent_id == parentLocation?.value);

                                return {
                                    ...dept,
                                    locations: [
                                        parentLocation, // Keep the original parent locations
                                        ...matchingSubLocations.map(subLoc => ({
                                            value: String(subLoc.location_id),
                                            text: subLoc.location_name
                                        }))
                                    ]
                                };
                            });
                        }
                    } else {
                        departmentList = cm_model.getAllManufacturingDepartments(null, requestBody?.params, null, null, locations);
                    }

                    // log.debug('departmentList with sub-locations', departmentList);
                    return { status: 'SUCCESS', reason: 'Departments Listed', data: departmentList };
                } catch (error) {
                    log.error('Error listDepartments', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listActiveBags() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listActiveBags rootContext.body', rootContext.body);

                    let pageIndex = requestBody.page_index ? Number(requestBody.page_index) : null;
                    let departmentId = requestBody.department_id ? requestBody.department_id : null;
                    let allDepartment = requestBody.all_department ? requestBody.all_department : false;
                    let customerId = requestBody.customer_id ? requestBody.customer_id : null;
                    let bagSearchKey = requestBody.bag_search_key ? requestBody.bag_search_key : null;
                    let params = requestBody.params ? requestBody.params : null; // location_transfer
                    let pageSize = requestBody.page_size ? requestBody.page_size : null;
                    let overdueDays = requestBody.overdue_days ? requestBody.overdue_days : 0;
                    let timestamp = requestBody.timestamp ? requestBody.timestamp : null;
                    let employee = requestBody.employee ? requestBody.employee : null;
                    let date = requestBody.date ? requestBody.date : null;
                    let locations = requestBody.locations || null;


                    if (params == 'active_bags_for_overdue') {
                        let overdueMaterialBags = cm_model.getOverdueMaterialBags(departmentId, null, pageIndex, allDepartment, customerId, bagSearchKey, params, pageSize, overdueDays, locations);
                        overdueMaterialBags.timestamp = timestamp;
                        return { status: 'SUCCESS', reason: 'Bags With Overdue Materials Listed', data: overdueMaterialBags };
                    }

                    let activeBagsList = [];
                    if (params == 'active_bags') {
                        activeBagsList = cm_model.getActiveBagsByEmployee(departmentId, null, pageIndex, allDepartment, customerId, bagSearchKey, params, pageSize, date, employee, null, locations);
                    } else {
                        activeBagsList = cm_model.getActiveBags(departmentId, null, pageIndex, allDepartment, customerId, bagSearchKey, params, pageSize, locations);
                    }

                    // const parsedActiveBagsList = {
                    //     ...activeBagsList,
                    //     bagList: activeBagsList.bagList?.map((bag) => {
                    //         const originalDate = bag["date"];
                    //         const parsed = cm_functions.parseDate(originalDate);
                    //         return {
                    //             ...bag,
                    //             parsed_date: parsed,   // YYYY-MM-DD format
                    //         };
                    //     }) || []
                    // };
                    // log.debug('activeBagsList', activeBagsList);

                    // log.debug("Bags List", activeBagsList.map(bag => bag.bag_no_name));

                    // if (activeBagsList && params == 'location_transfer') {
                    //     if (activeBagsList.length == 0) {
                    //         return { status: 'ERROR', reason: 'No build bags found', data: [] };
                    //     }
                    //     let assemblyBuilds = activeBagsList.map(bag => bag.assembly_build?.value);
                    //     log.debug("assemblyBuilds", assemblyBuilds);
                    //     if (assemblyBuilds.length == 0) {
                    //         return { status: 'ERROR', reason: 'No assembly builds found', data: [] };
                    //     }
                    //     let getFGSerialComponentsObj = cm_model.getFGSerialComponents(assemblyBuilds);
                    //     if (getFGSerialComponentsObj.status != 'SUCCESS') {
                    //         return getFGSerialComponentsObj;
                    //     }

                    //     activeBagsList = activeBagsList.map((bag) => {
                    //         const matchingBuild = getFGSerialComponentsObj.data?.find(build => build.assembly_build?.value == bag.assembly_build?.value);
                    //         return {
                    //             ...bag,
                    //             fgSerials: matchingBuild?.fg_series_groups || []
                    //         };
                    //     });
                    // }

                    return { status: 'SUCCESS', reason: 'Customer Bags Listed', data: activeBagsList };
                } catch (error) {
                    log.error('Error listActiveBags', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            listBagComponents() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getBagItemDetails requestBody', requestBody);

                    let bagId = requestBody.bag_id ? requestBody.bag_id : null;
                    let bagComponents = cm_model.getBagItemDetails(bagId);

                    if (bagComponents && bagComponents.length > 0) {
                        return { status: 'SUCCESS', reason: 'Bag Items Listed', data: bagComponents };
                    } else {
                        return { status: 'ERROR', reason: 'NO_ITEMS_FOUND', data: [] };
                    }
                } catch (error) {
                    log.error('Error getBagItemDetails', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },
            /**
             * Fetches ONLY unique metal qualities and colors from all Gold Bullion items in bags.
             * Returns clean arrays with text values only (no IDs).
             * 
             * @returns {Object} { qualities: ["G14", "G18", ...], colors: ["Yellow", "White", ...] }
             */
            getUniqueQualitiesAndColors() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getUniqueQualitiesAndColors - Request body:', JSON.stringify(requestBody));

                    let bagIds = requestBody.bag_ids ? requestBody.bag_ids : [];
                    log.debug('getUniqueQualitiesAndColors - Bag IDs:', bagIds);
                    log.debug('getUniqueQualitiesAndColors - Bag IDs count:', bagIds.length);

                    if (!bagIds || bagIds.length === 0) {
                        log.debug('getUniqueQualitiesAndColors - No bag IDs provided');
                        return { status: 'SUCCESS', reason: 'NO_BAG_IDS', data: { qualities: [], colors: [] } };
                    }

                    let result = cm_model.getUniqueQualitiesAndColors(bagIds);
                    log.debug('getUniqueQualitiesAndColors - Result:', JSON.stringify(result));

                    if (result && (result.qualities.length > 0 || result.colors.length > 0)) {
                        return { status: 'SUCCESS', reason: 'Unique Qualities and Colors Fetched', data: result };
                    } else {
                        return { status: 'SUCCESS', reason: 'NO_DATA_FOUND', data: { qualities: [], colors: [] } };
                    }
                } catch (error) {
                    log.error('Error getUniqueQualitiesAndColors', error);
                    log.error('Error stack:', error.stack);
                    return { status: 'ERROR', reason: error.message, data: { qualities: [], colors: [] } }
                }
            },

            /**
             * Fetches the Assembly Item (Bag Core Tracking) metal quality for each bag.
             * Used when a bag has multiple bullion items to determine which quality to use.
             * 
             * @returns {Object} Map of bagId → { quality: {text, value}, color: {text, value} }
             */
            getBagAssemblyQualityColor() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getBagAssemblyQualityColor - Request body:', JSON.stringify(requestBody));

                    let bagIds = requestBody.bag_ids ? requestBody.bag_ids : [];
                    log.debug('getBagAssemblyQualityColor - Bag IDs:', bagIds);
                    log.debug('getBagAssemblyQualityColor - Bag IDs count:', bagIds.length);

                    if (!bagIds || bagIds.length === 0) {
                        log.debug('getBagAssemblyQualityColor - No bag IDs provided');
                        return { status: 'SUCCESS', reason: 'NO_BAG_IDS', data: {} };
                    }

                    let qualityColorMap = cm_model.getBagAssemblyItemQualityAndColor(bagIds);
                    log.debug('getBagAssemblyQualityColor - Quality/Color map:', JSON.stringify(qualityColorMap));

                    if (qualityColorMap && Object.keys(qualityColorMap).length > 0) {
                        return { status: 'SUCCESS', reason: 'Bag Assembly Quality/Color Fetched', data: qualityColorMap };
                    } else {
                        return { status: 'SUCCESS', reason: 'NO_DATA_FOUND', data: {} };
                    }
                } catch (error) {
                    log.error('Error getBagAssemblyQualityColor', error);
                    log.error('Error stack:', error.stack);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            /**
             * Lists bags that are ready to move.
             * 
             * @returns {Object} The result of the bag movement list operation.
             */
            listBagToMove() {
                try {
                    let requestBody = rootContext.body;
                    log.debug("listBagToMove requestBody", requestBody);

                    let pageIndex = requestBody.page_index || null;
                    let fromDepartmentId = requestBody.from_department_id || null;
                    let fromManufacturerId = requestBody.from_manufacturer_id || null;
                    let bagSearchKey = requestBody.bag_search_key || null;
                    let params = requestBody.params || null; // bag_movement
                    let pageSize = requestBody.page_size ? requestBody.page_size : null;

                    // getBagsReadyToMove parameters (bags, department, bagSearchKey, pageIndex, params, manufacturer, pageSize)
                    let bagMovementList = cm_model.getBagsReadyToMove(null, fromDepartmentId, bagSearchKey, pageIndex, params, fromManufacturerId, pageSize);

                    // log.debug('bagMovementList', bagMovementList);
                    // Handle both array (when pageIndex is null) and object (when pageIndex is provided) responses
                    if (bagMovementList && (Array.isArray(bagMovementList) ? bagMovementList.length > 0 : bagMovementList.totalItems > 0)) {
                        return { status: 'SUCCESS', reason: 'Bags Listed', data: bagMovementList };
                    } else {
                        return { status: 'SUCCESS', reason: 'NO_BAGS_FOUND', data: [] };
                    }
                } catch (error) {
                    log.error('Error listBagToMove', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Lists bag movement details using the cm_model.getBagMovementDetails method.
             * @returns {Object} Response object with status, reason, and data.
             */
            listBagMovementDetails() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listBagMovementDetails requestBody', requestBody);

                    let pageIndex = requestBody.page_index || null;
                    let toDepartmentId = requestBody.to_department_id || null;
                    let bagSearchKey = requestBody.bag_search_key || null;
                    let params = requestBody.params || null; // bag_acknowledgement
                    let pageSize = requestBody.page_size ? requestBody.page_size : null;

                    // getBagMovementDetails parameters (bagIds, toDepartment, pageIndex, bagSearchKey, params)
                    let movementDetails = cm_model.getBagMovementDetails(null, toDepartmentId, pageIndex, bagSearchKey, params, pageSize);
                    log.debug('listBagMovementDetails', movementDetails);
                    // if pageIndex then data will have bagList, totalPages and currentPageIndex
                    return { status: 'SUCCESS', reason: 'Movement Details Listed', data: movementDetails }
                } catch (error) {
                    log.error('Error listBagMovementDetails', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            /**
             * Lists specific material details based on the provided material type and department ID.
             *
             * @returns {Object} An object containing the status, reason, and data of the material details.
             * @throws {Error} If there is an error during the process.
             */
            listSpecificMaterialDetails() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listSpecificMaterialDetails requestBody', requestBody);

                    let materialType = requestBody.material_type || null; // gold_type, diamond_type, color_stone_type
                    let departmentId = requestBody.department_id || null;
                    let bagSearchKey = requestBody.bag_search_key || null;

                    // getBagMetalTypeDetails parameters (materialType, departmentId)
                    let materialDetailsObj = cm_model.getSpecificMaterialDetails(materialType, departmentId, bagSearchKey);
                    log.debug('materialDetailsObj', materialDetailsObj);

                    if (materialDetailsObj.status != 'SUCCESS') {
                        return materialDetailsObj;
                    }
                    return { status: 'SUCCESS', reason: 'Material Details Listed', data: materialDetailsObj.data }
                } catch (error) {
                    log.error('Error listSpecificMaterialDetails', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            listRejectedBags() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listRejectedBags rootContext.body', rootContext.body);

                    let pageIndex = requestBody.page_index ? Number(requestBody.page_index) : null;
                    let departmentId = requestBody.department_id ? requestBody.department_id : null;
                    let allDepartment = requestBody.all_department ? requestBody.all_department : false;
                    let customerId = requestBody.customer_id ? requestBody.customer_id : null;
                    let bagSearchKey = requestBody.bag_search_key ? requestBody.bag_search_key : null;
                    let pageSize = requestBody.page_size ? requestBody.page_size : null;

                    // getActiveBags parameters (deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize)
                    let activeBagsList = cm_model.getActiveBags(departmentId, null, pageIndex, allDepartment, customerId, bagSearchKey, 'rejected_bags', pageSize);
                    // log.debug('activeBagsList', activeBagsList);

                    return { status: 'SUCCESS', reason: 'Customer Bags Listed', data: activeBagsList };
                } catch (error) {
                    log.error('Error @ listRejectedBags', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            /**
             * Lists item inventory details by department and material type, including both quantity and pieces.
             *
             * @returns {Object} Result object with `status`, `reason`, and enriched inventory data grouped by item and lot.
             */
            listItemInventoryDetails() {
                try {
                    let requestBody = rootContext.body;
                    log.debug("listItemInventoryDetails requestBody", requestBody);

                    let departmentId = requestBody.department_id;
                    let materialType = requestBody.material_type; // gold_type, diamond_type, color_stone_type
                    let params = requestBody.params || "";
                    let isInProgress = requestBody.isInProgress || false;

                    if (!jj_cm_ns_utility.checkForParameter(departmentId)) {
                        return { status: 'ERROR', reason: 'Invalid Department Id', data: [] };
                    }

                    if (jj_cm_ns_utility.checkForParameter(params) && params == 'recovery' && departmentId == CASTING_DEPARTMENT_ID && isInProgress) {
                        return { status: 'SUCCESS', reason: 'No Result Availble', data: [] };
                    } else if (jj_cm_ns_utility.checkForParameter(params) && (params == 'recovery' || params == 'write-off') && departmentId == CASTING_DEPARTMENT_ID) {
                        return cm_model.getTodaysWaxTreeLoss();
                    }

                    if (!jj_cm_ns_utility.checkForParameter(materialType)) {
                        return { status: 'ERROR', reason: 'Invalid Material Type', data: [] };
                    }

                    let deptFields = cm_model.getDepartmentFields(departmentId);
                    let locationId = deptFields?.location;
                    let binNumber = deptFields?.bin;

                    if (!locationId || !binNumber) {
                        return { status: 'ERROR', reason: 'No location or Bin found for the department', data: [] };
                    }

                    let statusId = "";
                    if (materialType == 'gold_type' && (params == 'recovery' || params == 'write-off') && !isInProgress) {
                        if (!deptFields.lossStatus) {
                            return { status: 'ERROR', reason: 'Loss status is mandatory for gold recovery/write off.', data: [] };
                        }
                        statusId = deptFields.lossStatus;
                    } else if (materialType == 'gold_type' && (params == 'recovery' || params == 'write-off') && isInProgress) {
                        if (!deptFields.lossOutsourcedStatus) {
                            return { status: 'ERROR', reason: 'Loss status is mandatory for gold recovery/write off.', data: [] };
                        }
                        statusId = deptFields.lossOutsourcedStatus;
                    } else if (materialType == 'diamond_type' && (params == 'recovery' || params == 'write-off')) {
                        const missedStatus = deptFields.diamondMissedStatus;
                        const burntStatus = deptFields.diamondBurntStatus;
                        const brokenStatus = deptFields.diamondBrokenStatus;

                        // Validate each status
                        if (!missedStatus || !burntStatus || !brokenStatus) {
                            return { status: 'ERROR', reason: 'Missed, Burnt, and Broken statuses are mandatory for diamond recovery/write off.', data: [] };
                        }

                        statusId = `${missedStatus},${burntStatus},${brokenStatus}`;
                    }
                    log.debug("departmentId, materialType, locationId, binNumber, statusId", departmentId, materialType, locationId, binNumber, statusId);

                    let inventoryDetailsObj = cm_model.getItemInventoryDetails(materialType, binNumber, locationId, statusId);
                    if (inventoryDetailsObj.status != 'SUCCESS') {
                        return { status: 'ERROR', reason: inventoryDetailsObj.reason, data: [] };
                    }

                    let inventoryPiecesDetails = cm_model.getItemInventoryPiecesDetails(materialType, binNumber, locationId, statusId);
                    if (inventoryPiecesDetails.status != 'SUCCESS') {
                        return { status: 'ERROR', reason: inventoryPiecesDetails.reason, data: [] };
                    }

                    if (Array.isArray(inventoryDetailsObj.data) && Array.isArray(inventoryPiecesDetails.data)) {
                        const pieceStatusFields = [
                            "goodPieces", "wipBagPieces", "wipWTPieces", "lossPieces",
                            "dammagedPieces", "brokenPieces", "missingPieces", "burnedPieces", "lossOutsourcedPieces"
                        ];

                        // Build a quick lookup: { itemId: { statusField: [...entries] } }
                        const piecesMap = {};

                        inventoryPiecesDetails.data.forEach(piecesItem => {
                            const { itemId, inventoryDetails = {} } = piecesItem;

                            if (!piecesMap[itemId]) {
                                piecesMap[itemId] = {};
                            }

                            Object.entries(inventoryDetails).forEach(([statusField, lots]) => {
                                if (!Array.isArray(lots) || lots.length === 0) return;

                                if (!piecesMap[itemId][statusField]) {
                                    piecesMap[itemId][statusField] = [];
                                }

                                piecesMap[itemId][statusField] = piecesMap[itemId][statusField].concat(lots);
                            });
                        });

                        // Now inject into inventoryDetailsObj
                        inventoryDetailsObj.data.forEach(item => {
                            const { itemId } = item;
                            const itemPieceDetails = piecesMap[itemId] || {};

                            // Ensure `inventoryDetails` object exists
                            if (!item.inventoryDetails) {
                                item.inventoryDetails = {};
                            }

                            // Initialize top-level totals
                            let totalPieces = 0;

                            // Merge lot-wise details and calculate total per status
                            pieceStatusFields.forEach(statusField => {
                                const lots = itemPieceDetails[statusField] || [];

                                // Insert the lot-wise array into inventoryDetails
                                item.inventoryDetails[statusField] = lots;

                                // Calculate and set total at top level
                                const statusTotal = lots.reduce((sum, lot) => sum + (lot.piecesAvailable || 0), 0);
                                item[statusField] = statusTotal;

                                // Accumulate into totalPieces
                                totalPieces += statusTotal;
                            });

                            // Final total of all piece statuses
                            item.totalPieces = totalPieces;
                        });
                    }
                    if (
                        Array.isArray(inventoryDetailsObj.data) && inventoryDetailsObj.data.length > 0 &&
                        Array.isArray(inventoryPiecesDetails.data) && inventoryPiecesDetails.data.length > 0
                    ) {
                        const lastInventoryDetailsRow = inventoryDetailsObj.data[inventoryDetailsObj.data.length - 1];
                        const lastPiecesDetailsRow = inventoryPiecesDetails.data[inventoryPiecesDetails.data.length - 1];

                        // Copy all keys from the last row of inventoryPiecesDetails into the last row of inventoryDetailsObj
                        Object.assign(lastInventoryDetailsRow, lastPiecesDetailsRow);
                    }

                    log.debug("inventoryDetailsObj", inventoryDetailsObj);

                    return { status: 'SUCCESS', reason: 'Inventory Details Retrieved', data: inventoryDetailsObj.data };
                } catch (e) {
                    log.error('error @ listItemInventoryDetails', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listOverdueBags() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listOverdueBags rootContext.body', rootContext.body);

                    let pageIndex = requestBody.page_index ? Number(requestBody.page_index) : null;
                    let departmentId = requestBody.department_id ? requestBody.department_id : null;
                    let allDepartment = requestBody.all_department ? requestBody.all_department : false;
                    let customerId = requestBody.customer_id ? requestBody.customer_id : null;
                    let bagSearchKey = requestBody.bag_search_key ? requestBody.bag_search_key : null;
                    let params = requestBody.params ? requestBody.params : null; // bags_overdue
                    let pageSize = requestBody.page_size ? requestBody.page_size : null;

                    // getActiveBags parameters (deptId, bagIds, pageIndex, allDept, customerId, bagSearchKey, params, pageSize)
                    let activeBagsList = cm_model.getActiveBags(departmentId, null, pageIndex, allDepartment, customerId, bagSearchKey, params, pageSize);
                    // log.debug('activeBagsList', activeBagsList);

                    // Handle both array (when pageIndex is null) and object (when pageIndex is provided) responses
                    if (!activeBagsList || (Array.isArray(activeBagsList) ? activeBagsList.length === 0 : activeBagsList.totalItems <= 0)) {
                        return { status: 'SUCCESS', reason: 'No Bags found', data: [] };
                    }

                    // Get the bag list - either the array itself or the bagList property
                    let bagList = Array.isArray(activeBagsList) ? activeBagsList : (activeBagsList.bagList || []);

                    bagList?.forEach((bag) => {
                        if (bag.duedate && bag.duedate.value) {
                            // Use the existing parseDate function
                            bag.duedate = cm_functions.parseDate(bag.duedate);
                        }
                    });

                    return { status: 'SUCCESS', reason: 'Customer Bags Listed', data: activeBagsList };
                } catch (error) {
                    log.error('Error @ listOverdueBags', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            getTotalMaterialWeights() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getTotalMaterialWeights requestBody', requestBody);

                    let bagIds = requestBody.bag_ids ? requestBody.bag_ids : null;
                    let params = requestBody.params ? requestBody.params : null;

                    if (!bagIds || bagIds.length === 0) {
                        log.debug('getTotalMaterialWeights: No bag IDs provided');
                        return {
                            status: 'SUCCESS',
                            reason: 'No Bags Provided',
                            data: {
                                goldWeight: 0,
                                diamondWeight: 0,
                                colorStoneWeight: 0
                            }
                        };
                    }

                    log.debug('getTotalMaterialWeights: Processing bagIds:', bagIds);

                    // Get all three weights in one call
                    let goldWeight = cm_model.getTotalGoldWeightForBags(bagIds);
                    let diamondWeight = cm_model.getTotalDiamondWeightForBags(bagIds);
                    let colorStoneWeight = cm_model.getTotalColorStoneWeightForBags(bagIds);

                    log.debug('getTotalMaterialWeights: Final weights:', { goldWeight, diamondWeight, colorStoneWeight });

                    return {
                        status: 'SUCCESS',
                        reason: 'Total Material Weights Calculated',
                        data: {
                            goldWeight: goldWeight,
                            diamondWeight: diamondWeight,
                            colorStoneWeight: colorStoneWeight
                        }
                    };
                } catch (error) {
                    log.error('Error @ getTotalMaterialWeights', error);
                    return {
                        status: 'ERROR',
                        reason: error.message,
                        data: {
                            goldWeight: 0,
                            diamondWeight: 0,
                            colorStoneWeight: 0
                        }
                    }
                }
            },

            watchOrder() {
                try {
                    let requestBody = rootContext.body;
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }

                    requestBody = requestBody.toLowerCase().includes("wo") ? requestBody : cm_model.getWorkOrderofBag(requestBody);

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Data Found', data: [] };
                    }

                    log.debug('watchOrder requestBody', requestBody);
                    let bagGen = cm_functions.getBagGenReport(requestBody);
                    let bagSplit = cm_functions.getSplitReport(requestBody);
                    let bagMerge = cm_functions.getMergeReports(requestBody);
                    let bagMove = cm_functions.getMoveReports(requestBody);
                    let operations = cm_functions.getOperationReports(requestBody);
                    let rejections = cm_functions.getRejectionReports(requestBody);
                    let builtSerials = cm_functions.getBuiltSerials(requestBody);
                    let bagTreeLoads = cm_functions.getBagTreeLoads(requestBody);

                    return { status: 'SUCCESS', reason: 'Fetched data', data: [{ label: requestBody.toUpperCase(), children: [bagGen, bagSplit, bagMerge, bagMove, operations, rejections, bagTreeLoads, builtSerials] }] };

                } catch (error) {
                    log.error('Error @ watchOrder', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            createInventoryAdjustment() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('createInventoryAdjustment rootContext.body', rootContext.body);

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }

                    let waxTreeRecovery = requestBody.wax_tree_recovery;
                    let departmentId = requestBody.department_id;
                    let selectedComponents = requestBody.selected_components;
                    let inventoryName = requestBody.inventory_name;
                    let selectedMetal = requestBody.selected_metal;
                    let totalRecoveredQty = requestBody.total_recovered_qty;
                    let selectedEmployee = requestBody.selected_employee;

                    if (!departmentId) {
                        return { status: 'ERROR', reason: 'No Department Id found', data: [] };
                    }

                    if (!selectedComponents || selectedComponents.length == 0) {
                        return { status: 'ERROR', reason: 'No Components found', data: [] };
                    }

                    if (!inventoryName) {
                        return { status: 'ERROR', reason: 'Inventory Name is mandatory', data: [] };
                    }

                    if (!selectedMetal) {
                        return { status: 'ERROR', reason: 'Metal is mandatory for inventory adjustment.', data: [] };
                    }

                    if (!totalRecoveredQty) {
                        return { status: 'ERROR', reason: 'Total Recovered Quantity is mandatory for inventory adjustment.', data: [] };
                    }

                    let deptFields = cm_model.getDepartmentFields(departmentId);
                    let locationId = deptFields?.location;
                    let binNumber = deptFields?.bin;
                    let goodStatus = deptFields?.goodStatus;
                    let lossStatus = waxTreeRecovery ? deptFields?.lossStatus : deptFields?.lossOutsourcedStatus;

                    if (!locationId || !binNumber) {
                        return { status: 'ERROR', reason: 'No location or Bin found for the department', data: [] };
                    }

                    if (!goodStatus) {
                        return { status: 'ERROR', reason: 'Good status is mandatory for inventory adjustment.', data: [] };
                    }

                    let formattedComponents = [];
                    if (waxTreeRecovery) {
                        // Grouped components by itemId  
                        const groupedComponents = selectedComponents.reduce((acc, component) => {
                            if (Number(component.recoveredQty) > 0) {
                                // Create or update the entry for the current itemId  
                                if (!acc[component.itemId]) {
                                    acc[component.itemId] = {
                                        itemId: component.itemId,
                                        recoveredQty: Number(component.recoveredQty),
                                        inventoryDetails: {
                                            lossQty: []
                                        }
                                    };
                                } else {
                                    acc[component.itemId].recoveredQty = Number(Number(acc[component.itemId].recoveredQty || 0) + Number(component.recoveredQty || 0));
                                }

                                // Find if the lotId already exists in the lossQty array  
                                const existingLot = acc[component.itemId].inventoryDetails.lossQty.find(lot => lot.inventoryNumber === component.lotId);

                                if (existingLot) {
                                    // If it exists, aggregate the recovered quantity  
                                    existingLot.recoveredQtyPerLot += Number(component.recoveredQty); // Summing up the lost quantities  
                                } else {
                                    // If it doesn't exist, add a new lot entry  
                                    acc[component.itemId].inventoryDetails.lossQty.push({
                                        recoveredQtyPerLot: Number(component.recoveredQty), // Start with initial quantity  
                                        inventoryNumber: component.lotId,
                                        inventoryStatus: lossStatus
                                    });
                                }
                            }
                            return acc;
                        }, {});

                        // Convert the grouped object back to an array
                        // Inject waxTreeInternalId from original selectedComponents so cm_functions can set the field
                        formattedComponents = Object.values(groupedComponents).map(function (fc) {
                            const match = selectedComponents.find(function (c) { return String(c.itemId) === String(fc.itemId) && c.waxTreeInternalId; });
                            log.debug('waxTree recovery formattedComponent', { itemId: fc.itemId, waxTreeInternalId: match ? match.waxTreeInternalId : null });
                            return Object.assign({}, fc, { waxTreeInternalId: match ? match.waxTreeInternalId : null });
                        });
                    } else {
                        // For In Progress recovery: distribute recoveredQty (from Gold Details table) across lots proportionally
                        // First, fetch live available quantities for all lots to avoid exceeding what NetSuite has
                        const allLotIds = [];
                        selectedComponents.forEach(function (component) {
                            const lots = (component.inventoryDetails && component.inventoryDetails.lossOutsourcedQty) || [];
                            lots.forEach(function (lot) {
                                if (lot.inventoryNumber && parseFloat(lot.quantityAvailable || 0) > 0) {
                                    allLotIds.push(lot.inventoryNumber);
                                }
                            });
                        });

                        // Build a live availability map { inventoryNumber: availableQty }
                        const liveAvailabilityMap = {};
                        if (allLotIds.length > 0) {
                            try {
                                const liveSearch = search.create({
                                    type: 'inventorybalance',
                                    filters: [
                                        ['inventorynumber', 'anyof', allLotIds],
                                        'AND', ['status', 'anyof', [lossStatus]]
                                    ],
                                    columns: [
                                        search.createColumn({ name: 'inventorynumber', summary: 'GROUP' }),
                                        search.createColumn({ name: 'available', summary: 'SUM' })
                                    ]
                                });
                                liveSearch.run().each(function (result) {
                                    const lotId = result.getValue({ name: 'inventorynumber', summary: 'GROUP' });
                                    const available = parseFloat(result.getValue({ name: 'available', summary: 'SUM' }) || 0);
                                    liveAvailabilityMap[lotId] = available;
                                    return true;
                                });
                                log.debug('liveAvailabilityMap', liveAvailabilityMap);
                            } catch (e) {
                                log.error('Error fetching live availability', e.message);
                            }
                        }

                        formattedComponents = selectedComponents
                            .filter(function (component) { return Number(component.recoveredQty || 0) > 0; })
                            .map(function (component) {
                                const lots = (component.inventoryDetails && component.inventoryDetails.lossOutsourcedQty) || [];
                                const totalAvailable = lots.reduce(function (s, l) { return s + parseFloat(l.quantityAvailable || 0); }, 0);
                                const recoveredQty = Number(component.recoveredQty || 0);

                                const updatedLots = lots
                                    .filter(function (lot) { return parseFloat(lot.quantityAvailable || 0) > 0; })
                                    .map(function (lot) {
                                        const proportion = totalAvailable > 0 ? parseFloat(lot.quantityAvailable) / totalAvailable : 0;
                                        let lotQty = Number(parseFloat(recoveredQty * proportion).toFixed(4));

                                        // Cap to live available qty to prevent NetSuite error
                                        const liveAvailable = liveAvailabilityMap[lot.inventoryNumber];
                                        if (liveAvailable !== undefined && lotQty > liveAvailable) {
                                            log.debug('Capping lotQty to live available', { lot: lot.inventoryNumber, lotQty, liveAvailable });
                                            lotQty = Number(parseFloat(liveAvailable).toFixed(4));
                                        }

                                        return {
                                            inventoryNumber: lot.inventoryNumber,
                                            recoveredQtyPerLot: lotQty,
                                            inventoryStatus: lossStatus
                                        };
                                    }).filter(function (lot) { return lot.recoveredQtyPerLot > 0; });

                                // Ensure sum of lots exactly equals recoveredQty (fix rounding)
                                const lotSum = Number(parseFloat(updatedLots.reduce(function (s, l) { return s + l.recoveredQtyPerLot; }, 0)).toFixed(4));
                                if (updatedLots.length > 0 && lotSum !== recoveredQty) {
                                    updatedLots[updatedLots.length - 1].recoveredQtyPerLot = Number(parseFloat(
                                        updatedLots[updatedLots.length - 1].recoveredQtyPerLot + (recoveredQty - lotSum)
                                    ).toFixed(4));
                                }

                                return {
                                    itemId: component.itemId,
                                    recoveredQty: recoveredQty,
                                    inventoryDetails: {
                                        lossOutsourcedQty: updatedLots
                                    }
                                };
                            });
                    }

                    log.debug("formattedComponents", formattedComponents);

                    let adjustmentStatus = cm_functions.createInventoryAdjustment(formattedComponents, locationId, binNumber, goodStatus, inventoryName, selectedMetal, totalRecoveredQty, departmentId, selectedEmployee, waxTreeRecovery, 'Loss recovery', null);

                    if (adjustmentStatus.status != 'SUCCESS') {
                        return { status: 'ERROR', reason: adjustmentStatus.reason, data: [] };
                    }

                    if (waxTreeRecovery) {
                        selectedComponents.forEach((waxTree) => {
                            let updateWTStatus = cm_functions.updateRecord('customrecord_jj_wax_tree', waxTree.waxTreeInternalId, {
                                custrecord_jj_scrap_recovered: Number(waxTree.recoveredQty) + Number(waxTree.scrapRecovered)
                            });

                            if (!updateWTStatus.success) {
                                throw new Error(updateWTStatus.error);
                            }
                        });
                    }

                    return { status: 'SUCCESS', reason: 'Recovery Successfully.', data: adjustmentStatus.data };
                } catch (error) {
                    log.error('Error @ createInventoryAdjustment', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },
            listInventoryForBinTransfer() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listInventoryForBinTransfer rootContext.body', rootContext.body);
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }
                    let componentId = requestBody.component_id;
                    let locationId = requestBody.location_id;

                    if (!componentId || !locationId) {
                        return { status: 'ERROR', reason: 'Component Id or Location Id not found', data: [] };
                    }

                    let inventoryDetailsObj = cm_model.listInventoryForBinTransfer(componentId, locationId);
                    log.debug("Search Result listItemInventoryDetails  ****** ", inventoryDetailsObj);

                    if (inventoryDetailsObj.status != 'SUCCESS') {
                        return { status: 'ERROR', reason: inventoryDetailsObj.reason, data: [] };
                    }

                    let piecesDetails = cm_model.getInventoryPieces(componentId, null, 'bin_transfer', locationId);
                    log.debug("piecesDetails", piecesDetails);

                    // Building a map of piecesDetails by bin_id and lot number
                    let piecesMap = {};
                    piecesDetails.forEach(piece => {
                        let binId = piece.bin_number.value; // Assuming bin_id is available in piecesDetails
                        let lotNumber = piece.inventory_number.value;
                        let piecesAvailable = parseInt(piece.pieces_available.value || 0);

                        // Creating a unique key using bin_id and lotnumber
                        let key = `${binId}_${lotNumber}`;
                        piecesMap[key] = piecesAvailable;
                    });

                    // Updating inventoryDetailsObj.data with pieces_available
                    inventoryDetailsObj.data.forEach(bin => {
                        bin.lots.forEach(lot => {
                            // Using bin_id and lotnumber as the key for piecesMap
                            let key = `${bin.bin_id}_${lot.lotnumber}`;
                            if (piecesMap[key] !== undefined) {
                                lot.pieces = piecesMap[key];
                            } else {
                                lot.pieces = 0; // Default value if not found
                            }
                        });
                    });

                    log.debug("Updated inventoryDetailsObj", inventoryDetailsObj.data);

                    return { status: 'SUCCESS', reason: 'Inventory Details Retrieved', data: inventoryDetailsObj.data };

                } catch (error) {
                    log.error('Error @ listInventoryForBinTransfer', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            createBinTransfer() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('createBinTransfer rootContext.body', rootContext.body);
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }
                    let binTransferCreated = cm_functions.createBinTransferRecordTest(requestBody, requestBody[0].location_id, null, null, null, "Item Transfer from UI");
                    if (binTransferCreated.status == 'SUCCESS') {
                        return { status: 'SUCCESS', reason: 'Bin Transfer Created', data: binTransferCreated.data };
                    }
                    return { status: 'ERROR', reason: binTransferCreated.reason, data: [] };
                } catch (error) {
                    log.error('Error @ createBinTransfer', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }

            },

            listComponentsInBinTransfer() {
                try {
                    return cm_model.getItemCache();
                }
                catch (e) {
                    log.error('error @ listComponentsInBinTransfer', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            // createInventoryTransfer() {
            //     try {
            //         let requestBody = rootContext.body;
            //         log.debug('createInventoryTransfer rootContext.body', rootContext.body);

            //         if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
            //             return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
            //         }

            //         const {
            //             selected_bags: selectedBags,
            //             from_department: fromDepartmentId,
            //             from_location: fromLocationId,
            //             to_department: toDepartmentId,
            //             to_location: toLocationId,
            //             use_sales_order: useSalesOrder
            //         } = requestBody;


            //         if (!selectedBags || selectedBags.length == 0) {
            //             return { status: 'ERROR', reason: 'No Bags found', data: [] };
            //         }
            //         if (!fromDepartmentId || !fromLocationId || (!useSalesOrder && !toDepartmentId) || !toLocationId) {
            //             return { status: 'ERROR', reason: 'Invalid Department or Location Id', data: [] };
            //         }

            //         // Fetch Department & Bin Data
            //         const deptData = cm_model.getAllManufacturingDepartments(useSalesOrder ? [fromDepartmentId] : [fromDepartmentId, toDepartmentId]);
            //         if (!deptData || !deptData[fromDepartmentId] || (!useSalesOrder && !deptData[toDepartmentId])) {
            //             throw new Error("Department data not found.");
            //         }

            //         let fromStatus = deptData[fromDepartmentId]?.goodStatus;
            //         let fromHod = deptData[fromDepartmentId]?.hod;
            //         let toStatus = deptData[toDepartmentId]?.goodStatus;
            //         let toHod = deptData[toDepartmentId]?.hod;

            //         if (!fromStatus || !fromHod || (!useSalesOrder && !toStatus) || (!useSalesOrder && !toHod)) {
            //             return { status: 'ERROR', reason: 'Invalid Bin or Status or Hod', data: [] };
            //         }

            //         let inventoryTransferCreated = cm_functions.createInventoryTransferRecord(selectedBags, fromLocationId, toLocationId, fromStatus, !useSalesOrder ? toStatus : fromStatus);
            //         if (inventoryTransferCreated.status != 'SUCCESS') {
            //             return { status: 'ERROR', reason: inventoryTransferCreated.reason, data: [] };
            //         }

            //         let movementStatus = cm_functions.createAndAcknowledgeBagMovement(selectedBags, fromDepartmentId, toDepartmentId, fromHod, toHod, toLocationId, useSalesOrder);

            //         if (movementStatus.status != 'SUCCESS') {
            //             return { status: 'ERROR', reason: movementStatus.reason, data: [] };
            //         }

            //         return { status: 'SUCCESS', reason: 'Inventory Transfer Created', data: inventoryTransferCreated.data };
            //     } catch (error) {
            //         log.error('Error @ createInventoryTransfer', error);
            //         return { status: 'ERROR', reason: error.message, data: [] }
            //     }
            // },

            createInventoryTransfer() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('createInventoryTransfer rootContext.body', rootContext.body);

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }

                    const {
                        selected_serials: selectedSerials,
                        from_department: fromDepartmentId,
                        from_location: fromLocationId,
                        from_bin: fromBinNumber,
                        to_department: toDepartmentId,
                        to_location: toLocationId,
                        to_bin: toBinNumber,
                        from_status: fromStatus,
                        to_status: toStatus,
                        memo: memoText,
                        weight_details: weightDetails,
                        serial_sequence_map: serialSequenceMap
                    } = requestBody;

                    log.debug("selectedSerials", selectedSerials);
                    log.debug("weightDetails received", weightDetails);
                    log.debug("serialSequenceMap received", serialSequenceMap);
                    log.debug("LOC_TRANS_REASON_CODE to be used", LOC_TRANS_REASON_CODE);

                    if (!selectedSerials || selectedSerials.length == 0) {
                        return { status: 'ERROR', reason: 'No selecetd serials found', data: [] };
                    }
                    if (!fromDepartmentId || !fromLocationId || !toDepartmentId || !toLocationId || !fromStatus || !toStatus) {
                        return { status: 'ERROR', reason: 'Invalid Department / Location / status', data: [] };
                    }

                    // Validate from_bin if provided - ensure all selected serials are from the specified bin
                    if (fromBinNumber) {
                        const invalidSerials = selectedSerials.filter(serial =>
                            serial.bin_number_id && serial.bin_number_id != fromBinNumber
                        );
                        if (invalidSerials.length > 0) {
                            const serialNames = invalidSerials.map(s => s.serial_number_name).join(', ');
                            return {
                                status: 'ERROR',
                                reason: `Some selected serials are not in the specified From Bin: ${serialNames}`,
                                data: []
                            };
                        }
                    }

                    let recordCreated = "";

                    // Condition 1: Check if Transfer Order is needed (different locations)
                    if (fromLocationId != toLocationId) {
                        log.debug("Condition 1: Creating Transfer Order with reasonCode", LOC_TRANS_REASON_CODE);
                        recordCreated = cm_functions.processTransferWithFulfillment(selectedSerials, fromLocationId, toLocationId, toStatus, toDepartmentId, memoText, weightDetails, serialSequenceMap, LOC_TRANS_REASON_CODE, toBinNumber);
                    }
                    // Condition 2: Check if Status Change only (same location, same department, same bin)
                    else if (fromLocationId === toLocationId &&
                        fromDepartmentId === toDepartmentId &&
                        fromBinNumber && toBinNumber &&
                        fromBinNumber === toBinNumber) {
                        log.debug("Condition 2: Creating Inventory Status Change with reasonCode", LOC_TRANS_REASON_CODE);
                        recordCreated = cm_functions.processInventoryStatusChangeForSerials(selectedSerials, fromLocationId, fromBinNumber, fromStatus, toStatus, toDepartmentId, weightDetails, memoText, serialSequenceMap, LOC_TRANS_REASON_CODE);
                    }
                    // Condition 3: Bin Transfer (same location, but different bin or department)
                    else {
                        log.debug("Condition 3: Creating Bin Transfer with reasonCode", LOC_TRANS_REASON_CODE);
                        // Use user-selected bin if provided, otherwise fetch from department record
                        let finalToBinNumber = toBinNumber;

                        if (!finalToBinNumber) {
                            // Fallback to department bin if not provided
                            const deptData = cm_model.getAllManufacturingDepartments([toDepartmentId]);
                            if (!deptData[toDepartmentId]) {
                                return { status: 'ERROR', reason: 'Department data not found.', data: [] };
                            }
                            finalToBinNumber = deptData[toDepartmentId]?.binNumber;
                        }

                        const transformed = cm_functions.transformSelectedSerialsForBinTransfer(selectedSerials, fromStatus, toStatus, finalToBinNumber, memoText, fromBinNumber);
                        log.debug("transformed", transformed);

                        if (transformed?.status != 'SUCCESS') {
                            return { status: 'ERROR', reason: transformed?.reason, data: [] };
                        }
                        recordCreated = cm_functions.createBinTransferRecordTest(transformed?.data, fromLocationId, null, null, null, memoText, weightDetails, serialSequenceMap, LOC_TRANS_REASON_CODE);
                    }

                    log.debug('Operation Result', recordCreated);

                    if (recordCreated?.status != 'SUCCESS') {
                        return { status: 'ERROR', reason: recordCreated?.reason, data: [] };
                    }

                    // let movementStatus = cm_functions.createAndAcknowledgeBagMovement(selectedBags, fromDepartmentId, toDepartmentId, fromHod, toHod, toLocationId);

                    // if (movementStatus.status != 'SUCCESS') {
                    //     return { status: 'ERROR', reason: movementStatus.reason, data: [] };
                    // }

                    return { status: 'SUCCESS', reason: recordCreated.reason, data: recordCreated?.data };
                } catch (error) {
                    log.error('Error @ createInventoryTransfer', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            transformToItemReceipt() {
                try {
                    // log.debug("=== transformToItemReceipt START ===");
                    let requestBody = rootContext.body;
                    log.debug('transformToItemReceipt requestBody', requestBody);
                    // log.debug('requestBody type:', typeof requestBody);
                    // log.debug('requestBody keys:', Object.keys(requestBody || {}));

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        log.error("ERROR: No Parameters Found in requestBody");
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }

                    const {
                        transfer_data,
                        selected_serials,
                        to_location,
                        to_status,
                        to_department,
                        memo,
                        to_bin
                    } = requestBody;

                    // log.debug("=== Extracted Parameters ===");
                    // log.debug('transfer_data:', transfer_data);
                    // log.debug('selected_serials:', selected_serials);
                    // log.debug('selected_serials type:', typeof selected_serials);
                    // log.debug('selected_serials length:', selected_serials ? selected_serials.length : 'undefined');
                    // log.debug('to_location:', to_location);
                    // log.debug('to_status:', to_status);
                    // log.debug('to_department:', to_department);
                    // log.debug('memo:', memo);
                    // log.debug('to_bin:', to_bin);

                    if (!selected_serials || selected_serials.length === 0) {
                        log.error("ERROR: No serials provided for Item Receipt creation");
                        return { status: 'ERROR', reason: 'No serials provided for Item Receipt creation', data: null };
                    }

                    if (!to_status) {
                        log.error("ERROR: To Status is required for Item Receipt creation");
                        return { status: 'ERROR', reason: 'To Status is required for Item Receipt creation', data: null };
                    }

                    // Get transfer order ID from transfer_data
                    const transferOrderId = transfer_data?.transferOrderId || transfer_data;
                    // log.debug('transferOrderId:', transferOrderId);

                    if (!transferOrderId) {
                        log.error("ERROR: Transfer Order ID is required for Item Receipt creation");
                        return { status: 'ERROR', reason: 'Transfer Order ID is required for Item Receipt creation', data: null };
                    }

                    // Use the selected bin (to_bin) if provided, otherwise fetch from department
                    let toBinNumber = to_bin || null;
                    if (!toBinNumber && to_department) {
                        // log.debug("Fetching bin number for department:", to_department);
                        const deptData = cm_model.getAllManufacturingDepartments([to_department]);
                        if (deptData && deptData[to_department]) {
                            toBinNumber = deptData[to_department]?.binNumber;
                            // log.debug("Bin number fetched for department:", toBinNumber);
                        } else {
                            log.debug("Department data not found for:", to_department);
                        }
                    }
                    // log.debug("Final toBinNumber to be used:", toBinNumber);

                    // Group serials by item ID in order of appearance
                    // log.debug("=== Grouping Serials ===");
                    let groupedItems = {};
                    let itemOrder = [];

                    selected_serials.forEach((serial, index) => {
                        log.debug(`Processing serial ${index}:`, serial);
                        const itemId = serial.assembly_item_id;
                        log.debug(`Serial ${index} itemId:`, itemId);

                        if (!itemId) {
                            log.error(`ERROR: Missing item ID for serial ${serial.serial_number_name}`);
                            throw new Error(`Missing item ID for serial ${serial.serial_number_name}`);
                        }

                        if (!groupedItems[itemId]) {
                            groupedItems[itemId] = {
                                itemName: serial.assembly_item_name,
                                quantity: 0,
                                serials: [],
                                index: itemOrder.length
                            };
                            itemOrder.push(itemId);
                        }

                        groupedItems[itemId].quantity += 1;
                        groupedItems[itemId].serials.push(serial);
                    });

                    // log.debug("=== Grouped Items ===");
                    // log.debug('groupedItems:', groupedItems);
                    // log.debug('itemOrder:', itemOrder);

                    // Order-respecting version of groupedItems
                    const orderedGroupedItems = itemOrder.reduce((obj, itemId) => {
                        obj[itemId] = groupedItems[itemId];
                        return obj;
                    }, {});

                    // log.debug("=== Calling cm_functions.transformToItemReceipt ===");
                    // log.debug('transferOrderId:', transferOrderId);
                    // log.debug('orderedGroupedItems:', orderedGroupedItems);
                    // log.debug('to_location:', to_location);
                    // log.debug('to_status:', to_status);
                    // log.debug('toBinNumber:', toBinNumber);
                    // log.debug('memo:', memo);

                    // Transform Transfer Order to Item Receipt
                    const irObj = cm_functions.transformToItemReceipt(transferOrderId, orderedGroupedItems, to_location, to_status, memo, toBinNumber);
                    // log.debug("=== cm_functions.transformToItemReceipt Response ===");
                    // log.debug("irObj:", irObj);

                    if (irObj.status != 'SUCCESS') {
                        log.error("ERROR: transformToItemReceipt failed");
                        log.error("irObj:", irObj);
                        return irObj;
                    }

                    // Get the Item Receipt number
                    // log.debug("=== Getting Item Receipt Number ===");
                    let irLookup = search.lookupFields({
                        type: record.Type.ITEM_RECEIPT,
                        id: irObj.data,
                        columns: ['tranid']
                    });
                    let irNumber = irLookup.tranid;
                    log.debug('irNumber:', irNumber);

                    // log.debug("=== transformToItemReceipt SUCCESS ===");
                    return {
                        status: 'SUCCESS',
                        reason: `Item Receipt record created successfully with id "${irNumber}"`,
                        data: irObj.data
                    };
                } catch (error) {
                    // log.error('=== ERROR in transformToItemReceipt ===');
                    // log.error('Error message:', error.message);
                    // log.error('Error name:', error.name);
                    // log.error('Error stack:', error.stack);
                    log.error('Full error:', error);
                    return { status: 'ERROR', reason: error.message, data: null }
                }
            },

            listBinsForLocation() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listBinsForLocation requestBody', requestBody);

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }

                    const locationId = requestBody.location_id;
                    if (!locationId) {
                        return { status: 'ERROR', reason: 'Location ID is required', data: [] };
                    }

                    log.debug('Fetching bins for locationId:', locationId);

                    // Call the centralized saved search function
                    const binResults = cm_model.getBinsForLocation(locationId);

                    // log.debug('Bins found:', binResults.length);
                    log.debug('binResults:', binResults);

                    return { status: 'SUCCESS', reason: 'Bins Listed', data: binResults };
                } catch (error) {
                    log.error('Error @ listBinsForLocation', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listToBinsForBinTransfer() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listBinsForBinTransfer rootContext.body', rootContext.body);
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }
                    let locationId = requestBody.location_id;
                    if (!locationId) {
                        return { status: 'ERROR', reason: 'Location Id not found', data: [] };
                    }
                    let binsList = cm_model.listBinsForBinTransfer(locationId);
                    if (binsList.status == 'SUCCESS') {
                        return { status: 'SUCCESS', reason: 'Bins Listed', data: binsList.data };
                    }
                    return { status: 'ERROR', reason: binsList.reason, data: [] };
                } catch (error) {
                    log.error('Error @ listBinsForBinTransfer', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },
            refreshItemCache() {
                try {
                    return cm_model.refreshItemCache();
                } catch (e) {
                    log.error('error @ refreshItemCache', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listMetal() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listMetal rootContext.body', rootContext.body);
                    let departmentId = requestBody?.department_id || "";

                    let metalList = cm_model.getMetals(departmentId);
                    log.debug('metalList', metalList);
                    if (metalList && metalList.length) {
                        return { status: 'SUCCESS', reason: 'Metal Listed', data: metalList };
                    }
                    return { status: 'ERROR', reason: 'NO_METAL_FOUND', data: [] }
                } catch (error) {
                    log.error('Error listMetal', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listAssemblyItems() {
                try {
                    let assemblyItemsListObj = cm_model.listAssemblyItems();
                    log.debug('assemblyItemsListObj', assemblyItemsListObj);
                    if (assemblyItemsListObj.status == 'SUCCESS' && assemblyItemsListObj.data?.length > 0) {
                        return { status: 'SUCCESS', reason: 'Assembly Items Listed', data: assemblyItemsListObj.data };
                    } else if (assemblyItemsListObj.status == 'SUCCESS' && assemblyItemsListObj.data?.length == 0) {
                        return { status: 'SUCCESS', reason: 'No Assembly Items Found', data: [] }
                    }
                    return { status: 'ERROR', reason: assemblyItemsListObj.reason, data: [] }
                } catch (error) {
                    log.error('Error listAssemblyItems', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listSerialTypes() {
                try {
                    let serialTypesListObj = cm_model.getSerialsType();
                    log.debug('serialTypesListObj', serialTypesListObj);
                    if (serialTypesListObj.status == 'SUCCESS' && serialTypesListObj.data?.length > 0) {
                        return { status: 'SUCCESS', reason: 'Serial Types Listed', data: serialTypesListObj.data };
                    } else if (serialTypesListObj.status == 'SUCCESS' && serialTypesListObj.data?.length == 0) {
                        return { status: 'SUCCESS', reason: 'No Serial Types Found', data: [] }
                    }
                    return { status: 'ERROR', reason: serialTypesListObj.reason, data: [] }
                } catch (error) {
                    log.error('Error listSerialTypes', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listDeptIssues() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listDeptIssues rootContext.body', rootContext.body);
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }
                    log.debug('listDeptIssues rootContext.body', rootContext.body);
                    let departmentIssues = cm_model.getDepartmentIssues(requestBody);
                    return { status: 'SUCCESS', reason: 'Department Issues Listed', data: departmentIssues?.data || [] };
                } catch (e) {
                    log.error('error @ listDeptIssues', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listSerialLots() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listSerialLots rootContext.body', rootContext.body);
                    let assemblyItemId = requestBody?.assembly_item_id || null;

                    let serialLotsListObj = cm_model.listSerialLots(assemblyItemId);

                    if (serialLotsListObj.status != 'SUCCESS') {
                        return serialLotsListObj;
                    }
                    let serialLotsList = serialLotsListObj.data;

                    let allSerialsObj = cm_model.getAllAssemblySerials(assemblyItemId);
                    if (allSerialsObj.status != 'SUCCESS') {
                        return allSerialsObj;
                    }
                    let allSerials = allSerialsObj.data;

                    // Convert existing serial numbers to a Set for O(1) lookup
                    const existingSerials = new Set(serialLotsList.map(item => item?.build_serial_number));
                    // Append only missing serials from allSerials
                    serialLotsList.push(
                        ...allSerials
                            .filter(serial => !existingSerials.has(serial.serialNumber)) // Exclude existing serials
                            .map(serial => ({
                                // build_id: null,
                                // build_name: null,
                                // work_order_name: null,
                                // work_order_id: null,
                                // build_quantity: null,
                                // bom_revision_id: null,
                                serial_number_id: serial.serialId,
                                build_serial_number: serial.serialNumber,
                                // remaining: 1, // Since it's a missing serial
                                // sales_order_name: null,
                                // sales_order_id: null
                            }))
                    );
                    log.debug("Updated Serial Lots List", serialLotsList);

                    serialLotsList.sort((a, b) => a.build_serial_number.localeCompare(b.build_serial_number));
                    log.debug('serialLotsList Sorted', serialLotsList);

                    if (serialLotsList.length > 0) {
                        return { status: 'SUCCESS', reason: 'Serial Lots Listed', data: serialLotsList };
                    } else if (serialLotsList.length == 0) {
                        return { status: 'SUCCESS', reason: 'No Serial Lots Found', data: [] }
                    }
                    return { status: 'ERROR', reason: serialLotsListObj.reason, data: [] }
                } catch (error) {
                    log.error('Error listSerialLots', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listBuildComponents() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listBuildComponents rootContext.body', rootContext.body);
                    // build_id
                    let buildId = requestBody?.build_id || null;
                    let serialNumber = requestBody?.serial_number || null;

                    if (!buildId) {
                        return { status: 'ERROR', reason: 'Invalid Build Id', data: [] };
                    }

                    if (!serialNumber) {
                        return { status: 'ERROR', reason: 'Invalid Serial Number', data: [] };
                    }

                    let buildComponentsListDetailsObj = cm_model.listBuildComponents(buildId);
                    // log.debug('buildComponentsListDetailsObj', buildComponentsListDetailsObj);
                    if (buildComponentsListDetailsObj.status != 'SUCCESS') {
                        return buildComponentsListDetailsObj;
                    }

                    let buildComponentsListObj = buildComponentsListDetailsObj.data?.buildComponentsArrayObj;
                    let commonDetailsArrayObj = buildComponentsListDetailsObj.data?.commonDetailsArrayObj;

                    let piecesDetailsFromBuild = commonDetailsArrayObj?.[0]?.piecesJson ? JSON.parse(commonDetailsArrayObj[0].piecesJson) : null;
                    log.debug("piecesDetailsFromBuild", piecesDetailsFromBuild);

                    // Build lookup using component line_id
                    let buildPiecesLookup = {};

                    (piecesDetailsFromBuild || []).forEach(line => {

                        // Skip FG line
                        if (!line.isNotBuiltLine) return;

                        // line_id = lineIndex + 1
                        let buildLineId = Number(line.lineIndex) + 1;
                        if (!buildPiecesLookup[buildLineId]) {
                            buildPiecesLookup[buildLineId] = [];
                        }

                        buildPiecesLookup[buildLineId].push({
                            itemId: line.itemId,
                            serial: line.serial,
                            quantity: Number(line.quantity || 0),
                            pieces: Number(line.pieces || 0),
                            lineIndex: line.lineIndex,
                            isNotBuiltLine: line.isNotBuiltLine
                        });
                    });

                    log.debug("buildPiecesLookup", buildPiecesLookup);

                    // let piecesDetailsObj = cm_model.listBuildPieces(buildId);
                    // if (piecesDetailsObj.status != 'SUCCESS') {
                    //     return piecesDetailsObj;
                    // }

                    let fgSerialsDetailsObj = cm_model.getFGSerialComponentsWithInventory(buildId, serialNumber);
                    // log.debug('fgSerialsDetailsObj', fgSerialsDetailsObj);
                    if (fgSerialsDetailsObj.status != 'SUCCESS') {
                        return fgSerialsDetailsObj;
                    }

                    let fgSerialsDetails = fgSerialsDetailsObj.data?.fgSerialCompInvnt;
                    let serialDetails = fgSerialsDetailsObj.data?.serialDetails;

                    commonDetailsArrayObj[0].customSerials = serialDetails.uniqueSerials;
                    commonDetailsArrayObj[0].remainingToBuild = Number(commonDetailsArrayObj[0]?.quantity?.value || 0) - Number(serialDetails.uniqueSerialCount || 0);

                    let processedData = buildComponentsListObj.map(component => {
                        let lineId = component.line_id;
                        let itemId = component.item?.value || null;
                        let fgSerialData = fgSerialsDetails[lineId] || { lots: {}, quantity: 0 };
                        let buildLinePieces = buildPiecesLookup[lineId] || [];

                        // log.debug("{ lineId, fgSerialData }", { lineId, fgSerialData, item: component.item });

                        // Calculate remaining quantity by subtracting used quantity from total quantity
                        let remainingQuantity = Math.max((component.quantity.value || 0) - (fgSerialData.quantity || 0), 0);

                        let isSerialized = component.isSerialized?.value;
                        // let itemClass = component.itemClass?.value;


                        // Calculate total count **before** filtering out used inventory
                        let totalQuantityCount = 0;
                        let totalPiecesCount = 0;

                        if (isSerialized) {
                            totalQuantityCount = totalPiecesCount = component.inventory.length;
                        } else {
                            // totalPiecesCount = piecesDetailsObj.data[itemId]?.totalPieces || 0; // Get total pieces available for the item
                            let buildLinePieces = buildPiecesLookup[lineId] || [];
                            // Sum only this build line pieces
                            totalPiecesCount = buildLinePieces.reduce((sum, line) => { return sum + Number(line.pieces || 0) }, 0);
                        }

                        let remainingInventory = component.inventory.map(inv => {
                            let lotNumber = inv.lotNumber?.value;
                            let matchedBuildLine = buildLinePieces.find(line => String(line.serial).trim() == String(lotNumber).trim());
                            let isUsed = false;

                            if (isSerialized) {
                                isUsed = fgSerialData.lots[lotNumber]?.is_used || false;
                                return isUsed ? null : { ...inv, is_used: false, pieces: { value: 1 } }; // Remove used inventory and if it is not used, set pieces to 1
                            } else {
                                // log.debug("Pieces Details Object", piecesDetailsObj.data[itemId]);
                                log.debug("matchedBuildLine", matchedBuildLine?.pieces);
                                // let piecesAvailable = piecesDetailsObj.data[itemId] ? piecesDetailsObj.data[itemId].lots[lotNumber]?.pieces || 0 : 0; // Get pieces available for the lot number
                                let piecesAvailable = Number(matchedBuildLine?.pieces || 0);
                                // log.debug('piecesAvailable', piecesAvailable);
                                // Get the exact lot quantity used
                                let usedQuantity = fgSerialData.lots[lotNumber]?.lot_quantity || 0;
                                let usedPieces = fgSerialData.lots[lotNumber]?.lot_pieces || 0;
                                let remainingLotQuantity = Math.max((inv.quantity.value || 0) - usedQuantity, 0);
                                let remainingLotPieces = Math.max((piecesAvailable || 0) - usedPieces, 0);

                                // return {
                                //     ...inv,
                                //     remaining_quantity: Number(parseFloat(remainingLotQuantity).toFixed(4)), // Lot-level remaining quantity
                                // };
                                return remainingLotQuantity > 0
                                    ? {
                                        ...inv,
                                        pieces: { value: piecesAvailable },
                                        remaining_quantity: Number(parseFloat(remainingLotQuantity).toFixed(4)), // Lot-level remaining quantity
                                        remaining_pieces: Number(parseInt(remainingLotPieces)), // Lot-level remaining pieces
                                    }
                                    : null; // Remove fully used lots
                            }
                        }).filter(inv => inv !== null); // Remove null values from inventory

                        // Recalculate remaining count after filtering out used inventory
                        let remainingQuantityCount = 0;
                        let remainingPiecesCount = 0;
                        if (isSerialized) {
                            remainingQuantityCount = remainingPiecesCount = remainingInventory.filter(inv => inv.is_used === false).length;
                        } else {
                            remainingPiecesCount = remainingInventory.reduce((acc, inv) => acc + (inv.remaining_pieces || 0), 0);
                        }

                        log.debug('remainingInventory', remainingInventory);

                        return {
                            ...component,
                            remainingQuantity: Number(parseFloat(remainingQuantity).toFixed(4)),
                            remainingQuantityCount: parseInt(remainingQuantityCount),
                            totalQuantityCount: parseInt(totalQuantityCount),
                            remainingPieces: parseInt(remainingPiecesCount),
                            actual_pieces_info: parseInt(totalPiecesCount),
                            inventoryDetail: remainingInventory,
                        };
                    });

                    log.debug('processedData', processedData);

                    return { status: 'SUCCESS', reason: 'Data Found', data: { componentDetails: processedData, commonDetailsArrayObj } }
                } catch (error) {
                    log.error('Error listBuildComponents', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Retrieves the components associated with a specific serial number, based on the selected inventory or inventory details.
             * 
             * @param {Object} requestBody - The request body containing either `selectedInventoryDetails` or `inventoryDetails` for serial components.
             * @returns {Object} The response object containing status, reason, and data (list of components).
             */
            listComponentsForSerial() {
                try {
                    let requestBody = rootContext.body;

                    // Validate requestBody and ensure it has required keys
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        log.error('Validation Error', 'No data provided for listComponentsForSerial');
                        return { status: 'ERROR', reason: 'NO_DATA_PROVIDED', data: [] };
                    }

                    log.debug('listComponentsForSerial requestBody', requestBody);

                    // Determine the primary parameter to pass (selectedInventory or inventoryDetails)
                    let parameterToPass = null;

                    if (requestBody.selectedInventoryDetails && Array.isArray(requestBody.selectedInventoryDetails) && requestBody.selectedInventoryDetails.length > 0) {
                        // Use selectedInventory if it exists and is valid
                        parameterToPass = requestBody.selectedInventoryDetails;
                    } else {
                        // Return an error if neither is valid
                        log.error('Validation Error', 'Neither selectedInventory nor inventoryDetails is valid');
                        return { status: 'ERROR', reason: 'INVALID_REQUEST_DATA', data: [] };
                    }

                    log.debug('Parameter to Pass', parameterToPass);

                    // Fetch components based on the determined parameter
                    let components = cm_model.listComponentsForSerial(parameterToPass);
                    if (components && components.length) {
                        return { status: 'SUCCESS', reason: 'Components Listed', data: components };
                    }

                    return { status: 'SUCCESS', reason: 'NO_COMPONENTS_FOUND', data: [] };
                } catch (error) {
                    log.error('error @ listComponentsForSerial', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Creates an Custom FG Serials based on the provided data.
             * 
             * @param {Object} requestBody The request body containing assembly build and Serial data.
             * @returns {Object} Response object containing status, reason, and data.
             */
            createCustomBuildFGSerials() {
                try {
                    let requestBody = rootContext.body;
                    log.debug("createCustomBuildFGSerials requestBody", requestBody);

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        log.error('Validation Error', 'No data provided for createAssemblyBuild');
                        return { status: 'ERROR', reason: 'NO_DATA_PROVIDED', data: [] };
                    }

                    return cm_functions.createCustomBuildFGSerials(requestBody);
                } catch (e) {
                    log.error('error @ createCustomBuildFGSerials', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            listBomAndRevisionDetails() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getBomAndRevisionDetails requestBody', requestBody);

                    let assemblyItemId = requestBody?.assembly_item_id || null;

                    if (!assemblyItemId) {
                        return { status: 'ERROR', reason: 'Invalid Assembly Item Id', data: [] };
                    }

                    return cm_model.listBomAndRevisionDetails(assemblyItemId);
                } catch (error) {
                    log.error('Error getBomAndRevisionDetails', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            listRevisionComponents() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listRevisionComponents requestBody', requestBody);

                    let revisionId = requestBody?.bom_revision_id || null;

                    if (!revisionId) {
                        return { status: 'ERROR', reason: 'Invalid Revision Id', data: [] };
                    }

                    return cm_model.listRevisionComponents(revisionId);
                } catch (error) {
                    log.error('Error listRevisionComponents', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },
            listLocations() {
                // Perform a search for locations using the searchResults.getLocations method
                let locationList = cm_model.getLocations();
                log.debug("Location List", locationList);

                // Check if the locationList is valid and contains elements
                if (locationList && locationList.length) {
                    // If locations are found, return a success response object
                    return {
                        status: "SUCCESS",
                        reason: "LOCATIONS_LISTED",
                        data: locationList,
                    };
                }

                // If the list is invalid or empty, return an error response object
                return {
                    status: "ERROR",
                    // Use jj_cm_ns_utility to determine if there was a specific error; otherwise, state no locations were found
                    reason: jj_cm_ns_utility.ERROR_STACK.length ? "ERROR" : "NO_LOCATIONS_FOUND",
                    data: null,
                };
            },

            /**
             * Retrieves the list of item cache.
             * 
             * @returns {Object} Response object containing status, reason, and data.
             */
            listItemCache() {
                try {
                    return cm_model.getItemCache();
                }
                catch (e) {
                    log.error('error @ listItemCache', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },

            getSpecificMaterialForFG() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getSpecificMaterialForFG requestBody', requestBody);
                    let itemId = requestBody?.item_id || null;

                    if (!itemId) {
                        return { status: 'ERROR', reason: 'Invalid Item', data: [] };
                    }

                    return cm_model.getSpecificMaterialForFG(itemId);
                } catch (e) {
                    log.error('error @ getSpecificMaterialForFG', e.message);
                    return { status: 'ERROR', reason: e.message, data: [] };
                }
            },
            listEfficiencyAnalysis() {
                try {
                    let requestBody = rootContext.body;
                    let locationId = requestBody?.location;
                    let startDate = requestBody?.startDate;
                    let endDate = requestBody?.endDate;
                    let isRepairOnly = requestBody?.isRepairOnly;

                    // Provide default date range if not provided (last 30 days)
                    if (!startDate || !endDate) {
                        const today = new Date();
                        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

                        endDate = format.format({
                            value: today,
                            type: format.Type.DATE
                        });
                        startDate = format.format({
                            value: thirtyDaysAgo,
                            type: format.Type.DATE
                        });
                    }

                    // Call appropriate function based on isRepairOnly parameter
                    let efficiencyData;
                    if (isRepairOnly === true) {
                        // Repair Efficiency Analysis — repair orders only
                        efficiencyData = cm_efficiency.getRepairEfficiencyData(locationId, startDate, endDate, isRepairOnly);
                    } else if (isRepairOnly === false) {
                        // Production Efficiency Analysis — non-repair orders only
                        efficiencyData = cm_efficiency.getProductionEfficiencyData(locationId, startDate, endDate);
                    } else {
                        // Overall Efficiency Analysis — all operations (repair + production)
                        efficiencyData = cm_efficiency.getOverallEfficiencyData(locationId, startDate, endDate);
                    }


                    if (efficiencyData) {
                        //if (efficiencyData && efficiencyData.length) {
                        return { status: 'SUCCESS', reason: 'Efficiency Data Listed', data: efficiencyData };
                    }

                    // If the list is invalid or empty, return an error response object
                    return {
                        status: "ERROR",
                        // Use jj_cm_ns_utility to determine if there was a specific error; otherwise, state no locations were found
                        reason: jj_cm_ns_utility.ERROR_STACK.length ? "ERROR" : "NO_EFFICIENCY_DATA_FOUND",
                        data: null,
                    };

                } catch (error) {
                    log.error('Error listEfficiencyAnalysis', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            createCustomFGSerials() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('createCustomFGSerials requestBody', requestBody);

                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        log.error('Validation Error', 'No data provided for createCustomFGSerials');
                        return { status: 'ERROR', reason: 'NO_DATA_PROVIDED', data: [] };
                    }

                    return cm_functions.createCustomFGSerials(requestBody);
                } catch (error) {
                    log.error('Error createCustomFGSerials', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            createGoldLossWriteOff() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('createGoldLossWriteOff requestBody', requestBody);

                    let waxTreeWriteOff = requestBody.wax_tree_write_off || false;
                    let selectedComponents = requestBody?.selected_components || null;
                    let departmentId = requestBody?.department_id || null;

                    if (!selectedComponents || !departmentId) {
                        log.error('Validation Error', 'Invalid Components or Department');
                        return { status: 'ERROR', reason: 'Invalid Components or Department', data: [] };
                    }

                    let deptFields = cm_model.getDepartmentFields(departmentId);
                    let locationId = deptFields?.location;
                    let binNumber = deptFields?.bin;
                    let lossStatus = deptFields?.lossStatus;

                    if (!locationId || !binNumber) {
                        return { status: 'ERROR', reason: 'No location or Bin found for the department', data: [] };
                    }

                    let formattedComponents = [];
                    if (waxTreeWriteOff) {
                        // Grouped components by itemId  
                        const groupedComponents = selectedComponents.reduce((acc, component) => {
                            if (Number(component.writeOffQty) > 0) {
                                // Create or update the entry for the current itemId  
                                if (!acc[component.itemId]) {
                                    acc[component.itemId] = {
                                        itemId: component.itemId,
                                        writeOffQty: Number(component.writeOffQty),
                                        inventoryDetails: {
                                            lossQty: []
                                        }
                                    };
                                } else {
                                    acc[component.itemId].writeOffQty = Number(Number(acc[component.itemId].writeOffQty || 0) + Number(component.writeOffQty || 0));
                                }

                                // Find if the lotId already exists in the lossQty array  
                                const existingLot = acc[component.itemId].inventoryDetails.lossQty.find(lot => lot.inventoryNumber === component.lotId);

                                if (existingLot) {
                                    // If it exists, aggregate the recovered quantity  
                                    existingLot.writeOffQtyPerLot += Number(component.writeOffQty); // Summing up the lost quantities  
                                } else {
                                    // If it doesn't exist, add a new lot entry  
                                    acc[component.itemId].inventoryDetails.lossQty.push({
                                        writeOffQtyPerLot: Number(component.writeOffQty), // Start with initial quantity  
                                        inventoryNumber: component.lotId,
                                        inventoryStatus: lossStatus
                                    });
                                }
                            }
                            return acc;
                        }, {});

                        // Convert the grouped object back to an array  
                        // Also carry waxTreeInternalId from original selectedComponents for the Related Wax Tree field
                        formattedComponents = Object.values(groupedComponents).map(function (fc) {
                            const waxTreeIds = selectedComponents
                                .filter(function (c) { return c.itemId === fc.itemId && c.waxTreeInternalId; })
                                .map(function (c) { return c.waxTreeInternalId; });
                            return Object.assign({}, fc, { waxTreeInternalId: waxTreeIds[0] || null });
                        });
                    } else {
                        // exact sum of writeOffQtyPerLot so adjustqtyby matches the inventory detail
                        const lossOutsourcedStatus = deptFields?.lossOutsourcedStatus;
                        formattedComponents = selectedComponents.map(function (component) {
                            const lots = (component.inventoryDetails && component.inventoryDetails.lossOutsourcedQty) || [];
                            const stampedLots = lots.map(function (lot) {
                                return { ...lot, inventoryStatus: lot.inventoryStatus || lossOutsourcedStatus };
                            }).filter(function (lot) { return parseFloat(lot.writeOffQtyPerLot || 0) > 0; });
                            const actualWriteOffQty = Number(parseFloat(
                                stampedLots.reduce(function (s, l) { return s + parseFloat(l.writeOffQtyPerLot || 0); }, 0)
                            ).toFixed(4));
                            return {
                                ...component,
                                writeOffQty: actualWriteOffQty,
                                inventoryDetails: {
                                    ...component.inventoryDetails,
                                    lossOutsourcedQty: stampedLots,
                                }
                            };
                        }).filter(function (c) { return c.writeOffQty > 0; });
                    }

                    // function createInventoryAdjustment params: selectedComponents, locationId, binNumber, goodStatus, inventoryName, selectedMetal, totalRecoveredQty, departmentId, selectedEmployee, waxTreeRecovery, memo, statusChangeDocId
                    let statusChangeDocId = requestBody?.status_change_document_id || null;
                    let adjustmentStatus = cm_functions.createInventoryAdjustment(formattedComponents, locationId, binNumber, null, null, null, null, departmentId, null, waxTreeWriteOff, 'Loss Write-Off', statusChangeDocId);

                    if (adjustmentStatus.status != 'SUCCESS') {
                        return { status: 'ERROR', reason: adjustmentStatus.reason, data: [] };
                    }

                    if (waxTreeWriteOff) {
                        selectedComponents.forEach((waxTree) => {
                            let updateWTStatus = cm_functions.updateRecord('customrecord_jj_wax_tree', waxTree.waxTreeInternalId, {
                                custrecord_jj_scrap_write_off: Number(waxTree.writeOffQty) + Number(waxTree.scrapWriteOff)
                            });

                            if (!updateWTStatus.success) {
                                throw new Error(updateWTStatus.error);
                            }
                        });
                    }

                    // Increment custbody_jj_recovered_pure_qty on the loss transaction so the
                    // written-off qty is treated as "consumed" — preventing further recovery
                    const lossTranId = requestBody.loss_transaction_id;
                    const pureQtyWrittenOff = Number(parseFloat(requestBody.pure_qty_written_off || 0).toFixed(4));
                    if (lossTranId && pureQtyWrittenOff > 0) {
                        try {
                            const invStatusRec = record.load({ type: 'inventorystatuschange', id: lossTranId, isDynamic: false });
                            const currentVal = parseFloat(invStatusRec.getValue({ fieldId: 'custbody_jj_recovered_pure_qty' }) || 0);
                            const newVal = Number(parseFloat(currentVal + pureQtyWrittenOff).toFixed(4));
                            invStatusRec.setValue({ fieldId: 'custbody_jj_recovered_pure_qty', value: newVal });
                            invStatusRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
                            log.debug('createGoldLossWriteOff: incremented recoveredPureQty', { lossTranId, currentVal, pureQtyWrittenOff, newVal });
                        } catch (e) {
                            log.error('createGoldLossWriteOff: failed to increment recoveredPureQty', e);
                        }
                    }

                    return { status: 'SUCCESS', reason: 'Gold Loss Write Off Created Successfully', data: adjustmentStatus.data };
                } catch (error) {
                    log.error('Error createGoldLossWriteOff', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Lists employees based on the provided request body.
             * @returns {Object} Response object containing status, reason, and data (list of employees).
             */
            listEmployees() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('rootContext.body', rootContext.body);
                    let employeeList = cm_model.getEmployees(requestBody.is_hod, requestBody.all_employees);
                    return { status: 'SUCCESS', reason: 'HODs Listed', data: employeeList };
                } catch (error) {
                    log.error('listEmployees', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },


            /**
             * Lists inventory adjustments.
             *
             * This function retrieves inventory adjustment data and returns it in a structured format.
             * If an error occurs during the process, it logs the error and returns an error response.
             *
             * @returns {Object} An object containing the status, reason, and data of the inventory adjustments.
             * @property {string} status - The status of the operation ('SUCCESS' or 'ERROR').
             * @property {string} reason - A message describing the reason for the status.
             * @property {Array} data - The inventory adjustment data or an empty array if an error occurred.
             */
            listInventoryAdjustments() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('rootContext.body', rootContext.body);
                    if (!requestBody || !jj_cm_ns_utility.checkForParameter(requestBody)) {
                        return { status: 'ERROR', reason: 'No Parameters Found', data: [] };
                    }
                    if (!requestBody.startDate || !requestBody.endDate) {
                        return { status: 'ERROR', reason: 'Start Date or End Date not found', data: [] };
                    }
                    return cm_model.getInventoryAdjustments(requestBody.startDate, requestBody.endDate);

                } catch (error) {
                    log.error('listInventoryAdjustments', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Retrieves the current gold rate.
             *
             * @returns {Object} An object containing the status, reason, and data (gold rate).
             * @property {string} status - The status of the operation ('SUCCESS' or 'ERROR').
             * @property {string} reason - The reason for the status.
             * @property {Array|number} data - The retrieved gold rate or an empty array in case of an error.
             */
            getCurrentGoldRate() {
                try {
                    return cm_model.getCurrentGoldRate();
                } catch (error) {
                    log.error('getCurrentGoldRate', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Retrieves the FG serial numbers for location transfer.
             * 
             * @returns {Object} An object containing the status, reason, and data (FG serial numbers).
             */
            listFGSerialForLocationTransfer() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listFGSerialForLocationTransfer requestBody', requestBody);

                    let fromBinId = requestBody?.from_bin || null;
                    return cm_model.listFGSerialForLocationTransfer(fromBinId);
                } catch (error) {
                    log.error('listFGSerialForLocationTransfer', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Retrieves location information for a specific FG serial number from Inventory Balance Search.
             * Called from Direct Repair page when user selects a serial number.
             * 
             * @returns {Object} { status, reason, data: { location_id, location_name, bin_id, bin_name, available_qty, assembly_item_name, all_locations } }
             */
            getSerialLocationFromInventoryBalance() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getSerialLocationFromInventoryBalance requestBody', requestBody);

                    // Validate that serial number is provided
                    if (!requestBody || !requestBody.serial_number) {
                        log.error('Missing required parameter: serial_number', requestBody);
                        return {
                            status: 'ERROR',
                            reason: 'Serial number is required in the request body',
                            data: null
                        };
                    }

                    const serialNumber = String(requestBody.serial_number).trim();
                    log.debug('API: Processing request for serial:', serialNumber);

                    // Call the model function to get location
                    const result = cm_model.getSerialLocationFromInventoryBalance(serialNumber);

                    log.debug('✓ API RESPONSE PREPARED', {
                        status: result.status,
                        reason: result.reason,
                        hasData: !!result.data,
                        dataContent: result.data,
                        apiType: 'getSerialLocationFromInventoryBalance',
                        timestamp: new Date().toISOString()
                    });

                    return result;

                } catch (error) {
                    log.error('getSerialLocationFromInventoryBalance', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve serial location: ' + (error.message || String(error)),
                        data: null
                    };
                }
            },

            /**
             * Retrieves components for a specific FG serial ID.
             * Called from Direct Repair page to display components list.
             * 
             * @returns {Object} { status, reason, data: [{ item, item_text, quantity, barcode_quantity, cost, pieces, units }] }
             */
            getFGSerialComponentsBySerialId() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getFGSerialComponentsBySerialId requestBody', requestBody);

                    // Validate that serial ID is provided
                    if (!requestBody || !requestBody.serial_id) {
                        log.error('Missing required parameter: serial_id', requestBody);
                        return {
                            status: 'ERROR',
                            reason: 'Serial ID is required in the request body',
                            data: []
                        };
                    }

                    const fgSerialRecId = requestBody.serial_id;
                    log.debug('API: Processing request for serial ID:', fgSerialRecId);

                    // Call the model function to get components
                    // const result = cm_model.getFGSerialComponentsBySerialId(fgSerialRecId);
                    const result = cm_model.getFGSerialComponentsNested(fgSerialRecId);
                    log.debug('Model result for getFGSerialComponentsNested', result);

                    if (result.data) {
                        log.debug('Customer data from model:', {
                            customer_id: result.data.customer_id,
                            customer_name: result.data.customer_name
                        });
                    }

                    // If no components found but we have FG Serial data, still return SUCCESS with empty components
                    if (result.status === 'ERROR' && result.reason === 'No components found' && result.data === null) {
                        log.debug('No components found for serial, attempting to fetch FG Serial details only');

                        // Try to get FG Serial details without components
                        // const fgSerialDetailsResult = cm_model.getFGSerialDetailsOnly(fgSerialRecId);

                        // if (fgSerialDetailsResult && fgSerialDetailsResult.status === 'SUCCESS') {
                        //     log.debug('✓ FG Serial details retrieved without components', fgSerialDetailsResult.data);
                        //     return {
                        //         status: 'SUCCESS',
                        //         reason: 'No components found',
                        //         data: [],
                        //         fgSerialDetails: fgSerialDetailsResult.data
                        //     };
                        // }

                        // If no details function available, return the error as-is
                        return result;
                    }

                    // If successful, ensure data is properly formatted
                    if (result.status === 'SUCCESS' && result.data) {
                        const fgSerialObject = result.data;
                        const components = fgSerialObject.components || [];

                        log.debug('✓ API RESPONSE PREPARED', {
                            status: result.status,
                            reason: result.reason,
                            componentsCount: components.length,
                            hasFGSerialDetails: !!fgSerialObject,
                            customer_id: fgSerialObject.customer_id,
                            customer_name: fgSerialObject.customer_name,
                            components: components.map(c => ({
                                item: c.item,
                                item_text: c.item_text,
                                quantity: c.quantity,
                                barcode_quantity: c.barcode_quantity
                            })),
                            apiType: 'getFGSerialComponentsBySerialId',
                            timestamp: new Date().toISOString()
                        });

                        return {
                            status: 'SUCCESS',
                            reason: 'Components retrieved successfully',
                            data: fgSerialObject,
                            fgSerialDetails: {
                                fg_serial_rec_id: fgSerialObject.fg_serial_rec_id,
                                serial_number_id: fgSerialObject.serial_number_id,
                                serial_number_name: fgSerialObject.serial_number_name,
                                created: fgSerialObject.created,
                                asm_build_date: fgSerialObject.asm_build_date,
                                assembly_unbuild_name: fgSerialObject.assembly_unbuild_name,
                                assembly_unbuild_id: fgSerialObject.assembly_unbuild_id,
                                assembly_unbuild_date: fgSerialObject.assembly_unbuild_date,
                                alloy_cost: fgSerialObject.alloy_cost,
                                alloy_weight: fgSerialObject.alloy_weight,
                                assembly_build_name: fgSerialObject.assembly_build_name,
                                assembly_build_id: fgSerialObject.assembly_build_id,
                                assembly_item_name: fgSerialObject.assembly_item_name,
                                bag_core_tracking: fgSerialObject.bag_core_tracking,
                                bom_revision: fgSerialObject.bom_revision,
                                clr_stone_cost: fgSerialObject.clr_stone_cost,
                                clr_stone_weight: fgSerialObject.clr_stone_weight,
                                diamond_cost: fgSerialObject.diamond_cost,
                                diamond_weight: fgSerialObject.diamond_weight,
                                gold_cost: fgSerialObject.gold_cost,
                                gold_weight: fgSerialObject.gold_weight,
                                gross_weight: fgSerialObject.gross_weight,
                                making_charge_cost: fgSerialObject.making_charge_cost,
                                pure_weight: fgSerialObject.pure_weight,
                                related_so: fgSerialObject.related_so,
                                related_so_date: fgSerialObject.related_so_date,
                                metal_colour: fgSerialObject.metal_colour,
                                metal_purity: fgSerialObject.metal_purity,
                                metal_quality: fgSerialObject.metal_quality,
                                diamond_color: fgSerialObject.diamond_color,
                                diamond_quality: fgSerialObject.diamond_quality,
                                clr_stone_color: fgSerialObject.clr_stone_color,
                                clr_stone_shape: fgSerialObject.clr_stone_shape,
                                customer_id: fgSerialObject.customer_id,
                                customer_name: fgSerialObject.customer_name
                            }
                        };
                    }

                    return result;

                } catch (error) {
                    log.error('getFGSerialComponentsBySerialId', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve serial components: ' + (error.message || String(error)),
                        data: []
                    };
                }
            },

            /**
             * Retrieves all available locations for Direct Repair
             * 
             * @returns {Object} { status, reason, data: [{ value: location_id, label: location_name }, ...] }
             */
            getAvailableLocationsForDirectRepair() {
                try {
                    log.debug('getAvailableLocationsForDirectRepair - START');

                    const result = cm_model.getAvailableLocationsForDirectRepair();

                    log.debug('✓ API RESPONSE PREPARED', {
                        status: result.status,
                        reason: result.reason,
                        locationsCount: result.data ? result.data.length : 0,
                        apiType: 'getAvailableLocationsForDirectRepair',
                        timestamp: new Date().toISOString()
                    });

                    return result;

                } catch (error) {
                    log.error('getAvailableLocationsForDirectRepair', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve locations: ' + (error.message || String(error)),
                        data: []
                    };
                }
            },

            /**
             * Retrieves FG serials filtered by location for Direct Repair
             * 
             * @returns {Object} { status, reason, data: [...serials] }
             */
            listFGSerialsByLocationForDirectRepair() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listFGSerialsByLocationForDirectRepair requestBody', requestBody);

                    if (!requestBody || !requestBody.location_id) {
                        log.error('Missing required parameter: location_id', requestBody);
                        return {
                            status: 'ERROR',
                            reason: 'Location ID is required in the request body',
                            data: []
                        };
                    }

                    const locationId = requestBody.location_id;
                    log.debug('API: Processing request for location:', locationId);

                    const result = cm_model.listFGSerialsByLocationForDirectRepair(locationId);

                    log.debug('✓ API RESPONSE PREPARED', {
                        status: result.status,
                        reason: result.reason,
                        serialsCount: result.data ? result.data.length : 0,
                        apiType: 'listFGSerialsByLocationForDirectRepair',
                        timestamp: new Date().toISOString()
                    });

                    return result;

                } catch (error) {
                    log.error('listFGSerialsByLocationForDirectRepair', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve serials for location: ' + (error.message || String(error)),
                        data: []
                    };
                }
            },

            /**
             * Fetch manufacturing departments for direct repair unbuild operation
             * 
             * @returns {Object} An object containing the status, reason, and data (departments).
             */
            getManufacturingDepartmentsForDirectRepair() {
                try {
                    log.debug('getManufacturingDepartmentsForDirectRepair - START');

                    // Call the model function to get manufacturing departments
                    const result = cm_model.getManufacturingDepartmentsForDirectRepair();

                    log.debug('✓ API RESPONSE PREPARED', {
                        status: result.status,
                        reason: result.reason,
                        departmentsCount: result.data ? result.data.length : 0,
                        apiType: 'getManufacturingDepartmentsForDirectRepair',
                        timestamp: new Date().toISOString()
                    });

                    return result;

                } catch (error) {
                    log.error('getManufacturingDepartmentsForDirectRepair', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve manufacturing departments: ' + (error.message || String(error)),
                        data: []
                    };
                }
            },

            /**
             * Fetch all inventory statuses from NetSuite
             * 
             * @returns {Object} An object containing the status, reason, and data (inventory statuses).
             */
            getInventoryStatuses() {
                try {
                    log.debug('getInventoryStatuses - START');

                    // Call the model function to get inventory statuses
                    const result = cm_model.getInventoryStatuses();

                    log.debug('✓ API RESPONSE PREPARED', {
                        status: result.status,
                        reason: result.reason,
                        statusesCount: result.data ? result.data.length : 0,
                        apiType: 'getInventoryStatuses',
                        timestamp: new Date().toISOString()
                    });

                    return result;

                } catch (error) {
                    log.error('getInventoryStatuses', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve inventory statuses: ' + (error.message || String(error)),
                        data: []
                    };
                }
            },

            /**
             * Fetch assembly unbuild record details
             * 
             * @returns {Object} An object containing the status, reason, and data (unbuild details).
             */
            getAssemblyUnbuildDetails() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getAssemblyUnbuildDetails requestBody', requestBody);

                    // Validate that build ID is provided
                    if (!requestBody || !requestBody.unbuild_id) {
                        log.error('Missing required parameter: unbuild_id', requestBody);
                        return {
                            status: 'ERROR',
                            reason: 'Build ID is required in the request body',
                            data: null
                        };
                    }

                    const buildId = requestBody.unbuild_id;
                    log.debug('API: Processing request for assembly build ID:', buildId);

                    // Fetch the assembly build record
                    try {
                        const buildRecord = record.load({
                            type: 'assemblybuild',
                            id: buildId,
                            isDynamic: false
                        });

                        // Extract all available fields from the assembly build record
                        const buildDetails = {
                            // Transaction Information
                            tranid: buildRecord.getValue('tranid'),
                            trandate: buildRecord.getValue('trandate'),
                            trandate_formatted: buildRecord.getText('trandate'),

                            // Item & Quantity Information
                            item_id: buildRecord.getValue('item'),
                            item_name: buildRecord.getText('item'),
                            quantity: buildRecord.getValue('quantity'),

                            // Location Information
                            location_id: buildRecord.getValue('location'),
                            location_name: buildRecord.getText('location'),

                            // Subsidiary Information
                            subsidiary_id: buildRecord.getValue('subsidiary'),
                            subsidiary_name: buildRecord.getText('subsidiary'),

                            // Memo/Notes
                            memo: buildRecord.getValue('memo'),

                            // Status Information
                            status: buildRecord.getValue('status'),
                            status_text: buildRecord.getText('status'),

                            // Department Information (if available)
                            department_id: buildRecord.getValue('department'),
                            department_name: buildRecord.getText('department'),

                            // Class Information (if available)
                            class_id: buildRecord.getValue('class'),
                            class_name: buildRecord.getText('class'),

                            // Created/Modified Information
                            created: buildRecord.getValue('created'),
                            lastmodified: buildRecord.getValue('lastmodified'),

                            // User Information
                            createdby: buildRecord.getValue('createdby'),
                            createdby_name: buildRecord.getText('createdby'),
                            lastmodifiedby: buildRecord.getValue('lastmodifiedby'),
                            lastmodifiedby_name: buildRecord.getText('lastmodifiedby')
                        };

                        log.debug('✓ API RESPONSE PREPARED', {
                            status: 'SUCCESS',
                            reason: 'Assembly build details retrieved successfully',
                            apiType: 'getAssemblyUnbuildDetails',
                            buildDetails: buildDetails,
                            timestamp: new Date().toISOString()
                        });

                        // Wrap the data as JSON string for consistency with other APIs
                        const wrappedData = JSON.stringify(buildDetails);

                        return {
                            status: 'SUCCESS',
                            reason: 'Assembly unbuild details retrieved successfully',
                            data: wrappedData
                        };

                    } catch (recordError) {
                        log.error('Error loading assembly unbuild record', recordError);
                        return {
                            status: 'ERROR',
                            reason: 'Failed to load assembly build record: ' + (recordError.message || String(recordError)),
                            data: null
                        };
                    }

                } catch (error) {
                    log.error('getAssemblyUnbuildDetails', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to retrieve assembly build details: ' + (error.message || String(error)),
                        data: null
                    };
                }
            },

            /**
             * Create assembly unbuild record for direct repair
             * @returns {Object} An object containing the status, reason, and data (unbuild record ID).
             */
            createAssemblyUnbuild() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('createAssemblyUnbuild requestBody', requestBody);

                    // Validate required parameters
                    if (!requestBody || !requestBody.assembly_build_id) {
                        log.error('Missing required parameter: assembly_build_id', requestBody);
                        return {
                            status: 'ERROR',
                            reason: 'Assembly build ID is required',
                            data: null
                        };
                    }

                    if (!requestBody.manufacturing_dept_id) {
                        log.error('Missing required parameter: manufacturing_dept_id', requestBody);
                        return {
                            status: 'ERROR',
                            reason: 'Manufacturing department ID is required',
                            data: null
                        };
                    }

                    // Call the function from jj_cm_functions.js
                    const result = cm_functions.createAssemblyUnbuildRecord(requestBody);

                    log.debug('✓ API RESPONSE PREPARED', {
                        status: result.status,
                        reason: result.reason,
                        apiType: 'createAssemblyUnbuild',
                        timestamp: new Date().toISOString()
                    });

                    return result;

                } catch (error) {
                    log.error('createAssemblyUnbuild', error);
                    return {
                        status: 'ERROR',
                        reason: 'Failed to create assembly unbuild: ' + (error.message || String(error)),
                        data: null
                    };
                }
            },

            /**
             * Lists the statuses.
             * 
             * @returns {Object} An object containing the status, reason, and data (statuses).
             */
            listStatuses() {
                try {
                    return cm_model.listStatuses();
                } catch (error) {
                    log.error('listStatuses', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Lists the all bags details.
             * 
             * @returns {Object} An object containing the status, reason, and data (statuses).
             */
            listAllBagsData() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('listSpecificMaterialDetails requestBody', requestBody);

                    let materialType = requestBody.material_type || null; // gold_type, diamond_type, color_stone_type
                    let departmentId = requestBody.department_id || null;
                    let bagSearchKey = requestBody.bag_search_key || null;

                    // getBagMetalTypeDetails parameters (materialType, departmentId)
                    let materialDetailsObj = cm_model.getAllBagsData(materialType, departmentId, bagSearchKey);
                    log.debug('materialDetailsObj', materialDetailsObj);

                    if (materialDetailsObj.status != 'SUCCESS') {
                        return materialDetailsObj;
                    }
                    return { status: 'SUCCESS', reason: 'Material Details Listed', data: materialDetailsObj.data }
                } catch (error) {
                    log.error('listAllBagsData', error);
                    return { status: 'ERROR', reason: error.message, data: [] }
                }
            },

            /**
             * Fetches department-wise employees for the specified manufacturing departments.
             * 
             * @returns {Object} A mapping object with department ID as key and an array of employees (value, name) as value.
             */
            getDepartmentEmployeesMap() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getDepartmentEmployeesMap rootContext.body', rootContext.body);
                    let employeeListMap = {};
                    if (requestBody.departments && requestBody.departments.length > 0) {
                        employeeListMap = cm_model.getDepartmentEmployeesMap(requestBody.departments, requestBody.all_employees);
                    }
                    log.debug("employeeListMap", employeeListMap);
                    return { status: 'SUCCESS', reason: 'HODs Listed', data: employeeListMap };
                } catch (error) {
                    log.error('error @ getDepartmentEmployeesMap', error);
                    return { status: 'ERROR', reason: error.message, data: {} };
                }
            },

            lossOutsourcedItemStatusChange() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('lossOutsourcedItemStatusChange payload', requestBody);

                    if (!requestBody || !requestBody.selected_components || !requestBody.department_id) {
                        return { status: 'ERROR', reason: 'Missing parameters in request', data: [] };
                    }

                    let departmentId = requestBody.department_id;
                    let selectedComponents = requestBody.selected_components;

                    let deptFields = cm_model.getDepartmentFields(departmentId);
                    if (!deptFields || !deptFields.location || !deptFields.bin || !deptFields.lossStatus || !deptFields.lossOutsourcedStatus) {
                        return { status: 'ERROR', reason: 'Invalid department setup', data: [] };
                    }

                    let location = deptFields.location;
                    let fromBin = deptFields.bin;
                    let fromStatus = deptFields.lossStatus;
                    let toStatus = deptFields.lossOutsourcedStatus;

                    // Step 1: Build groupedTransfers for inventoryStatusChange
                    let groupedTransfers = {};  // Format: { inventoryNumberId: { componentId, quantity, pieces } }

                    selectedComponents.forEach(component => {
                        let itemId = component.itemId;

                        // Extract inventory numbers from lossQty
                        (component.inventoryDetails?.lossQty || []).forEach(loss => {
                            let invNum = loss.inventoryNumber;
                            let qty = parseFloat(loss.quantityAvailable || 0);
                            if (qty <= 0) return;

                            if (!groupedTransfers[invNum]) {
                                groupedTransfers[invNum] = { componentId: itemId, quantity: 0, pieces: 0 };
                            }
                            groupedTransfers[invNum].quantity += qty;
                        });

                        // Extract matching pieces from lossPieces
                        (component.inventoryDetails?.lossPieces || []).forEach(piecesObj => {
                            let invNum = piecesObj.inventoryNumber;
                            let pcs = parseInt(piecesObj.piecesAvailable || 0);

                            if (groupedTransfers[invNum]) {
                                groupedTransfers[invNum].pieces += pcs;
                            }
                            // else {
                            //     // If pieces exist for a lot not listed in lossQty
                            //     groupedTransfers[invNum] = { componentId: itemId, quantity: 0, pieces: pcs };
                            // }
                        });
                    });

                    // Step 2: Generate JSON string for tracking
                    let jsonString = cm_functions.genPiecesTrackJSON(groupedTransfers, deptFields, toStatus, fromStatus);

                    log.debug("jsonString", jsonString);
                    log.debug("inventoryStatusChange Data", { location, fromBin, fromStatus, toStatus, groupedTransfers });

                    // Step 3: Call inventory status change function with isLossTransferred flag and department
                    let result = cm_functions.inventoryStatusChange(
                        groupedTransfers,  // groupedTransfers
                        location,          // location
                        fromBin,           // fromBin
                        fromStatus,        // fromStatus (Loss)
                        toStatus,          // toStatus (Loss Outsourced)
                        jsonString,        // jsonString
                        null,              // bagIds
                        null,              // operationIds
                        null,              // waxTreeId
                        null,              // weightDetails
                        "Loss Outsourced", // memoText
                        null,              // serialSequenceMap
                        true,              // isLossTransferred - Set checkbox for Move Loss operation
                        departmentId       // lossTransferredDept - Set department dropdown
                    );

                    if (result.status != "SUCCESS") {
                        return result;
                    }

                    return { status: "SUCCESS", reason: "Items moved for Loss Outsourcing.", data: [] }
                } catch (error) {
                    log.error("Error in lossOutsourcedItemStatusChange", error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Get the average cost of alloys.
             * @returns {Object} - A map of alloy internal IDs to their average costs.
             */
            getAlloyAvgCost() {
                try {
                    let colorIds = rootContext.body?.metal_colors;
                    log.debug("Color IDs", colorIds);
                    let alloyCosts = cm_model.getAlloyAvgCost(colorIds);
                    log.debug("Alloy Costs", alloyCosts);
                    return { status: "SUCCESS", reason: "Alloy average costs retrieved.", data: alloyCosts };
                } catch (error) {
                    log.error("Error in getAlloyAvgCost", error.message);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Lists the all Transfer Order Details.
             * 
             * @returns {Object} An object containing the status, reason, and data (statuses).
             */
            getTransferOrderSerials() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getTransferOrderSerials - Full requestBody', {
                        requestBody: requestBody,
                        type: typeof requestBody,
                        keys: requestBody ? Object.keys(requestBody) : 'null',
                        stringified: JSON.stringify(requestBody)
                    });

                    // Get transfer order IDs from request body (optional)
                    let transferOrderIds = requestBody.transferOrderIds || null;

                    log.debug('getTransferOrderSerials - Transfer Order IDs', {
                        transferOrderIds: transferOrderIds,
                        count: transferOrderIds ? transferOrderIds.length : 0,
                        isArray: Array.isArray(transferOrderIds),
                        rawValue: requestBody.transferOrderIds
                    });

                    let transferOrderSerials = cm_model.getTransferOrderSerials(transferOrderIds);

                    log.debug('getTransferOrderSerials - Result', {
                        resultKeys: Object.keys(transferOrderSerials),
                        resultCount: Object.keys(transferOrderSerials).length
                    });

                    return { status: 'SUCCESS', reason: 'Transfer Order Serials Listed', data: transferOrderSerials }
                } catch (error) {
                    log.error('getTransferOrderSerials', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            /**
             * Get Bin Transfer Serials (line level details)
             * @returns {Object} An object containing the status, reason, and data (bin transfer serials).
             */
            getBinTransferSerials() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getBinTransferSerials - Full requestBody', {
                        requestBody: requestBody,
                        type: typeof requestBody,
                        keys: requestBody ? Object.keys(requestBody) : 'null',
                        stringified: JSON.stringify(requestBody)
                    });

                    // Get bin transfer IDs from request body (optional)
                    let binTransferIds = requestBody.binTransferIds || null;

                    log.debug('getBinTransferSerials - Bin Transfer IDs', {
                        binTransferIds: binTransferIds,
                        count: binTransferIds ? binTransferIds.length : 0,
                        isArray: Array.isArray(binTransferIds),
                        rawValue: requestBody.binTransferIds
                    });

                    let binTransferSerials = cm_model.getBinTransferSerials(binTransferIds);

                    log.debug('getBinTransferSerials - Result', {
                        resultKeys: Object.keys(binTransferSerials),
                        resultCount: Object.keys(binTransferSerials).length,
                        fullResult: binTransferSerials
                    });

                    return { status: 'SUCCESS', reason: 'Bin Transfer Serials Listed', data: binTransferSerials }
                } catch (error) {
                    log.error('getBinTransferSerials', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            /**
             * Get Inventory Status Change Serials (line level details)
             * @returns {Object} An object containing the status, reason, and data (inventory status change serials).
             */
            getInvStatusChangeSerials() {
                try {
                    let requestBody = rootContext.body;
                    log.debug('getInvStatusChangeSerials - Full requestBody', {
                        requestBody: requestBody,
                        type: typeof requestBody,
                        keys: requestBody ? Object.keys(requestBody) : 'null',
                        stringified: JSON.stringify(requestBody)
                    });

                    // Get inventory status change IDs from request body (optional)
                    let invStatusChangeIds = requestBody.invStatusChangeIds || null;

                    log.debug('getInvStatusChangeSerials - Inventory Status Change IDs', {
                        invStatusChangeIds: invStatusChangeIds,
                        count: invStatusChangeIds ? invStatusChangeIds.length : 0,
                        isArray: Array.isArray(invStatusChangeIds),
                        rawValue: requestBody.invStatusChangeIds
                    });

                    // Use getInventoryStatusChangeSerials which filters by reason code 51 (Location Transfer)
                    let invStatusChangeSerials = cm_model.getInventoryStatusChangeSerials(invStatusChangeIds);

                    log.debug('getInvStatusChangeSerials - Result', {
                        resultKeys: Object.keys(invStatusChangeSerials),
                        resultCount: Object.keys(invStatusChangeSerials).length,
                        fullResult: invStatusChangeSerials
                    });

                    return { status: 'SUCCESS', reason: 'Inventory Status Change Serials Listed', data: invStatusChangeSerials }
                } catch (error) {
                    log.error('getInvStatusChangeSerials', error);
                    return { status: 'ERROR', reason: error.message, data: {} }
                }
            },

            // /**
            //  * Get Transfer Orders (main line data only)
            //  * @returns {Object} An object containing the status, reason, and data (transfer orders).
            //  */
            // getTransferOrders() {
            //     try {
            //         let transferOrders = cm_model.getTransferOrders();
            //         log.debug('getTransferOrders', transferOrders);

            //         return { status: 'SUCCESS', reason: 'Transfer Orders Listed', data: transferOrders }
            //     } catch (error) {
            //         log.error('getTransferOrders', error);
            //         return { status: 'ERROR', reason: error.message, data: {} }
            //     }
            // },
            aggregateEmployeeLossData() {
                try {
                    let requestBody = rootContext.body;

                    if (!requestBody.emp_id || !requestBody.department_id) {
                        return { status: 'ERROR', reason: 'Missing required parameters: emp_id and department_id', data: null };
                    }

                    // Get the exit time from inventory adjustments
                    const invAdjResult = cm_model.getInvAdjCreatedDate(requestBody.emp_id);

                    let exitTime = null;
                    if (invAdjResult.status === 'SUCCESS' && invAdjResult.data && invAdjResult.data.length > 0) {
                        exitTime = invAdjResult.data[invAdjResult.data.length - 1];
                    }

                    // Get lossLastTransferred from request body (selected loss transaction date)
                    const lossLastTransferred = requestBody.lossLastTransferred || null;

                    // Get lossTransactionId from request body (for date range filtering)
                    const lossTransactionId = requestBody.loss_transaction_id || null;

                    // Get date range info if lossTransactionId is provided
                    let dateRangeInfo = null;
                    if (lossTransactionId) {
                        const dateRangeResult = cm_model.getLossTransactionDateRange(lossTransactionId, requestBody.department_id);
                        if (dateRangeResult.status === 'SUCCESS') {
                            dateRangeInfo = {
                                startDate: dateRangeResult.startDate,
                                endDate: dateRangeResult.endDate
                            };
                        }
                    }

                    // Call aggregateEmployeeLossData with all parameters including lossTransactionId
                    const result = cm_model.aggregateEmployeeLossData(
                        requestBody.emp_id,
                        requestBody.department_id,
                        exitTime,
                        lossLastTransferred,
                        lossTransactionId
                    );

                    // Add exitTime and dateRangeInfo to the response data
                    if (result.status === 'SUCCESS' && result.data) {
                        result.data.exitTime = exitTime;
                        if (dateRangeInfo) {
                            result.data.dateRangeInfo = dateRangeInfo;
                        }
                    }

                    return result;
                } catch (error) {
                    log.error('error @ aggregateEmployeeLossData', error);
                    return { status: 'ERROR', reason: error.message, data: null };
                }
            },
            getLossTransactions() {
                try {
                    const requestBody = rootContext.body;
                    log.debug('getLossTransactions requestBody', requestBody);
                    const departmentId = (requestBody && requestBody.department_id) ? requestBody.department_id : null;
                    log.debug('getLossTransactions departmentId', departmentId);
                    return cm_model.getLossTransactions(departmentId);
                } catch (error) {
                    log.error('error @ getLossTransactions', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },
            getEmployeeWiseRecoveryByTransaction() {
                try {
                    const requestBody = rootContext.body;
                    const lossTranId = requestBody && requestBody.loss_transaction_id;
                    if (!lossTranId) {
                        return { status: 'ERROR', reason: 'loss_transaction_id is required', data: [] };
                    }
                    return cm_model.getEmployeeWiseRecoveryByTransaction(lossTranId);
                } catch (error) {
                    log.error('error @ getEmployeeWiseRecoveryByTransaction', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },
            incrementRecoveredPureQty() {
                try {
                    const requestBody = rootContext.body;
                    const tranId = requestBody && requestBody.tran_id;
                    const pureQtyToAdd = requestBody && parseFloat(requestBody.pure_qty_to_add || 0);
                    if (!tranId || !pureQtyToAdd) {
                        return { status: 'ERROR', reason: 'tran_id and pure_qty_to_add are required', data: null };
                    }

                    log.debug('incrementRecoveredPureQty START', { tranId, pureQtyToAdd });

                    const invStatusRec = record.load({
                        type: 'inventorystatuschange',
                        id: tranId,
                        isDynamic: false
                    });

                    const currentVal = parseFloat(invStatusRec.getValue({ fieldId: 'custbody_jj_recovered_pure_qty' }) || 0);
                    const newVal = Number(parseFloat(currentVal + pureQtyToAdd).toFixed(4));

                    invStatusRec.setValue({ fieldId: 'custbody_jj_recovered_pure_qty', value: newVal });
                    invStatusRec.save({ enableSourcing: false, ignoreMandatoryFields: true });

                    log.debug('incrementRecoveredPureQty SUCCESS', { tranId, currentVal, pureQtyToAdd, newVal });
                    return { status: 'SUCCESS', reason: 'Field updated', data: { newVal } };
                } catch (error) {
                    log.error('error @ incrementRecoveredPureQty', error);
                    return { status: 'ERROR', reason: error.message, data: null };
                }
            },
            getRecoveryDataByDeptAndDateRange() {
                try
                {
                    const requestBody = rootContext.body;
                    const startDate = (requestBody && requestBody.startDate) || '';
                    const endDate = (requestBody && requestBody.endDate) || '';
                    const departmentNames = (requestBody && requestBody.departmentNames) || [];

                    if (!startDate || !endDate)
                    {
                        return { status: 'SUCCESS', reason: 'Invalid or missing date range', data: { recoveryMap: {} } };
                    }

                    // Support both single (legacy) and batch calls
                    if (Array.isArray(departmentNames) && departmentNames.length > 0)
                    {
                        return cm_model.getAvgRecoveryPercentageBatch(startDate, endDate, departmentNames);
                    }

                    // Legacy single-dept fallback
                    const departmentName = (requestBody && requestBody.departmentName) || '';
                    return cm_model.getAvgRecoveryPercentageByDateRange(startDate, endDate, departmentName);
                } catch (error) {
                    log.error('error @ getRecoveryDataByDeptAndDateRange', error);
                    return { status: 'ERROR', reason: error.message, data: null };
                }
            },
            createEmployeeWiseRecovery() {
                try {
                    const requestBody = rootContext.body;
                    log.debug('createEmployeeWiseRecovery requestBody', requestBody);

                    if (!requestBody || !requestBody.records || !requestBody.records.length) {
                        return { status: 'ERROR', reason: 'No records provided', data: [] };
                    }

                    const createdIds = [];
                    requestBody.records.forEach(function (payload) {
                        log.debug('createEmployeeWiseRecovery payload.inventory_adjustment_id', {
                            raw: payload.inventory_adjustment_id,
                            type: typeof payload.inventory_adjustment_id,
                            asNumber: Number(payload.inventory_adjustment_id)
                        });
                        const rec = record.create({ type: 'customrecord_jj_employee_wise_recovery', isDynamic: true });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_department', value: payload.department_id || '' });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_employee', value: payload.employee_id || '' });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_loss_tran', value: payload.loss_transaction_id || '' });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_percentage', value: payload.employee_recovery_percentage || 0 });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_pure_rec_qty', value: payload.pure_recovered_qty || 0 });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_rec_qty', value: payload.recovered_qty || 0 });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_touch', value: payload.touch || 0 });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_rec_dept_recovery_perc', value: payload.dept_recovery_percentage || 0 });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_rec_emp_pure_loss_qty', value: payload.emp_pure_loss_qty || 0 });
                        rec.setValue({ fieldId: 'custrecord_jj_emp_recovery_emp_loss_qty', value: payload.emp_loss_qty || 0 });
                        if (payload.inventory_adjustment_id) {
                            rec.setValue({ fieldId: 'custrecord_jj_emp_rec_inv_adjustment', value: Number(payload.inventory_adjustment_id) });
                        }
                        const id = rec.save({ enableSourcing: false, ignoreMandatoryFields: false });
                        createdIds.push(id);
                    });

                    log.debug('createEmployeeWiseRecovery createdIds', createdIds);
                    return { status: 'SUCCESS', reason: 'Employee wise recovery records created', data: createdIds };
                } catch (error) {
                    log.error('error @ createEmployeeWiseRecovery', error);
                    return { status: 'ERROR', reason: error.message, data: [] };
                }
            },

            /**
             * Handles request to fetch bag lot summary and grouped data
             *
             * @function getBagLotSummary
             * @returns {{
             *   status: 'SUCCESS' | 'ERROR',
             *   reason: string,
             *   data: { summary: Object, grouped: Object } | {}
             * }}
             */
            getBagLotSummary() {
                try {
                    // Extract request body
                    const requestBody = rootContext.body || {};
                    log.debug('getBagLotSummary requestBody', requestBody);

                    // Ensure serialIds is always an array
                    const serialIds = Array.isArray(requestBody.serialIds) ? requestBody.serialIds : [];

                    // Validate input
                    if (!serialIds.length) {
                        return { status: 'ERROR', reason: 'No serialIds provided', data: {} };
                    }

                    // Call model function
                    const bagLotSummary = cm_model.getBagLotSummary(serialIds) || { summary: {}, grouped: {} };
                    log.debug('getBagLotSummary result', bagLotSummary);
                    return { status: 'SUCCESS', reason: 'Bag lot summary fetched successfully', data: bagLotSummary };
                } catch (error) {
                    log.error('Error getBagLotSummary', error);
                    return { status: 'ERROR', reason: error.message || 'Unexpected error occurred', data: {} };
                }
            },

            /**
             * Lists customers using the cm_model.getCustomerDetails method.
             *
             * @returns {Object} Response object with status, reason, and data.
             */
            listCustomers() {
                let customerList = cm_model.getCustomerDetails();
                // log.debug("customerList", customerList);

                // Check if the customerList is valid and contains elements
                if (customerList && customerList.length) {
                    // If work orders are found, return a success response object
                    return {
                        status: "SUCCESS",
                        reason: "CUSTOMER_LISTED",
                        data: customerList,
                    };
                }

                // If the list is invalid or empty, return an error response object
                return {
                    status: "ERROR",
                    // Use the jj_cm_ns_utility to determine if there was a specific error; otherwise, state no work orders were found
                    reason: jj_cm_ns_utility.ERROR_STACK.length ? "ERROR" : "NO_CUSTOMER_FOUND",
                    data: null,
                };
            },
        }
        jj_cm_ns_utility.applyTryCatch(apiMethods, 'apiMethods');
        const rootContext = {
            scriptContext: null,
            method: null,
            header: null,
            parameters: null,
            body: null,
            /**
             * @description To initialize the export Object with the Suitelet methods and parameters and body
             * @param {Object} scriptContext
            */
            init(scriptContext) {
                this.scriptContext = scriptContext;
                this.method = scriptContext.request.method;
                this.headers = scriptContext.request.headers;
                this.parameters = scriptContext.request.parameters;
                this.body = scriptContext.request.body;
                this.parseJSON();
            },
            parseJSON() {
                try {
                    log.debug('parseJSON - Raw body', {
                        body: this.body,
                        type: typeof this.body,
                        length: this.body ? this.body.length : 0
                    });

                    if (this.body && this.body.trim() !== '') {
                        this.body = JSON.parse(this.body);
                        log.debug('parseJSON - Parsed successfully', this.body);
                    } else {
                        log.debug('parseJSON - Empty body, setting to empty object');
                        this.body = {};
                    }
                }
                catch (err) {
                    log.error('parseJSON - Parse error', err);
                    this.body = {};
                }
            },
            /**
            * @description To route request based on API Type
            */
            routeRequest() {
                // DEBUG: Log all parameters and apiType
                // log.debug("DEBUG: Full parameters object", this.parameters);
                // log.debug("DEBUG: apiType value", this.parameters.apiType);
                // log.debug("DEBUG: apiType type", typeof this.parameters.apiType);
                if (this.method == "OPTIONS") {
                    return { status: 'SUCCESS', reason: 'OPTIONS request - no action taken', data: null };
                }

                // log.debug("this.parameters.apiType", this.parameters.apiType);
                if (jj_cm_ns_utility.checkForParameter(this.parameters.apiType)) {
                    switch (this.parameters.apiType) {
                        // case "loadPage":
                        //     return "";
                        case "listDepartments":
                            return apiMethods.listDepartments();
                        case "listActiveBags":
                            return apiMethods.listActiveBags();
                        case "listBagComponents":
                            return apiMethods.listBagComponents();
                        case "getBagAssemblyQualityColor":
                            return apiMethods.getBagAssemblyQualityColor();
                        case "getUniqueQualitiesAndColors":
                            return apiMethods.getUniqueQualitiesAndColors();
                        case "listBagToMove":
                            return apiMethods.listBagToMove();
                        case "listBagMovementDetails":
                            return apiMethods.listBagMovementDetails();
                        case "listSpecificMaterialDetails":
                            return apiMethods.listSpecificMaterialDetails();
                        case "listRejectedBags":
                            return apiMethods.listRejectedBags();
                        case "listItemInventoryDetails":
                            return apiMethods.listItemInventoryDetails();
                        case "listOverdueBags":
                            return apiMethods.listOverdueBags();
                        case "getTotalMaterialWeights":
                            return apiMethods.getTotalMaterialWeights();
                        case "watchOrder":
                            return apiMethods.watchOrder();
                        case "createInventoryAdjustment":
                            return apiMethods.createInventoryAdjustment();
                        case "listInventoryForBinTransfer":
                            return apiMethods.listInventoryForBinTransfer();
                        case "createBinTransfer":
                            return apiMethods.createBinTransfer();
                        case "listComponentsInBinTransfer":
                            return apiMethods.listComponentsInBinTransfer();
                        case "createInventoryTransfer":
                            return apiMethods.createInventoryTransfer();
                        case "transformToItemReceipt":
                            log.debug("✓ MATCHED CASE: transformToItemReceipt - NOW CALLING FUNCTION");
                            return apiMethods.transformToItemReceipt();
                        case "listBinsForLocation":
                            log.debug("✓ MATCHED CASE: listBinsForLocation - NOW CALLING FUNCTION");
                            return apiMethods.listBinsForLocation();
                        case "listToBinsForBinTransfer":
                            return apiMethods.listToBinsForBinTransfer();
                        case "refreshItemCache":
                            return apiMethods.refreshItemCache();
                        case "listMetal":
                            return apiMethods.listMetal();
                        case "listAssemblyItems":
                            return apiMethods.listAssemblyItems();
                        case "listSerialTypes":
                            return apiMethods.listSerialTypes();
                        case "listDeptIssues":
                            return apiMethods.listDeptIssues();
                        case "listSerialLots":
                            return apiMethods.listSerialLots();
                        case "listBuildComponents":
                            return apiMethods.listBuildComponents();
                        case "listComponentsForSerial":
                            return apiMethods.listComponentsForSerial();
                        case "createCustomBuildFGSerials":
                            return apiMethods.createCustomBuildFGSerials();
                        case "listBomAndRevisionDetails":
                            return apiMethods.listBomAndRevisionDetails();
                        case "listRevisionComponents":
                            return apiMethods.listRevisionComponents();
                        case "listLocations":
                            return apiMethods.listLocations();
                        case "listItemCache":
                            return apiMethods.listItemCache();
                        case "getSpecificMaterialForFG":
                            return apiMethods.getSpecificMaterialForFG();
                        case "listEfficiencyAnalysis":
                            return apiMethods.listEfficiencyAnalysis();
                        case "createCustomFGSerials":
                            return apiMethods.createCustomFGSerials();
                        case "createGoldLossWriteOff":
                            return apiMethods.createGoldLossWriteOff();
                        case "listEmployees":
                            return apiMethods.listEmployees();
                        case "listInventoryAdjustments":
                            return apiMethods.listInventoryAdjustments();
                        case "getCurrentGoldRate":
                            return apiMethods.getCurrentGoldRate();
                        case "listFGSerialForLocationTransfer":
                            return apiMethods.listFGSerialForLocationTransfer();
                        case "getSerialLocationFromInventoryBalance":
                            log.debug("✓ MATCHED CASE: getSerialLocationFromInventoryBalance - NOW CALLING FUNCTION");
                            return apiMethods.getSerialLocationFromInventoryBalance();
                        case "getFGSerialComponentsBySerialId":
                            log.debug("✓ MATCHED CASE: getFGSerialComponentsBySerialId - NOW CALLING FUNCTION");
                            return apiMethods.getFGSerialComponentsBySerialId();
                        case "getFGSerialComponentsNested":
                            log.debug("✓ MATCHED CASE: getFGSerialComponentsNested - NOW CALLING FUNCTION");
                            return apiMethods.getFGSerialComponentsBySerialId();
                        case "getManufacturingDepartmentsForDirectRepair":
                            log.debug("✓ MATCHED CASE: getManufacturingDepartmentsForDirectRepair - NOW CALLING FUNCTION");
                            return apiMethods.getManufacturingDepartmentsForDirectRepair();
                        case "getInventoryStatuses":
                            log.debug("✓ MATCHED CASE: getInventoryStatuses - NOW CALLING FUNCTION");
                            return apiMethods.getInventoryStatuses();
                        case "getAvailableLocationsForDirectRepair":
                            log.debug("✓ MATCHED CASE: getAvailableLocationsForDirectRepair - NOW CALLING FUNCTION");
                            return apiMethods.getAvailableLocationsForDirectRepair();
                        case "listFGSerialsByLocationForDirectRepair":
                            log.debug("✓ MATCHED CASE: listFGSerialsByLocationForDirectRepair - NOW CALLING FUNCTION");
                            return apiMethods.listFGSerialsByLocationForDirectRepair();
                        case "getAssemblyUnbuildDetails":
                            log.debug("✓ MATCHED CASE: getAssemblyUnbuildDetails - NOW CALLING FUNCTION");
                            return apiMethods.getAssemblyUnbuildDetails();
                        case "listStatuses":
                            return apiMethods.listStatuses();
                        case "listAllBagsData":
                            return apiMethods.listAllBagsData();
                        case "getDepartmentEmployeesMap":
                            return apiMethods.getDepartmentEmployeesMap();
                        case "lossOutsourcedItemStatusChange":
                            return apiMethods.lossOutsourcedItemStatusChange();
                        case "getAlloyAvgCost":
                            return apiMethods.getAlloyAvgCost();
                        // case "getTransferOrders":
                        //     return apiMethods.getTransferOrders();
                        case "getTransferOrderSerials":
                            return apiMethods.getTransferOrderSerials();
                        case "getBinTransferSerials":
                            return apiMethods.getBinTransferSerials();
                        case "getInvStatusChangeSerials":
                            return apiMethods.getInvStatusChangeSerials();
                        case "createAssemblyUnbuild":
                            log.debug("✓ MATCHED CASE: createAssemblyUnbuild - NOW CALLING FUNCTION");
                            return apiMethods.createAssemblyUnbuild();
                        case "aggregateEmployeeLossData":
                            return apiMethods.aggregateEmployeeLossData();
                        case "getLossTransactions":
                            return apiMethods.getLossTransactions();
                        case "createEmployeeWiseRecovery":
                            return apiMethods.createEmployeeWiseRecovery();
                        case "getEmployeeWiseRecoveryByTransaction":
                            return apiMethods.getEmployeeWiseRecoveryByTransaction();
                        case "getRecoveryDataByDeptAndDateRange":
                            return apiMethods.getRecoveryDataByDeptAndDateRange();
                        case "incrementRecoveredPureQty":
                            return apiMethods.incrementRecoveredPureQty();
                        case "getBagLotSummary":
                            return apiMethods.getBagLotSummary();
                        case "listCustomers":
                            return apiMethods.listCustomers();
                        default:
                            log.debug("✗ NO MATCH FOUND - DEFAULT CASE HIT", {
                                receivedApiType: this.parameters.apiType,
                                apiTypeLength: this.parameters.apiType ? this.parameters.apiType.length : 0,
                                expectedApiType: "getSerialLocationFromInventoryBalance",
                                match: this.parameters.apiType === "getSerialLocationFromInventoryBalance"
                            });
                            return { status: 'ERROR', reason: 'INVALID_APITYPE', data: null };
                    }
                }
            },
            /* @description Structures and sens the response. All response will be send from this common point
            * @param STATUS - It will be either Success or error
            * @param REASON - Reason Code
            * @param DATA - Data to be passed if any
            * @returns {boolean}
            */
            sendResponse(responseObj) {
                log.debug('responseObj', responseObj)
                let returnVal;
                const wrapInEscapedBody = (data) => {
                    return encodeURIComponent(JSON.stringify(data));
                };
                const unwrapInEscapedBody = (data) => {
                    return JSON.parse(decodeURIComponent(data));
                };
                log.debug('this.method', this.method);
                // if (this.method === 'GET') {
                //     let filePath = '../Views/FrontEndSPA/index.html';// 173013
                //     let fileObj = file.load({ id: filePath });
                //     if (fileObj) {
                //         let fileContent = fileObj.getContents();
                //         // log.debug('fileContent', fileContent)
                //         this.scriptContext.response.headers['Content-Type'] = 'text/html';

                //         return this.scriptContext.response.write(fileContent);
                //     } else {
                //         return this.scriptContext.response.write('HTML file not found');
                //     }
                // }
                if (this.method === 'POST') {
                    returnVal = {
                        status: responseObj.status,
                        reason: responseObj.reason,
                        data: wrapInEscapedBody(responseObj.data)
                    }
                    // Include fgSerialDetails if present (for getFGSerialComponentsBySerialId)
                    if (responseObj.fgSerialDetails) {
                        returnVal.fgSerialDetails = wrapInEscapedBody(responseObj.fgSerialDetails);
                    }
                    // Include componentInventoryTracking if present (for getFGSerialComponentsBySerialId)
                    if (responseObj.componentInventoryTracking) {
                        returnVal.componentInventoryTracking = wrapInEscapedBody(responseObj.componentInventoryTracking);
                    }
                    log.debug('returnVal', returnVal);
                    return this.scriptContext.response.write(`${JSON.stringify(returnVal)}`, true)
                }
                return this.scriptContext.response.write(`Invalid method: ${this.method}`, true)
            }
        }
        jj_cm_ns_utility.applyTryCatch(rootContext, 'rootContext');
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            rootContext.init(scriptContext);
            return rootContext.sendResponse(rootContext.routeRequest() || {
                status: 'ERROR',
                reason: 'UNHANDLED_ERROR',
                data: null
            })
        }
        return { onRequest }
    });