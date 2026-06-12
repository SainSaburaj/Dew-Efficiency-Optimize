<template>
    <!-- No Data Popup Modal -->
    <div v-if="showNoDataPopup"
        class="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 backdrop-blur-sm z-50 transition-opacity duration-300">
        <div class="bg-white p-8 rounded-xl shadow-2xl transform scale-95 transition-transform duration-300 ease-out">
            <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-4 flex justify-center items-center bg-red-100 rounded-full">
                    <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" stroke-width="2"
                        viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M18.364 18.364A9 9 0 115.636 5.636a9 9 0 0112.728 12.728z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 9l-6 6m0-6l6 6"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-gray-800">No Data Available</h2>
                <p class="text-gray-500 mt-2">Sorry, we couldn't find any data matching your criteria.</p>
                <button @click="closeNoDataPopup"
                    class="mt-6 px-6 py-3 bg-gray-500 text-white rounded-lg shadow-md hover:bg-gray-600 transition duration-200 transform hover:scale-105">
                    Close
                </button>
            </div>
        </div>
    </div>

    <div v-if="isInitialLoading || loading" class="flex justify-center items-center h-screen">
        <div class="animate-spin rounded-full h-10 w-10 border-t-4 border-gray-500"></div>
    </div>

    <div v-else class="flex h-screen overflow-hidden">
        <!-- Sidebar -->
        <aside
            class="w-64 bg-gradient-to-b text-white flex flex-col shadow-lg h-screen sticky top-0 flex-shrink-0 overflow-y-auto scrollbar-hidden">
            <!-- Sidebar Header -->
            <div class="p-5 text-lg font-bold flex items-center space-x-2 text-gray-800">
                <i class="fas fa-map-marker-alt text-gray-800"></i>
                <span>LOCATION</span>
            </div>

            <nav class="flex-1 overflow-auto scrollbar-hidden">
                <div v-for="(location, index) in locations" :key="index">
                    <button @click="toggleLocationView(location.internalid.value)" class="flex justify-between items-center py-3 px-5 w-full text-sm font-semibold transition-all 
                         hover:bg-gray-100 hover:text-white hover:scale-105 focus:outline-none"
                        :class="{ 'bg-gray-730 text-white': expandedLocation === location.internalid.value }">


                        <div class="flex items-center space-x-2 text-gray-800">
                            <i class="fas fa-building text-gray-800 "></i>
                            <span>{{ formatName(location.name.value) }}</span>
                        </div>
                        <i
                            :class="expandedLocation === location.internalid.value ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
                    </button>

                    <ul v-if="expandedLocation === location.internalid.value"
                        class="ml-5 text-gray-500 transition-all text-[12px]">
                        <li v-for="(dept, dIndex) in location.departments" :key="dIndex">
                            <div @click="toggleDepartmentView(dept.name)" class="flex justify-between items-center py-2 px-4 hover:bg-gray-650 hover:text-white hover:scale-105 
                                 cursor-pointer transition-all rounded-md text-[12px]"
                                :class="{ 'bg-gray-400 text-white': expandedDepartment === dept.name }">

                                <div class="flex items-center space-x-2 text-gray-800">
                                    <i class="fa fa-archive"></i>
                                    <span>{{ formatName(dept.name) }}</span>
                                </div>
                                <i
                                    :class="expandedDepartment === dept.name ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
                            </div>

                            <ul v-if="expandedDepartment === dept.name"
                                class="ml-6 text-gray-400 transition-all text-[12px] text-gray-800">
                                <li v-for="(emp, eIndex) in dept.employees" :key="eIndex" class="py-1 px-5 hover:bg-gray-800 hover:text-white hover:scale-105 cursor-pointer 
                                      flex items-center space-x-2 transition-all text-[12px] rounded-md">
                                    <i class="fa fa-user"></i>
                                    <span>{{ formatName(emp.name) }}</span>
                                </li>

                            </ul>
                        </li>
                    </ul>

                </div>
            </nav>

        </aside>

        <!-- Main Content -->
        <main class="flex-1 p-4 overflow-auto scrollbar-hidden min-h-screen">
            <!-- Header Section -->
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold">{{ dashboardTitle }}</h1>

                <div class="flex items-center space-x-4">
                    <!-- Legend (Separate Line) -->
                    <div class="flex items-center space-x-6 text-gray-600 text-sm mb-2">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-arrow-up text-green-500"></i>
                            <span>Production</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-arrow-down text-red-500"></i>
                            <span>Loss</span>
                        </div>
                    </div>


                    <!-- Standardized Date Filter -->
                    <div>
                        <VueDatePicker v-model="selectedDateRange" range :enable-time-picker="false"
                            :format="'MM/dd/yyyy'" :auto-apply="true" placeholder="Select date range"
                            menu-class-name="custom-date-picker"
                            class="custom-datepicker flex-1 text-gray-700 cursor-pointer" />
                    </div>

                    <!---- Download Button-->
                    <button
                        @click="downloadData"
                        class="group"
                    >
                        <div class="flex items-center border border-green-600 rounded-full overflow-hidden transition-all duration-300 h-8 w-8 group-hover:w-auto group-hover:px-3">
                            <!-- Icon -->
                            <div class="min-w-8 h-8 flex items-center justify-center">
                                <i class="fa fa-download text-green-600 text-sm mr-1"></i>
                            </div>

                            <!-- Text -->
                            <span class="text-green-600 text-sm whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 mr-2">Export</span>
                        </div>
                    </button>
                </div>
            </div>


            <!-- Loading Spinner -->
            <div v-if="loading" class="flex justify-center items-center">
                <div class="animate-spin rounded-full h-10 w-10 border-t-4 border-gray-500"></div>
            </div>
            <div class="main-card-grid grid grid-cols-5 gap-2">

                <!-- Locations Section -->
                <div v-if="!loading && !showDepartments && !showEmployees" v-for="(location, index) in locations"
                    :key="index" @click="toggleLocationView(location.internalid.value)"
                    class="flex shadow-lg rounded-lg hover:shadow-sm hover:-translate-y-1 transition-all cursor-pointer p-1 items-center w-full bg-gray-200">

                    <!-- Left Icon Section -->
                    <div class="flex items-center justify-center w-10 h-full bg-gray-200">
                        <i class="fas fa-map-marker-alt text-gray-600 text-sm"></i>
                    </div>

                    <!-- Right Content Section -->
                    <div class="flex-1 pl-2 pr-2 py-2 bg-white rounded-r-lg border-2 border-white shadow-md">
                        <p class="text-xs font-semibold text-gray-700">{{ location.name.value }}</p>

                        <!-- Bag Count -->
                        <div class="bg-blue-50 p-1 rounded mb-2 text-center">
                            <p class="text-[10px] font-semibold text-gray-700">No. of Bags: <span class="text-blue-600">{{ getLocationTotalBagCount(location) || 0 }}</span></p>
                        </div>

                        <div class="text-[11px] font-semibold w-full text-center bg-gray-100 rounded p-1 mb-1">Issued & Loss Quantity</div>

                        <div class="grid grid-cols-2 gap-y-0.5">
                            <!-- Gold Section -->
                            <div class="flex flex-col text-left">
                                <div class="flex items-center space-x-0.5">
                                    <i class="fas fa-ring text-gray-500 text-[9px]"></i>
                                    <span class="font-semibold text-gray-600 text-[11px]">Gold</span>
                                </div>
                                <span class="text-gray-700 text-[11px]">grams</span>
                                <div class="flex items-center space-x-0.5">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalIssuedQtyGold(location) || 0) }}</p>
                                </div>
                                <div class="flex items-center space-x-0.5">
                                    <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                    <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalLossQtyGold(location) || 0) }}</p>
                                </div>
                            </div>

                            <!-- Diamond Section -->
                            <div class="flex flex-col">
                                <div class="flex items-center space-x-0.5">
                                    <i class="fas fa-gem text-gray-500 text-[9px]"></i>
                                    <span class="font-semibold text-gray-600 text-[11px]">Diamond</span>
                                </div>
                                <div class="grid grid-cols-2 gap-x-1">
                                    <div class="flex flex-col items-center">
                                        <span class="text-gray-700 text-[11px]">carat</span>
                                        <div class="flex items-center space-x-0.5">
                                            <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                            <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalIssuedQtyDiamond(location) || 0) }}</p>
                                        </div>
                                        <div class="flex items-center space-x-0.5">
                                            <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                            <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalLossQtyDiamond(location) || 0) }}</p>
                                        </div>
                                    </div>
                                    <div class="flex flex-col items-right">
                                        <span class="text-gray-700 text-[11px]">pieces</span>
                                        <div class="flex items-center space-x-0.5">
                                            <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                            <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalIssuedPiecesDiamond(location) || 0) }}</p>
                                        </div>
                                        <div class="flex items-center space-x-0.5">
                                            <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                            <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalLossPiecesDiamond(location) || 0) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-[11px] font-semibold w-full text-center bg-gray-100 rounded p-1 mb-1 mt-1">
                            Received Quantities</div>
                        <!-- Received Quantities Section -->
                        <div class="grid grid-cols-2 gap-y-1">
                            <!-- Actual Gold Section -->
                            <div class="flex flex-col text-left">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-ring text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Gold</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalActualProductionGold(location) || 0) }}</p>
                                </div>
                            </div>

                            <!-- Actual Diamond Section -->
                            <div class="flex flex-col">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-gem text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Diamond</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getLocationTotalActualProductionDiamond(location) || 0) }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Departments Section -->
                <div v-if="!loading && showDepartments && !showEmployees" v-for="(dept, index) in selectedDepartments"
                    :key="index" @click="toggleDepartmentView(dept.name)"
                    class="flex shadow-lg rounded-lg hover:shadow-sm hover:-translate-y-1 transition-all cursor-pointer p-1 items-center w-full bg-gray-200">

                    <!-- Left Icon Section -->
                    <div class="flex items-center justify-center w-10 h-full bg-gray-200">
                        <i class="fa fa-archive text-gray-600 text-sm"></i>
                    </div>

                    <!-- Right Content Section -->
                    <div class="flex-1 pl-2 pr-2 py-2 bg-white rounded-r-lg border-2 border-white shadow-md">
                        <p class="text-sm font-semibold text-gray-700 mb-2">{{ dept.name }}</p>

                        <!-- Bag Count -->
                        <div class="bg-blue-50 p-1 rounded mb-2 text-center">
                            <p class="text-[10px] font-semibold text-gray-700">No. of Bags: <span class="text-blue-600">{{ dept.bag_count || 0 }}</span></p>
                        </div>

                        <div class="text-[11px] font-semibold w-full text-center bg-gray-100 rounded p-1 mb-1">Issued &
                            Loss Quantity</div>

                        <div class="grid grid-cols-2 mt-1 gap-y-1">
                            <!-- Gold Section -->
                            <div class="flex flex-col text-left">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-ring text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Gold</span>
                                </div>
                                <span class="text-[11px] text-gray-700 mt-1">grams</span>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).issuedNetWt) }}</p>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                    <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).lG) }}</p>
                                </div>
                            </div>

                            <!-- Diamond Section -->
                            <div class="flex flex-col">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-gem text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Diamond</span>
                                </div>
                                <div class="grid grid-cols-2 gap-x-2 mt-1">
                                    <!-- Diamond Carat Section -->
                                    <div class="flex flex-col items-center">
                                        <span class="text-[11px] text-gray-700">carat</span>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                            <p class="text-green-500 text-[10px]">{{
                                                roundToTwoAlways(getSummaryDeptTotals(dept).issuedNetWtDiamond) }}</p>
                                        </div>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                            <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).lD) }}</p>
                                        </div>
                                    </div>

                                    <!-- Diamond Pieces Section -->
                                    <div class="flex flex-col items-right">
                                        <span class="text-[11px] text-gray-700">pieces</span>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                            <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).receivedPieces)
                                                }}</p>
                                        </div>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                            <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).lossPieces) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-[11px] font-semibold w-full text-center bg-gray-100 rounded p-1 mb-1 mt-1">
                            Received Quantities</div>

                        <!-- Received Quantities Section -->
                        <div class="grid grid-cols-2 gap-y-1">
                            <!-- Actual Gold Section -->
                            <div class="flex flex-col text-left">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-ring text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Gold</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).recvG) }}</p>
                                </div>
                            </div>

                            <!-- Actual Diamond Section -->
                            <div class="flex flex-col">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-gem text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Diamond</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getSummaryDeptTotals(dept).aD) }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Employees Section -->
                <div v-if="!loading && showEmployees" v-for="(emp, index) in selectedEmployees" :key="index"
                    class="flex shadow-lg rounded-lg hover:shadow-sm hover:-translate-y-1 transition-all cursor-pointer p-1 items-center w-full bg-gray-200">

                    <!-- Left Icon Section -->
                    <div class="flex items-center justify-center w-10 h-full bg-gray-200">
                        <i class="fas fa-user text-gray-600 text-sm"></i>
                    </div>

                    <!-- Right Content Section -->
                    <div class="flex-1 pl-2 pr-2 py-2 bg-white rounded-r-lg border-2 border-white shadow-md">
                        <p class="text-sm font-semibold text-gray-700">{{ emp.name }}</p>

                        <!-- Bag Count -->
                        <div class="bg-blue-50 p-1 rounded mb-2 text-center">
                            <p class="text-[10px] font-semibold text-gray-700">No. of Bags: <span class="text-blue-600">{{ emp.bag_count || 0 }}</span></p>
                        </div>

                        <div class="text-[11px] font-semibold w-full text-center bg-gray-100 rounded p-1 mb-1">Issued &
                            Loss Quantity</div>

                        <div class="grid grid-cols-2 mt-1 gap-y-1">
                            <!-- Gold Section -->
                            <div class="flex flex-col text-left">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-ring text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Gold</span>
                                </div>
                                <span class="text-[11px] text-gray-700 mt-1">grams</span>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getEmployeeTotalIssuedQtyGold(emp) ||
                                        0) }}</p>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                    <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getEmployeeTotalLossQtyGold(emp) ||
                                        0) }}</p>
                                </div>
                            </div>

                            <!-- Diamond Section -->
                            <div class="flex flex-col">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-gem text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Diamond</span>
                                </div>
                                <div class="grid grid-cols-2 gap-x-2 mt-1">
                                    <!-- Diamond Carat Section -->
                                    <div class="flex flex-col items-center">
                                        <span class="text-[11px] text-gray-700">carat</span>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                            <p class="text-green-500 text-[10px]">{{
                                                roundToTwoAlways(getEmployeeTotalIssuedQtyDiamond(emp) || 0) }}</p>
                                        </div>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                            <p class="text-red-500 text-[10px]">{{ roundToTwoAlways(getEmployeeTotalLossQtyDiamond(emp)
                                                || 0) }}</p>
                                        </div>
                                    </div>

                                    <!-- Diamond Pieces Section -->
                                    <div class="flex flex-col items-right">
                                        <span class="text-[11px] text-gray-700">pieces</span>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                            <p class="text-green-500 text-[10px]">{{
                                                roundToTwoAlways(getEmployeeTotalIssuedPiecesDiamond(emp) || 0) }}</p>
                                        </div>
                                        <div class="flex items-center space-x-1">
                                            <i class="fas fa-arrow-down text-red-500 text-[9px]"></i>
                                            <p class="text-red-500 text-[10px]">{{
                                                roundToTwoAlways(getEmployeeTotalLossPiecesDiamond(emp) || 0) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-[11px] font-semibold w-full text-center bg-gray-100 rounded p-1 mb-1 mt-1">
                            Received Quantities</div>

                        <!-- Actual Production Section -->
                        <div class="grid grid-cols-2 gap-y-1">
                            <!-- Actual Gold Section -->
                            <div class="flex flex-col text-left">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-ring text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Gold</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{ roundToTwoAlways(getEmployeeTotalActualProductionGold(emp)
                                        || 0) }}</p>
                                </div>
                            </div>

                            <!-- Actual Diamond Section -->
                            <div class="flex flex-col">
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-gem text-gray-500 text-[9px]"></i>
                                    <span class="text-[11px] font-semibold text-gray-600">Diamond</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <i class="fas fa-arrow-up text-green-500 text-[9px]"></i>
                                    <p class="text-green-500 text-[10px]">{{
                                        roundToTwoAlways(getEmployeeTotalActualProductionDiamond(emp) || 0) }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Table Section -->
            <div v-if="showTable" class="bg-white p-3 rounded-lg shadow mt-4">
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-md font-bold text-gray-700">
                        {{ showEmployeesTable ? 'Employee Details' : 'Department Details' }}
                    </h2>
                    <div class="flex items-center space-x-2">
                        <button 
                            @click="decimalPlaces = 2"
                            :class="[
                                'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                decimalPlaces === 2 
                                    ? 'border-2 border-blue-500 bg-blue-100 text-blue-500 hover:shadow-lg' 
                                    : 'border-2 border-gray-200 bg-gray-100 text-gray-500 hover:shadow-lg'
                            ]"
                        >
                            Round to 2
                        </button>
                        <button 
                            @click="decimalPlaces = 3"
                            :class="[
                                'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                decimalPlaces === 3 
                                    ? 'border-2 border-blue-500 bg-blue-100 text-blue-500 hover:shadow-lg' 
                                    : 'border-2 border-gray-200 bg-gray-100 text-gray-500 hover:shadow-lg'
                            ]"
                        >
                            Round to 3
                        </button>
                        <button 
                            @click="decimalPlaces = 4"
                            :class="[
                                'px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                                decimalPlaces === 4 
                                    ? 'border-2 border-blue-500 bg-blue-100 text-blue-500 hover:shadow-lg' 
                                    : 'border-2 border-gray-200 bg-gray-100 text-gray-500 hover:shadow-lg'
                            ]"
                        >
                            Round to 4
                        </button>
                    </div>
                </div>
                <div class="table-container overflow-x-auto overflow-y-auto max-h-[45rem] scrollbar-custom">
                    <table class="w-full border-collapse border border-gray-200 text-[10px]"> <!-- Reduced text size -->
                        <thead class="bg-gray-100 text-gray-600 uppercase text-[11px]"
                            style="position: sticky; top: 0; z-index: 10;">
                            <tr>
                                <th class="px-3 py-2 text-left font-semibold">#</th>
                                <th class="px-3 py-2 text-left font-semibold">
                                    {{ showEmployeesTable ? 'Employees' : 'Department' }}
                                </th>
                                <th class="px-3 py-2 text-left font-semibold">No. of Bags</th>
                                <!-- Hidden columns (kept in Excel export) -->
                                <!-- <th class="px-3 py-2 text-left font-semibold">Item category</th> -->
                                <!-- <th class="px-3 py-2 text-left font-semibold">Sub Category</th> -->
                                <!-- <th class="px-3 py-2 text-left font-semibold">Bag Count</th> -->
                                <!-- <th class="px-3 py-2 text-left font-semibold">Style Number</th> -->
                                <!-- <th class="px-3 py-2 text-left font-semibold">Bag Name</th> -->

                                <th class="px-3 py-2 text-left font-semibold">Issued Net Weight Gold</th>
                                <th class="px-3 py-2 text-left font-semibold">Received Quantity Gold</th>
                                <th class="px-3 py-2 text-left font-semibold">Gross Loss</th>
                                <th class="px-3 py-2 text-left font-semibold">Gross Loss %</th>
                                <!-- <th class="px-3 py-2 text-left font-semibold">Purity %</th> -->

                                <th class="px-3 py-2 text-left font-semibold">Pure Weight</th>
                                <th class="px-3 py-2 text-left font-semibold">Pure Loss</th>

                                <th class="px-3 py-2 text-left font-semibold">Net Loss</th>
                                <th class="px-3 py-2 text-left font-semibold">Net Loss %</th>

                                <th class="px-3 py-2 text-left font-semibold">Issued Net Weight Diamond</th>
                                <th class="px-3 py-2 text-left font-semibold">Received Quantity Diamond</th>
                                <th class="px-3 py-2 text-left font-semibold">Loss Qty Diamond</th>
                                <th class="px-3 py-2 text-left font-semibold">Diamond Loss %</th>
                                <th class="px-3 py-2 text-left font-semibold">Received Pieces</th>
                                <th class="px-3 py-2 text-left font-semibold">Loss Pieces</th>

                                <th class="px-3 py-2 text-left font-semibold">Gold Recovery Weight (gm)</th>
                                <th class="px-3 py-2 text-left font-semibold">Gold Recovery Percentage</th>
                            </tr>
                        </thead>

                        <tbody class="text-gray-700">
                            <!-- Department Details without Categories -->
                            <template v-if="!showEmployeesTable" v-for="(dept, deptIndex) in selectedDepartmentData"
                                :key="'dept-' + deptIndex">
                                <!-- Department Total Row -->
                                <tr class="bg-blue-50 font-bold border-b-8 border-b-gray-200 text-[11px] ">
                                    <td class="px-3 py-2 text-center font-normal">{{ deptIndex + 1 }}</td>
                                    <td class="px-3 py-2 text-center">{{ dept.name }}</td>
                                    <td class="px-3 py-2 text-center bg-blue-100">{{ dept.bag_count || 0 }}</td>
                                    <!-- Hidden columns colspan removed -->
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryDeptTotals(dept).issuedNetWt) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryDeptTotals(dept).recvG) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryDeptTotals(dept).lG) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getSummaryDeptTotals(dept).grossLossPct }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryDeptTotals(dept).pw) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryDeptTotals(dept).pl) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryDeptTotals(dept).netLoss) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getSummaryDeptTotals(dept).netLossPct }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryDeptTotals(dept).issuedNetWtDiamond) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryDeptTotals(dept).aD) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryDeptTotals(dept).lD) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getSummaryDeptTotals(dept).diamondLossPct }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryDeptTotals(dept).receivedPieces) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryDeptTotals(dept).lossPieces) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo((() => { const pl = getSummaryDeptTotals(dept).pl; const pct = getDeptRecoveryPercentage(dept); return pl > 0 && pct > 0 ? pl * (pct / 100) : 0; })()) }}</td>
                                    <td class="px-3 py-2">{{ getDeptRecoveryPercentage(dept) > 0 ? roundToTwo(getDeptRecoveryPercentage(dept)) + '%' : '0%' }}</td>
                                </tr>
                            </template>

                            <!-- Total Row for Departments -->
                            <tr v-if="!showEmployeesTable" class="bg-gray-100 font-bold border-t text-[11px]">
                                <td class="px-3 py-2" colspan="2" style="text-align: center;">Total</td>

                                <!-- Total No. of Bags -->
                                <td class="px-3 py-2 font-semibold text-center bg-blue-50">{{ totalDeptBagCount }}</td>

                                <!-- Issued Net Weight -->
                                <td class="px-3 py-2">{{ totalDeptIssuedNetWeightGold }}</td>

                                <!-- Received Quantity -->
                                <td class="px-3 py-2">{{ totalDeptReceivedQtyGold }}</td>

                                <!-- Gross Loss -->
                                <td class="px-3 py-2 text-red-500">{{ totalDeptLossQtyGold }}</td>

                                <!-- Gross Loss % -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalDeptReceivedQtyGold) > 0 ?
                                    roundToTwo((parseFloat(totalDeptLossQtyGold) / parseFloat(totalDeptReceivedQtyGold))
                                    * 100) + '%' : '0.00%' }}
                                </td>

                                <!-- Pure Weight -->
                                <td class="px-3 py-2">{{ totalDeptPureWeight }}</td>

                                <!-- Pure Loss -->
                                <td class="px-3 py-2 text-red-500">{{ totalDeptPureLoss }}</td>

                                <!-- Net Loss -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalDeptReceivedQtyGold) > 0 ?
                                    roundToTwo(parseFloat(totalDeptLossQtyGold) / parseFloat(totalDeptReceivedQtyGold))
                                    : '0.00' }}</td>

                                <!-- Net Loss % -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalDeptReceivedQtyGold) > 0 ?
                                    roundToTwo((parseFloat(totalDeptLossQtyGold) / parseFloat(totalDeptReceivedQtyGold))
                                    * 100) + '%' : '0.00%' }}
                                </td>

                                <!-- Issued Net Weight Diamond -->
                                <td class="px-3 py-2">{{ totalDeptIssuedNetWeightDiamond }}</td>

                                <!-- Received Quantity Diamond -->
                                <td class="px-3 py-2">{{ totalDeptReceivedQtyDiamond }}</td>

                                <!-- Loss Qty Diamond -->
                                <td class="px-3 py-2 text-red-500">{{ totalDeptLossQtyDiamond }}</td>

                                <!-- Diamond Loss % -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalDeptReceivedQtyDiamond) > 0 ?
                                    roundToTwo((parseFloat(totalDeptLossQtyDiamond) /
                                    parseFloat(totalDeptReceivedQtyDiamond)) * 100) + '%' :
                                    '0.00%' }}</td>

                                <!-- Received Pieces Total -->
                                <td class="px-3 py-2">{{ totalDeptReceivedPieces }}</td>

                                <!-- Loss Pieces Total -->
                                <td class="px-3 py-2 text-red-500">{{ totalDeptLossPieces }}</td>

                                <!-- Gold Recovery Weight -->
                                <td class="px-3 py-2">{{ roundToTwo((() => { let totalRecoveryWt = 0; selectedDepartmentData.forEach(dept => { const pct = getDeptRecoveryPercentage(dept); const deptPl = parseFloat(dept.pure_loss_gold || 0); if (pct > 0 && deptPl > 0) totalRecoveryWt += deptPl * (pct / 100); }); return totalRecoveryWt; })()) }}</td>

                                <!-- Gold Recovery Percentage -->
                                <td class="px-3 py-2">{{ (() => { let totalRecoveryWt = 0; selectedDepartmentData.forEach(dept => { const pct = getDeptRecoveryPercentage(dept); const deptPl = parseFloat(dept.pure_loss_gold || 0); if (pct > 0 && deptPl > 0) totalRecoveryWt += deptPl * (pct / 100); }); const pl = parseFloat(totalDeptPureLoss); return pl > 0 && totalRecoveryWt > 0 ? roundToTwo((totalRecoveryWt / pl) * 100) + '%' : '0%'; })() }}</td>
                            </tr>
                        </tbody>

                        <!-- Employee Details -->
                        <tbody class="text-gray-700">
                            <template v-if="showEmployeesTable" v-for="(emp, empIndex) in selectedEmployees"
                                :key="'emp-' + empIndex">
                                <!-- Employee Total Row -->
                                <tr
                                    class="bg-blue-50 font-bold border-b-8 border-b-gray-200 border-blue-200 text-[11px]">
                                    <td class="px-3 py-2 text-center font-normal">{{ empIndex + 1 }}</td>
                                    <td class="px-3 py-2 text-center">{{ emp.name }}</td>
                                    <td class="px-3 py-2 text-center bg-blue-100">{{ emp.bag_count || 0 }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).issuedNetWt) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).recvG) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).lG) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).grossLossPct }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).pw) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).pl) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).netLoss) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).netLossPct }}</td>
                                    <!-- Issued Net Weight Diamond -->
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).issuedNetWtDiamond) }}</td>
                                    <!-- Received Quantity Diamond -->
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).aD) }}</td>
                                    <!-- Loss Qty Diamond -->
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).lD) }}</td>
                                    <!-- Diamond Loss % -->
                                    <td class="px-3 py-2 text-red-500">{{ getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).diamondLossPct }}</td>
                                    <!-- Received Pieces -->
                                    <td class="px-3 py-2">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).receivedPieces) }}</td>
                                    <!-- Loss Pieces -->
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).lossPieces) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo((() => { const pl = getSummaryEmpTotals(emp, selectedDepartmentData.find(d => d.name === expandedDepartment) || null).pl; const dept = selectedDepartmentData.find(d => d.name === expandedDepartment); const pct = getEmpRecoveryPercentage(emp, dept || null); return pl > 0 && pct > 0 ? pl * (pct / 100) : 0; })()) }}</td>
                                    <td class="px-3 py-2">{{ (() => { const dept = selectedDepartmentData.find(d => d.name === expandedDepartment); const pct = getEmpRecoveryPercentage(emp, dept || null); return pct > 0 ? roundToTwo(pct) + '%' : '0%'; })() }}</td>
                                </tr>
                            </template>

                            <!-- Unassigned Bags Rows -->
                            <template v-if="showEmployeesTable && getUnassignedBagsData(selectedDeptObject)">
                                <!-- Unassigned Total Row -->
                                <tr v-if="getUnassignedBagsData(selectedDeptObject)"
                                    class="bg-blue-50 font-bold border-b-8 border-b-gray-200 text-[11px]">
                                    <td class="px-3 py-2 text-center">{{ selectedEmployees.length + 1 }}</td>
                                    <td class="px-3 py-2 text-center" colspan="2">Unassigned — Total</td>
                                    <td class="px-3 py-2 text-center bg-blue-100">{{ getUnassignedBagsData(selectedDeptObject).bag_count || 0 }}</td>
                                    <td class="px-3 py-2" colspan="2"></td>
                                    <td class="px-3 py-2">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'issuedNetWt')) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'recvG')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'lG')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getUnassignedColumnSum(selectedDeptObject, 'recvG') > 0 ? roundToTwo((getUnassignedColumnSum(selectedDeptObject, 'lG') / getUnassignedColumnSum(selectedDeptObject, 'recvG')) * 100) + '%' : '0.00%' }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'pw')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'pl')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getUnassignedColumnSum(selectedDeptObject, 'recvG') > 0 ? roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'lG') / getUnassignedColumnSum(selectedDeptObject, 'recvG')) : '0.00' }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getUnassignedColumnSum(selectedDeptObject, 'recvG') > 0 ? roundToTwo((getUnassignedColumnSum(selectedDeptObject, 'lG') / getUnassignedColumnSum(selectedDeptObject, 'recvG')) * 100) + '%' : '0.00%' }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'issuedNetWtDiamond')) }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'aD')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'lD')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ getUnassignedColumnSum(selectedDeptObject, 'aD') > 0 ? roundToTwo((getUnassignedColumnSum(selectedDeptObject, 'lD') / getUnassignedColumnSum(selectedDeptObject, 'aD')) * 100) + '%' : '0.00%' }}</td>
                                    <td class="px-3 py-2">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'receivedPieces')) }}</td>
                                    <td class="px-3 py-2 text-red-500">{{ roundToTwo(getUnassignedColumnSum(selectedDeptObject, 'lossPieces')) }}</td>
                                    <td class="px-3 py-2"></td>
                                    <td class="px-3 py-2"></td>
                                </tr>
                            </template>

                            <!-- No data found row when selectedEmployees is empty -->
                            <tr v-if="showEmployeesTable && selectedEmployees.length === 0"
                                class="border-b group hover:bg-gray-50 transition-all duration-200 text-[11px]">
                                <td colspan="17" style="text-align: center;" class="px-3 py-2 text-gray-900 italic">No
                                    data found for this
                                    Employee</td>
                            </tr>

                            <!-- Total Row for Employees -->
                            <tr v-if="showEmployeesTable" class="bg-gray-100 font-bold border-t text-[11px]">
                                <td class="px-3 py-2" colspan="2" style="text-align: center;">Total</td>

                                <!-- Total No. of Bags -->
                                <td class="px-3 py-2 font-semibold text-center bg-blue-50">{{ totalEmpBagCount }}</td>

                                <!-- Issued Net Weight -->
                                <td class="px-3 py-2">{{ roundToTwo(parseFloat(totalEmpIssuedNetWeightGold)) }}</td>

                                <!-- Received Quantity -->
                                <td class="px-3 py-2">{{ roundToTwo(parseFloat(totalEmpReceivedQtyGold)) }}</td>

                                <!-- Gross Loss -->
                                <td class="px-3 py-2 text-red-500">{{ roundToTwo(parseFloat(totalEmpLossQuantityGold)) }}</td>

                                <!-- Gross Loss % -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalEmpReceivedQtyGold) > 0 ?
                                    roundToTwo((parseFloat(totalEmpLossQuantityGold) /
                                    parseFloat(totalEmpReceivedQtyGold)) * 100) + '%' :
                                    '0.00%' }}</td>

                                <!-- Pure Weight -->
                                <td class="px-3 py-2">{{ roundToTwo(parseFloat(totalEmpPureWeight)) }}</td>

                                <!-- Pure Loss -->
                                <td class="px-3 py-2 text-red-500">{{ roundToTwo(parseFloat(totalEmpPureLoss)) }}</td>

                                <!-- Net Loss -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalEmpReceivedQtyGold) > 0 ?
                                    roundToTwo(parseFloat(totalEmpLossQuantityGold) /
                                    parseFloat(totalEmpReceivedQtyGold)) : '0.00' }}</td>

                                <!-- Net Loss % -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalEmpReceivedQtyGold) > 0 ?
                                    roundToTwo((parseFloat(totalEmpLossQuantityGold) /
                                    parseFloat(totalEmpReceivedQtyGold)) * 100) + '%' :
                                    '0.00%' }}</td>

                                <!-- Issued Net Weight Diamond -->
                                <td class="px-3 py-2">{{ roundToTwo(parseFloat(totalEmpIssuedNetWeightDiamond)) }}</td>

                                <!-- Received Quantity Diamond -->
                                <td class="px-3 py-2">{{ roundToTwo(parseFloat(totalEmpReceivedQtyDiamond)) }}</td>

                                <!-- Loss Qty Diamond -->
                                <td class="px-3 py-2 text-red-500">{{ roundToTwo(parseFloat(totalEmpLossQuantityDiamond)) }}</td>

                                <!-- Diamond Loss % -->
                                <td class="px-3 py-2 text-red-500">{{ parseFloat(totalEmpReceivedQtyDiamond) > 0 ?
                                    roundToTwo((parseFloat(totalEmpLossQuantityDiamond) /
                                    parseFloat(totalEmpReceivedQtyDiamond)) * 100) + '%' :
                                    '0.00%' }}</td>

                                <!-- Received Pieces Total -->
                                <td class="px-3 py-2">{{ roundToTwo(parseFloat(totalEmpReceivedPieces)) }}</td>

                                <!-- Loss Pieces Total -->
                                <td class="px-3 py-2 text-red-500">{{ roundToTwo(parseFloat(totalEmpLossPieces)) }}</td>

                                <!-- Gold Recovery Weight -->
                                <td class="px-3 py-2">{{ roundToTwo((() => { const dept = selectedDepartmentData.find(d => d.name === expandedDepartment); if (!dept) return 0; const pct = getEmpRecoveryPercentage(selectedEmployees[0], dept); const pl = parseFloat(totalEmpPureLoss); return pl > 0 && pct > 0 ? pl * (pct / 100) : 0; })()) }}</td>

                                <!-- Gold Recovery Percentage -->
                                <td class="px-3 py-2">{{ (() => { const dept = selectedDepartmentData.find(d => d.name === expandedDepartment); if (!dept) return '0%'; const selectedEmp = selectedEmployees && selectedEmployees.length > 0 ? selectedEmployees[0] : null; const pct = selectedEmp ? getEmpRecoveryPercentage(selectedEmp, dept) : 0; return pct > 0 ? roundToTwo(pct) + '%' : '0%'; })() }}</td>
                            </tr>
                        </tbody>

                    </table>
                </div>
            </div>
            <!-- Chart & Production Section -->
            <div
                class="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <!-- Doughnut: Gold vs Diamond production split -->
                <div class="p-4 rounded-lg shadow w-full h-80 flex flex-col bg-transparent/2">
                    <h2 class="text-sm font-bold mb-2 text-center text-gray-700">Production</h2>
                    <div class="relative flex-1">
                        <canvas id="productionChart"></canvas>
                    </div>
                </div>
                <!-- Bar/Line: Production & Loss per entity -->
                <div class="p-4 rounded-lg shadow w-full h-80 flex flex-col bg-transparent/2">
                    <h2 class="text-sm font-bold mb-2 text-center text-gray-700">{{ dashboardTitle }} — Gold & Diamond
                    </h2>
                    <div class="relative flex-1">
                        <canvas id="cryptoChart"></canvas>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
