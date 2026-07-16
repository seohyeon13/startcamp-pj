<template>
        <!-- TOP WIDE NAVIGATION HEADER -->
        <header class="sticky top-0 z-40 bg-amber-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-amber-200/60 dark:border-slate-800/80 px-6 py-4 shadow-sm">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                
                <!-- Logo -->
                <div class="flex items-center gap-3 cursor-pointer" @click="changeTab('home')">
                    <span class="text-brand-600 dark:text-brand-500 font-black text-2xl tracking-tight">요기유<span class="text-sm font-bold align-top ml-0.5">YOGIU</span></span>
                    <span class="text-[11px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded font-bold">대충 스마트 포털</span>
                </div>

                <!-- Desktop Navigation Tabs -->
                <nav class="flex flex-wrap items-center justify-center gap-2">
                    <button 
                        @click="changeTab('home')" 
                        :class="currentTab === 'home' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-bold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
                        class="px-3.5 py-2 rounded-xl text-sm transition"
                    >
                        <i class="fa-solid fa-house-chimney mr-1.5"></i> 홈 포털
                    </button>
                    <!-- NEW Tab: Festival Calendar -->
                    <button 
                        @click="changeTab('calendar')" 
                        :class="currentTab === 'calendar' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-bold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
                        class="px-3.5 py-2 rounded-xl text-sm transition"
                    >
                        <i class="fa-solid fa-calendar-days mr-1.5"></i> 축제·행사
                    </button>
                    <button 
                        @click="changeTab('community')" 
                        :class="currentTab === 'community' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-bold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
                        class="px-3.5 py-2 rounded-xl text-sm transition"
                    >
                        <i class="fa-solid fa-comments mr-1.5"></i> 익명 소통방
                    </button>
                    <button 
                        @click="changeTab('mypage')" 
                        :class="currentTab === 'mypage' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-bold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
                        class="px-3.5 py-2 rounded-xl text-sm transition"
                    >
                        <i class="fa-solid fa-route mr-1.5"></i> 동선 플래너
                        <span v-if="favorites.length > 0" class="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {{ favorites.length }}
                        </span>
                    </button>
                </nav>

                <!-- Actions / Controls -->
                <div class="flex items-center gap-4">
                    <!-- Quick Region Selector in Header -->
                    <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                            v-for="region in ['전체', '대전', '충북', '충남']" 
                            :key="region"
                            @click="selectRegion(region)"
                            :class="activeRegion === region ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'"
                            class="px-3 py-1 text-xs rounded-lg transition"
                        >
                            {{ region }}
                        </button>
                    </div>

                    <!-- Dark Mode Toggle -->
                    <button @click="toggleDarkMode" class="text-slate-500 dark:text-slate-400 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <i :class="isDark ? 'fa-solid fa-sun text-yellow-400' : 'fa-solid fa-moon text-slate-600'"></i>
                    </button>
                </div>
            </div>
        </header>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'AppHeader', setup() { return useYogiuContext(); } };
</script>
