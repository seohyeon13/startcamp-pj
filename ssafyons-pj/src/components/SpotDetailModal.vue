<template>
        <!-- DETAIL MODAL FOR SPOT -->
        <div v-if="selectedSpot" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden relative">
                <!-- Close Button -->
                <button @click="selectedSpot = null" class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <!-- Header Image -->
                <img :src="selectedSpot.image" class="w-full h-48 object-cover" alt="Detail cover" @error="handleImageError($event, selectedSpot.category, selectedSpot.id)">

                <!-- Spot Info Body -->
                <div class="p-6 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div class="flex justify-between items-start gap-2">
                        <div>
                            <span class="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-0.5 rounded">
                                {{ selectedSpot.region }} | {{ selectedSpot.category }}
                            </span>
                            <h3 class="text-md font-bold mt-2 text-slate-800 dark:text-slate-100 leading-tight">{{ selectedSpot.name }}</h3>
                        </div>
                        <button @click="toggleFavorite(selectedSpot)" class="text-red-500 text-lg hover:scale-110 active:scale-95 transition">
                            <i :class="isFavorite(selectedSpot.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                        </button>
                    </div>

                    <!-- Explicit KOGL Information Badge inside modal -->
                    <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">공공저작물 라이선스:</span>
                        <span class="text-xs font-black px-2.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                            {{ getLicenseName(selectedSpot.license || 'Type1') }}
                        </span>
                    </div>

                    <div v-if="selectedSpot.category === '축제공연행사'" class="bg-amber-50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-200">
                        <i class="fa-regular fa-calendar-alt text-amber-500 mr-1.5"></i>
                        공공데이터에 정확한 행사 일정(시작일·종료일) 정보가 없어유. 아래 전화번호로 최신 일정을 확인해보셔유.
                    </div>

                    <div class="space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> {{ selectedSpot.address || '상세 위치 정보 없음' }}</div>
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-phone text-slate-400"></i> {{ selectedSpot.tel || '전화번호 정보 없음' }}</div>
                    </div>

                    <div class="space-y-1">
                        <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400">정보 제공</h4>
                        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            이 항목은 한국관광공사 Tour API(TourAPI 4.0)에서 제공하는 공공데이터이며, 콘텐츠 ID <b>{{ selectedSpot.id }}</b> 기준 정보예유. 자세한 소개글은 공식 API에서 제공 안 해줘서 이 화면엔 안 뜬다는 점 참고하셔유.
                        </p>
                    </div>

                    <!-- 좌표 기반 실시간 날씨 -->
                    <div v-if="selectedSpot.lat && selectedSpot.lng" class="space-y-2 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-4">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300"><i class="fa-solid fa-cloud-sun text-sky-500 mr-1"></i>현재 장소 날씨</h4>
                            <button @click="fetchSpotWeather(selectedSpot)" :disabled="spotWeatherLoading" class="text-[10px] font-bold text-sky-600 disabled:opacity-50"><i class="fa-solid fa-rotate mr-1" :class="spotWeatherLoading ? 'animate-spin' : ''"></i>새로고침</button>
                        </div>
                        <div v-if="spotWeatherLoading" class="text-[11px] text-slate-400">날씨를 불러오는 중이에유...</div>
                        <div v-else-if="spotWeather" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-2.5 text-center"><p class="text-[9px] text-slate-400">현재</p><p class="text-sm font-black text-slate-800 dark:text-white">{{ spotWeather.temperature }}℃</p></div>
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-2.5 text-center"><p class="text-[9px] text-slate-400">체감</p><p class="text-sm font-black text-slate-800 dark:text-white">{{ spotWeather.apparentTemperature }}℃</p></div>
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-2.5 text-center"><p class="text-[9px] text-slate-400">강수확률</p><p class="text-sm font-black text-slate-800 dark:text-white">{{ spotWeather.precipitationProbability }}%</p></div>
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-2.5 text-center"><p class="text-[9px] text-slate-400">풍속</p><p class="text-sm font-black text-slate-800 dark:text-white">{{ spotWeather.windSpeed }}km/h</p></div>
                            <div class="col-span-2 sm:col-span-4 text-[11px] font-bold rounded-xl px-3 py-2" :class="spotWeather.statusClass">{{ spotWeather.description }} · {{ spotWeather.travelAdvice }}</div>
                            <p class="col-span-2 sm:col-span-4 text-[9px] text-slate-400 text-right"><i class="fa-regular fa-clock mr-1"></i>{{ spotWeather.updatedAt }}</p>
                        </div>
                        <p v-else-if="spotWeatherError" class="text-[11px] text-red-500">{{ spotWeatherError }}</p>
                    </div>

                    <!-- 데이터 기반 장소 자동 요약 -->
                    <div v-if="placeSummary" class="space-y-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4">
                        <div class="flex items-center justify-between gap-2">
                            <h4 class="text-xs font-bold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-wand-magic-sparkles text-amber-500 mr-1"></i>지역·장소 한눈에 보기</h4>
                            <span class="text-[9px] font-bold px-2 py-1 rounded-full bg-white/80 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50">데이터 자동 요약</span>
                        </div>

                        <div class="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-amber-100 dark:border-slate-700">
                            <p class="text-xs font-black text-slate-800 dark:text-white leading-relaxed">{{ placeSummary.intro }}</p>
                            <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{{ placeSummary.highlight }}</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-slate-700">
                                <p class="text-[9px] text-slate-400"><i class="fa-regular fa-clock mr-1"></i>예상 소요 시간</p>
                                <p class="text-[11px] font-black text-slate-700 dark:text-slate-100 mt-1">{{ placeSummary.duration }}</p>
                            </div>
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-slate-700">
                                <p class="text-[9px] text-slate-400"><i class="fa-solid fa-user-group mr-1"></i>추천 대상</p>
                                <p class="text-[11px] font-black text-slate-700 dark:text-slate-100 mt-1">{{ placeSummary.audience }}</p>
                            </div>
                            <div class="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-slate-700">
                                <p class="text-[9px] text-slate-400"><i class="fa-solid fa-camera-retro mr-1"></i>추천 시간대</p>
                                <p class="text-[11px] font-black text-slate-700 dark:text-slate-100 mt-1">{{ placeSummary.bestTime }}</p>
                            </div>
                        </div>

                        <div class="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <div class="flex gap-2 bg-white/70 dark:bg-slate-800/70 rounded-xl p-3"><i class="fa-solid fa-lightbulb text-amber-500 mt-0.5"></i><p><b>방문 팁</b><br>{{ placeSummary.visitTip }}</p></div>
                            <div class="flex gap-2 bg-white/70 dark:bg-slate-800/70 rounded-xl p-3"><i class="fa-solid fa-cloud-sun text-sky-500 mt-0.5"></i><p><b>날씨 팁</b><br>{{ placeSummary.weatherTip }}</p></div>
                            <div class="flex gap-2 bg-white/70 dark:bg-slate-800/70 rounded-xl p-3"><i class="fa-solid fa-route text-brand-600 mt-0.5"></i><p><b>이동 팁</b><br>{{ placeSummary.moveTip }}</p></div>
                        </div>

                        <p class="text-[9px] text-slate-400 leading-relaxed">이 내용은 장소명, 지역, 주소, 카테고리, 좌표 등 현재 보유한 공공데이터를 조합해 자동 생성한 안내예유. 실제 운영시간·주차·휴무 정보는 현장 또는 공식 안내를 한 번 더 확인해주셔유.</p>
                    </div>

                    <!-- 장소 위치 미니맵 -->
                    <div v-if="selectedSpot.lat && selectedSpot.lng" class="space-y-1.5">
                        <div class="flex items-center justify-between gap-2">
                            <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"><i class="fa-solid fa-map-location-dot text-brand-600"></i> 위치</h4>
                            <button v-if="kakaoMapReady" @click="openRoadview(selectedSpot)" class="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-500"><i class="fa-solid fa-street-view mr-1"></i>로드뷰 보기</button>
                        </div>
                        <div id="detail-mini-map" class="w-full h-40 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"></div>
                    </div>
                </div>

                <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                    <a 
                        :href="getYoutubeSearchUrl(selectedSpot)" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="flex items-center justify-center text-xs py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition shrink-0"
                        title="유튜브에서 검색"
                    >
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12l-6.2 3.5Z"/></svg>
                    </a>
                    <a 
                        :href="getInstagramSearchUrl(selectedSpot)" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="flex items-center justify-center text-xs py-2.5 px-3 rounded-xl border border-pink-200 dark:border-pink-900/40 bg-pink-50 dark:bg-pink-950/10 text-pink-600 dark:text-pink-400 font-bold hover:bg-pink-100 transition shrink-0"
                        title="인스타그램에서 검색"
                    >
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 4.95 4.95.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.15 3.25-1.65 4.8-4.95 4.95-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-4.95-4.95C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.15-3.25 1.65-4.8 4.95-4.95C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.75.07-2.35.1-3.4 1.18-3.5 3.5C3.7 8.82 3.7 9.15 3.7 12s0 3.18.05 4.43c.1 2.32 1.15 3.4 3.5 3.5 1.25.05 1.6.07 4.75.07s3.5 0 4.75-.07c2.34-.1 3.4-1.16 3.5-3.5.05-1.25.07-1.58.07-4.43s0-3.18-.07-4.43c-.1-2.32-1.15-3.4-3.5-3.5C15.5 4 15.15 4 12 4Zm0 3.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.8-2a1.08 1.08 0 1 1 0 2.16 1.08 1.08 0 0 1 0-2.16Z"/></svg>
                    </a>
                    <button @click="toggleFavorite(selectedSpot)" class="flex-1 text-xs py-2.5 rounded-xl border transition font-bold" :class="isFavorite(selectedSpot.id) ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/10 dark:border-red-900/40' : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'">
                        {{ isFavorite(selectedSpot.id) ? '♥ 찜 보관 완료' : '♡ 찜 코스 추가' }}
                    </button>
                    <button @click="selectedSpot = null" class="flex-1 text-xs bg-brand-600 text-white py-2.5 rounded-xl font-bold hover:bg-brand-700">확인</button>
                </div>
            </div>
        </div>


        <!-- KAKAO ROADVIEW MODAL -->
        <div v-if="roadviewModalOpen" class="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl">
                <div class="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <div><p class="text-xs font-black text-slate-800 dark:text-white"><i class="fa-solid fa-street-view text-yellow-500 mr-1"></i>{{ roadviewSpot?.name }} 주변 로드뷰</p><p class="text-[10px] text-slate-400 mt-1">장소 주변 50m부터 최대 1km까지 가장 가까운 카카오 로드뷰를 자동으로 찾아 표시해유.</p></div>
                    <button @click="closeRoadview" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="relative w-full h-[520px] bg-slate-100 dark:bg-slate-950">
                    <div id="kakao-roadview" class="absolute inset-0 w-full h-full"></div>
                    <div v-if="roadviewLoading" class="absolute inset-0 z-10 bg-white/90 dark:bg-slate-900/90 flex items-center justify-center text-sm text-slate-400"><i class="fa-solid fa-spinner animate-spin mr-2"></i>가까운 로드뷰를 찾는 중이에유...</div>
                    <div v-if="roadviewError" class="absolute inset-0 z-20 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-sm text-slate-400 gap-3 px-6 text-center"><i class="fa-solid fa-circle-exclamation text-3xl text-amber-500"></i><p>{{ roadviewError }}</p><button @click="retryRoadview" class="px-4 py-2 rounded-xl bg-yellow-400 text-slate-900 text-xs font-bold">다시 시도</button></div>
                </div>
            </div>
        </div>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'SpotDetailModal', setup() { return useYogiuContext(); } };
</script>
