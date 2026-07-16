<template>
            <!-- TAB 4: COURSE PLANNER & LEAFLET WIDE MAP -->
            <div v-if="currentTab === 'mypage'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <!-- Left panel: Drag-reorder interactive planner -->
                <div class="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">나의 동선 코스 설계기</h3>
                        <p class="text-xs text-slate-400 mt-1">홈 포털 및 축제·행사 탭에서 하트를 누른 추천 장소들입니다. 상하 이동버튼으로 순서를 변경해 최단경로 동선을 완성하셔유.</p>
                    </div>

                    <div v-if="favoriteSpots.length === 0" class="text-center py-12 bg-slate-50 dark:bg-slate-800/30 border border-dashed rounded-2xl text-xs text-slate-400">
                        <i class="fa-regular fa-heart text-3xl mb-3 block text-slate-300"></i>
                        가보고 싶은 장소 및 축제의 하트를 눌러 이곳에 담아 동선을 배치하셔유.
                    </div>

                    <div v-else class="space-y-2">
                        <p class="text-[10px] text-brand-600 dark:text-brand-400 font-semibold mb-1">
                            💡 ▲▼ 버튼 조절 시 우측 지도가 순서대로 자동 연결됩니다. 카카오맵 키가 없으면 Leaflet 지도로 안전하게 표시돼유.
                        </p>
                        <div v-for="(spot, index) in favoriteSpots" :key="spot.id" class="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between hover:shadow-sm transition">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="w-6 h-6 bg-brand-600 text-white text-xs font-black rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                    {{ index + 1 }}
                                </span>
                                <div class="min-w-0">
                                    <h5 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" :title="spot.name">{{ spot.name }}</h5>
                                    <span class="text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                                        {{ spot.category }} | {{ spot.region }}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Actions for course reordering -->
                            <div class="flex items-center gap-1 shrink-0">
                                <button @click="moveFav(index, -1)" :disabled="index === 0" class="p-1.5 rounded bg-white dark:bg-slate-700 text-[10px] disabled:opacity-30 hover:bg-slate-100">
                                    ▲
                                </button>
                                <button @click="moveFav(index, 1)" :disabled="index === favoriteSpots.length - 1" class="p-1.5 rounded bg-white dark:bg-slate-700 text-[10px] disabled:opacity-30 hover:bg-slate-100">
                                    ▼
                                </button>
                                <button @click="toggleFavorite(spot)" class="p-1.5 text-red-500 hover:scale-105">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 이동 시간/방법 검색 -->
                    <div v-if="favoriteSpots.length >= 2" class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <button 
                            @click="fetchRouteInfo"
                            :disabled="routeLoading"
                            class="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
                        >
                            <i class="fa-solid" :class="routeLoading ? 'fa-spinner animate-spin' : 'fa-route'"></i>
                            {{ routeLoading ? '실제 도로 경로 계산 중...' : '실제 동선 거리·시간 계산하기' }}
                        </button>
                        <p class="text-[9px] text-slate-400 leading-relaxed">
                            <i class="fa-solid fa-circle-info mr-1"></i>총 거리와 자동차 시간은 실제 도로망(OSRM) 기준으로 계산해유. 대중교통은 각 구간의 <b>카카오맵 실시간 대중교통 길찾기</b>를 바로 열어 버스·지하철 환승 정보를 확인할 수 있어유.
                        </p>

                        <p v-if="routeError" class="text-[11px] text-red-500">{{ routeError }}</p>

                        <div v-if="routeInfo" class="bg-brand-50 dark:bg-brand-950/20 rounded-2xl p-4 space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    <i class="fa-solid fa-car mr-1 text-brand-600"></i>총 이동
                                </span>
                                <span class="text-sm font-black text-brand-700 dark:text-brand-400">
                                    {{ routeInfo.totalDurationMin }}분 · {{ routeInfo.totalDistanceKm }}km
                                </span>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <button @click="openKakaoFullRoute('car')" class="text-[10px] py-2 rounded-xl bg-slate-800 text-white font-black"><i class="fa-solid fa-car mr-1"></i>전체 자동차 길찾기</button>
                                <button @click="openKakaoFullRoute('traffic')" class="text-[10px] py-2 rounded-xl bg-yellow-300 text-slate-900 font-black"><i class="fa-solid fa-bus-simple mr-1"></i>구간별 대중교통 보기</button>
                            </div>
                            <div class="space-y-1.5">
                                <div v-for="(leg, i) in routeInfo.legs" :key="i" class="text-[10px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 space-y-2">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="truncate min-w-0"><b>{{ i + 1 }}</b> {{ leg.fromName }} → {{ leg.toName }}</span>
                                        <span class="font-bold text-brand-600 dark:text-brand-400 shrink-0">차량 {{ leg.durationMin }}분 · {{ leg.distanceKm }}km</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="text-[9px] text-slate-400 truncate"><i class="fa-solid fa-bus-simple mr-1"></i>{{ leg.transitHint }}</span>
                                        <div class="flex gap-1 shrink-0">
                                            <button @click="openKakaoLegRoute(leg, 'traffic')" class="px-2 py-1 rounded-lg bg-yellow-300 hover:bg-yellow-400 text-slate-900 font-black">대중교통</button>
                                            <button @click="openKakaoLegRoute(leg, 'car')" class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold">자동차</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right panel: Interactive map visualization -->
                <div class="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <i class="fa-solid fa-route text-brand-600"></i> 지도 시각화
                        </span>

                        <!-- 지도 표시 모드 토글 -->
                        <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-fit">
                            <button 
                                @click="mapViewMode = 'favorites'"
                                :class="mapViewMode === 'favorites' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500'"
                                class="px-3 py-1.5 rounded-lg transition"
                            >
                                <i class="fa-solid fa-heart mr-1"></i> 내 찜 코스
                            </button>
                            <button 
                                @click="mapViewMode = 'all'"
                                :class="mapViewMode === 'all' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500'"
                                class="px-3 py-1.5 rounded-lg transition"
                            >
                                <i class="fa-solid fa-map-location-dot mr-1"></i> 전체 데이터 핀
                            </button>
                        </div>
                    </div>

                    <!-- Map Marker Category Legend (실제 8개 콘텐츠 유형) -->
                    <div class="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-sky-500 text-[8px]"></i> 관광지</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-violet-500 text-[8px]"></i> 문화시설</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-pink-500 text-[8px]"></i> 축제·행사</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-teal-500 text-[8px]"></i> 여행코스</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-orange-500 text-[8px]"></i> 레포츠</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-indigo-500 text-[8px]"></i> 숙박</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-rose-500 text-[8px]"></i> 쇼핑</span>
                        <span class="flex items-center gap-1"><i class="fa-solid fa-circle text-green-500 text-[8px]"></i> 음식점</span>
                    </div>

                    <!-- 지역 지도 이미지 + 시군 클릭 필터 (전체 데이터 핀 모드에서만 노출) -->
                    <div v-if="mapViewMode === 'all'" class="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 space-y-3">
                        <div class="flex flex-col sm:flex-row gap-4 items-center">
                            <img :src="regionMapImg" alt="대전·충청권 행정구역 지도" class="w-full sm:w-[360px] max-h-[320px] object-contain rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 bg-white">
                            <div class="flex-1 space-y-2">
                                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                    대전·공주·논산·계룡·옥천 권역 지도로 교체했어유. 아래 지역 버튼을 누르면 해당 권역의 관광지·축제·맛집 핀만 빠르게 확인할 수 있어유.
                                </p>
                                <div class="flex flex-wrap gap-1.5">
                                    <button 
                                        @click="mapCity = '전체'"
                                        :class="mapCity === '전체' ? 'bg-brand-600 text-white border-brand-600 font-bold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                                        class="px-3 py-1.5 rounded-xl border text-[11px] transition"
                                    >
                                        전체 ({{ spotsData.length }})
                                    </button>
                                    <button 
                                        v-for="city in ['대전','공주','논산','계룡','옥천']"
                                        :key="city"
                                        @click="mapCity = city"
                                        :class="mapCity === city ? 'bg-brand-600 text-white border-brand-600 font-bold' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                                        class="px-3 py-1.5 rounded-xl border text-[11px] transition"
                                    >
                                        {{ city }} ({{ mapCityCount(city) }})
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 지도 전용 카테고리 선택 (전체 데이터 핀 모드에서만 노출) -->
                    <div v-if="mapViewMode === 'all'" class="flex flex-wrap gap-1.5">
                        <button 
                            v-for="cat in ['전체','관광지','문화시설','축제공연행사','여행코스','레포츠','숙박','쇼핑','음식점']"
                            :key="cat"
                            @click="mapCategory = cat"
                            :class="mapCategory === cat ? 'bg-brand-600 text-white border-brand-600 font-bold' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-300'"
                            class="px-3 py-1.5 rounded-xl border text-[11px] transition"
                        >
                            {{ cat }}
                        </button>
                    </div>

                    <p v-if="mapViewMode === 'all'" class="text-[11px] text-slate-400">
                        지역 필터는 홈 탭과 공유돼유. 현재 <b class="text-brand-600 dark:text-brand-400">{{ mapAllModeSpots.length }}개</b> 핀 표시 중
                        <span v-if="mapAllModeTotalCount > mapAllModeSpots.length">(전체 {{ mapAllModeTotalCount }}건 중 성능을 위해 {{ mapAllModeSpots.length }}개까지만 표시했어유)</span>
                    </p>

                    <!-- 카카오맵 설정 및 지도 엔진 전환 -->
                    <div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 space-y-3">
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <p class="text-xs font-extrabold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-map mr-1 text-amber-600"></i>지도 엔진</p>
                                <p class="text-[10px] text-slate-500 mt-1">카카오 JavaScript 키를 등록하면 카카오맵·스카이뷰·로드뷰를 사용할 수 있어유. 키가 없거나 로딩에 실패하면 기존 Leaflet 지도가 유지돼유.</p>
                            </div>
                            <div class="flex bg-white dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold shrink-0">
                                <button @click="setMapEngine('leaflet')" :class="mapEngine === 'leaflet' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-500'" class="px-3 py-1.5 rounded-lg">Leaflet</button>
                                <button @click="setMapEngine('kakao')" :class="mapEngine === 'kakao' ? 'bg-yellow-400 text-slate-900' : 'text-slate-500'" class="px-3 py-1.5 rounded-lg">Kakao Maps</button>
                            </div>
                        </div>
                        <div v-if="mapEngine === 'kakao'" class="space-y-2">
                            <div v-if="kakaoMapKey && !showKakaoKeyEditor" class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-900/50 px-3.5 py-2.5">
                                <p class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-circle-check mr-1"></i>카카오맵 키가 이 브라우저에 저장되어 자동 적용돼유.</p>
                                <button @click="showKakaoKeyEditor = true" class="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200">키 변경</button>
                            </div>
                            <div v-else class="flex flex-col sm:flex-row gap-2">
                                <input v-model.trim="kakaoMapKeyInput" type="password" autocomplete="off" placeholder="카카오 JavaScript 키를 최초 1회 입력" class="flex-1 text-xs px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-400">
                                <button @click="saveKakaoMapKey" class="text-xs font-bold px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900">키 저장·자동 적용</button>
                                <button v-if="kakaoMapKey" @click="cancelKakaoKeyEdit" class="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200">취소</button>
                            </div>
                        </div>
                        <div v-if="mapEngine === 'kakao' && kakaoMapReady" class="flex flex-wrap gap-2">
                            <button @click="setKakaoMapType('roadmap')" :class="kakaoMapType === 'roadmap' ? 'bg-yellow-400 text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500'" class="text-[11px] font-bold px-3 py-1.5 rounded-xl">일반지도</button>
                            <button @click="setKakaoMapType('skyview')" :class="kakaoMapType === 'skyview' ? 'bg-yellow-400 text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500'" class="text-[11px] font-bold px-3 py-1.5 rounded-xl">스카이뷰</button>
                            <button @click="toggleKakaoTraffic" :class="kakaoTrafficOn ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'" class="text-[11px] font-bold px-3 py-1.5 rounded-xl">교통정보</button>
                            <button @click="toggleKakaoRoadviewRoad" :class="kakaoRoadviewRoadOn ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'" class="text-[11px] font-bold px-3 py-1.5 rounded-xl">로드뷰 도로</button>
                        </div>
                        <p v-if="mapEngine === 'kakao' && !kakaoMapKey" class="text-[10px] text-red-500">.env의 VITE_KAKAO_JS_KEY를 설정하고 실행 주소를 카카오 Developers 웹 도메인에 등록해주셔유.</p>
                    </div>

                    <!-- Map viewport -->
                    <div id="course-map" class="w-full h-[450px] rounded-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800"></div>
                </div>
            </div>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'PlannerView', setup() { return useYogiuContext(); } };
</script>
