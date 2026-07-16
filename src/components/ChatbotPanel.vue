<template>
        <!-- FLOATING CHATBOT BUBBLE (꿈돌이 배너 클릭 시 챗봇 오픈) -->
        <div class="fixed bottom-6 right-6 z-40">
            <button 
                @click="toggleChatbot"
                class="w-16 h-16 rounded-full shadow-2xl overflow-hidden border-4 border-white dark:border-slate-900 hover:scale-110 active:scale-95 transition duration-300 bg-gradient-to-tr from-brand-600 to-amber-400 flex items-center justify-center"
                title="꿈돌이한테 물어보기"
            >
                <img :src="chatbotMascotImg" alt="충청봇 열기" class="w-full h-full object-contain object-bottom">
            </button>
        </div>

        <!-- FLOATING CHATBOT MODAL -->
        <div v-if="chatbotOpen" class="fixed right-6 bottom-24 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 flex flex-col h-[500px]">
            <!-- Header -->
            <div class="bg-gradient-to-r from-brand-600 to-amber-500 text-white px-4 py-4 rounded-t-3xl flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-white/90 overflow-hidden shrink-0">
                        <img :src="chatbotMascotImg" alt="충청봇" class="w-full h-full object-contain object-bottom">
                    </div>
                    <div>
                        <h4 class="text-xs font-bold">충청 가이드 '충청봇'</h4>
                        <span class="text-[10px] opacity-80">서버 환경변수로 연결</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="chatbotOpen = false" class="text-white hover:text-slate-200">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <p class="text-[10px] text-slate-500 dark:text-slate-400"><i class="fa-solid fa-shield-halved mr-1"></i>OpenAI 키는 브라우저가 아닌 서버의 <b>.env</b>에서 안전하게 사용돼유.</p>
            </div>

            <!-- History -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" id="chat-messages-container">
                <div v-for="msg in chatHistory" :key="msg.id" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                    <div class="max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed" :class="msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'">
                        <span class="whitespace-pre-wrap">{{ msg.text }}</span>
                    </div>
                </div>

                <!-- Thinking Spinner -->
                <div v-if="loadingChat" class="flex justify-start">
                    <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <i class="fa-solid fa-spinner animate-spin"></i> 분석하여 고심 중이유...
                    </div>
                </div>
            </div>

            <!-- Recommendations -->
            <div class="px-4 py-2 border-t border-slate-50 dark:border-slate-800 flex gap-1.5 overflow-x-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <button 
                    v-for="rec in recommendedQuestions" 
                    :key="rec"
                    @click="askBot(rec)"
                    class="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2.5 py-1.5 rounded-full hover:bg-brand-50 hover:border-brand-300 transition shrink-0"
                >
                    {{ rec }}
                </button>
            </div>

            <!-- Input Form -->
            <form @submit.prevent="sendChat" class="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input 
                    type="text" 
                    v-model="chatInput"
                    placeholder="충청도 로컬 정보에 대해 물어보셔유!" 
                    class="flex-1 text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-full focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
                >
                <button 
                    type="submit" 
                    :disabled="!chatInput.trim() || loadingChat"
                    class="bg-brand-600 text-white rounded-full p-2.5 hover:bg-brand-700 disabled:opacity-50 transition"
                >
                    <i class="fa-solid fa-paper-plane text-xs"></i>
                </button>
            </form>
        </div>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'ChatbotPanel', setup() { return useYogiuContext(); } };
</script>
