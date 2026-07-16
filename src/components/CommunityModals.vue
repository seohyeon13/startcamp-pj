<template>
        <!-- POST DETAIL MODAL -->
        <div v-if="selectedPost" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded font-extrabold">#{{ selectedPost.category }}</span>
                    <button @click="selectedPost = null" class="text-slate-400 hover:text-slate-600">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-slate-400">📍 {{ selectedPost.region }} 지역 이야기</p>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">{{ selectedPost.title }}</h3>
                    <div class="flex items-center gap-4 text-xs text-slate-400 py-1.5 border-y border-slate-100 dark:border-slate-800 flex-wrap">
                        <span>👤 {{ selectedPost.author }}</span>
                        <span>🕒 {{ formatDate(selectedPost.createdAt) }}</span>
                        <span v-if="selectedPost.updatedAt" class="text-slate-300 dark:text-slate-500">(수정됨 {{ formatDate(selectedPost.updatedAt) }})</span>
                        <span>👀 조회 {{ selectedPost.views }}회</span>
                    </div>
                </div>

                <div class="max-h-56 overflow-y-auto custom-scrollbar py-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {{ selectedPost.content }}
                </div>

                <!-- Like Button -->
                <button 
                    @click="toggleLikePost(selectedPost)" 
                    class="w-full text-xs py-2.5 rounded-xl border transition font-bold flex items-center justify-center gap-1.5"
                    :class="hasLiked(selectedPost.id) ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/10 dark:border-red-900/40' : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'"
                >
                    <i :class="hasLiked(selectedPost.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                    {{ hasLiked(selectedPost.id) ? '공감 완료' : '공감하기' }} ({{ selectedPost.likes || 0 }})
                </button>

                <!-- 익명 댓글·대댓글 -->
                <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                    <div class="flex items-center justify-between"><h4 class="text-xs font-black text-slate-700 dark:text-slate-200"><i class="fa-regular fa-comments text-brand-600 mr-1"></i>익명 댓글 {{ selectedPostComments.length }}개</h4><span class="text-[10px] text-slate-400">대댓글은 한 단계까지 지원해유</span></div>
                    <form @submit.prevent="submitComment" class="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-2">
                        <div v-if="replyTarget" class="flex items-center justify-between text-[10px] bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 px-2.5 py-1.5 rounded-lg"><span><b>{{ replyTarget.anonymousName }}</b> 님에게 답글 작성 중</span><button type="button" @click="cancelReply"><i class="fa-solid fa-xmark"></i></button></div>
                        <textarea v-model.trim="newComment.content" required maxlength="500" rows="2" placeholder="익명으로 댓글을 남겨보셔유." class="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-900 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 resize-none"></textarea>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input v-model.trim="newComment.author" maxlength="20" placeholder="별칭(선택)" class="text-xs px-3 py-2 bg-white dark:bg-slate-900 border-0 rounded-xl">
                            <input v-model="newComment.password" required minlength="4" maxlength="20" type="password" placeholder="삭제 비밀번호(4자 이상)" class="text-xs px-3 py-2 bg-white dark:bg-slate-900 border-0 rounded-xl">
                            <button class="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2">{{ replyTarget ? '답글 등록' : '댓글 등록' }}</button>
                        </div>
                    </form>
                    <div class="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        <div v-for="comment in rootComments" :key="comment.id" class="space-y-2">
                            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                                <div class="flex items-center justify-between gap-2"><div class="text-[10px]"><b class="text-slate-700 dark:text-slate-200">{{ comment.anonymousName }}</b><span class="text-slate-400 ml-2">{{ timeAgo(comment.createdAt) }}</span></div><div class="flex gap-2"><button @click="startReply(comment)" class="text-[10px] font-bold text-brand-600">답글</button><button @click="requestDeleteComment(comment)" class="text-[10px] text-red-400">삭제</button></div></div>
                                <p class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mt-1.5">{{ comment.content }}</p>
                            </div>
                            <div v-for="reply in childComments(comment.id)" :key="reply.id" class="ml-6 bg-brand-50/60 dark:bg-brand-950/20 border-l-2 border-brand-300 rounded-r-2xl p-3">
                                <div class="flex items-center justify-between gap-2"><div class="text-[10px]"><i class="fa-solid fa-reply text-brand-400 mr-1"></i><b class="text-slate-700 dark:text-slate-200">{{ reply.anonymousName }}</b><span class="text-slate-400 ml-2">{{ timeAgo(reply.createdAt) }}</span></div><button @click="requestDeleteComment(reply)" class="text-[10px] text-red-400">삭제</button></div>
                                <p class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mt-1.5">{{ reply.content }}</p>
                            </div>
                        </div>
                        <p v-if="rootComments.length === 0" class="text-center text-[11px] text-slate-400 py-5">아직 댓글이 없어유. 첫 댓글을 남겨보셔유!</p>
                    </div>
                </div>

                <!-- Anonymous Password-based Edit/Delete Actions -->
                <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p class="text-[11px] text-slate-400">수정·삭제를 원하시면 작성 시 등록한 비밀번호를 입력해 주셔유.</p>
                    <div class="flex items-center gap-2">
                        <input 
                            type="password" 
                            v-model="postPassInput"
                            placeholder="작성 비밀번호 입력" 
                            class="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                        >
                        <button 
                            @click="requestEditPost(selectedPost)" 
                            class="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 font-bold px-4 py-2.5 rounded-xl transition shrink-0"
                        >
                            수정하기
                        </button>
                        <button 
                            @click="deletePost(selectedPost)" 
                            class="text-xs bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950/20 dark:text-red-400 font-bold px-4 py-2.5 rounded-xl transition shrink-0"
                        >
                            글삭제하기
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- POST CREATE MODAL -->
        <div v-if="postCreateModalOpen" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form @submit.prevent="submitPost" class="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ isEditMode ? '게시글 수정하기' : '익명 소통 한마디 작성' }}</h4>
                    <button type="button" @click="postCreateModalOpen = false" class="text-slate-400 hover:text-slate-600">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Region & Category Selection -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 block mb-1">대상 지역</label>
                        <select v-model="newPost.region" class="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-brand-500">
                            <option v-for="r in ['대전', '충북', '충남']" :key="r" :value="r">{{ r }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 block mb-1">분류 카테고리</label>
                        <select v-model="newPost.category" class="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-brand-500">
                            <option v-for="c in ['음식', '문화', '자연']" :key="c" :value="c">{{ c }}</option>
                        </select>
                    </div>
                </div>

                <!-- Form Inputs -->
                <div class="space-y-2.5">
                    <input 
                        type="text" 
                        v-model="newPost.title"
                        placeholder="제목을 입력해주셔유" 
                        required
                        class="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                    >
                    <textarea 
                        v-model="newPost.content"
                        placeholder="익명의 충청도 이야기를 들려주세요 (맛집 후기, 여행 꿀팁 등...)" 
                        required
                        rows="5"
                        class="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                    ></textarea>
                </div>

                <!-- Anon Credentials -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 block mb-1">작성 닉네임</label>
                        <input 
                            type="text" 
                            v-model="newPost.author"
                            placeholder="익명 별명" 
                            required
                            class="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                        >
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 block mb-1">삭제 비밀번호</label>
                        <input 
                            type="password" 
                            v-model="newPost.password"
                            placeholder="삭제용 비번 입력" 
                            required
                            class="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-0 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500"
                        >
                    </div>
                </div>

                <div class="flex gap-2 pt-2">
                    <button type="button" @click="postCreateModalOpen = false" class="flex-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 py-3 rounded-xl font-bold">취소</button>
                    <button type="submit" class="flex-1 text-xs bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold shadow-md transition">{{ isEditMode ? '수정 완료' : '게시하기' }}</button>
                </div>
            </form>
        </div>

        <!-- ALERT TOAST SYSTEM -->
        <div v-if="toastMsg" class="fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-900/95 dark:bg-slate-850 text-white text-xs py-3 px-5 rounded-xl shadow-2xl flex items-center justify-between z-50 animate-bounce">
            <span class="font-medium mr-4"><i class="fa-solid fa-circle-info text-brand-400 mr-2"></i>{{ toastMsg }}</span>
            <button @click="toastMsg = ''" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'CommunityModals', setup() { return useYogiuContext(); } };
</script>
