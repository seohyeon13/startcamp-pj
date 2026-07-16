<template>
            <!-- TAB 1: HOME (Dashboard Grid Style) -->
            <div v-if="currentTab === 'home'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <!-- LEFT & MIDDLE COLUMN: Categories, Spot Showcase & List -->
                <div class="lg:col-span-8 space-y-6">
                    
                    <!-- Welcome Hero Banner -->
                    <div class="bg-gradient-to-r from-amber-500 to-yellow-400 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                        <!-- 지역별 공식 이미지를 배너 전체 배경으로 사용 (사용자 업로드 원본 파일) -->
                        <img 
                            :src="currentBannerImg" 
                            :alt="activeRegion + ' 지역 캐릭터 이미지'"
                            class="absolute inset-0 w-full h-full object-cover"
                        >
                        <!-- 텍스트 가독성을 위한 그라디언트 오버레이 -->
                        <div class="absolute inset-0 bg-gradient-to-r from-amber-700/95 via-amber-600/75 to-amber-500/30"></div>
                        <div class="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

                        <div class="relative z-10">
                            <span class="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider">공공데이터포털 투어 API 전면 개방</span>
                            <h2 class="text-2xl md:text-3xl font-extrabold mt-3 leading-tight">
                                공공데이터 활용 실시간 데이터!<br>
                                지금은 <span class="underline decoration-yellow-300 underline-offset-4">{{ activeRegion === '전체' ? '대전 및 충청권' : activeRegion }}</span> 여행 중이예유!
                            </h2>
                            <p class="text-sm text-amber-50 mt-2 max-w-lg">한국관광공사가 제공하는 데이터를 활용해 실제 명소 매장 정보와 축제 행사 목록을 탐색해 보셔유.</p>
                            
                            <button @click="changeTab('calendar')" class="mt-4 bg-white text-amber-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:bg-amber-50 transition shadow-md">
                                <i class="fa-solid fa-calendar-days"></i> 스마트 축제 일정표 보러가기 →
                            </button>
                        </div>
                    </div>

                    <!-- Dynamic Category Select & Store List -->
                    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <i class="fa-solid fa-map-location text-brand-600"></i>
                                    {{ activeRegion }}의 테마별 검증 관광 데이터
                                </h3>
                                <p class="text-xs text-slate-400 mt-0.5">공공데이터포털 출처의 라이선스를 보장하는 장소들이에유.</p>
                            </div>

                            <!-- Spot Search Box -->
                            <div class="relative w-full sm:w-64 shrink-0">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                                </span>
                                <input 
                                    type="text" 
                                    v-model="spotSearchQuery"
                                    placeholder="장소명, 주소, 키워드 검색..." 
                                    class="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-2xl focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
                                >
                            </div>
                        </div>

                        <!-- Core Category Selection Tabs (실제 TourAPI 8개 콘텐츠 유형) -->
                        <div class="flex flex-wrap gap-2">
                            <button 
                                v-for="cat in ['전체','관광지','문화시설','여행코스','레포츠','숙박','쇼핑','음식점']"
                                :key="cat"
                                @click="activeCategory = cat"
                                :class="activeCategory === cat ? 'bg-brand-600 text-white border-brand-600 font-bold' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-300'"
                                class="px-3.5 py-2 rounded-xl border text-xs transition hover:scale-[1.03]"
                            >
                                {{ cat }}
                            </button>
                        </div>
                        <p class="text-[11px] text-slate-400">현재 <b class="text-brand-600 dark:text-brand-400">{{ filteredSpots.length }}건</b>건의 한국관광공사 제공 정보가 조회됐어유.</p>

                        <!-- Spot Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div v-for="spot in paginatedSpots" :key="spot.id" class="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md transition flex flex-col justify-between">
                                <div class="relative">
                                    <img :src="spot.image" class="w-full h-44 object-cover" alt="spot image" @error="handleImageError($event, spot.category, spot.id)">
                                    <button @click.stop="toggleFavorite(spot)" class="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 p-2 rounded-full text-red-500 hover:scale-110 shadow transition">
                                        <i :class="isFavorite(spot.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                                    </button>
                                    
                                    <!-- Dynamic License Badge inside Thumbnail -->
                                    <span class="absolute bottom-3 left-3 text-[9px] font-extrabold px-2 py-1 rounded bg-black/70 text-white backdrop-blur-sm">
                                        공공누리 {{ getLicenseShort(spot.license) }}
                                    </span>
                                    <span v-if="isShowingIllustration(spot)" class="absolute bottom-3 right-3 text-[9px] font-extrabold px-2 py-1 rounded bg-slate-900/70 text-white backdrop-blur-sm">
                                        일러스트 (실사진 없음)
                                    </span>
                                    <span class="absolute top-3 left-3 text-[9px] font-extrabold px-2 py-1 rounded bg-brand-600/90 text-white">
                                        {{ spot.category }}
                                    </span>
                                </div>
                                <div class="p-4 space-y-2 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div class="flex items-center justify-between gap-1">
                                            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-2" :title="spot.name">{{ spot.name }}</h4>
                                            <span class="text-[10px] text-slate-400 shrink-0">{{ spot.region }}</span>
                                        </div>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                            <i class="fa-solid fa-location-dot mr-1"></i>{{ spot.address || '상세 위치 정보 없음 (여행코스형 데이터)' }}
                                        </p>
                                    </div>
                                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                        <span class="truncate max-w-[70%]"><i class="fa-solid fa-phone"></i> {{ spot.tel || '전화번호 정보 없음' }}</span>
                                        <div class="flex items-center gap-2 shrink-0">
                                            <a :href="getYoutubeSearchUrl(spot)" target="_blank" rel="noopener noreferrer" @click.stop class="text-red-500 hover:text-red-600" title="유튜브에서 검색">
                                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12l-6.2 3.5Z"/></svg>
                                            </a>
                                            <a :href="getInstagramSearchUrl(spot)" target="_blank" rel="noopener noreferrer" @click.stop class="text-pink-500 hover:text-pink-600" title="인스타그램에서 검색">
                                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 4.95 4.95.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.15 3.25-1.65 4.8-4.95 4.95-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-4.95-4.95C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.15-3.25 1.65-4.8 4.95-4.95C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.75.07-2.35.1-3.4 1.18-3.5 3.5C3.7 8.82 3.7 9.15 3.7 12s0 3.18.05 4.43c.1 2.32 1.15 3.4 3.5 3.5 1.25.05 1.6.07 4.75.07s3.5 0 4.75-.07c2.34-.1 3.4-1.16 3.5-3.5.05-1.25.07-1.58.07-4.43s0-3.18-.07-4.43c-.1-2.32-1.15-3.4-3.5-3.5C15.5 4 15.15 4 12 4Zm0 3.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 1.8a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.8-2a1.08 1.08 0 1 1 0 2.16 1.08 1.08 0 0 1 0-2.16Z"/></svg>
                                            </a>
                                            <button @click="viewSpotDetail(spot)" class="text-brand-600 dark:text-brand-400 font-bold hover:underline">상세보기</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="filteredSpots.length === 0" class="text-center py-12 text-slate-400">
                            일치하는 추천 관광지/상점이 없어유. 다른 검색어를 입력해보셔유.
                        </div>

                        <!-- Spot Grid Pagination -->
                        <div v-if="totalSpotPages > 1" class="flex items-center justify-center gap-3 pt-2">
                            <button 
                                @click="spotPage = Math.max(1, spotPage - 1)" 
                                :disabled="spotPage === 1"
                                class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 text-xs transition"
                            >
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <span class="text-xs text-slate-500 font-extrabold">{{ spotPage }} / {{ totalSpotPages }}</span>
                            <button 
                                @click="spotPage = Math.min(totalSpotPages, spotPage + 1)" 
                                :disabled="spotPage === totalSpotPages"
                                class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 text-xs transition"
                            >
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: TODAY'S BRIEFING & LIVE POSTS -->
                <div class="lg:col-span-4 space-y-6">
                    
                    <!-- TODAY'S BRIEFING -->
                    <div class="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
                        <div class="absolute right-0 top-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl"></div>
                        
                        <div class="flex items-center justify-between mb-5">
                            <div class="flex items-center gap-2">
                                <div class="w-2.5 h-2.5 bg-brand-500 rounded-full animate-ping"></div>
                                <h3 class="text-sm font-bold tracking-tight">로컬 스마트 브리핑</h3>
                            </div>
                            <button @click="refreshAIBriefing" class="text-[11px] bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-xl flex items-center gap-1 transition">
                                <i class="fa-solid fa-wand-magic-sparkles text-brand-400 animate-pulse"></i> 동네 AI 갱신
                            </button>
                        </div>

                        <!-- AI Briefing Content Loading -->
                        <div v-if="loadingBriefing" class="space-y-3 py-4">
                            <div class="h-4 bg-slate-800 rounded-full animate-pulse w-3/4"></div>
                            <div class="h-4 bg-slate-800 rounded-full animate-pulse w-5/6"></div>
                            <div class="h-4 bg-slate-800 rounded-full animate-pulse w-2/3"></div>
                        </div>

                        <!-- AI Briefing Content Loaded -->
                        <div v-else class="space-y-4">
                            <!-- AI 추천 여행 경로 -->
                            <div class="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                <div class="flex items-center justify-between gap-2 mb-2">
                                    <div class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-route text-sky-400"></i>
                                        <p class="text-[10px] text-slate-400">AI 추천 여행 경로</p>
                                    </div>
                                    <a v-if="aiRouteStops.length >= 2" :href="aiRouteKakaoUrl" target="_blank" rel="noopener noreferrer" class="text-[9px] font-bold px-2 py-1 rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-500 shrink-0 inline-flex items-center">
                                        <i class="fa-solid fa-map-location-dot mr-1"></i>카카오맵 길찾기
                                    </a>
                                </div>
                                <div v-if="aiRouteStops.length" class="flex flex-wrap items-center gap-1.5 mb-2">
                                    <template v-for="(stop, idx) in aiRouteStops" :key="stop.id">
                                        <span class="text-[10px] font-bold px-2 py-1 rounded-full bg-sky-500/15 text-sky-300">{{ stop.name }}</span>
                                        <i v-if="idx < aiRouteStops.length - 1" class="fa-solid fa-arrow-right text-[9px] text-slate-500"></i>
                                    </template>
                                </div>
                                <p v-else class="text-[11px] text-slate-400 mb-2">이 지역엔 아직 추천할 코스 데이터가 부족해유.</p>
                                <p class="text-xs text-slate-200 leading-normal">{{ aiBriefing.routeSummary }}</p>
                            </div>

                            <!-- Traffic -->
                            <div class="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs shrink-0 mt-0.5">
                                    <i class="fa-solid fa-car-side"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between gap-2">
                                        <p class="text-[10px] text-slate-400">실시간 혼잡도</p>
                                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" :class="trafficColorClass">
                                            {{ aiBriefing.trafficLevel }}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-200 mt-1 leading-normal">{{ aiBriefing.trafficDesc }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 실시간 소통 인기글 TOP 5 -->
                    <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-fire text-amber-500"></i>
                                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">실시간 광장 인기글</h3>
                            </div>
                            <button @click="goToCommunityPage" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                                광장가기 <i class="fa-solid fa-angle-right ml-0.5"></i>
                            </button>
                        </div>

                        <div class="space-y-3">
                            <div v-for="(post, index) in topPosts" :key="post.id" @click="viewPost(post)" class="group p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer transition flex items-start gap-3">
                                <span class="text-xs font-extrabold text-brand-600 dark:text-brand-400 min-w-[16px] mt-0.5">0{{ index + 1 }}</span>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                                            {{ post.category }}
                                        </span>
                                        <span class="text-[10px] text-slate-400">{{ post.region }}</span>
                                    </div>
                                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">{{ post.title }}</h4>
                                    <div class="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                        <span>👤 {{ post.author }}</span>
                                        <span>👀 {{ post.views }}</span>
                                        <span>🕒 {{ timeAgo(post.createdAt) }}</span>
                                    </div>
                                </div>
                            </div>
                            <div v-if="topPosts.length === 0" class="text-center py-6 text-xs text-slate-400">
                                아직 등록된 소통글이 없습니다.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'HomeView', setup() { return useYogiuContext(); } };
</script>