import { onMounted, ref, watch, computed } from 'vue';
import Chart from 'chart.js/auto';
import { useAllEfficiencyAnalysisApi } from "@/composables/reports-api/efficiency-analysis-api/FetchEfficiencyAnalysisApi";
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ENV_VAR } from "@/shared/constants";

export default {
    components: {
        VueDatePicker,
    },
    props: {
        type: {
            type: String,
            default: 'overall', // 'overall' or 'repair'
        }
    },
    setup(props) {

        const expandedLocation = ref(null);
        const expandedDepartment = ref(null);
        const showDepartments = ref(false);
        const showEmployees = ref(false);
        const selectedDateRange = ref(null); // Holds selected date range
        const baseTitle = props.type === 'repair' ? "Repair Efficiency Analysis" : props.type === 'production' ? "Production Efficiency Analysis" : "Overall Efficiency Analysis";
        const dashboardTitle = ref(baseTitle);
        const selectedDepartments = ref([]);
        const selectedEmployees = ref([]);
        const showTable = ref(false);
        const selectedDepartmentData = ref([]);
        const showEmployeesTable = ref(false);
        const showNoDataMessage = ref(false); // Show message if no data is available after retries
        const decimalPlaces = ref(2); // Decimal places for rounding (2, 3, or 4)

        let cryptoChart = null;
        let productionChart = null;
        const {
            loading,
            loadingComponents,
            error,
            fetchlistLocations,
            listLocationsData,
            listEfficiencyData,
            fetchListEfficiencyAnalysis,
            fetchInventoryAdjustments,
            listInventoryAdjustments,
            fetchRecoveryDataBatch
        } = useAllEfficiencyAnalysisApi();

        const to = ref(false); // ✅ Controls the visibility of the popup
        const locations = ref([]);
        const isInitialLoading = ref(true);
        const showNoDataPopup = ref(false); // ✅ Define showNoDataPopup as a reactive variable
        const deptRecoveryPercentageMap = ref({}); // Store recovery % for each department
        const employeeRecoveryMap = ref({});
        const recoveryMapVersion = ref(0);

        // Helper to get recovery percentage for a specific department
        // Now reads directly from dept.recovery_percentage_gold (populated by backend summary function)
        const getDeptRecoveryPercentage = (dept) => {
            void recoveryMapVersion.value; // ← reactive dependency
            if (!dept) return 0;
            // ✅ Read directly from backend-populated field
            if (dept.recovery_percentage_gold !== undefined && dept.recovery_percentage_gold !== null) {
                return parseFloat(dept.recovery_percentage_gold || 0);
            }
            // Fallback to old map for backward compatibility
            const byId = deptRecoveryPercentageMap.value[dept.id];
            if (byId !== undefined && byId !== null) return byId;
            const byName = deptRecoveryPercentageMap.value[dept.name];
            if (byName !== undefined && byName !== null) return byName;
            return 0;
        };

        const getEmpRecoveryPercentage = (emp, dept) => {
            void recoveryMapVersion.value;
            
            if (!emp || !dept) {
                return 0;
            }

            // ✅ Read directly from backend-populated field (PRIORITY 1)
            if (emp.recovery_percentage_gold !== undefined && emp.recovery_percentage_gold !== null) {
                return parseFloat(emp.recovery_percentage_gold || 0);
            }

            // Fallback to old map logic for backward compatibility
            // Try looking up the deptMap using different keys
            let deptMap = null;

            // 1. Try by exact name
            if (employeeRecoveryMap.value[dept.name]) {
                deptMap = employeeRecoveryMap.value[dept.name];
            }
            // 2. Try by ID
            else if (dept.id && employeeRecoveryMap.value[dept.id]) {
                deptMap = employeeRecoveryMap.value[dept.id];
            }
            // 3. Try by String ID
            else if (dept.id && employeeRecoveryMap.value[String(dept.id)]) {
                deptMap = employeeRecoveryMap.value[String(dept.id)];
            }
            // 4. Case-insensitive search on keys
            else {
                const deptNameLower = (dept.name || '').trim().toLowerCase();
                const matchedDeptKey = Object.keys(employeeRecoveryMap.value).find(
                    k => k.trim().toLowerCase() === deptNameLower
                );
                if (matchedDeptKey) {
                    deptMap = employeeRecoveryMap.value[matchedDeptKey];
                }
            }

            if (!deptMap) {
                return 0;
            }

            // Now look for the employee in deptMap
            // Try multiple employee name formats because backend may return "ID NAME" or "ID - NAME"
                        
            // 1. Try exact name match
            if (deptMap[emp.name] !== undefined) {
                const result = deptMap[emp.name];
                return result;
            }

            // 2. Try with ID prefix formats (backend returns various formats)
            if (emp.id) {
                // Try "ID NAME" format
                const format1 = `${emp.id} ${emp.name}`;
                if (deptMap[format1] !== undefined) {
                    const result = deptMap[format1];
                    return result;
                }

                // Try "ID - NAME" format
                const format2 = `${emp.id} - ${emp.name}`;
                if (deptMap[format2] !== undefined) {
                    const result = deptMap[format2];
                    return result;
                }

                // Try just ID
                const idStr = String(emp.id);
                if (deptMap[idStr] !== undefined) {
                    const result = deptMap[idStr];
                    return result;
                }
            } else {
                console.warn(`[getEmpRecoveryPercentage] emp.id is undefined or null`);
            }

            // 3. Case-insensitive name match
            const empNameLower = (emp.name || '').trim().toLowerCase();
            const matchedEmpKey = Object.keys(deptMap).find(
                k => k.trim().toLowerCase() === empNameLower
            );
            if (matchedEmpKey !== undefined) {
                const result = deptMap[matchedEmpKey];
                return result;
            }

            // 4. Key ends with " NAME" — handles "DD-1027 MERCY" format from backend
            const suffixMatchKey = Object.keys(deptMap).find(
                k => k.trim().toLowerCase().endsWith(' ' + empNameLower)
            );
            if (suffixMatchKey !== undefined) {
                const result = deptMap[suffixMatchKey];
                return result;
            }

            // 5. Key contains name (last resort, only for names longer than 2 chars)
            if (empNameLower.length > 2) {
                const containsMatchKey = Object.keys(deptMap).find(
                    k => k.trim().toLowerCase().includes(empNameLower)
                );
                if (containsMatchKey !== undefined) {
                    const result = deptMap[containsMatchKey];
                    return result;
                }
            }
            return 0;
        };

        const getEmpBagRecoveryWeightByEmpPct = (emp, category, bagName, dept = null) => {
            const pct = dept ? getEmpRecoveryPercentage(emp, dept) : 0;
            const pureLoss = getEmpBagLossQtyGoldRaw(emp, category, bagName)
                        * getEmpBagPurityFactor(emp, category, bagName);
            return (pureLoss > 0 && pct > 0) ? pureLoss * (pct / 100) : 0;
        };

        const CASTING = Number(ENV_VAR.CONSTANTS.DEPARTMENT_CASTING);
        const TREE_CUTTING_CLEANING = Number(ENV_VAR.CONSTANTS.DEPARTMENT_TREE_CUTTING_CLEANING);
        const GRINDING = Number(ENV_VAR.CONSTANTS.DEPARTMENT_GRINDING);

        // Function to get the start of the current month and today’s date
        // const getDefaultDateRange = () => {
        //     const today = new Date();
        //     const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        //     return [firstDayOfMonth, today]; // Returns the range [start of month, today]
        // };
        const getDefaultDateRange = () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            // return [yesterday, yesterday]; // Returns range: [yesterday, yesterday]
            return [today, today]; // Returns range: [today, today]
        };
        selectedDateRange.value = getDefaultDateRange(); // Initialize with today's date range
        const getDefaultDateRangeLast = () => {
            const today = new Date();

            // Subtract 1 year from today's date
            const lastYear = today.getFullYear() - 1;

            // Get the first day of the month, one year ago
            const firstDayOfLastYearMonth = new Date(lastYear, today.getMonth(), 1);

            // If today is the first day of the month, return the last day of the previous month from last year
            if (today.getDate() === 1) {
                const lastDayPrevMonth = new Date(lastYear, today.getMonth(), 0);
                return [lastDayPrevMonth, today]; // Returns range: [last day of previous month, today]
            }

            return [firstDayOfLastYearMonth, today]; // Normal case
        };


        // Compute Department Table Totals (sum all rows in table)
        const totalDeptStartingQuantityGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += getDepartmentStartingQtyGoldRaw(dept);
            });
            return roundToTwo(sum);
        });

        const totalDeptIssuedNetWeightDiamond = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.issued_net_wt_diamond !== undefined
                    ? parseFloat(dept.issued_net_wt_diamond || 0)
                    : parseFloat(getDeptTotals(dept).issuedNetWtDiamond || 0);
            });
            return roundToTwo(sum);
        });

        const totalDeptActualProductionGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += getDepartmentTotalActualProductionGold(dept);
            });
            return roundToTwo(sum);
        });

        const totalDeptGrossLossGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += parseFloat(getDeptTotals(dept).lG);
            });
            return roundToTwo(sum);
        });

        const totalDeptReceivedQtyDiamond = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.received_qty_diamond !== undefined
                    ? parseFloat(dept.received_qty_diamond || 0)
                    : parseFloat(getDeptTotals(dept).aD || 0);
            });
            return roundToTwo(sum);
        });

        const totalDeptGrossLossDiamond = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.loss_qty_diamond !== undefined
                    ? parseFloat(dept.loss_qty_diamond || 0)
                    : parseFloat(getDeptTotals(dept).lD);
            });
            return roundToTwo(sum);
        });

        const getBagRecoveryWeight = (dept, category, bagName) => {
            const pct = getDeptRecoveryPercentage(dept);
            const pureLoss = getBagLossQtyGoldRaw(dept, category, bagName) * getBagPurityFactor(dept, category, bagName);
            return (pureLoss > 0 && pct > 0) ? pureLoss * (pct / 100) : 0;
        };

        const getEmpBagRecoveryWeight = (emp, category, bagName, dept = null) => {
            // Use passed dept or find from selectedDepartments by expandedDepartment name
            let targetDept = dept;
            if (!targetDept && expandedDepartment.value) {
                targetDept = selectedDepartments.value.find(d => d.name === expandedDepartment.value);
            }
            // ✅ FIXED: Use EMPLOYEE recovery percentage, not department percentage
            const pct = targetDept ? getEmpRecoveryPercentage(emp, targetDept) : 0;
            const pureLoss = getEmpBagLossQtyGoldRaw(emp, category, bagName) * getEmpBagPurityFactor(emp, category, bagName);
            return (pureLoss > 0 && pct > 0) ? pureLoss * (pct / 100) : 0;
        };

        const getSelectedDeptBagRecoveryWeight = (dept, category, bagName) => {
            const pct = getDeptRecoveryPercentage(dept);
            const pureLoss = getBagLossQtyGoldRaw(dept, category, bagName) * getBagPurityFactor(dept, category, bagName);
            return (pureLoss > 0 && pct > 0) ? pureLoss * (pct / 100) : 0;
        };

        const totalDeptGoldRecoveryWeight = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => sum += getDeptColumnSum(dept, 'recoveryWt'));
            return roundToTwo(sum);
        });

        const totalDeptNetLossGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += parseFloat(dept.netLoss || 0);
            });
            return roundToTwo(sum);
        });

        const totalDeptTmProductionGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += parseFloat(dept.production || 0);
            });
            return roundToTwo(sum);
        });

        const totalDeptTmProductionDiamond = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += parseFloat(dept.production_diamond || 0);
            });
            return roundToTwo(sum);
        });

        const totalDeptBagCount = computed(() => {
            // Distinct bag count across all departments shown in the table,
            // same dedup logic as getLocationTotalBagCount (a bag shared by
            // multiple departments is only counted once in the grand total)
            const uniqueBags = new Set();
            selectedDepartmentData.value.forEach(dept => {
                if (dept.unique_bags_array && Array.isArray(dept.unique_bags_array)) {
                    dept.unique_bags_array.forEach(bag => uniqueBags.add(bag));
                }
            });
            if (uniqueBags.size === 0) {
                // Fallback: sum dept.bag_count (less accurate, but works if
                // unique_bags_array isn't available)
                let sum = 0;
                selectedDepartmentData.value.forEach(dept => {
                    sum += parseInt(dept.bag_count || 0);
                });
                return sum;
            }
            return uniqueBags.size;
        });

        const totalDeptIssuedQtyGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += getDepartmentIssuedQtyGoldRaw(dept);
            });
            return roundToTwo(sum);
        });

        const totalDeptLossQtyGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                if (dept.gross_loss_gold !== undefined) {
                    sum += parseFloat(dept.gross_loss_gold || 0);
                } else {
                    const waxLoss = getDepartmentWaxTreeLossGold(dept);
                    sum += (waxLoss !== null ? waxLoss : getDepartmentTotalLossQtyGold(dept));
                }
            });
            return roundToTwo(sum);
        });

        const totalDeptScrapQtyGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += getDepartmentScrapQtyGoldRaw(dept);
            });
            return roundToTwo(sum);
        });

        // Starting Net Weight total = starting + issued - (loss + scrap)
        const totalDeptNetStartingGold = computed(() => {
            const s = parseFloat(totalDeptStartingQuantityGold.value || 0);
            const i = parseFloat(totalDeptIssuedQtyGold.value || 0);
            const l = parseFloat(totalDeptLossQtyGold.value || 0);
            const sc = parseFloat(totalDeptScrapQtyGold.value || 0);
            return roundToTwo(s + i - (l + sc));
        });

        const totalDeptReceivedQtyGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.received_qty_gold !== undefined
                    ? parseFloat(dept.received_qty_gold || 0)
                    : getDeptColumnSum(dept, 'recvG');
            });
            return roundToTwo(sum);
        });

        // Issued Net Weight total = starting + issued - (scrap + balance)  [loss NOT subtracted]
        const totalDeptIssuedNetWeightGold = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.issued_net_wt_gold !== undefined
                    ? parseFloat(dept.issued_net_wt_gold || 0)
                    : getDeptColumnSum(dept, 'issuedNetWt');
            });
            return roundToTwo(sum);
        });

        const totalDeptLossQtyDiamond = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.loss_qty_diamond !== undefined
                    ? parseFloat(dept.loss_qty_diamond || 0)
                    : getDeptColumnSum(dept, 'lD');
            });
            return roundToTwo(sum);
        });

        const totalDeptIssuedQtyDiamond = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.issued_net_wt_diamond !== undefined
                    ? parseFloat(dept.issued_net_wt_diamond || 0)
                    : getDeptColumnSum(dept, 'issuedNetWtDiamond');
            });
            return roundToTwo(sum);
        });

        const totalDeptReceivedPieces = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.received_pieces !== undefined
                    ? parseFloat(dept.received_pieces || 0)
                    : getDeptColumnSum(dept, 'receivedPieces');
            });
            return roundToTwo(sum);
        });

        const totalDeptLossPieces = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.loss_pieces !== undefined
                    ? parseFloat(dept.loss_pieces || 0)
                    : getDeptColumnSum(dept, 'lossPieces');
            });
            return roundToTwo(sum);
        });

        const selectedDeptObject = computed(() => {
            if (!expandedDepartment.value) return null;
            return selectedDepartments.value.find(dept => dept.name === expandedDepartment.value) || null;
        });

        const totalEmpTmProductionGold = computed(() => {
            let sum = 0;
            selectedEmployees.value.forEach(emp => {
                sum += parseFloat(emp.tmProduction || 0);
            });
            return roundToTwo(sum);
        });

        const totalEmpTmProductionDiamond = computed(() => {
            let sum = 0;
            selectedEmployees.value.forEach(emp => {
                sum += parseFloat(emp.tmProductionDiamond || 0);
            });
            return roundToTwo(sum);
        });

        const totalEmpBagCount = computed(() => {
            return selectedDeptObject.value ? (selectedDeptObject.value.bag_count || 0) : 0;
        });

        // Compute Employee Table Totals (sum all rows in table)
        const totalEmpActualProductionGold = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).recvG)
                : '0.00';
        });

        const totalEmpGrossLossGold = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).lG)
                : '0.00';
        });

        const totalEmpActualProductionDiamond = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).aD)
                : '0.00';
        });

        const totalEmpGrossLossDiamond = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).lD)
                : '0.00';
        });

        const totalEmpGoldRecoveryWeight = computed(() => {
            let sum = 0;
            const dept = selectedDepartmentData.value && selectedDepartmentData.value.find(d => d.name === expandedDepartment.value);
            selectedEmployees.value.forEach(emp => {
                sum += parseFloat(getEmpTotals(emp, dept || null).recoveryWt || 0);
            });
            return roundToTwo(sum);
        });

        const totalEmpNetLossGold = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).netLoss)
                : '0.00';
        });

        const totalEmpStartingQuantityGold = computed(() => {
            let sum = 0;
            selectedEmployees.value.forEach(emp => {
                (emp.categories || []).forEach(cat => { sum += parseFloat(cat.starting_qty_gold || 0); });
            });
            return roundToTwo(sum);
        });

        const totalEmpIssuedQuantityGold = computed(() => {
            let sum = 0;
            selectedEmployees.value.forEach(emp => {
                (emp.categories || []).forEach(cat => { sum += parseFloat(cat.issued_qty_gold || 0); });
            });
            return roundToTwo(sum);
        });

        const totalEmpLossQuantityGold = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).lG)
                : '0.00';
        });

        const totalEmpScrapQtyGold = computed(() => {
            let sum = 0;
            selectedEmployees.value.forEach(emp => {
                (emp.categories || []).forEach(cat => { sum += parseFloat(cat.scrap_qty_gold || 0); });
            });
            return roundToTwo(sum);
        });

        // Starting Net Weight total = starting + issued - (loss + scrap)
        const totalEmpNetStartingGold = computed(() => {
            const s = parseFloat(totalEmpStartingQuantityGold.value || 0);
            const i = parseFloat(totalEmpIssuedQuantityGold.value || 0);
            const l = parseFloat(totalEmpLossQuantityGold.value || 0);
            const sc = parseFloat(totalEmpScrapQtyGold.value || 0);
            return roundToTwo(s + i - (l + sc));
        });

        // Received Quantity total = starting + issued - (loss + scrap + balance)
        const totalEmpReceivedQtyGold = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).recvG)
                : '0.00';
        });

        // Issued Net Weight total = starting + issued - (scrap + balance)  [loss NOT subtracted]
        const totalEmpIssuedNetWeightGold = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).issuedNetWt)
                : '0.00';
        });

        const totalEmpIssuedNetWeightDiamond = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).issuedNetWtDiamond)
                : '0.00';
        });

        const totalEmpIssuedQuantityDiamond = computed(() => {
            let sum = 0;
            selectedEmployees.value.forEach(emp => {
                (emp.categories || []).forEach(cat => { sum += parseFloat(cat.issued_qty_diamond || 0); });
            });
            return roundToTwo(sum);
        });

        const totalEmpLossQuantityDiamond = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).lD)
                : '0.00';
        });

        const totalEmpReceivedPieces = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).receivedPieces)
                : '0.00';
        });

        const totalEmpLossPieces = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).lossPieces)
                : '0.00';
        });

        const totalEmpActualProductionGoldCalculated = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).recvG)
                : '0.00';
        });

        const totalEmpReceivedQtyDiamond = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).aD)
                : '0.00';
        });

        const totalDeptPureWeight = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.pure_weight_gold !== undefined
                    ? parseFloat(dept.pure_weight_gold || 0)
                    : getDeptColumnSum(dept, 'pw');
            });
            return roundToTwo(sum);
        });

        const totalDeptPureLoss = computed(() => {
            let sum = 0;
            selectedDepartmentData.value.forEach(dept => {
                sum += dept.pure_loss_gold !== undefined
                    ? parseFloat(dept.pure_loss_gold || 0)
                    : getDeptColumnSum(dept, 'pl');
            });
            return roundToTwo(sum);
        });

        const totalEmpPureWeight = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).pw)
                : '0.00';
        });

        const totalEmpPureLoss = computed(() => {
            return selectedDeptObject.value
                ? roundToTwo(getSummaryDeptTotals(selectedDeptObject.value).pl)
                : '0.00';
        });

        // Function to format the name of locations, departments, and employees
        const formatName = (name) => {
            if (!name) return "";
            return name
                .toLowerCase()
                .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalizes the first letter of each word
        };

        // Helper function to calculate gold loss percentage using loss qty and actual production
        const calculateGoldLossPercentage = (startingGold, issuedGold, lossGold, scrapGold, balanceGold) => {
            const starting = startingGold || 0;
            const issued = issuedGold || 0;
            const loss = lossGold || 0;
            const scrap = scrapGold || 0;
            const balance = balanceGold || 0;

            // Calculate actual production: starting + issued - loss - scrap - balance
            const actualProduction = starting + issued - loss - scrap - balance;

            // If actual production is 0 or negative, return 0
            if (actualProduction <= 0) return 0;

            // Loss percentage = (loss / actual production) * 100
            return (loss / actualProduction) * 100;
        };

        // Helper function to calculate diamond loss percentage using loss qty and actual production
        const calculateDiamondLossPercentage = (startingDiamond, issuedDiamond, lossDiamond, scrapDiamond, balanceDiamond) => {
            const starting = startingDiamond || 0;
            const issued = issuedDiamond || 0;
            const loss = lossDiamond || 0;
            const scrap = scrapDiamond || 0;
            const balance = balanceDiamond || 0;

            // Calculate actual production: starting + issued - loss - scrap - balance
            const actualProduction = starting + issued - loss - scrap - balance;

            // If actual production is 0 or negative, return 0
            if (actualProduction <= 0) return 0;

            // Loss percentage = (loss / actual production) * 100
            return (loss / actualProduction) * 100;
        };

        // Set default date range on mount
        selectedDateRange.value = getDefaultDateRange();

        // fetchLocations function
        const fetchLocations = async () => {
            try {
                loading.value = true;
                isInitialLoading.value = true;
                await fetchlistLocations();
                if (listLocationsData.value) {
                    locations.value = listLocationsData.value.map(location => ({
                        internalid: { value: location.internalid.value },
                        name: { value: location.name.value },
                        production: "0", // Set default values
                        loss: "0",
                        departments: [] // Departments will be fetched dynamically
                    }));
                }
            } catch (err) {
                console.error("Error fetching locations:", err);
            } finally {
                loading.value = false;
                isInitialLoading.value = false;
            }
        };

        const fetchInventoryAdjustmentsDetails = async (startDate, endDate) => {
            try {
                loading.value = true;
                // Pass the dates to the API call if it expects them
                await fetchInventoryAdjustments(startDate, endDate);
            } catch (err) {
                console.error("Error fetching inventory Adjustment:", err);
            } finally {
                loading.value = false;
            }
        };

        // ─── Colour palette (ARGB, no leading #) ────────────────────────────────────
        const CLR = {
            headerBg:   'FF1F2937', // dark slate  → header row
            headerFg:   'FFFFFFFF', // white
            totalBg:    'FFE0E7FF', // light indigo → dept/emp total rows
            grandBg:    'FFE5E7EB', // light gray  → grand total row
            lossFg:     'FFDC2626', // red         → loss columns
            bagCntBg:   'FFDBeafe', // sky-50      → bag-count cells
            catBg:      'FFF0F9FF', // very light blue → category cells
            linkFg:     'FF2563EB', // blue-600    → hyperlink-style text
            whiteBg:    'FFFFFFFF',
            altRowBg:   'FFF9FAFB', // gray-50
        };
        
        // ─── Column definitions ──────────────────────────────────────────────────────
        // label  : header text
        // width  : approximate Excel column width (chars)
        // isLoss : true → red text in data rows
        // align  : default alignment for data cells
        const EMP_COLS = [
            { label: 'Department',                    width: 22, align: 'center' },
            { label: 'Employee',                      width: 22, align: 'center' },
            { label: 'No. of Bags',                   width: 12, align: 'center' },
            { label: 'Item Category',                 width: 18, align: 'center' },
            { label: 'Sub Category',                  width: 18, align: 'center' },
            { label: 'Bag Count',                     width: 10, align: 'center' },
            { label: 'Style Number',                  width: 16, align: 'center' },
            { label: 'Bag Name',                      width: 20, align: 'center' },
            { label: 'Issued Net Weight Gold (g)',    width: 20, align: 'center' },
            { label: 'Received Qty Gold (g)',         width: 18, align: 'center' },
            { label: 'Gross Loss (g)',                width: 14, isLoss: true, align: 'center' },
            { label: 'Gross Loss %',                  width: 12, isLoss: true, align: 'center' },
            { label: 'Purity %',                      width: 12, align: 'center' },
            { label: 'Pure Weight (g)',               width: 14, align: 'center' },
            { label: 'Pure Loss (g)',                 width: 13, isLoss: true, align: 'center' },
            { label: 'Net Loss',                      width: 12, isLoss: true, align: 'center' },
            { label: 'Net Loss %',                    width: 11, isLoss: true, align: 'center' },
            { label: 'Issued Net Wt Diamond (ct)',    width: 22, align: 'center' },
            { label: 'Received Qty Diamond (ct)',     width: 20, align: 'center' },
            { label: 'Loss Qty Diamond (ct)',         width: 18, isLoss: true, align: 'center' },
            { label: 'Diamond Loss %',               width: 14, isLoss: true, align: 'center' },
            { label: 'Received Pieces',              width: 15, align: 'center' },
            { label: 'Loss Pieces',                  width: 12, isLoss: true, align: 'center' },
            { label: 'Gold Recovery Wt (g)',         width: 18, align: 'center' },
            { label: 'Gold Recovery %',              width: 15, align: 'center' },
        ];

        const DEPT_COLS = [
            { label: '#',                              width: 5,  align: 'center' },
            { label: 'Department',                     width: 22, align: 'center' },
            { label: 'No. of Bags',                    width: 12, align: 'center' },
            { label: 'Item Category',                  width: 18, align: 'center' },
            { label: 'Sub Category',                   width: 18, align: 'center' },
            { label: 'Bag Count',                      width: 10, align: 'center' },
            { label: 'Style Number',                   width: 16, align: 'center' },
            { label: 'Bag Name',                       width: 20, align: 'center' },
            { label: 'Issued Net Weight Gold (g)',     width: 20, align: 'center' },
            { label: 'Received Qty Gold (g)',          width: 18, align: 'center' },
            { label: 'Gross Loss (g)',                 width: 14, isLoss: true, align: 'center' },
            { label: 'Gross Loss %',                   width: 12, isLoss: true, align: 'center' },
            { label: 'Purity %',                       width: 12, align: 'center' },
            { label: 'Pure Weight (g)',                width: 14, align: 'center' },
            { label: 'Pure Loss (g)',                  width: 13, isLoss: true, align: 'center' },
            { label: 'Net Loss',                       width: 12, isLoss: true, align: 'center' },
            { label: 'Net Loss %',                     width: 11, isLoss: true, align: 'center' },
            { label: 'Issued Net Wt Diamond (ct)',     width: 22, align: 'center' },
            { label: 'Received Qty Diamond (ct)',      width: 20, align: 'center' },
            { label: 'Loss Qty Diamond (ct)',          width: 18, isLoss: true, align: 'center' },
            { label: 'Diamond Loss %',                 width: 14, isLoss: true, align: 'center' },
            { label: 'Received Pieces',                width: 15, align: 'center' },
            { label: 'Loss Pieces',                    width: 12, isLoss: true, align: 'center' },
            { label: 'Gold Recovery Wt (g)',           width: 18, align: 'center' },
            { label: 'Gold Recovery %',                width: 15, align: 'center' },
        ];

        // ─── Helpers ─────────────────────────────────────────────────────────────────
        const toNum = (v) => parseFloat(v) || 0;

        /** Safe merge — skips if either cell is already part of a merge. */
        function safeMerge(ws, r1, c1, r2, c2) {
            try {
                ws.mergeCells(r1, c1, r2, c2);
            } catch (_) { /* already merged or single cell — ignore */ }
        }

        /** Apply font + fill to every cell in a row range. */
        function styleRow(ws, rowIdx, { bold = false, bgARGB, fgARGB, wrapText = false } = {}) {
            const row = ws.getRow(rowIdx);
            row.eachCell({ includeEmpty: true }, (cell) => {
                if (bold) cell.font = { ...cell.font, bold: true, name: 'Calibri', size: 9 };
                if (bgARGB) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgARGB } };
                if (fgARGB) cell.font = { ...(cell.font || {}), color: { argb: fgARGB }, name: 'Calibri', size: 9 };
                if (wrapText) cell.alignment = { ...cell.alignment, wrapText: true };
            });
        }

        /** Apply thin border to a single cell. */
        function borderCell(cell) {
            const thin = { style: 'thin', color: { argb: 'FFD1D5DB' } };
            cell.border = { top: thin, left: thin, bottom: thin, right: thin };
        }

        /** Write a value into a cell with shared base style. */
        function writeCell(ws, row, col, value, { isLoss = false, align, bgARGB, bold = false } = {}) {
            const cell = ws.getCell(row, col);
            cell.value = value === undefined || value === null ? '' : value;
            cell.font = {
                name: 'Calibri',
                size: 9,
                bold: bold,
                color: isLoss ? { argb: CLR.lossFg } : undefined,
            };
            cell.alignment = { horizontal: align || 'left', vertical: 'middle', wrapText: true };
            if (bgARGB) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgARGB } };
            borderCell(cell);
            return cell;
        }

        // ─── Main export function (replaces the stub) ────────────────────────────────
        const downloadData = async () => {
            try {
                // Guard: need ExcelJS
                if (typeof ExcelJS === 'undefined') {
                    alert('ExcelJS is not loaded. Cannot export.');
                    return;
                }

                // ── NEW: guard — no table visible ──────────────────────────────
                if (!showTable.value) {
                    alert('No data to export. Please select a location first!');
                    return;
                }

                const isEmpView = showEmployeesTable.value;
                const COLS = isEmpView ? EMP_COLS : DEPT_COLS;
                const NCOLS = COLS.length;

                // Decide which entity list to iterate
                const entities = isEmpView
                    ? selectedDepartmentData.value.map(dept => ({
                        _isDeptGroup: true,
                        dept,
                        employees: dept.employees || []
                    }))
                    : selectedDepartmentData.value;

                const getTotals = isEmpView
                    ? (e) => getEmpTotals(e)
                    : (e) => getDeptTotals(e);

                // Collect date range string for title
                let dateLabel = '';
                if (selectedDateRange.value && selectedDateRange.value.length === 2) {
                    const fmt = (d) => {
                        const dd = new Date(d);
                        return `${dd.getMonth() + 1}/${dd.getDate()}/${dd.getFullYear()}`;
                    };
                    dateLabel = `${fmt(selectedDateRange.value[0])} – ${fmt(selectedDateRange.value[1])}`;
                }

                // ── Build workbook ────────────────────────────────────────────────────────
                const wb = new ExcelJS.Workbook();
                wb.creator = 'Efficiency Analysis';
                wb.created = new Date();

                const ws = wb.addWorksheet('Efficiency Report', {
                    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
                });

                // Set column widths
                ws.columns = COLS.map((c) => ({ width: c.width }));

                // ── Row 1: Report title ───────────────────────────────────────────────────
                let currentRow = 1;
                const titleCell = ws.getCell(currentRow, 1);
                titleCell.value = ('EFFICIENCY ANALYSIS REPORT - ' + dashboardTitle.value + (dateLabel ? `  |  ${dateLabel}` : '')).toUpperCase(); // ADD .toUpperCase()
                titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: CLR.headerFg } };
                titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.headerBg } };
                titleCell.alignment = { horizontal: 'left', vertical: 'middle' }; // CHANGE 'left' → 'left'
                safeMerge(ws, currentRow, 1, currentRow, NCOLS);
                ws.getRow(currentRow).height = 22;
                currentRow++;

                // ── Row 2: blank spacer ───────────────────────────────────────────────────
                currentRow++;

                // ── Row 3: Column headers ─────────────────────────────────────────────────
                const headerRow = currentRow;
                COLS.forEach((col, i) => {
                    const cell = ws.getCell(headerRow, i + 1);
                    cell.value = col.label;
                    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: CLR.headerFg } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.headerBg } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    borderCell(cell);
                });
                ws.getRow(headerRow).height = 28;
                currentRow++;

                // ── Data rows ─────────────────────────────────────────────────────────────
                // We need to know the row span for each entity upfront so we can merge.
                // ── Data rows ─────────────────────────────────────────────────────────────
                if (isEmpView) {
                    // Column mapping:
                    //  1=Department  2=Employee  3=No.of Bags  4=Item Category  5=Sub Category
                    //  6=Bag Count   7=Style Number  8=Bag Name
                    //  9=Issued Net Wt Gold  10=Recv Qty Gold  11=Gross Loss  12=Gross Loss% 13=Purity %
                    // 14=Pure Weight  15=Pure Loss  16=Net Loss  17=Net Loss%
                    // 18=Issued Net Wt Diamond  19=Recv Qty Diamond  20=Loss Qty Diamond  21=Diamond Loss%
                    // 22=Recv Pieces  23=Loss Pieces  24=Recovery Wt  25=Recovery%

                    selectedDepartmentData.value.forEach((dept) => {
                        const employees = dept.employees || [];

                        // Total rows this dept occupies:
                        // each employee: (data rows) + 1 subtotal row
                        // plus 1 for the dept subtotal row itself
                        const deptTotalRowSpan = employees.reduce((sum, entity) => {
                            const cats = entity.unique_categories_array || [];
                            const empRowCount = cats.reduce((s, cat) => {
                                return s + ((entity.category_bag_names_map?.[cat] || ['']).length || 1);
                            }, 0) || 1;
                            return sum + empRowCount + 1;
                        }, 0) + 1;

                        let deptColWritten = false;

                        employees.forEach((entity) => {
                            const categories = entity.unique_categories_array || [];

                            const entityRowCount = categories.reduce((sum, cat) => {
                                return sum + ((entity.category_bag_names_map?.[cat] || ['']).length || 1);
                            }, 0) || 1;

                            const entityStartRow = currentRow;
                            let catStartRow = currentRow;
                            let firstRowOfEmp = true;

                            categories.forEach((category) => {
                                const bagNames = entity.category_bag_names_map?.[category] || [''];
                                const catRowCount = bagNames.length || 1;

                                bagNames.forEach((bagName, bagIdx) => {
                                    const r = currentRow;
                                    const bagRow = (colIdx, value, opts = {}) => writeCell(ws, r, colIdx, value, opts);

                                    // ── Col 1: Department — written once per dept, merged over all dept rows ──
                                    if (!deptColWritten && firstRowOfEmp && bagIdx === 0) {
                                        const deptCell = ws.getCell(r, 1);
                                        deptCell.value = dept.name;
                                        deptCell.font = { name: 'Calibri', size: 9, bold: true };
                                        deptCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.whiteBg } };
                                        deptCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                                        borderCell(deptCell);
                                        if (deptTotalRowSpan > 1) {
                                            safeMerge(ws, r, 1, r + deptTotalRowSpan - 1, 1);
                                        }
                                        deptColWritten = true;
                                    }

                                    // ── Col 2: Employee — written once per employee, merged over its data rows ──
                                    if (firstRowOfEmp && bagIdx === 0) {
                                        const empCell = ws.getCell(r, 2);
                                        empCell.value = entity.name;
                                        empCell.font = { name: 'Calibri', size: 9 };
                                        empCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.whiteBg } };
                                        empCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                                        borderCell(empCell);
                                        if (entityRowCount > 1) {
                                            safeMerge(ws, r, 2, r + entityRowCount - 1, 2);
                                        }
                                    }

                                    // ── Col 3: No. of Bags — once per employee, merged over its data rows ──
                                    if (firstRowOfEmp && bagIdx === 0) {
                                        const bagCntCell = ws.getCell(r, 3);
                                        bagCntCell.value = entity.bag_count || 0;
                                        bagCntCell.font = { name: 'Calibri', size: 9 };
                                        bagCntCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.bagCntBg } };
                                        bagCntCell.alignment = { horizontal: 'center', vertical: 'middle' };
                                        borderCell(bagCntCell);
                                        if (entityRowCount > 1) {
                                            safeMerge(ws, r, 3, r + entityRowCount - 1, 3);
                                        }
                                    }

                                    // ── Col 4: Item Category — once per category, merged over its bags ──
                                    if (bagIdx === 0) {
                                        const catCell = ws.getCell(r, 4);
                                        catCell.value = category || 'N/A';
                                        catCell.font = { name: 'Calibri', size: 9 };
                                        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.catBg } };
                                        catCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                                        borderCell(catCell);
                                        if (catRowCount > 1) {
                                            safeMerge(ws, r, 4, r + catRowCount - 1, 4);
                                        }
                                    }

                                    // ── Col 5: Sub Category — per bag ──
                                    bagRow(5, entity.category_bag_sub_category_map?.[category]?.[bagName] || '-', { align: 'center' });

                                    // ── Col 6: Bag Count — once per category, merged over its bags ──
                                    if (bagIdx === 0) {
                                        const bcCell = ws.getCell(r, 6);
                                        bcCell.value = entity.category_bag_count_map?.[category] || 0;
                                        bcCell.font = { name: 'Calibri', size: 9 };
                                        bcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.bagCntBg } };
                                        bcCell.alignment = { horizontal: 'center', vertical: 'middle' };
                                        borderCell(bcCell);
                                        if (catRowCount > 1) {
                                            safeMerge(ws, r, 6, r + catRowCount - 1, 6);
                                        }
                                    }

                                    // ── Col 7: Style Number — per bag ──
                                    bagRow(7, entity.category_bag_print_design_map?.[category]?.[bagName] || '-', { align: 'center' });

                                    // ── Col 8: Bag Name — per bag ──
                                    bagRow(8, bagName || '-', { align: 'center' });

                                    // ── Quantity calculations ──
                                    const sG  = getEmpBagStartingQtyGoldRaw(entity, category, bagName);
                                    const iG  = getEmpBagIssuedQtyGoldRaw(entity, category, bagName);
                                    const lG  = getEmpBagLossQtyGoldRaw(entity, category, bagName);
                                    const scG = getEmpBagScrapQtyGoldRaw(entity, category, bagName);
                                    const bG  = getEmpBagBalanceQtyGoldRaw(entity, category, bagName);
                                    const sD  = getEmpBagStartingQtyDiamondRaw(entity, category, bagName);
                                    const iD  = getEmpBagIssuedQtyDiamondRaw(entity, category, bagName);
                                    const lD  = getEmpBagLossQtyDiamondRaw(entity, category, bagName);
                                    const scD = getEmpBagScrapQtyDiamondRaw(entity, category, bagName);
                                    const bD  = getEmpBagBalanceQtyDiamondRaw(entity, category, bagName);
                                    const rPc = getEmpBagReceivedPiecesRaw(entity, category, bagName);
                                    const lPc = getEmpBagLossPiecesRaw(entity, category, bagName);
                                    const purityFactor = getEmpBagPurityFactor(entity, category, bagName);

                                    const issuedNetWtG   = sG + iG - scG - bG;
                                    const recvG          = sG + iG - lG - scG - bG;
                                    const pureWt         = recvG * purityFactor;
                                    const pureLoss       = lG * purityFactor;
                                    const netLoss        = recvG > 0 ? lG / recvG : 0;
                                    const grossLossPct   = recvG > 0 ? (lG / recvG) * 100 : 0;
                                    const netLossPct     = netLoss * 100;
                                    const issuedNetWtD   = sD + iD - scD - bD;
                                    const recvD          = sD + iD - lD - scD - bD;
                                    const diamondLossPct = recvD > 0 ? (lD / recvD) * 100 : 0;
                                    const recoveryWt = getEmpBagRecoveryWeight(entity, category, bagName, dept);
                                    const deptPct = getDeptRecoveryPercentage(dept);
                                    const recoveryPct = recoveryWt > 0 && deptPct > 0 ? deptPct : 0;

                                    bagRow(9,  roundToTwo(issuedNetWtG),       { align: 'center' });
                                    bagRow(10, roundToTwo(recvG),               { align: 'center' });
                                    bagRow(11, roundToTwo(lG),                  { isLoss: true, align: 'center' });
                                    bagRow(12, (roundToTwo(grossLossPct)) + '%',   { isLoss: true, align: 'center' });
                                    bagRow(13, getEmpBagQtyData(entity, category, bagName)?.metal_purity_percent !== undefined ? getEmpBagQtyData(entity, category, bagName).metal_purity_percent + '%' : '-', { align: 'center' });
                                    bagRow(14, roundToTwo(pureWt),              { align: 'center' });
                                    bagRow(15, roundToTwo(pureLoss),            { isLoss: true, align: 'center' });
                                    bagRow(16, roundToTwo(netLoss),             { isLoss: true, align: 'center' });
                                    bagRow(17, (roundToTwo(netLossPct)) + '%',     { isLoss: true, align: 'center' });
                                    bagRow(18, roundToTwo(issuedNetWtD),        { align: 'center' });
                                    bagRow(19, roundToTwo(recvD),               { align: 'center' });
                                    bagRow(20, roundToTwo(lD),                  { isLoss: true, align: 'center' });
                                    bagRow(21, (roundToTwo(diamondLossPct)) + '%', { isLoss: true, align: 'center' });
                                    bagRow(22, roundToTwo(rPc),                 { align: 'center' });
                                    bagRow(23, roundToTwo(lPc),                 { isLoss: true, align: 'center' });
                                    bagRow(24, recoveryWt > 0 ? roundToTwo(recoveryWt) : 0, { align: 'center' });
                                    bagRow(25, recoveryPct > 0 ? roundToTwo(recoveryPct) + '%' : '0%', { align: 'center' });

                                    ws.getRow(r).height = 16;
                                    currentRow++;

                                    // flip after first bag of first category of this employee
                                    if (firstRowOfEmp && bagIdx === 0) firstRowOfEmp = false;
                                }); // end bags loop

                                catStartRow += catRowCount;
                            }); // end categories loop

                            // ── Employee subtotal row ─────────────────────────────────────────────
                            // Mirrors "<emp.name> — Total" in HTML table
                            const empTotals = getSummaryEmpTotals(entity, dept);
                            const empSubR = currentRow;
                            const EMP_SUB_BG = CLR.totalBg; // light indigo

                            // Col 1: dept is already merged — apply background only
                            const empSubCol1 = ws.getCell(empSubR, 1);
                            empSubCol1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMP_SUB_BG } };
                            borderCell(empSubCol1);

                            // Col 2: label, merged cols 2-5
                            const empLabelCell = ws.getCell(empSubR, 2);
                            empLabelCell.value = `${entity.name} — Total`;
                            empLabelCell.font = { name: 'Calibri', size: 9, bold: true };
                            empLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMP_SUB_BG } };
                            empLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
                            borderCell(empLabelCell);
                            safeMerge(ws, empSubR, 2, empSubR, 5);

                            // Col 6: bag count
                            const empBagCell = ws.getCell(empSubR, 6);
                            empBagCell.value = entity.bag_count || 0;
                            empBagCell.font = { name: 'Calibri', size: 9, bold: true };
                            empBagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.bagCntBg } };
                            empBagCell.alignment = { horizontal: 'center', vertical: 'middle' };
                            borderCell(empBagCell);

                            // Cols 7-8: blank styled
                            [7, 8].forEach((col) => {
                                const c = ws.getCell(empSubR, col);
                                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMP_SUB_BG } };
                                borderCell(c);
                            });

                            // Cols 9-25: totals
                            [
                                [9,  roundToTwo(empTotals.issuedNetWt),       false],
                                [10, roundToTwo(empTotals.recvG),              false],
                                [11, roundToTwo(empTotals.lG),                 true ],
                                [12, empTotals.grossLossPct,              true ],
                                [13, '',                                       false],
                                [14, roundToTwo(empTotals.pw),                 false],
                                [15, roundToTwo(empTotals.pl),                 true ],
                                [16, roundToTwo(empTotals.netLoss),            true ],
                                [17, empTotals.netLossPct,                true ],
                                [18, roundToTwo(empTotals.issuedNetWtDiamond), false],
                                [19, roundToTwo(empTotals.aD),                 false],
                                [20, roundToTwo(empTotals.lD),                 true ],
                                [21, empTotals.diamondLossPct,            true ],
                                [22, roundToTwo(empTotals.receivedPieces),     false],
                                [23, roundToTwo(empTotals.lossPieces),         true ],
                                [24, roundToTwo(empTotals.recoveryWt),         false],
                                [25, empTotals.recoveryPct,               false],
                            ].forEach(([col, val, isLoss]) => {
                                const c = ws.getCell(empSubR, col);
                                c.value = val;
                                c.font = { name: 'Calibri', size: 9, bold: true, color: isLoss ? { argb: CLR.lossFg } : undefined };
                                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMP_SUB_BG } };
                                c.alignment = { horizontal: 'center', vertical: 'middle' };
                                borderCell(c);
                            });

                            ws.getRow(empSubR).height = 16;
                            currentRow++;
                        }); // end employees loop

                        // ── Department subtotal row — after all employees in this dept ────────────
                        // Mirrors "<dept.name> — Total" in HTML table
                        const deptTotals = getSummaryDeptTotals(dept);
                        const deptSubR = currentRow;
                        const DEPT_SUB_BG = 'FFE0E7FF';

                        // Col 1: dept is already merged — apply background only
                        const deptSubCol1 = ws.getCell(deptSubR, 1);
                        deptSubCol1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DEPT_SUB_BG } };
                        borderCell(deptSubCol1);

                        // Col 2: label, merged cols 2-5
                        const deptLabelCell = ws.getCell(deptSubR, 2);
                        deptLabelCell.value = `${dept.name} — Total`;
                        deptLabelCell.font = { name: 'Calibri', size: 9, bold: true };
                        deptLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DEPT_SUB_BG } };
                        deptLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        borderCell(deptLabelCell);
                        safeMerge(ws, deptSubR, 2, deptSubR, 5);

                        // Col 6: dept bag count
                        const deptBagCell = ws.getCell(deptSubR, 6);
                        deptBagCell.value = dept.bag_count || 0;
                        deptBagCell.font = { name: 'Calibri', size: 9, bold: true };
                        deptBagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.bagCntBg } };
                        deptBagCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        borderCell(deptBagCell);

                        // Cols 7-8: blank styled
                        [7, 8].forEach((col) => {
                            const c = ws.getCell(deptSubR, col);
                            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DEPT_SUB_BG } };
                            borderCell(c);
                        });

                        // Cols 9-25: dept totals
                        [
                            [9,  roundToTwo(deptTotals.issuedNetWt),       false],
                            [10, roundToTwo(deptTotals.recvG),              false],
                            [11, roundToTwo(deptTotals.lG),                 true ],
                            [12, deptTotals.grossLossPct,                   true ],
                            [13, '',                                        false],
                            [14, roundToTwo(deptTotals.pw),                 false],
                            [15, roundToTwo(deptTotals.pl),                 true ],
                            [16, roundToTwo(deptTotals.netLoss),            true ],
                            [17, deptTotals.netLossPct,                     true ],
                            [18, roundToTwo(deptTotals.issuedNetWtDiamond), false],
                            [19, roundToTwo(deptTotals.aD),                 false],
                            [20, roundToTwo(deptTotals.lD),                 true ],
                            [21, deptTotals.diamondLossPct,                 true ],
                            [22, roundToTwo(deptTotals.receivedPieces),     false],
                            [23, roundToTwo(deptTotals.lossPieces),         true ],
                            [24, roundToTwo(deptTotals.recoveryWt),         false],
                            [25, deptTotals.recoveryPct,                    false],
                        ].forEach(([col, val, isLoss]) => {
                            const c = ws.getCell(deptSubR, col);
                            c.value = val;
                            c.font = { name: 'Calibri', size: 9, bold: true, color: isLoss ? { argb: CLR.lossFg } : undefined };
                            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DEPT_SUB_BG } };
                            c.alignment = { horizontal: 'center', vertical: 'middle' };
                            borderCell(c);
                        });

                        ws.getRow(deptSubR).height = 18;
                        currentRow++;
                    }); // end dept groups loop

                } // end isEmpView
                else {
                    // ── DEPARTMENT VIEW: original logic unchanged ──────────────────────────
                    entities.forEach((entity, entityIdx) => {
                        const categories = entity.unique_categories_array || [];

                        const entityRowCount = categories.reduce((sum, cat) => {
                            return sum + ((entity.category_bag_names_map?.[cat] || ['']).length || 1);
                        }, 0) || 1;

                        const entityStartRow = currentRow;
                        let catStartRow = currentRow;

                        categories.forEach((category) => {
                            const bagNames = entity.category_bag_names_map?.[category] || [''];
                            const catRowCount = bagNames.length || 1;

                            bagNames.forEach((bagName, bagIdx) => {
                                const r = currentRow;
                                const bagRow = (colIdx, value, opts = {}) => writeCell(ws, r, colIdx, value, opts);

                                if (catStartRow === entityStartRow && bagIdx === 0) {
                                    bagRow(1, entityIdx + 1, { align: 'center' });
                                    bagRow(2, entity.name, { bold: false, align: 'center' });
                                    bagRow(3, entity.bag_count || 0, { align: 'center', bgARGB: CLR.bagCntBg });
                                }
                                if (bagIdx === 0) {
                                    bagRow(4, category || 'N/A', { bgARGB: CLR.catBg, align: 'center' });
                                    bagRow(6, entity.category_bag_count_map?.[category] || 0, { align: 'center', bgARGB: CLR.bagCntBg });
                                }

                                bagRow(5, entity.category_bag_sub_category_map?.[category]?.[bagName] || '-', { align: 'center' });
                                bagRow(7, entity.category_bag_print_design_map?.[category]?.[bagName] || '-', { align: 'center' });
                                bagRow(8, bagName || '-', { align: 'center' });

                                const sG  = getBagStartingQtyGoldRaw(entity, category, bagName);
                                const iG  = getBagIssuedQtyGoldRaw(entity, category, bagName);
                                const lG  = getBagLossQtyGoldRaw(entity, category, bagName);
                                const scG = getBagScrapQtyGoldRaw(entity, category, bagName);
                                const bG  = getBagBalanceQtyGoldRaw(entity, category, bagName);
                                const sD  = getBagStartingQtyDiamondRaw(entity, category, bagName);
                                const iD  = getBagIssuedQtyDiamondRaw(entity, category, bagName);
                                const lD  = getBagLossQtyDiamondRaw(entity, category, bagName);
                                const scD = getBagScrapQtyDiamondRaw(entity, category, bagName);
                                const bD  = getBagBalanceQtyDiamondRaw(entity, category, bagName);
                                const rPc = getBagReceivedPiecesRaw(entity, category, bagName);
                                const lPc = getBagLossPiecesRaw(entity, category, bagName);
                                const purityFactor = getBagPurityFactor(entity, category, bagName);

                                const issuedNetWtG  = sG + iG - scG - bG;
                                const recvG         = sG + iG - lG - scG - bG;
                                const pureWt        = recvG * purityFactor;
                                const pureLoss      = lG * purityFactor;
                                const netLoss       = recvG > 0 ? lG / recvG : 0;
                                const grossLossPct  = recvG > 0 ? (lG / recvG) * 100 : 0;
                                const netLossPct    = netLoss * 100;
                                const issuedNetWtD  = sD + iD - scD - bD;
                                const recvD         = sD + iD - lD - scD - bD;
                                const diamondLossPct = recvD > 0 ? (lD / recvD) * 100 : 0;
                                const recoveryWt    = getBagRecoveryWeight(entity, category, bagName);
                                const deptPct       = getDeptRecoveryPercentage(entity);
                                const recoveryPct   = recoveryWt > 0 && deptPct > 0 ? deptPct : 0;

                                bagRow(9,  roundToTwo(issuedNetWtG),        { align: 'center' });
                                bagRow(10, roundToTwo(recvG),               { align: 'center' });
                                bagRow(11, roundToTwo(lG),                  { isLoss: true, align: 'center' });
                                bagRow(12, (roundToTwo(grossLossPct)) + '%',   { isLoss: true, align: 'center' });
                                bagRow(13, getBagQtyData(entity, category, bagName)?.metal_purity_percent !== undefined ? getBagQtyData(entity, category, bagName).metal_purity_percent + '%' : '-', { align: 'center' });
                                bagRow(14, roundToTwo(pureWt),              { align: 'center' });
                                bagRow(15, roundToTwo(pureLoss),            { isLoss: true, align: 'center' });
                                bagRow(16, roundToTwo(netLoss),             { isLoss: true, align: 'center' });
                                bagRow(17, (roundToTwo(netLossPct)) + '%',     { isLoss: true, align: 'center' });
                                bagRow(18, roundToTwo(issuedNetWtD),        { align: 'center' });
                                bagRow(19, roundToTwo(recvD),               { align: 'center' });
                                bagRow(20, roundToTwo(lD),                  { isLoss: true, align: 'center' });
                                bagRow(21, (roundToTwo(diamondLossPct)) + '%', { isLoss: true, align: 'center' });
                                bagRow(22, roundToTwo(rPc),                 { align: 'center' });
                                bagRow(23, roundToTwo(lPc),                 { isLoss: true, align: 'center' });
                                bagRow(24, recoveryWt > 0 ? roundToTwo(recoveryWt) : 0, { align: 'center' });
                                bagRow(25, recoveryPct > 0 ? roundToTwo(recoveryPct) + '%' : '0%', { align: 'center' });

                                ws.getRow(r).height = 16;
                                currentRow++;
                            }); // end bags loop

                            if (catRowCount > 1) {
                                safeMerge(ws, catStartRow, 4, catStartRow + catRowCount - 1, 4);
                                safeMerge(ws, catStartRow, 6, catStartRow + catRowCount - 1, 6);
                            }
                            catStartRow += catRowCount;
                        }); // end categories loop

                        if (entityRowCount > 1) {
                            safeMerge(ws, entityStartRow, 1, entityStartRow + entityRowCount, 1);
                            safeMerge(ws, entityStartRow, 2, entityStartRow + entityRowCount, 2);
                            safeMerge(ws, entityStartRow, 3, entityStartRow + entityRowCount, 3);
                        } else {
                            safeMerge(ws, entityStartRow, 1, entityStartRow + 1, 1);
                            safeMerge(ws, entityStartRow, 2, entityStartRow + 1, 2);
                            safeMerge(ws, entityStartRow, 3, entityStartRow + 1, 3);
                        }

                        // ── Dept subtotal row ───────────────────────────────────────────────
                        const totals = getSummaryDeptTotals(entity);
                        const subR = currentRow;

                        const labelCell = ws.getCell(subR, 2);
                        labelCell.value = `${entity.name}`;
                        labelCell.font = { name: 'Calibri', size: 9, bold: true };
                        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.totalBg } };
                        labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        borderCell(labelCell);
                        safeMerge(ws, subR, 2, subR, 3);

                        // Item Category + Sub Category columns: show dept total label
                        const catLabelCell = ws.getCell(subR, 4);
                        catLabelCell.value = `${entity.name} — Total`;
                        catLabelCell.font = { name: 'Calibri', size: 9, bold: true };
                        catLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.totalBg } };
                        catLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
                        borderCell(catLabelCell);
                        safeMerge(ws, subR, 4, subR, 5);

                        const bagCntCell2 = ws.getCell(subR, 6);
                        bagCntCell2.value = entity.bag_count || 0;
                        bagCntCell2.font = { name: 'Calibri', size: 9, bold: true };
                        bagCntCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.bagCntBg } };
                        bagCntCell2.alignment = { horizontal: 'center', vertical: 'middle' };
                        borderCell(bagCntCell2);

                        // Cols 9-25: totals
                        [
                            [9,  roundToTwo(totals.issuedNetWt),      false],
                            [10, roundToTwo(totals.recvG),             false],
                            [11, roundToTwo(totals.lG),                true],
                            [12, totals.grossLossPct,             true],
                            [13, '',                                   false],
                            [14, roundToTwo(totals.pw),                false],
                            [15, roundToTwo(totals.pl),                true],
                            [16, roundToTwo(totals.netLoss),           true],
                            [17, totals.netLossPct,               true],
                            [18, roundToTwo(totals.issuedNetWtDiamond),false],
                            [19, roundToTwo(totals.aD),                false],
                            [20, roundToTwo(totals.lD),                true],
                            [21, totals.diamondLossPct,           true],
                            [22, roundToTwo(totals.receivedPieces),    false],
                            [23, roundToTwo(totals.lossPieces),        true],
                            [24, roundToTwo(totals.recoveryWt),        false],
                            [25, totals.recoveryPct,              false],
                        ].forEach(([col, val, isLoss]) => {
                            const c = ws.getCell(subR, col);
                            c.value = val;
                            c.font = { name: 'Calibri', size: 9, bold: true, color: isLoss ? { argb: CLR.lossFg } : undefined };
                            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.totalBg } };
                            c.alignment = { horizontal: 'center', vertical: 'middle' };
                            borderCell(c);
                        });

                        [1, 7, 8].forEach((col) => {
                            const c = ws.getCell(subR, col);
                            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.totalBg } };
                            borderCell(c);
                        });

                        ws.getRow(subR).height = 16;
                        currentRow++;
                    }); // end entities loop
                } // end if/else isEmpView // end entities loop

                // ── Grand total row (both Department and Employee views) ─────────────────
                if (!isEmpView) {
                    const gR = currentRow;

                    // Pull totals from the correct computed set
                    const bagCount = isEmpView ? totalEmpBagCount.value : totalDeptBagCount.value;
                    const issuedNWG = isEmpView ? parseFloat(totalEmpIssuedNetWeightGold.value) : parseFloat(totalDeptIssuedNetWeightGold.value);
                    const recvG = isEmpView ? parseFloat(totalEmpReceivedQtyGold.value) : parseFloat(totalDeptReceivedQtyGold.value);
                    const lossG = isEmpView ? parseFloat(totalEmpLossQuantityGold.value) : parseFloat(totalDeptLossQtyGold.value);
                    const pureWt = isEmpView ? parseFloat(totalEmpPureWeight.value) : parseFloat(totalDeptPureWeight.value);
                    const pureLoss = isEmpView ? parseFloat(totalEmpPureLoss.value) : parseFloat(totalDeptPureLoss.value);
                    const issuedNWD = isEmpView ? parseFloat(totalEmpIssuedNetWeightDiamond.value) : parseFloat(totalDeptIssuedNetWeightDiamond.value);
                    const recvD = isEmpView ? parseFloat(totalEmpReceivedQtyDiamond.value) : parseFloat(totalDeptReceivedQtyDiamond.value);
                    const lossD = isEmpView ? parseFloat(totalEmpLossQuantityDiamond.value) : parseFloat(totalDeptLossQtyDiamond.value);
                    const recvPieces = isEmpView ? parseFloat(totalEmpReceivedPieces.value) : parseFloat(totalDeptReceivedPieces.value);
                    const lossPieces = isEmpView ? parseFloat(totalEmpLossPieces.value) : parseFloat(totalDeptLossPieces.value);
                    const recoveryWt = isEmpView ? parseFloat(totalEmpGoldRecoveryWeight.value) : parseFloat(totalDeptGoldRecoveryWeight.value);

                    const grandLabel = ws.getCell(gR, 1);
                    grandLabel.value = 'Grand Total';
                    grandLabel.font = { name: 'Calibri', size: 9, bold: true };
                    grandLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.grandBg } };
                    grandLabel.alignment = { horizontal: 'center', vertical: 'middle' };
                    borderCell(grandLabel);
                    safeMerge(ws, gR, 1, gR, 2);

                    // Bag count cell
                    const gbC = ws.getCell(gR, 3);
                    gbC.value = bagCount;
                    gbC.font = { name: 'Calibri', size: 9, bold: true };
                    gbC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.bagCntBg } };
                    gbC.alignment = { horizontal: 'center', vertical: 'middle' };
                    borderCell(gbC);

                    const grandNums = [
                        [4, '', false],
                        [5, '', false],
                        [6, '', false],
                        [7, '', false],
                        [8, '', false],
                        [9, roundToTwo(issuedNWG), false],
                        [10, roundToTwo(recvG), false],
                        [11, roundToTwo(lossG), true],
                        [12, recvG > 0 ? roundToTwo((lossG / recvG * 100)) + '%' : '0%', true],
                        [13, '', false],
                        [14, roundToTwo(pureWt), false],
                        [15, roundToTwo(pureLoss), true],
                        [16, recvG > 0 ? roundToTwo((lossG / recvG)) : 0, true],
                        [17, recvG > 0 ? roundToTwo((lossG / recvG * 100)) + '%' : '0%', true],
                        [18, roundToTwo(issuedNWD), false],
                        [19, roundToTwo(recvD), false],
                        [20, roundToTwo(lossD), true],
                        [21, recvD > 0 ? roundToTwo((lossD / recvD * 100)) + '%' : '0%', true],
                        [22, roundToTwo(recvPieces), false],
                        [23, roundToTwo(lossPieces), true],
                        [24, roundToTwo(recoveryWt), false],
                        [25, parseFloat(recoveryWt) > 0 && parseFloat(pureLoss) > 0
                            ? roundToTwo((parseFloat(recoveryWt) / parseFloat(pureLoss)) * 100) + '%'
                            : '0%', false],
                    ];

                    grandNums.forEach(([col, val, isLoss]) => {
                        const c = ws.getCell(gR, col);
                        c.value = val;
                        c.font = {
                            name: 'Calibri', size: 9, bold: true,
                            color: isLoss ? { argb: CLR.lossFg } : undefined,
                        };
                        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLR.grandBg } };
                        c.alignment = { horizontal: 'center', vertical: 'middle' };
                        borderCell(c);
                    });

                    ws.getRow(gR).height = 16;
                }

                // ── Freeze header row ─────────────────────────────────────────────────────
                ws.views = [{ state: 'frozen', ySplit: headerRow, xSplit: isEmpView ? 2 : 3 }]; 

                // ── Generate filename with timestamp ──────────────────────────────────────
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const ts = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_` +
                    `${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
                const filename = `Efficiency_Report_${ts}.xlsx`;

                // ── Write & download ──────────────────────────────────────────────────────
                const buffer = await wb.xlsx.writeBuffer();
                saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);

            } catch (err) {
                console.error('Excel export failed:', err);
                alert(`Export failed: ${err.message}`);
            }
        };

        // **Helper Function to Round Values to 2 Decimal Places (Always Rounds - for Cards)**
        const roundToTwoAlways = (value) => {
            const n = parseFloat(value);
            if (isNaN(n)) return 0;
            return Math.round(n * 100) / 100;
        };

        // **Helper Function to Round Values Based on Decimal Places Setting (Respects Toggle - for Tables)**
        const roundToTwo = (value) => {
            const n = parseFloat(value);
            if (isNaN(n)) return 0;
            const multiplier = Math.pow(10, decimalPlaces.value);
            return Math.round(n * multiplier) / multiplier;
        };

        // **Helper Function to Conditionally Round Based on Decimal Places**
        const displayValue = (value) => {
            return roundToTwo(value);
        };

        // Helper function to get total actual production gold for a location
        const getLocationTotalActualProductionGold = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.received_qty_gold !== undefined
                    ? parseFloat(dept.received_qty_gold || 0)
                    : getDepartmentTotalActualProductionGold(dept);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total actual production diamond for a location
        const getLocationTotalActualProductionDiamond = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.received_qty_diamond !== undefined
                    ? parseFloat(dept.received_qty_diamond || 0)
                    : getDepartmentTotalActualProductionDiamond(dept);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total unique bags for a location
        const getLocationTotalBagCount = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            const uniqueBags = new Set();
            location.departments.forEach(dept => {
                if (dept.unique_bags_array && Array.isArray(dept.unique_bags_array)) {
                    dept.unique_bags_array.forEach(bag => uniqueBags.add(bag));
                }
            });
            // If no unique_bags_array, fallback to summing bag_count
            if (uniqueBags.size === 0) {
                let sum = 0;
                location.departments.forEach(dept => {
                    sum += parseInt(dept.bag_count || 0);
                });
                return sum;
            }
            return uniqueBags.size;
        };

        // Helper function to get total issued quantity gold for a location
        // Now sums the green text from department cards (includes wax tree overrides)
        const getLocationTotalIssuedQtyGold = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                // Prefer pre-computed summary field; fall back to per-bag calculation
                sum += dept.issued_net_wt_gold !== undefined
                    ? parseFloat(dept.issued_net_wt_gold || 0)
                    : parseFloat(getDeptTotals(dept).issuedNetWt || 0);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total issued quantity diamond for a location
        const getLocationTotalIssuedQtyDiamond = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.issued_net_wt_diamond !== undefined
                    ? parseFloat(dept.issued_net_wt_diamond || 0)
                    : getDepartmentTotalIssuedQtyDiamond(dept);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total loss quantity gold for a location
        // Now sums the red text from department cards (includes wax tree overrides)
        const getLocationTotalLossQtyGold = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.gross_loss_gold !== undefined
                    ? parseFloat(dept.gross_loss_gold || 0)
                    : parseFloat(getDeptTotals(dept).lG || 0);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total loss quantity diamond for a location
        const getLocationTotalLossQtyDiamond = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.loss_qty_diamond !== undefined
                    ? parseFloat(dept.loss_qty_diamond || 0)
                    : getDepartmentTotalLossQtyDiamond(dept);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total issued pieces diamond for a location
        const getLocationTotalIssuedPiecesDiamond = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.received_pieces !== undefined
                    ? parseFloat(dept.received_pieces || 0)
                    : getDepartmentTotalIssuedPiecesDiamond(dept);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total loss pieces diamond for a location
        const getLocationTotalLossPiecesDiamond = (location) => {
            if (!location.departments || location.departments.length === 0) return 0;
            let sum = 0;
            location.departments.forEach(dept => {
                sum += dept.loss_pieces !== undefined
                    ? parseFloat(dept.loss_pieces || 0)
                    : getDepartmentTotalLossPiecesDiamond(dept);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total issued quantity gold for an employee
        const getEmployeeTotalIssuedQtyGold = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.issued_net_wt_gold !== undefined) {
                return roundToTwo(parseFloat(emp.issued_net_wt_gold || 0));
            }
            if (emp.categories && emp.categories.length > 0) {
                let sum = 0;
                emp.categories.forEach(cat => {
                    sum += parseFloat(cat.starting_qty_gold || 0)
                        + parseFloat(cat.issued_qty_gold || 0)
                        - parseFloat(cat.scrap_qty_gold || 0)
                        - parseFloat(cat.balance_qty_gold || 0);
                });
                return roundToTwo(sum);
            }
            return 0;
        };

        // Helper function to get total issued quantity diamond for an employee
        const getEmployeeTotalIssuedQtyDiamond = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.issued_net_wt_diamond !== undefined) {
                return roundToTwo(parseFloat(emp.issued_net_wt_diamond || 0));
            }
            if (emp.categories && emp.categories.length > 0) {
                let sum = 0;
                emp.categories.forEach(cat => {
                    sum += parseFloat(cat.starting_qty_diamond || 0)
                        + parseFloat(cat.issued_qty_diamond || 0)
                        - parseFloat(cat.scrap_qty_diamond || 0)
                        - parseFloat(cat.balance_qty_diamond || 0);
                });
                return roundToTwo(sum);
            }
            return 0;
        };

        // Helper function to get total loss quantity gold for an employee
        const getEmployeeTotalLossQtyGold = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.gross_loss_gold !== undefined) {
                return roundToTwo(parseFloat(emp.gross_loss_gold || 0));
            }
            if (!emp.categories || emp.categories.length === 0) return 0;
            let sum = 0;
            emp.categories.forEach(cat => {
                sum += parseFloat(cat.loss_qty_gold || 0);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total loss quantity diamond for an employee
        const getEmployeeTotalLossQtyDiamond = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.loss_qty_diamond !== undefined) {
                return roundToTwo(parseFloat(emp.loss_qty_diamond || 0));
            }
            if (emp.categories && emp.categories.length > 0) {
                let sum = 0;
                emp.categories.forEach(cat => {
                    sum += parseFloat(cat.loss_qty_diamond || 0);
                });
                return roundToTwo(sum);
            }
            return roundToTwo(parseFloat(emp.loss_quantity_diamond || 0));
        };

        // Helper function to get total actual production gold for an employee
        const getEmployeeTotalActualProductionGold = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.received_qty_gold !== undefined) {
                return roundToTwo(parseFloat(emp.received_qty_gold || 0));
            }
            if (!emp.categories || emp.categories.length === 0) return 0;
            let sum = 0;
            emp.categories.forEach(cat => {
                const actualProd = (
                    parseFloat(cat.starting_qty_gold || 0) +
                    parseFloat(cat.issued_qty_gold || 0) -
                    parseFloat(cat.loss_qty_gold || 0) -
                    parseFloat(cat.scrap_qty_gold || 0) -
                    parseFloat(cat.balance_qty_gold || 0)
                );
                sum += actualProd;
            });
            return roundToTwo(sum);
        };

        // Helper function to get total actual production diamond for an employee
        const getEmployeeTotalActualProductionDiamond = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.received_qty_diamond !== undefined) {
                return roundToTwo(parseFloat(emp.received_qty_diamond || 0));
            }
            if (!emp.categories || emp.categories.length === 0) return 0;
            let sum = 0;
            emp.categories.forEach(cat => {
                const actualProd = (
                    parseFloat(cat.starting_qty_diamond || 0) +
                    parseFloat(cat.issued_qty_diamond || 0) -
                    parseFloat(cat.loss_qty_diamond || 0) -
                    parseFloat(cat.scrap_qty_diamond || 0) -
                    parseFloat(cat.balance_qty_diamond || 0)
                );
                sum += actualProd;
            });
            return roundToTwo(sum);
        };

        // Helper function to get total issued pieces diamond for an employee
        const getEmployeeTotalIssuedPiecesDiamond = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.received_pieces !== undefined) {
                return roundToTwo(parseFloat(emp.received_pieces || 0));
            }
            if (!emp.categories || emp.categories.length === 0) return 0;
            let sum = 0;
            emp.categories.forEach(cat => {
                // Calculate received_pieces = starting_pieces + issued_pieces - scrap_pieces - balance_pieces
                const calculatedReceivedPieces = (cat.starting_pieces_info || 0) + (cat.issued_pieces_info || 0) - (cat.scrap_pieces_info || 0) - (cat.balance_pieces_info || 0);
                sum += parseFloat(calculatedReceivedPieces);
            });
            return roundToTwo(sum);
        };

        // Helper function to get total loss pieces diamond for an employee
        const getEmployeeTotalLossPiecesDiamond = (emp) => {
            // Prefer pre-computed summary field from backend
            if (emp.loss_pieces !== undefined) {
                return roundToTwo(parseFloat(emp.loss_pieces || 0));
            }
            if (!emp.categories || emp.categories.length === 0) return 0;
            let sum = 0;
            emp.categories.forEach(cat => {
                sum += parseFloat(cat.loss_pieces_info || 0);
            });
            return roundToTwo(sum);
        };



        // Helper function to get raw numeric category-level starting quantity for Gold (for calculations)
        const getCategoryStartingQtyGoldRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.starting_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric category-level starting quantity for Diamond (for calculations)
        const getCategoryStartingQtyDiamondRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.starting_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric category-level issued quantity for Gold (for calculations)
        const getCategoryIssuedQtyGoldRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.issued_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric category-level issued quantity for Diamond (for calculations)
        const getCategoryIssuedQtyDiamondRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.issued_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric category-level loss quantity for Gold (for calculations)
        const getCategoryLossQtyGoldRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.loss_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric category-level loss quantity for Diamond (for calculations)
        const getCategoryLossQtyDiamondRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.loss_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric category-level scrap quantity for Gold (for calculations)
        const getCategoryScrapQtyGoldRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.scrap_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric category-level scrap quantity for Diamond (for calculations)
        const getCategoryScrapQtyDiamondRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.scrap_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric category-level balance quantity for Gold (for calculations)
        const getCategoryBalanceQtyGoldRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.balance_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric category-level balance quantity for Diamond (for calculations)
        const getCategoryBalanceQtyDiamondRaw = (dept, category) => {
            if (!dept.category_qty_map) return 0;
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? parseFloat(data.balance_qty_diamond || 0) : 0;
        };

        // ── Per-bag helpers (dept) ──────────────────────────────────────────────
        const getBagQtyData = (dept, category, bagName) => {
            if (!dept.category_bag_qty_map) return null;
            const key = `${dept.id}_${category}_${bagName}`;
            return dept.category_bag_qty_map[key] || null;
        };
        const getBagStartingQtyGoldRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.starting_qty_gold || 0);
        const getBagIssuedQtyGoldRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.issued_qty_gold || 0);
        const getBagLossQtyGoldRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.loss_qty_gold || 0);
        const getBagScrapQtyGoldRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.scrap_qty_gold || 0);
        const getBagBalanceQtyGoldRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.balance_qty_gold || 0);
        const getBagStartingQtyDiamondRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.starting_qty_diamond || 0);
        const getBagIssuedQtyDiamondRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.issued_qty_diamond || 0);
        const getBagLossQtyDiamondRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.loss_qty_diamond || 0);
        const getBagScrapQtyDiamondRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.scrap_qty_diamond || 0);
        const getBagBalanceQtyDiamondRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.balance_qty_diamond || 0);
        // Calculate received_pieces = starting_pieces + issued_pieces - scrap_pieces - balance_pieces
        const getBagReceivedPiecesRaw = (dept, cat, bag) => {
            const bagData = getBagQtyData(dept, cat, bag);
            if (!bagData) return 0;
            const starting = parseFloat(bagData.starting_pieces_info || 0);
            const issued = parseFloat(bagData.issued_pieces_info || 0);
            const scrap = parseFloat(bagData.scrap_pieces_info || 0);
            const balance = parseFloat(bagData.balance_pieces_info || 0);
            return starting + issued - scrap - balance;
        };
        const getBagLossPiecesRaw = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.loss_pieces_info || 0);

        // ── Per-bag helpers (employee) ─────────────────────────────────────────
        // Employee categories array has per-bag entries: { category_name, bag_name, ...qty fields }
        const getEmpBagQtyData = (emp, category, bagName) => {
            if (!emp.categories) return null;
            return emp.categories.find(c => c.category_name === category && c.bag_name === bagName) || null;
        };
        const getEmpBagStartingQtyGoldRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.starting_qty_gold || 0);
        const getEmpBagIssuedQtyGoldRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.issued_qty_gold || 0);
        const getEmpBagLossQtyGoldRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.loss_qty_gold || 0);
        const getEmpBagScrapQtyGoldRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.scrap_qty_gold || 0);
        const getEmpBagBalanceQtyGoldRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.balance_qty_gold || 0);
        const getEmpBagStartingQtyDiamondRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.starting_qty_diamond || 0);
        const getEmpBagIssuedQtyDiamondRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.issued_qty_diamond || 0);
        const getEmpBagLossQtyDiamondRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.loss_qty_diamond || 0);
        const getEmpBagScrapQtyDiamondRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.scrap_qty_diamond || 0);
        const getEmpBagBalanceQtyDiamondRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.balance_qty_diamond || 0);
        // Calculate received_pieces = starting_pieces + issued_pieces - scrap_pieces - balance_pieces
        const getEmpBagReceivedPiecesRaw = (emp, cat, bag) => {
            const bagData = getEmpBagQtyData(emp, cat, bag);
            if (!bagData) return 0;
            const starting = parseFloat(bagData.starting_pieces_info || 0);
            const issued = parseFloat(bagData.issued_pieces_info || 0);
            const scrap = parseFloat(bagData.scrap_pieces_info || 0);
            const balance = parseFloat(bagData.balance_pieces_info || 0);
            return starting + issued - scrap - balance;
        };
        const getEmpBagLossPiecesRaw = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.loss_pieces_info || 0);
        // ──────────────────────────────────────────────────────────────────────

        // Pure Weight = Actual Production Gold × (metal_purity_percent / 100)
        // Pure Loss   = Loss Qty Gold          × (metal_purity_percent / 100)
        const getBagPurityFactor = (dept, cat, bag) => parseFloat(getBagQtyData(dept, cat, bag)?.metal_purity_percent || 0) / 100;
        const getBagPureWeight = (dept, cat, bag) => {
            const purity = getBagPurityFactor(dept, cat, bag);
            const actualProdGold = getBagStartingQtyGoldRaw(dept, cat, bag) + getBagIssuedQtyGoldRaw(dept, cat, bag) - getBagLossQtyGoldRaw(dept, cat, bag) - getBagScrapQtyGoldRaw(dept, cat, bag) - getBagBalanceQtyGoldRaw(dept, cat, bag);
            return actualProdGold * purity; // raw float
        };
        const getBagPureLoss = (dept, cat, bag) => {
            const purity = getBagPurityFactor(dept, cat, bag);
            return getBagLossQtyGoldRaw(dept, cat, bag) * purity; // raw float
        };

        const getEmpBagPurityFactor = (emp, cat, bag) => parseFloat(getEmpBagQtyData(emp, cat, bag)?.metal_purity_percent || 0) / 100;
        const getEmpBagPureWeight = (emp, cat, bag) => {
            const purity = getEmpBagPurityFactor(emp, cat, bag);
            const actualProdGold = getEmpBagStartingQtyGoldRaw(emp, cat, bag) + getEmpBagIssuedQtyGoldRaw(emp, cat, bag) - getEmpBagLossQtyGoldRaw(emp, cat, bag) - getEmpBagScrapQtyGoldRaw(emp, cat, bag) - getEmpBagBalanceQtyGoldRaw(emp, cat, bag);
            return actualProdGold * purity; // raw float
        };
        const getEmpBagPureLoss = (emp, cat, bag) => {
            const purity = getEmpBagPurityFactor(emp, cat, bag);
            return getEmpBagLossQtyGoldRaw(emp, cat, bag) * purity; // raw float
        };

        // Helper: Distribute rounding remainder to ensure split values sum to original
        // When a value is split between two employees and each is rounded independently,
        // tiny rounding errors accumulate. This function corrects that.
        const correctRoundingForSplitBags = (value1, value2, originalValue) => {
            const rounded1 = parseFloat(roundToTwo(value1));
            const rounded2 = parseFloat(roundToTwo(value2));
            const sum = rounded1 + rounded2;
            const diff = parseFloat(originalValue) - sum;
            
            // If there's a rounding difference, add it to the first value
            if (Math.abs(diff) > 0.001) {
                return [rounded1 + diff, rounded2];
            }
            return [rounded1, rounded2];
        };

        // Helper: Sum all displayed values in a column for a department (simple column sum)
        const getDeptColumnSum = (dept, columnKey) => {
            // ✅ For summary fields, return directly from backend if available
            if (columnKey === 'recoveryWt' && dept && dept.recovery_weight_gold !== undefined) {
                return parseFloat(dept.recovery_weight_gold || 0);
            }

            let sum = 0;
            (dept.unique_categories_array || []).forEach(cat => {
                (dept.category_bag_names_map?.[cat] || []).forEach(bagName => {
                    switch(columnKey) {
                        case 'issuedNetWt':
                            sum += getBagStartingQtyGoldRaw(dept, cat, bagName)
                                 + getBagIssuedQtyGoldRaw(dept, cat, bagName)
                                 - getBagScrapQtyGoldRaw(dept, cat, bagName)
                                 - getBagBalanceQtyGoldRaw(dept, cat, bagName);
                            break;
                        case 'recvG':
                            sum += getBagStartingQtyGoldRaw(dept, cat, bagName)
                                 + getBagIssuedQtyGoldRaw(dept, cat, bagName)
                                 - getBagLossQtyGoldRaw(dept, cat, bagName)
                                 - getBagScrapQtyGoldRaw(dept, cat, bagName)
                                 - getBagBalanceQtyGoldRaw(dept, cat, bagName);
                            break;
                        case 'lG':
                            sum += getBagLossQtyGoldRaw(dept, cat, bagName);
                            break;
                        case 'pw': {
                            const recvG = getBagStartingQtyGoldRaw(dept, cat, bagName)
                                        + getBagIssuedQtyGoldRaw(dept, cat, bagName)
                                        - getBagLossQtyGoldRaw(dept, cat, bagName)
                                        - getBagScrapQtyGoldRaw(dept, cat, bagName)
                                        - getBagBalanceQtyGoldRaw(dept, cat, bagName);
                            sum += recvG * getBagPurityFactor(dept, cat, bagName);
                            break;
                        }
                        case 'pl':
                            sum += getBagLossQtyGoldRaw(dept, cat, bagName) * getBagPurityFactor(dept, cat, bagName);
                            break;
                        case 'issuedNetWtDiamond':
                            sum += getBagStartingQtyDiamondRaw(dept, cat, bagName)
                                 + getBagIssuedQtyDiamondRaw(dept, cat, bagName)
                                 - getBagScrapQtyDiamondRaw(dept, cat, bagName)
                                 - getBagBalanceQtyDiamondRaw(dept, cat, bagName);
                            break;
                        case 'aD':
                            sum += getBagStartingQtyDiamondRaw(dept, cat, bagName)
                                 + getBagIssuedQtyDiamondRaw(dept, cat, bagName)
                                 - getBagLossQtyDiamondRaw(dept, cat, bagName)
                                 - getBagScrapQtyDiamondRaw(dept, cat, bagName)
                                 - getBagBalanceQtyDiamondRaw(dept, cat, bagName);
                            break;
                        case 'lD':
                            sum += getBagLossQtyDiamondRaw(dept, cat, bagName);
                            break;
                        case 'receivedPieces':
                            sum += getBagReceivedPiecesRaw(dept, cat, bagName);
                            break;
                        case 'lossPieces':
                            sum += getBagLossPiecesRaw(dept, cat, bagName);
                            break;
                        case 'recoveryWt': {
                            // Fallback to computing from bags (only if summary field not available)
                            const pureLoss = getBagLossQtyGoldRaw(dept, cat, bagName)
                                * getBagPurityFactor(dept, cat, bagName);
                            // Use dept-specific pct
                            const pct = dept ? getDeptRecoveryPercentage(dept) : 0;
                            if (pureLoss > 0 && pct > 0) {
                                sum += pureLoss * (pct / 100);
                            }
                            break;
                        }
                    }
                });
            });
            return sum; // raw float — caller rounds at display time
        };

        // Helper: Sum all displayed values in a column for an employee (simple column sum)
        const getEmpColumnSum = (emp, columnKey, dept = null) => {
            // ✅ For summary fields, return directly from backend if available
            if (columnKey === 'recoveryWt' && emp && emp.recovery_weight_gold !== undefined) {
                return parseFloat(emp.recovery_weight_gold || 0);
            }

            let sum = 0;
            (emp.unique_categories_array || []).forEach(cat => {
                (emp.category_bag_names_map?.[cat] || []).forEach(bagName => {
                    switch(columnKey) {
                        case 'issuedNetWt':
                            sum += getEmpBagStartingQtyGoldRaw(emp, cat, bagName)
                                 + getEmpBagIssuedQtyGoldRaw(emp, cat, bagName)
                                 - getEmpBagScrapQtyGoldRaw(emp, cat, bagName)
                                 - getEmpBagBalanceQtyGoldRaw(emp, cat, bagName);
                            break;
                        case 'recvG':
                            sum += getEmpBagStartingQtyGoldRaw(emp, cat, bagName)
                                 + getEmpBagIssuedQtyGoldRaw(emp, cat, bagName)
                                 - getEmpBagLossQtyGoldRaw(emp, cat, bagName)
                                 - getEmpBagScrapQtyGoldRaw(emp, cat, bagName)
                                 - getEmpBagBalanceQtyGoldRaw(emp, cat, bagName);
                            break;
                        case 'lG':
                            sum += getEmpBagLossQtyGoldRaw(emp, cat, bagName);
                            break;
                        case 'pw': {
                            const recvG = getEmpBagStartingQtyGoldRaw(emp, cat, bagName)
                                        + getEmpBagIssuedQtyGoldRaw(emp, cat, bagName)
                                        - getEmpBagLossQtyGoldRaw(emp, cat, bagName)
                                        - getEmpBagScrapQtyGoldRaw(emp, cat, bagName)
                                        - getEmpBagBalanceQtyGoldRaw(emp, cat, bagName);
                            sum += recvG * getEmpBagPurityFactor(emp, cat, bagName);
                            break;
                        }
                        case 'pl':
                            sum += getEmpBagLossQtyGoldRaw(emp, cat, bagName) * getEmpBagPurityFactor(emp, cat, bagName);
                            break;
                        case 'issuedNetWtDiamond':
                            sum += getEmpBagStartingQtyDiamondRaw(emp, cat, bagName)
                                 + getEmpBagIssuedQtyDiamondRaw(emp, cat, bagName)
                                 - getEmpBagScrapQtyDiamondRaw(emp, cat, bagName)
                                 - getEmpBagBalanceQtyDiamondRaw(emp, cat, bagName);
                            break;
                        case 'aD':
                            sum += getEmpBagStartingQtyDiamondRaw(emp, cat, bagName)
                                 + getEmpBagIssuedQtyDiamondRaw(emp, cat, bagName)
                                 - getEmpBagLossQtyDiamondRaw(emp, cat, bagName)
                                 - getEmpBagScrapQtyDiamondRaw(emp, cat, bagName)
                                 - getEmpBagBalanceQtyDiamondRaw(emp, cat, bagName);
                            break;
                        case 'lD':
                            sum += getEmpBagLossQtyDiamondRaw(emp, cat, bagName);
                            break;
                        case 'receivedPieces':
                            sum += getEmpBagReceivedPiecesRaw(emp, cat, bagName);
                            break;
                        case 'lossPieces':
                            sum += getEmpBagLossPiecesRaw(emp, cat, bagName);
                            break;
                        case 'recoveryWt': {
                            // Fallback to computing from bags (only if summary field not available)
                            const pureLoss = getEmpBagLossQtyGoldRaw(emp, cat, bagName)
                                * getEmpBagPurityFactor(emp, cat, bagName);
                            const pct = dept ? getEmpRecoveryPercentage(emp, dept) : 0;
                            if (pureLoss > 0 && pct > 0) sum += pureLoss * (pct / 100);
                            break;
                        }
                    }
                });
            });
            return sum; // raw float — caller rounds at display time
        };

        // Helper: Calculate unassigned bags (bags in department but not assigned to any employee)
        const getUnassignedBagsData = (dept) => {
            if (!dept || !dept.category_bag_names_map) return null;
            
            // Collect all bags assigned to employees
            const assignedBags = new Set();
            (dept.employees || []).forEach(emp => {
                (emp.unique_categories_array || []).forEach(cat => {
                    (emp.category_bag_names_map?.[cat] || []).forEach(bagName => {
                        assignedBags.add(`${cat}_${bagName}`);
                    });
                });
            });
            
            // Find unassigned bags
            const unassignedBags = {};
            (dept.unique_categories_array || []).forEach(cat => {
                (dept.category_bag_names_map?.[cat] || []).forEach(bagName => {
                    if (!assignedBags.has(`${cat}_${bagName}`)) {
                        if (!unassignedBags[cat]) {
                            unassignedBags[cat] = [];
                        }
                        unassignedBags[cat].push(bagName);
                    }
                });
            });
            
            // If no unassigned bags, return null
            if (Object.keys(unassignedBags).length === 0) return null;
            
            // Build unassigned employee object
            return {
                id: 'unassigned',
                name: 'Unassigned',
                bag_count: Object.values(unassignedBags).reduce((sum, bags) => sum + bags.length, 0),
                unique_categories_array: Object.keys(unassignedBags),
                category_bag_names_map: unassignedBags,
                category_bag_count_map: Object.keys(unassignedBags).reduce((map, cat) => {
                    map[cat] = unassignedBags[cat].length;
                    return map;
                }, {}),
                category_bag_sub_category_map: dept.category_bag_sub_category_map || {},
                category_bag_print_design_map: dept.category_bag_print_design_map || {},
                category_bag_ids_map: dept.category_bag_ids_map || {},
                category_bag_print_design_id_map: dept.category_bag_print_design_id_map || {},
                category_bag_category_id_map: dept.category_bag_category_id_map || {},
                category_bag_sub_category_id_map: dept.category_bag_sub_category_id_map || {}
            };
        };

        // Helper: Get unassigned column sum with rounding correction
        // Uses the difference method: Dept Total - Sum of All Employees
        // This automatically corrects for rounding errors in split bags
        const getUnassignedColumnSum = (dept, columnKey) => {
            if (!dept) return 0;
            
            // Get department total for this column
            const deptTotal = parseFloat(getDeptColumnSum(dept, columnKey));
            
            // Sum all employee values for this column
            let empSum = 0;
            (dept.employees || []).forEach(emp => {
                empSum += getEmpColumnSum(emp, columnKey, dept);
            });
            
            // Unassigned = Dept Total - Employee Sum
            // This automatically corrects for any rounding errors
            return deptTotal - empSum;
        };

        // Compute all totals for a single department (for the per-dept total row in UI table)
        const getDeptTotals = (dept) => {
            const issuedNetWt      = getDeptColumnSum(dept, 'issuedNetWt');
            const recvG            = getDeptColumnSum(dept, 'recvG');
            const lG               = getDeptColumnSum(dept, 'lG');
            const pw               = getDeptColumnSum(dept, 'pw');
            const pl               = getDeptColumnSum(dept, 'pl');
            const issuedNetWtDiam  = getDeptColumnSum(dept, 'issuedNetWtDiamond');
            const aD               = getDeptColumnSum(dept, 'aD');
            const lD               = getDeptColumnSum(dept, 'lD');
            const receivedPieces   = getDeptColumnSum(dept, 'receivedPieces');
            const lossPieces       = getDeptColumnSum(dept, 'lossPieces');
            const recoveryWt       = getDeptColumnSum(dept, 'recoveryWt');

            return {
                issuedNetWt,
                recvG,
                lG,
                grossLossPct:      recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                pw,
                pl,
                netLoss:           recvG > 0 ? roundToTwo(lG / recvG) : 0,
                netLossPct:        recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                aD,
                lD,
                diamondLossPct:    aD > 0 ? roundToTwo((lD / aD) * 100) + '%' : '0.00%',
                recoveryWt,
                recoveryPct:       (() => {
                                       const pct = getDeptRecoveryPercentage(dept);
                                       return pct > 0 ? roundToTwo(pct) + '%' : '0%';
                                   })(),
                receivedPieces,
                lossPieces,
                issuedNetWtDiamond: issuedNetWtDiam,
            };
        };

        // ── Summary-API version of getDeptTotals ──────────────────────────────
        // Reads pre-computed fields from buildSummaryEfficiencyData instead of
        // summing per-bag data. Used in subtotal rows and cards when summary data
        // is available (dept.issued_net_wt_gold is defined).
        const getSummaryDeptTotals = (dept) => {
            if (!dept || dept.issued_net_wt_gold === undefined) {
                // Fall back to per-bag calculation if summary fields not available
                return getDeptTotals(dept);
            }
            const recvG  = parseFloat(dept.received_qty_gold  || 0);
            const lG     = parseFloat(dept.gross_loss_gold     || 0);
            const recvD  = parseFloat(dept.received_qty_diamond || 0);
            const lD     = parseFloat(dept.loss_qty_diamond    || 0);
            const pw     = parseFloat(dept.pure_weight_gold    || 0);
            const pl     = parseFloat(dept.pure_loss_gold      || 0);
            const netL   = parseFloat(dept.net_loss_gold       || 0);
            const recoveryWt = getDeptColumnSum(dept, 'recoveryWt'); // still computed in FE (needs recovery %)
            return {
                issuedNetWt:        parseFloat(dept.issued_net_wt_gold      || 0),
                recvG,
                lG,
                grossLossPct:       recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                pw,
                pl,
                netLoss:            recvG > 0 ? roundToTwo(lG / recvG) : 0,
                netLossPct:         recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                aD:                 recvD,
                lD,
                diamondLossPct:     recvD > 0 ? roundToTwo((lD / recvD) * 100) + '%' : '0.00%',
                recoveryWt,
                recoveryPct:        (() => {
                                        const pct = getDeptRecoveryPercentage(dept);
                                        return pct > 0 ? roundToTwo(pct) + '%' : '0%';
                                    })(),
                receivedPieces:     parseFloat(dept.received_pieces || 0),
                lossPieces:         parseFloat(dept.loss_pieces     || 0),
                issuedNetWtDiamond: parseFloat(dept.issued_net_wt_diamond || 0),
            };
        };

        // ── Summary-API version of getEmpTotals ───────────────────────────────
        const getSummaryEmpTotals = (emp, dept = null) => {
            if (!emp || emp.issued_net_wt_gold === undefined) {
                return getEmpTotals(emp, dept);
            }
            const recvG = parseFloat(emp.received_qty_gold   || 0);
            const lG    = parseFloat(emp.gross_loss_gold      || 0);
            const recvD = parseFloat(emp.received_qty_diamond || 0);
            const lD    = parseFloat(emp.loss_qty_diamond     || 0);
            const pw    = parseFloat(emp.pure_weight_gold     || 0);
            const pl    = parseFloat(emp.pure_loss_gold       || 0);
            const recoveryWt = (() => {
                if (!dept) return 0;
                const pct = getEmpRecoveryPercentage(emp, dept);
                if (!pct) return 0;
                return pl > 0 ? pl * (pct / 100) : 0;
            })();
            return {
                issuedNetWt:        parseFloat(emp.issued_net_wt_gold      || 0),
                recvG,
                lG,
                grossLossPct:       recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                pw,
                pl,
                netLoss:            recvG > 0 ? roundToTwo(lG / recvG) : 0,
                netLossPct:         recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                aD:                 recvD,
                lD,
                diamondLossPct:     recvD > 0 ? roundToTwo((lD / recvD) * 100) + '%' : '0.00%',
                recoveryWt,
                recoveryPct:        (() => {
                                        const pct = dept ? getEmpRecoveryPercentage(emp, dept) : 0;
                                        return pct > 0 ? roundToTwo(pct) + '%' : '0%';
                                    })(),
                receivedPieces:     parseFloat(emp.received_pieces || 0),
                lossPieces:         parseFloat(emp.loss_pieces     || 0),
                issuedNetWtDiamond: parseFloat(emp.issued_net_wt_diamond || 0),
            };
        };

        // Compute all totals for a single employee (for the per-employee total row)
        const getEmpTotals = (emp, dept = null) => {
            const issuedNetWt      = getEmpColumnSum(emp, 'issuedNetWt');
            const recvG            = getEmpColumnSum(emp, 'recvG');
            const lG               = getEmpColumnSum(emp, 'lG');
            const pw               = getEmpColumnSum(emp, 'pw');
            const pl               = getEmpColumnSum(emp, 'pl');
            const issuedNetWtDiam  = getEmpColumnSum(emp, 'issuedNetWtDiamond');
            const aD               = getEmpColumnSum(emp, 'aD');
            const lD               = getEmpColumnSum(emp, 'lD');
            const receivedPieces   = getEmpColumnSum(emp, 'receivedPieces');
            const lossPieces       = getEmpColumnSum(emp, 'lossPieces');
            const recoveryWt = (() => {
                if (!dept) return 0;
                const empPct = getEmpRecoveryPercentage(emp, dept);
                if (!empPct) return 0;
                let sum = 0;
                (emp.unique_categories_array || []).forEach(cat => {
                    (emp.category_bag_names_map?.[cat] || []).forEach(bag => {
                        const pureLoss = getEmpBagLossQtyGoldRaw(emp, cat, bag)
                                    * getEmpBagPurityFactor(emp, cat, bag);
                        if (pureLoss > 0) sum += pureLoss * (empPct / 100);
                    });
                });
                return sum;
            })();

            return {
                issuedNetWt,
                recvG,
                lG,
                grossLossPct:      recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                pw,
                pl,
                netLoss:           recvG > 0 ? roundToTwo(lG / recvG) : 0,
                netLossPct:        recvG > 0 ? roundToTwo((lG / recvG) * 100) + '%' : '0.00%',
                aD,
                lD,
                diamondLossPct:    aD > 0 ? roundToTwo((lD / aD) * 100) + '%' : '0.00%',
                recoveryWt,
                recoveryPct: (() => {
                    const pct = dept ? getEmpRecoveryPercentage(emp, dept) : 0;
                    return pct > 0 ? roundToTwo(pct) + '%' : '0%';
                })(),
                receivedPieces,
                lossPieces,
                issuedNetWtDiamond: issuedNetWtDiam,
            };
        };

        // Build NetSuite record links — always use app.netsuite.com for record navigation.
        // extforms.netsuite.com (used in dev) is for unauthenticated external forms only;
        // record links must go to app.netsuite.com where the user's session cookie is valid.
        const _appendRaw = ENV_VAR.NS_API.API.BAG_MANAGEMENT_APP_ENDPOINT.APPEND || '';
        const _compidMatch = _appendRaw.match(/compid=([^&]+)/);
        const _compidValue = _compidMatch ? _compidMatch[1] : '';
        // Derive app.netsuite.com base from compid (strip _SB1 suffix for sandbox → use -sb1 subdomain)
        const _isSandbox = _compidValue.includes('_SB');
        const _sbNum = _isSandbox ? _compidValue.split('_SB')[1] : '';
        const _accountId = _compidValue.split('_SB')[0];
        const _appBase = _isSandbox
            ? `https://${_accountId}-sb${_sbNum}.app.netsuite.com`
            : `https://${_accountId}.app.netsuite.com`;
        const _compid = _compidValue ? `&compid=${_compidValue}` : '';

        const getBagNsUrl = (dept, category, bagName) => {
            const bagId = dept.category_bag_ids_map?.[category]?.[bagName];
            if (!bagId) return null;
            return `${_appBase}/app/common/custom/custrecordentry.nl?rectype=1026&id=${bagId}${_compid}`;
        };
        const getEmpBagNsUrl = (emp, category, bagName) => {
            const bagId = emp.category_bag_ids_map?.[category]?.[bagName];
            if (!bagId) return null;
            return `${_appBase}/app/common/custom/custrecordentry.nl?rectype=1026&id=${bagId}${_compid}`;
        };

        // Department link (customrecord_jj_manufacturing_dept)
        const getDeptNsUrl = (dept) => {
            if (!dept?.id) return null;
            return `${_appBase}/app/common/custom/custrecordentry.nl?rectype=1011&id=${dept.id}${_compid}`;
        };

        // Employee link (standard employee record)
        const getEmpNsUrl = (emp) => {
            if (!emp?.id) return null;
            return `${_appBase}/app/common/entity/employee.nl?id=${emp.id}${_compid}`;
        };

        // Style Number (assembly item) link — per bag
        const getStyleNsUrlPerBag = (entity, category, bagName) => {
            const itemId = entity?.category_bag_print_design_id_map?.[category]?.[bagName];
            if (!itemId) return null;
            return `${_appBase}/app/common/item/item.nl?id=${itemId}${_compid}`;
        };

        // Category link (CUSTOMRECORD_JJ_CATEGORY) — per bag
        // Uses category_bag_category_id_map if available (requires backend deployment),
        // otherwise falls back to a NS search URL by category name
        const getCategoryNsUrl = (entity, category, bagName) => {
            const catId = entity?.category_bag_category_id_map?.[category]?.[bagName];
            if (catId) {
                return `${_appBase}/app/common/custom/custrecordentry.nl?rectype=1007&id=${catId}`;
            }
            // Fallback: search for the category record by name
            if (category) {
                return `${_appBase}/app/common/custom/custrecordlist.nl?rectype=customrecord_jj_category&searchtype=CUSTOMRECORD_JJ_CATEGORY&query=${encodeURIComponent(category)}${_compid}`;
            }
            return null;
        };

        // Sub Category link — per bag
        // Uses category_bag_sub_category_id_map if available (requires backend deployment),
        // otherwise falls back to a NS search URL by sub-category name
        const getSubCategoryNsUrl = (entity, category, bagName) => {
            const subCatId = entity?.category_bag_sub_category_id_map?.[category]?.[bagName];
            if (subCatId) {
                return `${_appBase}/app/common/custom/custrecordentry.nl?rectype=1020&id=${subCatId}`;
            }
            // Fallback: search for the sub-category record by name
            const subCatName = entity?.category_bag_sub_category_map?.[category]?.[bagName];
            if (subCatName && subCatName !== '-') {
                return `${_appBase}/app/common/custom/custrecordlist.nl?rectype=customrecord_jj_sub_category&searchtype=CUSTOMRECORD_JJ_SUB_CATEGORY&query=${encodeURIComponent(subCatName)}${_compid}`;
            }
            return null;
        };
        // Helper function to get category-level starting quantity for Gold
        const getCategoryStartingQtyGold = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.starting_qty_gold) : '-';
        };

        // Helper function to get category-level starting quantity for Diamond
        const getCategoryStartingQtyDiamond = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.starting_qty_diamond) : '-';
        };

        // Generic wrapper for starting quantity (defaults to Gold)
        const getCategoryStartingQty = (dept, category) => {
            return getCategoryStartingQtyGold(dept, category);
        };

        // Helper function to get category-level issued quantity for Gold
        const getCategoryIssuedQtyGold = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.issued_qty_gold) : '-';
        };

        // Helper function to get category-level issued quantity for Diamond
        const getCategoryIssuedQtyDiamond = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.issued_qty_diamond) : '-';
        };

        // Generic wrapper for issued quantity (defaults to Gold)
        const getCategoryIssuedQty = (dept, category) => {
            return getCategoryIssuedQtyGold(dept, category);
        };

        // Helper function to get category-level loss quantity for Gold
        const getCategoryLossQtyGold = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.loss_qty_gold) : '-';
        };

        // Helper function to get category-level loss quantity for Diamond
        const getCategoryLossQtyDiamond = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.loss_qty_diamond) : '-';
        };

        // Generic wrapper for loss quantity (defaults to Gold)
        const getCategoryLossQty = (dept, category) => {
            return getCategoryLossQtyGold(dept, category);
        };

        // Helper function to get category-level scrap quantity for Gold
        const getCategoryScrapQtyGold = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.scrap_qty_gold) : '-';
        };

        // Helper function to get category-level scrap quantity for Diamond
        const getCategoryScrapQtyDiamond = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.scrap_qty_diamond) : '-';
        };

        // Generic wrapper for scrap quantity (defaults to Gold)
        const getCategoryScrapQty = (dept, category) => {
            return getCategoryScrapQtyGold(dept, category);
        };

        // Helper function to get category-level balance quantity for Gold
        const getCategoryBalanceQtyGold = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.balance_qty_gold) : '-';
        };

        // Helper function to get category-level balance quantity for Diamond
        const getCategoryBalanceQtyDiamond = (dept, category) => {
            if (!dept.category_qty_map) return '-';
            const key = `${dept.id}_${category}`;
            const data = dept.category_qty_map[key];
            return data ? roundToTwo(data.balance_qty_diamond) : '-';
        };

        // Generic wrapper for balance quantity (defaults to Gold)
        const getCategoryBalanceQty = (dept, category) => {
            return getCategoryBalanceQtyGold(dept, category);
        };

        // ===== EMPLOYEE CATEGORY-LEVEL GETTER FUNCTIONS =====

        // Helper function to get raw numeric employee category-level starting quantity for Gold (for calculations)
        const getEmployeeCategoryStartingQtyGoldRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.starting_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level starting quantity for Diamond (for calculations)
        const getEmployeeCategoryStartingQtyDiamondRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.starting_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level issued quantity for Gold (for calculations)
        const getEmployeeCategoryIssuedQtyGoldRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.issued_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level issued quantity for Diamond (for calculations)
        const getEmployeeCategoryIssuedQtyDiamondRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.issued_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level loss quantity for Gold (for calculations)
        const getEmployeeCategoryLossQtyGoldRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.loss_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level loss quantity for Diamond (for calculations)
        const getEmployeeCategoryLossQtyDiamondRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.loss_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level scrap quantity for Gold (for calculations)
        const getEmployeeCategoryScrapQtyGoldRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.scrap_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level scrap quantity for Diamond (for calculations)
        const getEmployeeCategoryScrapQtyDiamondRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.scrap_qty_diamond || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level balance quantity for Gold (for calculations)
        const getEmployeeCategoryBalanceQtyGoldRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.balance_qty_gold || 0) : 0;
        };

        // Helper function to get raw numeric employee category-level balance quantity for Diamond (for calculations)
        const getEmployeeCategoryBalanceQtyDiamondRaw = (emp, category) => {
            if (!emp.category_qty_map) return 0;
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? parseFloat(data.balance_qty_diamond || 0) : 0;
        };

        // Helper function to get employee category-level starting quantity for Gold
        const getEmployeeCategoryStartingQtyGold = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.starting_qty_gold) : '-';
        };

        // Helper function to get employee category-level starting quantity for Diamond
        const getEmployeeCategoryStartingQtyDiamond = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.starting_qty_diamond) : '-';
        };

        // Generic wrapper for employee category starting quantity (defaults to Gold)
        const getEmployeeCategoryStartingQty = (emp, category) => {
            return getEmployeeCategoryStartingQtyGold(emp, category);
        };

        // Helper function to get employee category-level issued quantity for Gold
        const getEmployeeCategoryIssuedQtyGold = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.issued_qty_gold) : '-';
        };

        // Helper function to get employee category-level issued quantity for Diamond
        const getEmployeeCategoryIssuedQtyDiamond = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.issued_qty_diamond) : '-';
        };

        // Generic wrapper for employee category issued quantity (defaults to Gold)
        const getEmployeeCategoryIssuedQty = (emp, category) => {
            return getEmployeeCategoryIssuedQtyGold(emp, category);
        };

        // Helper function to get employee category-level loss quantity for Gold
        const getEmployeeCategoryLossQtyGold = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.loss_qty_gold) : '-';
        };

        // Helper function to get employee category-level loss quantity for Diamond
        const getEmployeeCategoryLossQtyDiamond = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.loss_qty_diamond) : '-';
        };

        // Generic wrapper for employee category loss quantity (defaults to Gold)
        const getEmployeeCategoryLossQty = (emp, category) => {
            return getEmployeeCategoryLossQtyGold(emp, category);
        };

        // Helper function to get employee category-level scrap quantity for Gold
        const getEmployeeCategoryScrapQtyGold = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.scrap_qty_gold) : '-';
        };

        // Helper function to get employee category-level scrap quantity for Diamond
        const getEmployeeCategoryScrapQtyDiamond = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.scrap_qty_diamond) : '-';
        };

        // Generic wrapper for employee category scrap quantity (defaults to Gold)
        const getEmployeeCategoryScrapQty = (emp, category) => {
            return getEmployeeCategoryScrapQtyGold(emp, category);
        };

        // Helper function to get employee category-level balance quantity for Gold
        const getEmployeeCategoryBalanceQtyGold = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.balance_qty_gold) : '-';
        };

        // Helper function to get employee category-level balance quantity for Diamond
        const getEmployeeCategoryBalanceQtyDiamond = (emp, category) => {
            if (!emp.category_qty_map) return '-';
            const key = `${emp.id}_${category}`;
            const data = emp.category_qty_map[key];
            return data ? roundToTwo(data.balance_qty_diamond) : '-';
        };

        // Generic wrapper for employee category balance quantity (defaults to Gold)
        const getEmployeeCategoryBalanceQty = (emp, category) => {
            return getEmployeeCategoryBalanceQtyGold(emp, category);
        };

        // Helper function to sum total starting quantity (gold + diamond) for an employee across all categories
        const getEmployeeTotalStartingQtyAllCategories = (emp) => {
            if (!emp.category_qty_map || !emp.unique_categories_array) return 0;
            let sum = 0;
            emp.unique_categories_array.forEach(category => {
                const key = `${emp.id}_${category}`;
                const data = emp.category_qty_map[key];
                if (data) {
                    sum += parseFloat(data.starting_qty_gold || 0) + parseFloat(data.starting_qty_diamond || 0);
                }
            });
            return roundToTwo(sum);
        };

        // Helper function to sum total issued quantity (gold + diamond) for an employee across all categories
        const getEmployeeTotalIssuedQtyAllCategories = (emp) => {
            if (!emp.category_qty_map || !emp.unique_categories_array) return 0;
            let sum = 0;
            emp.unique_categories_array.forEach(category => {
                const key = `${emp.id}_${category}`;
                const data = emp.category_qty_map[key];
                if (data) {
                    sum += parseFloat(data.issued_qty_gold || 0) + parseFloat(data.issued_qty_diamond || 0);
                }
            });
            return roundToTwo(sum);
        };

        // Helper function to sum total loss quantity (gold + diamond) for an employee across all categories
        const getEmployeeTotalLossQtyAllCategories = (emp) => {
            if (!emp.category_qty_map || !emp.unique_categories_array) return 0;
            let sum = 0;
            emp.unique_categories_array.forEach(category => {
                const key = `${emp.id}_${category}`;
                const data = emp.category_qty_map[key];
                if (data) {
                    sum += parseFloat(data.loss_qty_gold || 0) + parseFloat(data.loss_qty_diamond || 0);
                }
            });
            return roundToTwo(sum);
        };

        const maxRetries = 1; // Prevent infinite loop
        let retryCount = 0;
        const fetchEfficiencyAnalysisData = async (locationId = null, overrideEndDate = null) => {
            try {
                loading.value = true;
                showNoDataPopup.value = false;

                if (!selectedDateRange.value || selectedDateRange.value.length < 2) return;

                const formatDate = (date) => {
                    const offset = date.getTimezoneOffset();
                    date = new Date(date.getTime() - (offset * 60 * 1000));
                    return date.toISOString().split('T')[0];
                };

                const formattedStartDate = formatDate(selectedDateRange.value[0]);
                const formattedEndDate = overrideEndDate || formatDate(selectedDateRange.value[1]);

                // Fetch Efficiency Analysis Data (Overall - All Operations)
                const isRepairOnly = props.type === 'repair' ? true : props.type === 'production' ? false : null;
                await fetchListEfficiencyAnalysis(locationId, formattedStartDate, formattedEndDate, isRepairOnly);

                // ── Log fetched summary data for debugging ────────────────────────────────────
                // if (listEfficiencyData.value && Object.keys(listEfficiencyData.value).length > 0) {
                //     const summaryLog = [];
                //     summaryLog.push('\n🔄 FETCHED SUMMARY EFFICIENCY DATA:\n');
                    
                //     Object.entries(listEfficiencyData.value || {}).forEach(([locId, locData]) => {
                //         summaryLog.push(`📍 LOCATION: ${locData.location_name} (Total Unique Bags: ${locData.total_unique_bags})`);
                        
                //         Object.entries(locData.departments || {}).forEach(([deptId, dept]) => {
                //             summaryLog.push(`\n  🏭 DEPARTMENT: ${dept.department_name}`);
                //             summaryLog.push(`     ├─ Bags: ${dept.bag_count}`);
                //             summaryLog.push(`     ├─ Gold Metrics:`);
                //             summaryLog.push(`     │  ├─ Issued Net Wt (Gold): ${(dept.issued_net_wt_gold || 0).toFixed(4)}`);
                //             summaryLog.push(`     │  ├─ Received Qty (Gold): ${(dept.received_qty_gold || 0).toFixed(4)}`);
                //             summaryLog.push(`     │  ├─ Gross Loss (Gold): ${(dept.gross_loss_gold || 0).toFixed(4)}`);
                //             summaryLog.push(`     │  ├─ Pure Weight (Gold): ${(dept.pure_weight_gold || 0).toFixed(4)}`);
                //             summaryLog.push(`     │  ├─ Pure Loss (Gold): ${(dept.pure_loss_gold || 0).toFixed(4)}`);
                //             summaryLog.push(`     │  └─ Net Loss (Gold): ${(dept.net_loss_gold || 0).toFixed(6)}`);
                //             summaryLog.push(`     ├─ Recovery Metrics:`);
                //             summaryLog.push(`     │  ├─ Recovery Percentage (Gold): ${(dept.recovery_percentage_gold || 0).toFixed(2)}%`);
                //             summaryLog.push(`     │  └─ Recovery Weight (Gold): ${(dept.recovery_weight_gold || 0).toFixed(4)}`);
                //             summaryLog.push(`     └─ Diamond Metrics:`);
                //             summaryLog.push(`        ├─ Issued Net Wt (Diamond): ${(dept.issued_net_wt_diamond || 0).toFixed(4)}`);
                //             summaryLog.push(`        ├─ Received Qty (Diamond): ${(dept.received_qty_diamond || 0).toFixed(4)}`);
                //             summaryLog.push(`        ├─ Loss Qty (Diamond): ${(dept.loss_qty_diamond || 0).toFixed(4)}`);
                //             summaryLog.push(`        ├─ Received Pieces: ${(dept.received_pieces || 0).toFixed(4)}`);
                //             summaryLog.push(`        └─ Loss Pieces: ${(dept.loss_pieces || 0).toFixed(4)}`);
                            
                //             // Log employees if they exist
                //             if (dept.employees_array && dept.employees_array.length > 0) {
                //                 summaryLog.push(`\n     👥 EMPLOYEES (${dept.employees_array.length}):`);
                //                 dept.employees_array.forEach((emp, idx) => {
                //                     const isLast = idx === dept.employees_array.length - 1;
                //                     summaryLog.push(`     ${isLast ? '└' : '├'}─ ${emp.name} (Bags: ${emp.bag_count})`);
                //                     summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Issued Net Wt: ${(emp.issued_net_wt_gold || 0).toFixed(4)}`);
                //                     summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Received Qty: ${(emp.received_qty_gold || 0).toFixed(4)}`);
                //                     summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Gross Loss: ${(emp.gross_loss_gold || 0).toFixed(4)}`);
                //                     summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Pure Loss: ${(emp.pure_loss_gold || 0).toFixed(4)}`);
                //                     summaryLog.push(`        ${isLast ? ' ' : '│'}  ├─ Recovery %: ${(emp.recovery_percentage_gold || 0).toFixed(2)}%`);
                //                     summaryLog.push(`        ${isLast ? ' ' : '│'}  └─ Recovery Wt: ${(emp.recovery_weight_gold || 0).toFixed(4)}`);
                //                 });
                //             }
                //         });
                //     });
                    
                //     console.log(summaryLog.join('\n'));
                // }

                Object.entries(listEfficiencyData.value || {}).forEach(([locId, locData]) => {
                    Object.entries(locData.departments || {}).forEach(([deptId, dept]) => {
                        if (dept.category_qty_map) {
                            Object.entries(dept.category_qty_map).forEach(([key, catData]) => {
                            });
                        }
                        (dept.employees_array || []).forEach(emp => {
                            (emp.categories || []).forEach(cat => {
                            });
                        });
                    });
                });

                // Log wax tree received data for special departments
                Object.entries(listEfficiencyData.value || {}).forEach(([locId, locData]) => {
                    Object.entries(locData.departments || {}).forEach(([deptId, dept]) => {
                        // Wax tree data available but not logged
                    });
                });

                if (listEfficiencyData.value && Object.keys(listEfficiencyData.value).length > 0) {

                    if (!locationId) {
                        // ✅ Updating all locations with departments, employees, and bag counts
                        locations.value = Object.entries(listEfficiencyData.value).map(([locId, locData]) => ({
                            internalid: { value: locId },
                            name: { value: locData.location_name },
                            total_unique_bags: locData.total_unique_bags,
                            departments: Object.entries(locData.departments || {}).map(([deptId, dept]) => {
                                // Build category_bag_qty_map from employees' categories
                                const categoryBagQtyMap = dept.category_bag_qty_map || {};

                                return {
                                    id: deptId,
                                    name: dept.department_name,
                                    bag_count: dept.bag_count || 0,
                                    unique_bags_array: dept.unique_bags_array || [],
                                    category_count: dept.category_count || 0,
                                    unique_categories_array: dept.unique_categories_array || [],
                                    starting_qty: dept.starting_qty || 0,
                                    loss_qty: dept.loss_qty || 0,
                                    wax_tree_actual_production_gold: dept.wax_tree_actual_production_gold ?? null,
                                    wax_tree_loss_gold: dept.wax_tree_loss_gold ?? null,
                                    wax_tree_received_qty_gold: dept.wax_tree_received_qty_gold ?? null,
                                    // Summary fields from backend
                                    issued_net_wt_gold: dept.issued_net_wt_gold,
                                    received_qty_gold: dept.received_qty_gold,
                                    gross_loss_gold: dept.gross_loss_gold,
                                    pure_weight_gold: dept.pure_weight_gold,
                                    pure_loss_gold: dept.pure_loss_gold,
                                    net_loss_gold: dept.net_loss_gold,
                                    issued_net_wt_diamond: dept.issued_net_wt_diamond,
                                    received_qty_diamond: dept.received_qty_diamond,
                                    loss_qty_diamond: dept.loss_qty_diamond,
                                    received_pieces: dept.received_pieces,
                                    loss_pieces: dept.loss_pieces,
                                    // Recovery fields from backend
                                    recovery_percentage_gold: dept.recovery_percentage_gold ?? 0,
                                    recovery_weight_gold: dept.recovery_weight_gold ?? 0,
                                    employees: (dept.employees_array || []).map(emp => {
                                        // Build category_qty_map from categories array
                                        const categoryQtyMap = {};
                                        if (emp.categories && Array.isArray(emp.categories)) {
                                            emp.categories.forEach(cat => {
                                                const key = `${emp.employee_id}_${cat.category_name}`;
                                                // Calculate received_pieces = starting_pieces + issued_pieces - scrap_pieces - balance_pieces
                                                const calculatedReceivedPieces = (cat.starting_pieces_info || 0) + (cat.issued_pieces_info || 0) - (cat.scrap_pieces_info || 0) - (cat.balance_pieces_info || 0);
                                                categoryQtyMap[key] = {
                                                    starting_qty_gold: cat.starting_qty_gold || 0,
                                                    starting_qty_diamond: cat.starting_qty_diamond || 0,
                                                    issued_qty_gold: cat.issued_qty_gold || 0,
                                                    issued_qty_diamond: cat.issued_qty_diamond || 0,
                                                    loss_qty_gold: cat.loss_qty_gold || 0,
                                                    loss_qty_diamond: cat.loss_qty_diamond || 0,
                                                    scrap_qty_gold: cat.scrap_qty_gold || 0,
                                                    scrap_qty_diamond: cat.scrap_qty_diamond || 0,
                                                    balance_qty_gold: cat.balance_qty_gold || 0,
                                                    balance_qty_diamond: cat.balance_qty_diamond || 0,
                                                    starting_pieces_info: cat.starting_pieces_info || 0,
                                                    issued_pieces_info: cat.issued_pieces_info || 0,
                                                    scrap_pieces_info: cat.scrap_pieces_info || 0,
                                                    balance_pieces_info: cat.balance_pieces_info || 0,
                                                    received_pieces_info: calculatedReceivedPieces,
                                                    loss_pieces_info: cat.loss_pieces_info || 0
                                                };
                                            });
                                        }

                                        const empObj = {
                                            id: emp.employee_id,
                                            name: emp.name,
                                            bag_count: emp.bag_count || 0,
                                            unique_bags_array: emp.unique_bags_array || [],
                                            category_count: emp.category_count || 0,
                                            unique_categories_array: emp.unique_categories_array || [],
                                            starting_qty: emp.starting_qty || 0,
                                            loss_qty: emp.loss_qty || 0,
                                            // Summary fields from backend
                                            issued_net_wt_gold: emp.issued_net_wt_gold,
                                            received_qty_gold: emp.received_qty_gold,
                                            gross_loss_gold: emp.gross_loss_gold,
                                            pure_weight_gold: emp.pure_weight_gold,
                                            pure_loss_gold: emp.pure_loss_gold,
                                            net_loss_gold: emp.net_loss_gold,
                                            issued_net_wt_diamond: emp.issued_net_wt_diamond,
                                            received_qty_diamond: emp.received_qty_diamond,
                                            loss_qty_diamond: emp.loss_qty_diamond,
                                            received_pieces: emp.received_pieces,
                                            loss_pieces: emp.loss_pieces,
                                            // Recovery fields from backend
                                            recovery_percentage_gold: emp.recovery_percentage_gold ?? 0,
                                            recovery_weight_gold: emp.recovery_weight_gold ?? 0,
                                        };
                                        return empObj;
                                    })
                                };
                            })
                        }));

                        locations.value.forEach((loc, locIdx) => {

                            loc.departments.forEach((dept, deptIdx) => {

                                dept.employees.forEach((emp, empIdx) => {
                                });
                            });
                        });

                        let totalDepts = 0, totalEmps = 0, totalBags = 0, totalCategories = 0;
                        locations.value.forEach(loc => {
                            loc.departments.forEach(dept => {
                                totalDepts++;
                                totalBags += dept.bag_count;
                                totalCategories += dept.category_count;
                                totalEmps += dept.employees.length;
                            });
                        });


                        // ✅ LOG ALL BAGS' PIECES DATA
                        const allBagsPiecesData = [];
                        locations.value.forEach(loc => {
                            loc.departments.forEach(dept => {
                                dept.employees.forEach(emp => {
                                    if (emp.categories && Array.isArray(emp.categories)) {
                                        emp.categories.forEach(cat => {
                                            // Calculate received_pieces = starting_pieces + issued_pieces - scrap_pieces - balance_pieces
                                            const calculatedReceivedPieces = (cat.starting_pieces_info || 0) + (cat.issued_pieces_info || 0) - (cat.scrap_pieces_info || 0) - (cat.balance_pieces_info || 0);
                                            allBagsPiecesData.push({
                                                location: loc.name.value,
                                                department: dept.name,
                                                employee: emp.name,
                                                category: cat.category_name,
                                                bag_name: cat.bag_name,
                                                starting_pieces: cat.starting_pieces_info || 0,
                                                issued_pieces: cat.issued_pieces_info || 0,
                                                scrap_pieces: cat.scrap_pieces_info || 0,
                                                balance_pieces: cat.balance_pieces_info || 0,
                                                received_pieces: calculatedReceivedPieces,
                                                loss_pieces: cat.loss_pieces_info || 0
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    } else {
                        // ✅ locationId provided — update only that specific location's departments
                        const locData = listEfficiencyData.value[locationId];
                        if (locData) {
                            const targetLoc = locations.value.find(loc => loc.internalid.value == locationId);
                            if (targetLoc) {
                                targetLoc.departments = Object.entries(locData.departments || {}).map(([deptId, dept]) => {
                                    const categoryQtyMapByEmp = {};
                                    const employees = (dept.employees_array || []).map(emp => {
                                        const empCategoryQtyMap = {};
                                        if (emp.categories && Array.isArray(emp.categories)) {
                                            emp.categories.forEach(cat => {
                                                const key = `${emp.employee_id}_${cat.category_name}`;
                                                // Calculate received_pieces = starting_pieces + issued_pieces - scrap_pieces - balance_pieces
                                                const calculatedReceivedPieces = (cat.starting_pieces_info || 0) + (cat.issued_pieces_info || 0) - (cat.scrap_pieces_info || 0) - (cat.balance_pieces_info || 0);
                                                empCategoryQtyMap[key] = {
                                                    starting_qty_gold: cat.starting_qty_gold || 0,
                                                    starting_qty_diamond: cat.starting_qty_diamond || 0,
                                                    issued_qty_gold: cat.issued_qty_gold || 0,
                                                    issued_qty_diamond: cat.issued_qty_diamond || 0,
                                                    loss_qty_gold: cat.loss_qty_gold || 0,
                                                    loss_qty_diamond: cat.loss_qty_diamond || 0,
                                                    scrap_qty_gold: cat.scrap_qty_gold || 0,
                                                    scrap_qty_diamond: cat.scrap_qty_diamond || 0,
                                                    balance_qty_gold: cat.balance_qty_gold || 0,
                                                    balance_qty_diamond: cat.balance_qty_diamond || 0,
                                                    starting_pieces_info: cat.starting_pieces_info || 0,
                                                    issued_pieces_info: cat.issued_pieces_info || 0,
                                                    scrap_pieces_info: cat.scrap_pieces_info || 0,
                                                    balance_pieces_info: cat.balance_pieces_info || 0,
                                                    received_pieces_info: calculatedReceivedPieces,
                                                    loss_pieces_info: cat.loss_pieces_info || 0
                                                };
                                            });
                                        }
                                        return {
                                            id: emp.employee_id,
                                            name: emp.name,
                                            bag_count: emp.bag_count || 0,
                                            unique_bags_array: emp.unique_bags_array || [],
                                            category_count: emp.category_count || 0,
                                            unique_categories_array: emp.unique_categories_array || [],
                                            starting_qty: emp.starting_qty || 0,
                                            loss_qty: emp.loss_qty || 0,
                                            issued_net_wt_gold: emp.issued_net_wt_gold,
                                            received_qty_gold: emp.received_qty_gold,
                                            gross_loss_gold: emp.gross_loss_gold,
                                            pure_weight_gold: emp.pure_weight_gold,
                                            pure_loss_gold: emp.pure_loss_gold,
                                            net_loss_gold: emp.net_loss_gold,
                                            issued_net_wt_diamond: emp.issued_net_wt_diamond,
                                            received_qty_diamond: emp.received_qty_diamond,
                                            loss_qty_diamond: emp.loss_qty_diamond,
                                            received_pieces: emp.received_pieces,
                                            loss_pieces: emp.loss_pieces,
                                        };
                                    });

                                    // Build category_bag_qty_map from employees' categories
                                    const categoryBagQtyMap = dept.category_bag_qty_map || {};

                                    return {
                                        id: deptId,
                                        name: dept.department_name,
                                        bag_count: dept.bag_count || 0,
                                        unique_bags_array: dept.unique_bags_array || [],
                                        category_count: dept.category_count || 0,
                                        unique_categories_array: dept.unique_categories_array || [],
                                        starting_qty: dept.starting_qty || 0,
                                        loss_qty: dept.loss_qty || 0,
                                        issued_net_wt_gold: dept.issued_net_wt_gold,
                                        received_qty_gold: dept.received_qty_gold,
                                        gross_loss_gold: dept.gross_loss_gold,
                                        pure_weight_gold: dept.pure_weight_gold,
                                        pure_loss_gold: dept.pure_loss_gold,
                                        net_loss_gold: dept.net_loss_gold,
                                        issued_net_wt_diamond: dept.issued_net_wt_diamond,
                                        received_qty_diamond: dept.received_qty_diamond,
                                        loss_qty_diamond: dept.loss_qty_diamond,
                                        received_pieces: dept.received_pieces,
                                        loss_pieces: dept.loss_pieces,
                                        wax_tree_actual_production_gold: dept.wax_tree_actual_production_gold ?? null,
                                        wax_tree_loss_gold: dept.wax_tree_loss_gold ?? null,
                                        wax_tree_received_qty_gold: dept.wax_tree_received_qty_gold ?? null,
                                        employees
                                    };
                                });
                            }
                        }
                    }

                    // Fetch recovery percentages for each department in selectedDepartmentData
                    // Department-wise recovery percentages will be populated when departments are displayed
                    
                    isInitialLoading.value = false;
                } else {
                    console.warn("❌ NO DATA FOUND for the selected date range");
                    showNoDataPopup.value = true;
                    isInitialLoading.value = false;
                }

                loading.value = false;
            } catch (error) {
                console.error('Error fetching efficiency analysis data:', error);
                loading.value = false;
                isInitialLoading.value = false;
                showNoDataPopup.value = true;
            }
        };

        // Function to close no data popup
        const closeNoDataPopup = () => {
            console.log("Closing No Data Popup");
            showNoDataPopup.value = false;
            // Reset departments so cards show with all 0 values, keeping date picker usable
            locations.value = locations.value.map(loc => ({ ...loc, departments: [] }));
        };

        const formatDate = (date) => {
            const offset = date.getTimezoneOffset();
            date = new Date(date.getTime() - (offset * 60 * 1000)); // Adjust for timezone offset
            return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        };

        // Helper: Fetch recovery percentages for all departments (MUST be before watchers)
        const fetchDeptRecoveryPercentages = async () => {
            if (!selectedDateRange.value || selectedDateRange.value.length < 2 || !selectedDepartmentData.value.length) return;

            const startDate = formatDate(selectedDateRange.value[0]);
            const endDate   = formatDate(selectedDateRange.value[1]);
            const departmentNames = selectedDepartmentData.value.map(d => d.name);

            try {
                let result = await fetchRecoveryDataBatch(startDate, endDate, departmentNames);

                // Backend returns recoveryDates[] — last entry is the effective recovery date used.
                // If it falls AFTER the user's endDate, the efficiency data must be re-fetched
                // using that date as the end date so all departments on that recovery date appear.
                // Normalize recoveryDates from backend (may be raw "17-May-2026 2:25 pm" format)
                // Normalize dates from backend (may arrive as "17-May-2026 2:25 pm" or "2026-05-17")
                const normalizeToYMD = (s) => {
                    if (!s) return '';
                    const datePart = String(s).split(' ')[0];
                    const parts = datePart.split('-');
                    if (parts.length === 3) {
                        if (isNaN(parseInt(parts[1]))) {
                            // DD-Mon-YYYY
                            const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,
                                            Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
                            const m = months[parts[1]];
                            if (m === undefined) return '';
                            const d = new Date(parseInt(parts[2]), m, parseInt(parts[0]));
                            return d.getFullYear() + '-' +
                                String(d.getMonth()+1).padStart(2,'0') + '-' +
                                String(d.getDate()).padStart(2,'0');
                        }
                        if (parts[0].length === 4) return datePart; // YYYY-MM-DD already
                    }
                    return '';
                };

                const recoveryDates = [...new Set(
                    (result.recoveryDates || []).map(normalizeToYMD).filter(Boolean)
                )].sort();

                // Build dept map (by id + name for flexible lookup)
                const newDeptMap = {};
                selectedDepartmentData.value.forEach(dept => {
                    const pct = parseFloat((result.departmentRecoveryMap || {})[dept.name] || 0);
                    newDeptMap[dept.id] = pct;
                    newDeptMap[dept.name] = pct;
                });
                deptRecoveryPercentageMap.value = newDeptMap;

                console.log('[fetchDeptRecoveryPercentages]:', newDeptMap);

                // Build employee map (case-insensitive indexing)
                const rawEmpMap = result.employeeRecoveryMap || {};
                const indexedEmpMap = { ...rawEmpMap };
                selectedDepartmentData.value.forEach(dept => {
                    const norm = dept.name.trim().toLowerCase();
                    const byName = rawEmpMap[dept.name]
                        || Object.entries(rawEmpMap).find(([k]) => k.trim().toLowerCase() === norm)?.[1];
                    if (byName) {
                        indexedEmpMap[String(dept.id)] = byName;
                        indexedEmpMap[dept.name] = byName;
                    }
                });
                employeeRecoveryMap.value = indexedEmpMap;
                
                // Debug logging
                console.log('[fetchDeptEmpRecoveryPercentages]:', rawEmpMap);
                recoveryMapVersion.value++;
            } catch (err) {
                console.error('Error fetching batch recovery percentages:', err);
            }
        };

        // Watch for changes in the selected date range and re-fetch data
        watch(selectedDateRange, async (newRange) => {
            if (newRange && newRange.length === 2) {
                console.log("Date Range Changed:", newRange);
                const formattedStartDate = formatDate(newRange[0]);
                const formattedEndDate = formatDate(newRange[1]);

                if (expandedLocation.value) {
                    await fetchEfficiencyAnalysisData(expandedLocation.value);

                    const selectedLocation = locations.value.find(loc => loc.internalid.value === expandedLocation.value);

                    if (showDepartments.value) {
                        selectedDepartments.value = selectedLocation?.departments || [];
                        selectedDepartmentData.value = [...selectedDepartments.value];
                        
                        // ✅ Re-fetch dept recovery percentages on date change (when not viewing employees)
                        await fetchDeptRecoveryPercentages();
                    }
                    if (showEmployees.value) {
                        selectedEmployees.value = selectedDepartments.value
                            .find(dept => dept.name === expandedDepartment.value)?.employees || [];
                    }
                } else {
                    await fetchEfficiencyAnalysisData();
                }

                updateCharts(); // Ensure charts are updated with new data
            }
        });

        // Helper: Fetch recovery percentages for all departments (call AFTER selectedDepartmentData is populated)
        // Watch for changes in the selected department
        // Department-specific recovery percentage will be retrieved from deptRecoveryPercentageMap via getDeptRecoveryPercentage

        // Watch for changes in showDepartments to recalculate recovery percentage for department view
        // watch(showDepartments, async (isShowingDepts) => {
        //     if (isShowingDepts && !expandedDepartment.value && selectedDateRange.value && selectedDateRange.value.length === 2) {
        //         const formattedStartDate = formatDate(selectedDateRange.value[0]);
        //         const formattedEndDate = formatDate(selectedDateRange.value[1]);
        //         const departmentNames = selectedDepartmentData.value.map(dept => dept.name);

        //         try {
        //             // Single API call for all departments
        //             const recoveryMap = await fetchRecoveryDataBatch(formattedStartDate, formattedEndDate, departmentNames);
                    
        //             deptRecoveryPercentageMap.value = {};
        //             selectedDepartmentData.value.forEach(dept => {
        //                 const pct = parseFloat(recoveryMap[dept.name] || 0);
        //                 deptRecoveryPercentageMap.value[dept.id] = pct;
        //                 deptRecoveryPercentageMap.value[dept.name] = pct;
        //             });
        //             recoveryMapVersion.value++;
        //         } catch (error) {
        //             console.error('Error updating department recovery percentages:', error);
        //         }
        //     }
        // });


        // Function to toggle location view and fetch department data
        const toggleLocationView = async (locationId) => {
            if (expandedLocation.value == locationId) {
                expandedLocation.value = null;
                expandedDepartment.value = null;
                showDepartments.value = false;
                showEmployees.value = false;
                showTable.value = false;
                deptRecoveryPercentageMap.value = {}; // ✅ Clear on collapse
                dashboardTitle.value = baseTitle;
                updateCharts();
            } else {
                expandedLocation.value = locationId;
                expandedDepartment.value = null;
                showDepartments.value = true;
                showEmployees.value = false;
                showTable.value = true;
                showEmployeesTable.value = false;
                dashboardTitle.value = "Department Details";

                await fetchEfficiencyAnalysisData(locationId);

                const selectedLocation = locations.value.find(loc => loc.internalid.value === locationId);
                selectedDepartments.value = [...(selectedLocation?.departments || [])]; // Force reactivity

                // Set department data with calculated bag counts
                selectedDepartmentData.value = [...selectedDepartments.value];

                // ✅ NOW selectedDepartmentData is populated — fetch dept-specific recovery %
                await fetchDeptRecoveryPercentages();

                updateCharts();
            }
        };


        // Function to toggle department view and fetch employee data
        const toggleDepartmentView = (deptName) => {
            if (expandedDepartment.value === deptName) {
                expandedDepartment.value = null;
                showEmployees.value = false;
                showEmployeesTable.value = false;
                dashboardTitle.value = "Department Details";

            } else {
                expandedDepartment.value = deptName;
                showEmployees.value = true;
                showEmployeesTable.value = true;
                dashboardTitle.value = "Employee Details";

                // Get employees from the already-populated selectedDepartments
                const selectedDept = selectedDepartments.value.find(dept => dept.name === deptName);

                // Add department ID to each employee
                selectedEmployees.value = (selectedDept?.employees || []).map(emp => {
                    return {
                        ...emp,
                        departmentId: selectedDept.id
                    };
                });

            }
            updateCharts();
        };

        const updateCharts = () => {
            setTimeout(() => {
                const getEntityTotals = (entity, isEmp) => {
                    return isEmp ? getSummaryEmpTotals(entity) : getSummaryDeptTotals(entity);
                };
                const actualProdGold = (e, isEmp) => parseFloat(getEntityTotals(e, isEmp).recvG || 0);
                const actualProdDiamond = (e, isEmp) => parseFloat(getEntityTotals(e, isEmp).aD || 0);
                const lossGold = (e, isEmp) => parseFloat(getEntityTotals(e, isEmp).lG || 0);
                const lossDiamond = (e, isEmp) => parseFloat(getEntityTotals(e, isEmp).lD || 0);

                let labels = [];
                let barDatasets = [];
                let doughnutLabels = [];
                let doughnutValues = [];

                if (!showDepartments.value && !showEmployees.value) {
                    // Location level — one bar per location, aggregated across all its departments
                    labels = locations.value.map(l => l.name.value);

                    const prodGoldData = locations.value.map(loc =>
                        parseFloat(roundToTwo(loc.departments.reduce((s, d) => s + actualProdGold(d, false), 0))));
                    const lossGoldData = locations.value.map(loc =>
                        parseFloat(roundToTwo(loc.departments.reduce((s, d) => s + lossGold(d, false), 0))));
                    const prodDiamondData = locations.value.map(loc =>
                        parseFloat(roundToTwo(loc.departments.reduce((s, d) => s + actualProdDiamond(d, false), 0))));
                    const lossDiamondData = locations.value.map(loc =>
                        parseFloat(roundToTwo(loc.departments.reduce((s, d) => s + lossDiamond(d, false), 0))));

                    barDatasets = [
                        { label: 'Received Quantity Gold (g)', data: prodGoldData, backgroundColor: '#e5c000', borderColor: '#e5c000', borderWidth: 1 },
                        { label: 'Gross Loss Gold (g)', data: lossGoldData, backgroundColor: '#ff4034', borderColor: '#ff4034', borderWidth: 1 },
                        { label: 'Received Quantity Diamond (ct)', data: prodDiamondData, backgroundColor: '#4993f7', borderColor: '#4993f7', borderWidth: 1 },
                        { label: 'Loss Qty Diamond (ct)', data: lossDiamondData, backgroundColor: 'rgba(220,38,38,0.5)', borderColor: '#DC2626', borderWidth: 1 },
                    ];

                    const totalProdGold = prodGoldData.reduce((s, v) => s + v, 0);
                    const totalProdDiamond = prodDiamondData.reduce((s, v) => s + v, 0);
                    const totalLossGold = lossGoldData.reduce((s, v) => s + v, 0);
                    const totalLossDiamond = lossDiamondData.reduce((s, v) => s + v, 0);
                    doughnutLabels = ['Received Quantity Gold', 'Received Quantity Diamond', 'Gross Loss Gold', 'Loss Qty Diamond'];
                    doughnutValues = [totalProdGold, totalProdDiamond, totalLossGold, totalLossDiamond];
                } else if (showDepartments.value && !showEmployees.value) {
                    // Department level — mirror the department table
                    const depts = selectedDepartmentData.value;
                    labels = depts.map(d => d.name);

                    const prodGoldData = depts.map(d => parseFloat(roundToTwo(actualProdGold(d, false))));
                    const lossGoldData = depts.map(d => parseFloat(roundToTwo(lossGold(d, false))));
                    const prodDiamondData = depts.map(d => parseFloat(roundToTwo(actualProdDiamond(d, false))));
                    const lossDiamondData = depts.map(d => parseFloat(roundToTwo(lossDiamond(d, false))));

                    barDatasets = [
                        { label: 'Received Quantity Gold (g)', data: prodGoldData, backgroundColor: '#e5c000', borderColor: '#e5c000', borderWidth: 1 },
                        { label: 'Gross Loss Gold (g)', data: lossGoldData, backgroundColor: '#ff4034', borderColor: '#ff4034', borderWidth: 1 },
                        { label: 'Received Quantity Diamond (ct)', data: prodDiamondData, backgroundColor: '#4993f7', borderColor: '#4993f7', borderWidth: 1 },
                        { label: 'Loss Qty Diamond (ct)', data: lossDiamondData, backgroundColor: 'rgba(220,38,38,0.5)', borderColor: '#DC2626', borderWidth: 1 },
                    ];

                    const totalProdGold = prodGoldData.reduce((s, v) => s + v, 0);
                    const totalProdDiamond = prodDiamondData.reduce((s, v) => s + v, 0);
                    const totalLossGold = lossGoldData.reduce((s, v) => s + v, 0);
                    const totalLossDiamond = lossDiamondData.reduce((s, v) => s + v, 0);
                    doughnutLabels = ['Received Quantity Gold', 'Received Quantity Diamond', 'Gross Loss Gold', 'Loss Qty Diamond'];
                    doughnutValues = [totalProdGold, totalProdDiamond, totalLossGold, totalLossDiamond];
                } else {
                    // Employee level — mirror the employee table
                    const emps = selectedEmployees.value;
                    labels = emps.map(e => e.name);

                    const prodGoldData = emps.map(e => parseFloat(roundToTwo(actualProdGold(e, true))));
                    const lossGoldData = emps.map(e => parseFloat(roundToTwo(lossGold(e, true))));
                    const prodDiamondData = emps.map(e => parseFloat(roundToTwo(actualProdDiamond(e, true))));
                    const lossDiamondData = emps.map(e => parseFloat(roundToTwo(lossDiamond(e, true))));

                    barDatasets = [
                        { label: 'Received Quantity Gold (g)', data: prodGoldData, backgroundColor: '#e5c000', borderColor: '#e5c000', borderWidth: 1 },
                        { label: 'Gross Loss Gold (g)', data: lossGoldData, backgroundColor: '#ff4034', borderColor: '#ff4034', borderWidth: 1 },
                        { label: 'Received Quantity Diamond (ct)', data: prodDiamondData, backgroundColor: '#4993f7', borderColor: '#4993f7', borderWidth: 1 },
                        { label: 'Loss Qty Diamond (ct)', data: lossDiamondData, backgroundColor: 'rgba(220,38,38,0.5)', borderColor: '#DC2626', borderWidth: 1 },
                    ];

                    const totalProdGold = prodGoldData.reduce((s, v) => s + v, 0);
                    const totalProdDiamond = prodDiamondData.reduce((s, v) => s + v, 0);
                    const totalLossGold = lossGoldData.reduce((s, v) => s + v, 0);
                    const totalLossDiamond = lossDiamondData.reduce((s, v) => s + v, 0);
                    doughnutLabels = ['Received Quantity Gold', 'Received Quantity Diamond', 'Gross Loss Gold', 'Loss Qty Diamond'];
                    doughnutValues = [totalProdGold, totalProdDiamond, totalLossGold, totalLossDiamond];
                }

                // ── Bar chart (cryptoChart) ───────────────────────────────────────
                const ctx1 = document.getElementById('cryptoChart')?.getContext('2d');
                if (ctx1) {
                    if (cryptoChart) cryptoChart.destroy();
                    cryptoChart = new Chart(ctx1, {
                        type: 'bar',
                        data: { labels, datasets: barDatasets },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, position: 'top', labels: { font: { size: 10 } } },
                                tooltip: { enabled: true }
                            },
                            scales: {
                                y: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { font: { size: 10 } } },
                                x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } }
                            }
                        }
                    });
                }

                // ── Doughnut chart (productionChart) ─────────────────────────────
                const ctx2 = document.getElementById('productionChart')?.getContext('2d');
                if (ctx2) {
                    if (productionChart) productionChart.destroy();
                    productionChart = new Chart(ctx2, {
                        type: 'doughnut',
                        data: {
                            labels: doughnutLabels,
                            datasets: [{
                                data: doughnutValues,
                                backgroundColor: ['#e5c000', '#4993f7', '#ff4034', '#DC2626'],
                                hoverOffset: 8
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(2)}`
                                    }
                                }
                            }
                        }
                    });
                }
            }, 300);
        };

        onMounted(async () => {
            await fetchLocations();  // Ensure locations are loaded
            await fetchEfficiencyAnalysisData();  // Ensure efficiency data is loaded
            setTimeout(() => {
                updateCharts();  // Delay execution to allow DOM to be ready
            }, 500);
        });



        return {
            expandedLocation,
            expandedDepartment,
            showDepartments,
            showEmployees,
            loading,
            dashboardTitle,
            locations,
            selectedDepartments,
            selectedEmployees,
            toggleLocationView,
            toggleDepartmentView,
            showTable,
            selectedDepartmentData,
            showEmployeesTable,
            selectedDateRange,
            isInitialLoading,
            showNoDataPopup,
            selectedDateRange,
            closeNoDataPopup,
            selectedDeptObject,
            downloadData,
            formatName,
            roundToTwo,
            roundToTwoAlways,
            decimalPlaces,
            getLocationTotalBagCount,
            getLocationTotalActualProductionGold,
            getLocationTotalActualProductionDiamond,
            getLocationTotalIssuedQtyGold,
            getLocationTotalIssuedQtyDiamond,
            getLocationTotalLossQtyGold,
            getLocationTotalLossQtyDiamond,
            getLocationTotalIssuedPiecesDiamond,
            getLocationTotalLossPiecesDiamond,
            getEmployeeTotalIssuedQtyGold,
            getEmployeeTotalIssuedQtyDiamond,
            getEmployeeTotalLossQtyGold,
            getEmployeeTotalLossQtyDiamond,
            getEmployeeTotalActualProductionGold,
            getEmployeeTotalActualProductionDiamond,
            getEmployeeTotalIssuedPiecesDiamond,
            getEmployeeTotalLossPiecesDiamond,
            getBagStartingQtyGoldRaw,
            getBagIssuedQtyGoldRaw,
            getBagLossQtyGoldRaw,
            getBagScrapQtyGoldRaw,
            getBagBalanceQtyGoldRaw,
            getBagStartingQtyDiamondRaw,
            getBagIssuedQtyDiamondRaw,
            getBagLossQtyDiamondRaw,
            getBagScrapQtyDiamondRaw,
            getBagBalanceQtyDiamondRaw,
            getBagReceivedPiecesRaw,
            getBagLossPiecesRaw,
            getEmpBagStartingQtyGoldRaw,
            getEmpBagIssuedQtyGoldRaw,
            getEmpBagLossQtyGoldRaw,
            getEmpBagScrapQtyGoldRaw,
            getEmpBagBalanceQtyGoldRaw,
            getEmpBagStartingQtyDiamondRaw,
            getEmpBagIssuedQtyDiamondRaw,
            getEmpBagLossQtyDiamondRaw,
            getEmpBagScrapQtyDiamondRaw,
            getEmpBagBalanceQtyDiamondRaw,
            getEmpBagReceivedPiecesRaw,
            getEmpBagLossPiecesRaw,
            getBagPureWeight,
            getBagPureLoss,
            getBagPurityFactor,
            getEmpBagPureWeight,
            getEmpBagPureLoss,
            getBagQtyData,
            getEmpBagQtyData,
            getDeptTotals,
            getSummaryDeptTotals,
            getSummaryEmpTotals,
            getUnassignedBagsData,
            getUnassignedColumnSum,
            getEmpTotals,
            getEmpBagPurityFactor,
            getBagNsUrl,
            getEmpBagNsUrl,
            getDeptNsUrl,
            getEmpNsUrl,
            getStyleNsUrlPerBag,
            getCategoryNsUrl,
            getSubCategoryNsUrl,
            totalDeptActualProductionGold,
            totalDeptGrossLossGold,
            totalDeptReceivedQtyDiamond,
            totalDeptGrossLossDiamond,
            totalDeptGoldRecoveryWeight,
            totalDeptNetLossGold,
            totalDeptTmProductionGold,
            totalDeptTmProductionDiamond,
            totalDeptBagCount,
            totalDeptStartingQuantityGold,
            totalDeptIssuedNetWeightDiamond,
            totalDeptIssuedQtyGold,
            totalDeptLossQtyGold,
            totalDeptScrapQtyGold,
            totalDeptReceivedQtyGold,
            totalDeptIssuedNetWeightGold,
            totalDeptIssuedQtyDiamond,
            totalDeptLossQtyDiamond,
            totalDeptReceivedPieces,
            totalDeptLossPieces,
            totalEmpActualProductionGold,
            totalEmpGrossLossGold,
            totalEmpActualProductionDiamond,
            totalEmpGrossLossDiamond,
            totalEmpGoldRecoveryWeight,
            totalEmpNetLossGold,
            totalEmpTmProductionGold,
            totalEmpTmProductionDiamond,
            totalEmpBagCount,
            totalEmpStartingQuantityGold,
            totalEmpIssuedQuantityGold,
            totalEmpLossQuantityGold,
            totalEmpScrapQtyGold,
            totalEmpReceivedQtyGold,
            totalEmpIssuedNetWeightGold,
            totalEmpIssuedNetWeightDiamond,
            totalEmpIssuedQuantityDiamond,
            totalEmpLossQuantityDiamond,
            totalEmpReceivedPieces,
            totalEmpLossPieces,
            totalEmpActualProductionGoldCalculated,
            totalEmpReceivedQtyDiamond,
            totalDeptPureWeight,
            totalDeptPureLoss,
            totalEmpPureWeight,
            totalEmpPureLoss,
            showNoDataMessage,
            fetchEfficiencyAnalysisData,
            calculateGoldLossPercentage,
            calculateDiamondLossPercentage,
            getBagRecoveryWeight,
            getEmpBagRecoveryWeight,
            getSelectedDeptBagRecoveryWeight,
            getDeptRecoveryPercentage,
            deptRecoveryPercentageMap,
            getEmpRecoveryPercentage,
            getEmpBagRecoveryWeightByEmpPct,
            recoveryMapVersion
        };
    }
};
</script>



<style scoped>
/* ✅ Date Picker Container */
:deep(.dp__menu) {
    border-radius: 12px;
    box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.15);
    padding: 10px;
    border: 1px solid #e5e7eb;
}

/* ✅ Selected Date (Gray Background) */
:deep(.dp__active_date) {
    background-color: #4a4a4b !important;
    /* Dark Gray */
    color: white !important;
    border-radius: 6px;
    font-weight: bold;
    transition: all 0.2s ease-in-out;
}

/* ✅ Today’s Date (Outlined Circle) */
:deep(.dp__today) {
    border: 2px solid #b0b0b3 !important;
    /* Medium Gray */
    border-radius: 50%;
    font-weight: bold;
    color: #909195 !important;
}

/* ✅ Selected Date (Start and End - Fully Rounded) */
:deep(.dp__range_start) {
    background-color: #e3e3f1 !important;
    /* Dark Gray */
    color: white !important;
    border-radius: 50% !important;
    /* Fully rounded */
    font-weight: bold;
}

/* ✅ Selected Date (Start and End - Fully Rounded) */
:deep(.dp__range_end) {
    background-color: #e3e3f1 !important;
    /* Dark Gray */
    color: white !important;
    border-radius: 50% !important;
    /* Fully rounded */
    font-weight: bold;
}

/* ✅ Range Between (Softer Gray Background, No Rounded Borders) */
:deep(.dp__range_between) {
    background-color: rgba(120, 120, 120, 0.2) !important;
    /* Light Gray */
    color: #5a5c64 !important;
    border-radius: 0px !important;
    /* Remove rounding */
}

/* ✅ Hover Effect */
:deep(.dp__range_between:hover) {
    background-color: rgba(90, 90, 90, 0.3) !important;
}


/* ✅ Navigation Arrows */
:deep(.dp__pointer) {
    color: #5a5a5b !important;
    /* Dark Gray */
    transition: transform 0.2s ease-in-out;
}



/* ✅ Calendar Header */
:deep(.dp__month_year_row) {
    font-weight: bold;
    color: #5a5a5b;
    /* Dark Gray */
}

/* ✅ Weekday Headers */
:deep(.dp__weekday_header) {
    font-weight: bold;
    color: #6b6d6f;
    /* Medium Gray */
}

/* ✅ Date Picker Input Box */
.custom-datepicker {

    /* Adjust width to match UI */
    padding: 10px 14px;
    font-size: 8px;

    /* Dark gray background */

    /* Darker border */
    border-radius: 25px;
    /* Rounded corners */
    color: #ffffff;

}



/* Hide scrollbar but keep scrolling functionality */
.scrollbar-hidden::-webkit-scrollbar {
    width: 0px;
    display: none;
}

.scrollbar-hidden {
    scrollbar-width: none;
    /* For Firefox */
}

/* Custom scrollbar styling */
.scrollbar-custom {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
}

.scrollbar-custom::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.scrollbar-custom::-webkit-scrollbar-track {
    background-color: #f1f5f9;
    border-radius: 4px;
}

.scrollbar-custom::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 4px;
    border: 2px solid #f1f5f9;
}

.scrollbar-custom::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
}

.chart-container {
    width: 100%;
    height: 100%;
    /* or set a specific height for your needs */
}

.table-container {
    max-width: 100%;
    overflow-x: auto;
}

table {
    width: 100%;
    font-size: 12px;
    /* Reduced font size */
    border-spacing: 0;
    border-collapse: collapse;
}

th,
td {
    padding: 6px 8px;
    /* Reduced padding */
    text-align: left;
    border: 1px solid #E5E7EB;
}

th {
    font-weight: 600;
    background-color: #F3F4F6;
    text-transform: uppercase;
    color: #374151;
}

tr:hover {
    background-color: #F9FAFB;
}
</style>

<style>
@media (max-width: 1508px) {
    .main-card-grid {
        grid-template-columns: repeat(4, minmax(100px, 1fr)) !important;
    }
}

@media (max-width: 1271px) {
    .main-card-grid {
        grid-template-columns: repeat(3, minmax(100px, 1fr)) !important;
    }
}

@media (max-width: 1046px) {
    .main-card-grid {
        grid-template-columns: repeat(2, minmax(100px, 1fr)) !important;
    }
}

@media (max-width: 802px) {
    .main-card-grid {
        grid-template-columns: repeat(1, minmax(100px, 1fr)) !important;
    }
}
</style>