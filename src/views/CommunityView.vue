<template>
            <!-- TAB 3: COMMUNITY (Anonymity Discussion Space) -->
            <div v-if="currentTab === 'community'" class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
                
                <!-- Community Board Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <i class="fa-solid fa-comments text-brand-600"></i> 대전/충청 익명 로컬 소통방
                        </h3>
                        <p class="text-xs text-slate-400 mt-1">로그인 필요 없이 자유롭고 성숙하게 소통하셔유. 비밀번호가 복구키 역할을 해유.</p>
                    </div>
                    <button @click="openPostCreateModal" class="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-md transition shrink-0">
                        <i class="fa-solid fa-pen-nib"></i> 글쓰기
                    </button>
                </div>

                <!-- Filters & Search Toolbar -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                    <div class="md:col-span-8 flex flex-wrap gap-1.5">
                        <button 
                            @click="commFilterCategory = '전체'"
                            :class="commFilterCategory === '전체' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'"
                            class="text-xs px-3.5 py-2 rounded-xl transition"
                        >
                            전체 카테고리
                        </button>
                        <button 
                            v-for="cat in ['음식', '문화', '자연']" 
                            :key="cat"
                            @click="commFilterCategory = cat"
                            :class="commFilterCategory === cat ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'"
                            class="text-xs px-3.5 py-2 rounded-xl transition"
                        >
                            #{{ cat }}
                        </button>
                    </div>

                    <div class="md:col-span-4 relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <i class="fa-solid fa-magnifying-glass text-xs"></i>
                        </span>
                        <input 
                            type="text" 
                            v-model="commSearchQuery"
                            placeholder="제목 또는 내용 검색..." 
                            class="w-full text-xs pl-9 pr-4 py-2 bg-white dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
                        >
                    </div>
                </div>

                <!-- Sort Toggle -->
                <div class="flex items-center gap-2 text-xs">
                    <span class="text-slate-400 font-bold">정렬:</span>
                    <button 
                        @click="commSortMode = 'latest'"
                        :class="commSortMode === 'latest' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'"
                        class="px-3 py-1.5 rounded-xl transition"
                    >
                        <i class="fa-solid fa-clock mr-1"></i>최신순
                    </button>
                    <button 
                        @click="commSortMode = 'likes'"
                        :class="commSortMode === 'likes' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'"
                        class="px-3 py-1.5 rounded-xl transition"
                    >
                        <i class="fa-solid fa-fire mr-1"></i>인기순
                    </button>
                </div>

                <!-- Discussion List -->
                <div class="space-y-4">
                    <div v-for="post in paginatedPosts" :key="post.id" @click="viewPost(post)" class="bg-slate-50 hover:bg-slate-100/70 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 p-5 rounded-2xl cursor-pointer transition border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-[10px] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded font-bold">#{{ post.category }}</span>
                            <span class="text-[11px] text-slate-400"><i class="fa-solid fa-location-dot"></i> {{ post.region }}</span>
                            <span v-if="post.updatedAt" class="text-[10px] text-slate-300 dark:text-slate-500">(수정됨)</span>
                        </div>
                        <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">{{ post.title }}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">{{ post.content }}</p>
                        <div class="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/30 dark:border-slate-800 pt-3">
                            <div class="flex items-center gap-3">
                                <span class="font-bold">👤 {{ post.author }}</span>
                                <span>🕒 {{ timeAgo(post.createdAt) }}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <button @click.stop="toggleLikePost(post)" class="flex items-center gap-1" :class="hasLiked(post.id) ? 'text-red-500 font-bold' : 'hover:text-red-400'">
                                    <i :class="hasLiked(post.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i> {{ post.likes || 0 }}
                                </button>
                                <span><i class="fa-regular fa-comments mr-1"></i>댓글 {{ getPostCommentCount(post.id) }}</span>
                                <span>👀 조회 {{ post.views }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="filteredPostsList.length === 0" class="text-center py-16 text-slate-400">
                        글이 하나도 없어유. 첫 주인공이 되어보셔유!
                    </div>
                </div>

                <!-- Pagination -->
                <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 pt-4">
                    <button 
                        @click="commPage = Math.max(1, commPage - 1)" 
                        :disabled="commPage === 1"
                        class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 text-xs transition"
                    >
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="text-xs text-slate-500 font-extrabold">{{ commPage }} / {{ totalPages }}</span>
                    <button 
                        @click="commPage = Math.min(totalPages, commPage + 1)" 
                        :disabled="commPage === totalPages"
                        class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 text-xs transition"
                    >
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'CommunityView', setup() { return useYogiuContext(); } };
</script>
