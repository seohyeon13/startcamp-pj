<template>
            <!-- TAB 2: FESTIVAL & EVENT LIST + CALENDAR (실제 TourAPI 데이터 기반) -->
            <div v-if="currentTab === 'calendar'" class="space-y-6">
                <!-- Tab Header -->
                <div class="bg-gradient-to-r from-teal-600 to-brand-600 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                    <div class="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
                    <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider">한국관광공사 제공 축제·행사</span>
                    <h2 class="text-2xl md:text-3xl font-extrabold mt-3 leading-tight">
                        대전·세종·공주·논산·계룡·옥천 축제·행사
                    </h2>
                    <p class="text-xs text-teal-50 mt-1 max-w-xl">
                        TourAPI 공공데이터에 등록된 실제 축제·행사 {{ festivalSpots.length }}건이에유. 이 중 4건은 공식 발표 자료로 <b>실제 개최일을 검증</b>해서 달력에 표시했고, 나머지는 원본 데이터에 개최일 필드가 없어서 <b>공공데이터 등록/수정일</b>을 참고용으로만 보여드려유(실제 행사 개최일이 아닐 수 있으니 정확한 일정은 문의처로 확인해보셔유).
                    </p>
                </div>

                <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <i class="fa-solid fa-champagne-glasses text-brand-600"></i>
                            {{ activeRegion === '전체' ? '전체 권역' : activeRegion }} 축제·행사
                        </h3>

                        <!-- 목록형 / 달력형 토글 -->
                        <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-fit">
                            <button 
                                @click="festivalViewMode = 'list'"
                                :class="festivalViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500'"
                                class="px-3 py-1.5 rounded-lg transition"
                            >
                                <i class="fa-solid fa-list mr-1"></i> 목록형
                            </button>
                            <button 
                                @click="festivalViewMode = 'calendar'"
                                :class="festivalViewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500'"
                                class="px-3 py-1.5 rounded-lg transition"
                            >
                                <i class="fa-solid fa-calendar-days mr-1"></i> 달력형
                            </button>
                        </div>
                    </div>

                    <!-- ============ 목록형 뷰 ============ -->
                    <div v-if="festivalViewMode === 'list'" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div 
                                v-for="fest in festivalSpots" 
                                :key="fest.id"
                                class="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md transition flex flex-col"
                            >
                                <div class="relative">
                                    <img :src="fest.image" class="w-full h-32 object-cover" alt="festival image" @error="handleImageError($event, fest.category, fest.id)">
                                    <button @click.stop="toggleFavorite(fest)" class="absolute top-2 right-2 bg-white/95 dark:bg-slate-900/95 p-1.5 rounded-full text-red-500 hover:scale-110 shadow transition">
                                        <i :class="isFavorite(fest.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'" class="text-xs"></i>
                                    </button>
                                    <span class="absolute bottom-2 left-2 text-[9px] font-extrabold px-2 py-1 rounded bg-black/70 text-white backdrop-blur-sm">
                                        공공누리 {{ getLicenseShort(fest.license) }}
                                    </span>
                                    <span v-if="isShowingIllustration(fest)" class="absolute bottom-2 right-2 text-[9px] font-extrabold px-2 py-1 rounded bg-slate-900/70 text-white backdrop-blur-sm">
                                        일러스트
                                    </span>
                                </div>
                                <div class="p-4 flex flex-col gap-1.5 flex-1">
                                    <div class="flex items-center gap-1 flex-wrap">
                                        <span class="text-[9px] bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-extrabold px-1.5 py-0.5 rounded">
                                            {{ fest.region }}
                                        </span>
                                        <span v-if="fest.verifiedStartDate" class="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded">✓ 실제 확정 일정</span>
                                    </div>
                                    <h5 class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{{ fest.name }}</h5>
                                    <p v-if="fest.verifiedStartDate" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                        <i class="fa-solid fa-calendar-check mr-1"></i>{{ fest.verifiedStartDate }} ~ {{ fest.verifiedEndDate }}
                                    </p>
                                    <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                        <i class="fa-solid fa-location-dot mr-1"></i>{{ fest.address || '주소 정보 없음' }}
                                    </p>
                                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                        <i class="fa-solid fa-phone mr-1"></i>{{ fest.tel || '전화번호 정보 없음' }}
                                    </p>

                                    <div class="mt-auto flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-700/50">
                                        <div class="flex items-center gap-2">
                                            <a :href="getYoutubeSearchUrl(fest)" target="_blank" rel="noopener noreferrer" class="text-red-500 hover:text-red-600" title="유튜브에서 검색">
                                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12l-6.2 3.5Z"/></svg>
                                            </a>
                                            <a :href="getInstagramSearchUrl(fest)" target="_blank" rel="noopener noreferrer" class="text-pink-500 hover:text-pink-600" title="인스타그램에서 검색">
                                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 4.95 4.95.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.15 3.25-1.65 4.8-4.95 4.95-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-4.95-4.95C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.15-3.25 1.65-4.8 4.95-4.95C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.75.07-2.35.1-3.4 1.18-3.5 3.5C3.7 8.82 3.7 9.15 3.7 12s0 3.18.05 4.43c.1 2.32 1.15 3.4 3.5 3.5 1.25.05 1.6.07 4.75.07s3.5 0 4.75-.07c2.34-.1 3.4-1.16 3.5-3.5.05-1.25.07-1.58.07-4.43s0-3.18-.07-4.43c-.1-2.32-1.15-3.4-3.5-3.5C15.5 4 15.15 4 12 4Zm0 3.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.8-2a1.08 1.08 0 1 1 0 2.16 1.08 1.08 0 0 1 0-2.16Z"/></svg>
                                            </a>
                                            <button @click="viewSpotDetail(fest)" class="text-[11px] font-bold text-slate-500 hover:underline">상세보기</button>
                                        </div>
                                        <button 
                                            @click="toggleFavorite(fest)"
                                            :class="isFavorite(fest.id) ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'"
                                            class="px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 hover:scale-105"
                                        >
                                            <i :class="isFavorite(fest.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                                            {{ isFavorite(fest.id) ? '코스담김' : '코스추가' }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="festivalSpots.length === 0" class="text-center py-16 text-slate-400 space-y-2">
                            <i class="fa-regular fa-calendar-times text-3xl block text-slate-300"></i>
                            <p class="text-xs">선택한 지역에 등록된 축제·행사 정보가 없어유.</p>
                            <p class="text-[10px] text-slate-500">상단 지역 필터를 '전체'로 바꿔보셔유.</p>
                        </div>
                    </div>

                    <!-- ============ 달력형 뷰 ============ -->
                    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <!-- Left: Month Grid -->
                        <div class="lg:col-span-7 space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <i class="fa-solid fa-calendar-days text-brand-600"></i>
                                    {{ calendarYear }}년 {{ calendarMonth + 1 }}월 정보 등록 현황
                                </h4>
                                <div class="flex items-center gap-1">
                                    <button @click="moveCalMonth(-1)" class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition">
                                        <i class="fa-solid fa-chevron-left"></i>
                                    </button>
                                    <button @click="moveCalMonth(1)" class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition">
                                        <i class="fa-solid fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                <span class="text-red-500">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="text-blue-500">토</span>
                            </div>

                            <div class="grid grid-cols-7 gap-1">
                                <div 
                                    v-for="(day, index) in calendarDays" 
                                    :key="index"
                                    @click="day.dateStr ? (selectedCalDateStr = day.dateStr) : null"
                                    :class="[
                                        day.dateStr ? 'cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-950/20' : 'bg-transparent pointer-events-none',
                                        selectedCalDateStr === day.dateStr ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950/30 font-bold' : ''
                                    ]"
                                    class="min-h-[64px] p-1.5 flex flex-col justify-between rounded-xl border border-transparent transition duration-150"
                                >
                                    <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ day.dayNum }}</span>
                                    <div v-if="day.festivals && day.festivals.length" class="space-y-0.5">
                                        <div 
                                            v-for="f in day.festivals.slice(0, 2)" 
                                            :key="f.id"
                                            class="text-[8px] px-1 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-bold truncate"
                                            :title="f.name"
                                        >
                                            {{ f.name }}
                                        </div>
                                        <div v-if="day.festivals.length > 2" class="text-[7px] text-slate-400 text-right">외 {{ day.festivals.length - 2 }}개</div>
                                    </div>
                                </div>
                            </div>

                            <p class="text-[10px] text-slate-400">
                                <i class="fa-solid fa-circle-info mr-1"></i>날짜에 표시되는 건 <b>정보 등록/수정일</b>이에유. 실제 축제 날짜는 달라유.
                            </p>
                        </div>

                        <!-- Right: Selected date list -->
                        <div class="lg:col-span-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-5 space-y-3">
                            <div class="border-b border-slate-200/60 dark:border-slate-700 pb-3">
                                <span class="text-[10px] uppercase font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-0.5 rounded">선택한 날짜</span>
                                <h4 class="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                                    {{ selectedCalDateStr || '날짜를 선택해보셔유' }}
                                </h4>
                            </div>

                            <div class="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                                <div 
                                    v-for="fest in selectedCalDateFestivals" 
                                    :key="fest.id"
                                    class="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2 hover:shadow-sm transition"
                                >
                                    <div class="flex gap-3">
                                        <img :src="fest.image" class="w-16 h-16 object-cover rounded-xl shrink-0" alt="fest" @error="handleImageError($event, fest.category, fest.id)">
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-1 flex-wrap">
                                                <span class="text-[9px] bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-bold px-1.5 py-0.2 rounded">{{ fest.region }}</span>
                                                <span v-if="fest.verifiedStartDate" class="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded">✓ 실제 확정 일정</span>
                                                <span v-else class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-1.5 py-0.2 rounded">등록일 기준</span>
                                            </div>
                                            <h5 class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-1">{{ fest.name }}</h5>
                                            <p v-if="fest.verifiedStartDate" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{{ fest.verifiedStartDate }} ~ {{ fest.verifiedEndDate }}</p>
                                            <p class="text-[10px] text-slate-500 truncate"><i class="fa-solid fa-phone mr-1"></i>{{ fest.tel || '전화번호 없음' }}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                        <button @click="viewSpotDetail(fest)" class="text-[10px] font-bold text-slate-500 hover:underline">상세보기</button>
                                        <button 
                                            @click="toggleFavorite(fest)"
                                            :class="isFavorite(fest.id) ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600'"
                                            class="px-2 py-0.5 rounded-lg text-[9px] font-bold transition"
                                        >
                                            {{ isFavorite(fest.id) ? '코스담김' : '코스추가' }}
                                        </button>
                                    </div>
                                </div>

                                <div v-if="selectedCalDateStr && selectedCalDateFestivals.length === 0" class="text-center py-10 text-slate-400 text-xs">
                                    이 날짜엔 등록된 정보가 없어유.
                                </div>
                                <div v-if="!selectedCalDateStr" class="text-center py-10 text-slate-400 text-xs">
                                    왼쪽 달력에서 점이 찍힌 날짜를 눌러보셔유.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'FestivalView', setup() { return useYogiuContext(); } };
</script>
