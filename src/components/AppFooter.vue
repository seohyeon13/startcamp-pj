<template>
        <!-- SOURCE ATTRIBUTION AND CREDIT FOOTER PANEL -->
        <footer class="bg-amber-100/60 dark:bg-slate-950 border-t border-amber-200 dark:border-slate-900 py-10 px-6 mt-12 transition">
            <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Branding & Legal Description -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <span class="text-brand-600 font-extrabold text-lg">요기유(YOGIU) Data Engine</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        본 플랫폼은 한국관광공사 국문 관광정보 서비스 및 대전/충청권 산림휴양정보 공공데이터와 더불어 축제 일정을 기반으로 실시간 연동되어 설계된 스마트 가이드 앱입니다. 공공누리(KOGL) 라이선스를 준수하며 올바른 출처 표기를 통해 자유롭고 투명한 로컬 관광 생태계를 지원합니다.
                    </p>
                </div>

                <!-- Copyright License Guideline -->
                <div class="space-y-3 border-t md:border-t-0 pt-6 md:pt-0 border-slate-200 dark:border-slate-800">
                    <h4 class="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">공공저작물 자유이용허락 요약</h4>
                    <div class="space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <div class="flex items-center gap-2">
                            <span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-extrabold px-1.5 py-0.5 rounded text-[9px]">Type 1 (제1유형)</span>
                            <span>출처 표시 시 상업적 이용 및 변형이 가능해유.</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-extrabold px-1.5 py-0.5 rounded text-[9px]">Type 3 (제3유형)</span>
                            <span>출처 표시 필수, 상업적 이용은 금지돼유.</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-extrabold px-1.5 py-0.5 rounded text-[9px]">기타 유형</span>
                            <span>그 외 변형/상업적 제한 라이선스는 상세 정보창을 참고하십시오.</span>
                        </div>
                    </div>
                </div>

                <!-- Explicit Source List -->
                <div class="space-y-3 border-t md:border-t-0 pt-6 md:pt-0 border-slate-200 dark:border-slate-800 text-xs">
                    <h4 class="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">데이터 공식 출처 표기 (Source)</h4>
                    <ul class="space-y-1.5 text-slate-500 dark:text-slate-400 leading-normal text-[11px]">
                        <li><i class="fa-solid fa-database mr-1"></i> <strong>주요 데이터셋:</strong> 한국관광공사 TourAPI 4.0 대전_충청권 8종 데이터(관광지·문화시설·축제공연행사·여행코스·레포츠·숙박·쇼핑·음식점), 총 1,365건</li>
                        <li><i class="fa-solid fa-server mr-1"></i> <strong>공동 제공기관:</strong> 한국관광공사 (TourAPI 4.0 국문 서비스)</li>
                        <li><i class="fa-solid fa-shield-halved mr-1"></i> <strong>허락 기준:</strong> KOGL 공공누리 제1유형 및 제3유형 연동</li>
                        <li><i class="fa-solid fa-building-columns mr-1"></i> <strong>기타 출처:</strong> 대전관광공사, 공공데이터포털 포털 API</li>
                    </ul>
                </div>
            </div>

            <div class="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
                <p>© 2026 요기유(YOGIU). All rights reserved. Powered by OpenAI & Public Data Portal.</p>
            </div>
        </footer>
</template>

<script>
import { useYogiuContext } from '../composables/yogiuContext.js';
export default { name: 'AppFooter', setup() { return useYogiuContext(); } };
</script>
