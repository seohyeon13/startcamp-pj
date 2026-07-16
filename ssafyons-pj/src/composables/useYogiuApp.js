import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { CATEGORY_PLACEHOLDER, REAL_SPOTS_DATA } from '../data/spots.js';
import { loadExternalSpotData } from '../services/spotDataService.js';
import { DAEJEON_MASCOT_IMG, REGION_MAP_IMG, CHATBOT_MASCOT_IMG, CHUNGBUK_BANNER_IMG, CHUNGNAM_BANNER_IMG } from '../data/assets.js';
import { OPENAI_MODEL, OPENAI_CHAT_URL } from '../services/openai.js';

export function useYogiuApp() {

                const currentTab = ref('home');
                const isDark = ref(false);
                const activeRegion = ref('전체');
                const activeCategory = ref('전체'); // 실제 8개 콘텐츠 유형 + 전체

                const toastMsg = ref('');
                const daejeonMascotImg = DAEJEON_MASCOT_IMG;
                const regionMapImg = REGION_MAP_IMG;
                const chatbotMascotImg = CHATBOT_MASCOT_IMG;
                const chungbukBannerImg = CHUNGBUK_BANNER_IMG;
                const chungnamBannerImg = CHUNGNAM_BANNER_IMG;

                // 지역 선택에 따라 홈 배너 배경 이미지를 전환 (대전=꿈돌이, 충남/충북=업로드하신 이미지)
                const currentBannerImg = computed(() => {
                    if (activeRegion.value === '충북') return chungbukBannerImg;
                    if (activeRegion.value === '충남') return chungnamBannerImg;
                    return daejeonMascotImg; // '대전' 또는 '전체' 기본값
                });
                const showToast = (msg) => {
                    toastMsg.value = msg;
                    setTimeout(() => {
                        toastMsg.value = '';
                    }, 3000);
                };

                // Helper to render readable License Type
                // 공공누리(KOGL) 유형별 정확한 정의
                // 제1유형: 출처표시 / 제2유형: 출처표시+상업적 이용금지
                // 제3유형: 출처표시+변경금지 / 제4유형: 출처표시+상업적 이용금지+변경금지
                const getLicenseName = (code) => {
                    if (code === 'Type1') return '공공누리 제1유형: 출처표시';
                    if (code === 'Type2') return '공공누리 제2유형: 출처표시, 상업적 이용금지';
                    if (code === 'Type3') return '공공누리 제3유형: 출처표시, 변경금지 (상업적 이용 가능)';
                    if (code === 'Type4') return '공공누리 제4유형: 출처표시, 상업적 이용금지, 변경금지';
                    return '공공누리 제1유형 표준준용';
                };

                const getLicenseShort = (code) => {
                    if (code === 'Type1') return '제1유형';
                    if (code === 'Type2') return '제2유형';
                    if (code === 'Type3') return '제3유형';
                    if (code === 'Type4') return '제4유형';
                    return '제1유형';
                };

                // 장소명 기반 유튜브 검색 링크 생성 (실제 영상 매칭이 아닌 검색결과 페이지로 연결)
                const getYoutubeSearchUrl = (spot) => {
                    const query = `${spot.name} ${spot.region}`.trim();
                    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                };

                // 장소명 기반 인스타그램 해시태그 검색 링크 생성
                // (인스타그램은 공개 키워드 검색 URL이 없어서, 가장 가까운 대안인 해시태그 탐색 페이지로 연결해유)
                const getInstagramSearchUrl = (spot) => {
                    const tag = spot.name.replace(/[^가-힣a-zA-Z0-9]/g, '');
                    return `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`;
                };

                // Compile all initial spots mapping (실제 한국관광공사 TourAPI 데이터 사용)
                const spotsData = reactive([]);

                const dataSource = ref('loading');
                const dataLoadError = ref('');

                const hydrateData = async () => {
                    spotsData.length = 0;
                    dataLoadError.value = '';

                    try {
                        const externalSpots = await loadExternalSpotData();
                        spotsData.push(...externalSpots);
                        dataSource.value = 'external-json';
                        console.info(`[YOGIU] 외부 JSON 데이터 ${externalSpots.length}건을 불러왔습니다.`);
                    } catch (error) {
                        spotsData.push(...REAL_SPOTS_DATA);
                        dataSource.value = 'embedded-fallback';
                        dataLoadError.value = error instanceof Error ? error.message : String(error);
                        console.warn('[YOGIU] 외부 JSON을 불러오지 못해 내장 데이터로 실행합니다.', error);
                    }
                };

                // Filter logic
                const spotSearchQuery = ref('');
                const filteredSpots = computed(() => {
                    return spotsData.filter(spot => {
                        // 축제·공연·행사는 별도 탭(축제·행사 목록)에서 다루므로 홈 그리드에서는 제외
                        if (spot.category === '축제공연행사') return false;

                        const matchRegion = activeRegion.value === '전체' || spot.region === activeRegion.value;
                        const matchCategory = activeCategory.value === '전체' || spot.category === activeCategory.value;
                        const q = spotSearchQuery.value.toLowerCase();
                        const matchSearch = !q ||
                                            spot.name.toLowerCase().includes(q) ||
                                            spot.address.toLowerCase().includes(q);
                        return matchRegion && matchCategory && matchSearch;
                    });
                });

                // 홈 스팟 그리드 페이지네이션 (데이터가 최대 500건 이상이라 필수)
                const spotPage = ref(1);
                const spotItemsPerPage = 12;
                const paginatedSpots = computed(() => {
                    const start = (spotPage.value - 1) * spotItemsPerPage;
                    return filteredSpots.value.slice(start, start + spotItemsPerPage);
                });
                const totalSpotPages = computed(() => {
                    return Math.ceil(filteredSpots.value.length / spotItemsPerPage) || 1;
                });
                watch([activeRegion, activeCategory, spotSearchQuery], () => {
                    spotPage.value = 1;
                });

                // 실제 축제공연행사 데이터 (한국관광공사 TourAPI 원본에는 시작일/종료일 필드가 없어
                // 날짜별 캘린더 표시 대신 목록형으로 제공)
                const festivalSpots = computed(() => {
                    return spotsData.filter(spot => {
                        const matchRegion = activeRegion.value === '전체' || spot.region === activeRegion.value;
                        return spot.category === '축제공연행사' && matchRegion;
                    });
                });

                // ============ 축제 달력 ============
                // 일부 축제(4건)는 공식 홈페이지/보도자료로 실제 개최일을 검증해서 verifiedStartDate~verifiedEndDate로 반영했어유.
                // 나머지는 원본 데이터에 개최일 필드가 없어서 "정보 등록/수정일(infoUpdatedAt)"을 참고용으로만 표시해유.
                const festivalViewMode = ref('list'); // 'list' | 'calendar'
                const calendarYear = ref(2026);
                const calendarMonth = ref(3); // 0-indexed: 3 = 4월 (검증된 축제가 몰려있는 달로 기본 설정)
                const selectedCalDateStr = ref(null);

                const isDateInRange = (dateStr, startStr, endStr) => {
                    return dateStr >= startStr && dateStr <= endStr;
                };

                const getFestivalsForCalDate = (dateStr) => {
                    return festivalSpots.value.filter(f => {
                        if (f.verifiedStartDate && f.verifiedEndDate) {
                            return isDateInRange(dateStr, f.verifiedStartDate, f.verifiedEndDate);
                        }
                        return f.infoUpdatedAt === dateStr;
                    });
                };

                const calendarDays = computed(() => {
                    const year = calendarYear.value;
                    const month = calendarMonth.value;
                    const firstDayIdx = new Date(year, month, 1).getDay();
                    const totalDays = new Date(year, month + 1, 0).getDate();
                    const daysArray = [];

                    for (let i = 0; i < firstDayIdx; i++) {
                        daysArray.push({ dayNum: null, dateStr: null, festivals: [] });
                    }
                    for (let day = 1; day <= totalDays; day++) {
                        const mm = String(month + 1).padStart(2, '0');
                        const dd = String(day).padStart(2, '0');
                        const dateStr = `${year}-${mm}-${dd}`;
                        daysArray.push({
                            dayNum: day,
                            dateStr: dateStr,
                            festivals: getFestivalsForCalDate(dateStr)
                        });
                    }
                    return daysArray;
                });

                const selectedCalDateFestivals = computed(() => {
                    if (!selectedCalDateStr.value) return [];
                    return getFestivalsForCalDate(selectedCalDateStr.value);
                });

                const moveCalMonth = (dir) => {
                    let nextMonth = calendarMonth.value + dir;
                    let nextYear = calendarYear.value;
                    if (nextMonth < 0) { nextMonth = 11; nextYear -= 1; }
                    else if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
                    calendarMonth.value = nextMonth;
                    calendarYear.value = nextYear;
                    selectedCalDateStr.value = null;
                };

                const selectedSpot = ref(null);
                const spotWeather = ref(null);
                const spotWeatherLoading = ref(false);
                const spotWeatherError = ref('');
                const placeSummary = ref(null);
                let spotWeatherRequestId = 0;
                let detailMiniMap = null;
                let detailKakaoMap = null;

                const weatherCodeDescription = (code) => {
                    const table = {0:'맑음',1:'대체로 맑음',2:'부분적으로 흐림',3:'흐림',45:'안개',48:'서리 안개',51:'약한 이슬비',53:'이슬비',55:'강한 이슬비',61:'약한 비',63:'비',65:'강한 비',71:'약한 눈',73:'눈',75:'강한 눈',80:'소나기',81:'강한 소나기',82:'매우 강한 소나기',95:'천둥번개',96:'우박 동반 천둥번개',99:'강한 우박 동반 천둥번개'};
                    return table[code] || '날씨 정보';
                };
                const fetchSpotWeather = async (spot) => {
                    if (!spot?.lat || !spot?.lng) return;
                    const requestId = ++spotWeatherRequestId;
                    spotWeatherLoading.value = true;
                    spotWeatherError.value = '';
                    try {
                        const url = `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FSeoul`;
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`날씨 API 응답 오류 ${res.status}`);
                        const data = await res.json();
                        const currentTime = data.current?.time;
                        const idx = data.hourly?.time?.indexOf(currentTime);
                        const rain = idx >= 0 ? (data.hourly.precipitation_probability[idx] ?? 0) : 0;
                        const temp = Number(data.current?.temperature_2m ?? 0);
                        const wind = Number(data.current?.wind_speed_10m ?? 0);
                        let advice = '여행하기 좋은 날씨예유.';
                        let statusClass = 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
                        if (rain >= 70) { advice='우산을 챙기고 실내 관광지를 함께 고려해보셔유.'; statusClass='bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'; }
                        else if (temp >= 33) { advice='무더위가 예상되니 수분 보충과 휴식이 필요해유.'; statusClass='bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'; }
                        else if (temp <= 0) { advice='노면 결빙과 한파에 주의해주셔유.'; statusClass='bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'; }
                        else if (wind >= 30) { advice='바람이 강하니 야외 일정에 주의해주셔유.'; statusClass='bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'; }
                        if (requestId !== spotWeatherRequestId || String(selectedSpot.value?.id) !== String(spot.id)) return;
                        const updatedDate = data.current?.time ? new Date(data.current.time) : new Date();
                        const updatedAt = Number.isNaN(updatedDate.getTime())
                            ? '방금 갱신'
                            : `${updatedDate.getFullYear()}.${String(updatedDate.getMonth()+1).padStart(2,'0')}.${String(updatedDate.getDate()).padStart(2,'0')} ${String(updatedDate.getHours()).padStart(2,'0')}:${String(updatedDate.getMinutes()).padStart(2,'0')} 기준`;
                        spotWeather.value = {temperature:temp.toFixed(1), apparentTemperature:Number(data.current?.apparent_temperature ?? temp).toFixed(1), precipitationProbability:rain, windSpeed:wind.toFixed(1), description:weatherCodeDescription(data.current?.weather_code), travelAdvice:advice, statusClass, updatedAt};
                    } catch (err) {
                        if (requestId !== spotWeatherRequestId) return;
                        console.error(err);
                        spotWeather.value = null;
                        spotWeatherError.value = '날씨 정보를 불러오지 못했어유. 잠시 후 다시 시도해보셔유.';
                    } finally { if (requestId === spotWeatherRequestId) spotWeatherLoading.value = false; }
                };

                const extractPlaceRegion = (spot) => {
                    const address = String(spot?.address || '').trim();
                    const knownRegions = ['대전광역시', '세종특별자치시', '충청남도', '충청북도', '대전', '세종', '충남', '충북', '논산', '공주', '계룡', '옥천'];
                    const matched = knownRegions.find(region => address.includes(region));
                    return spot?.region || matched || '대전·충청권';
                };

                const normalizeCategory = (category = '') => String(category).replace(/\s+/g, '').toLowerCase();

                const buildPlaceSummary = (spot) => {
                    if (!spot) return null;
                    const name = spot.name || spot.title || '이 장소';
                    const region = extractPlaceRegion(spot);
                    const category = spot.category || spot.contentType || '관광지';
                    const categoryKey = normalizeCategory(category);
                    const address = spot.address || '상세 주소 정보가 제공되지 않은 곳';

                    const presets = [
                        {
                            keys: ['축제공연행사', '축제', '공연', '행사'],
                            highlight: `${name}은 ${region}의 지역 분위기와 문화 콘텐츠를 현장에서 즐길 수 있는 행사형 명소예유. 일정과 프로그램에 따라 체험·공연·먹거리 구성이 달라질 수 있어유.`,
                            duration: '약 1~3시간', audience: '가족 · 친구 · 연인', bestTime: '행사 시작 30분 전',
                            visitTip: '행사 날짜와 운영시간, 입장 마감 여부를 공식 채널이나 전화로 먼저 확인해주셔유.',
                            weatherTip: '야외 행사라면 강수확률과 체감온도를 확인하고 우산·겉옷을 준비하면 좋아유.',
                            moveTip: '행사 시간대에는 주변 도로와 주차장이 붐빌 수 있어 대중교통 또는 외곽 주차 후 이동을 추천해유.'
                        },
                        {
                            keys: ['음식점', '맛집', '카페'],
                            highlight: `${name}은 ${region}에서 식사나 휴식을 계획할 때 함께 들르기 좋은 음식·카페 장소예유. 주변 관광지와 묶어 코스를 구성하기 좋아유.`,
                            duration: '약 40분~1시간 30분', audience: '가족 · 친구 · 연인', bestTime: '혼잡 시간 전후',
                            visitTip: '대표 메뉴, 휴무일, 예약 가능 여부와 재료 소진 시간을 방문 전에 확인해주셔유.',
                            weatherTip: '비나 더위가 강한 날에는 실내 휴식 지점으로 활용하기 좋아유.',
                            moveTip: '식사 시간에는 주차와 대기 시간이 길어질 수 있어 도보 이동 가능한 주변 장소와 함께 계획하면 편해유.'
                        },
                        {
                            keys: ['숙박', '호텔', '펜션'],
                            highlight: `${name}은 ${region} 여행 중 휴식과 체류를 위한 숙박 장소예유. 주변 관광지와의 이동 거리와 체크인 시간을 함께 고려하면 동선이 더 효율적이에유.`,
                            duration: '1박 이상', audience: '가족 · 연인 · 소규모 여행', bestTime: '체크인 시간 전후',
                            visitTip: '체크인·체크아웃 시간, 객실 유형, 취소 규정과 주차 가능 여부를 예약 전에 확인해주셔유.',
                            weatherTip: '악천후가 예상되면 숙소까지의 진입도로와 야간 이동 안전 여부를 미리 확인해주셔유.',
                            moveTip: '첫날 마지막 코스나 다음 날 첫 코스와 가까운 숙소를 선택하면 이동 시간을 줄일 수 있어유.'
                        },
                        {
                            keys: ['레포츠', '스포츠', '체험'],
                            highlight: `${name}은 ${region}에서 활동적인 체험이나 야외 여가를 즐기기 좋은 레포츠 장소예유. 체력과 날씨, 장비 조건을 함께 확인하는 게 중요해유.`,
                            duration: '약 1~3시간', audience: '친구 · 가족 · 활동형 여행객', bestTime: '오전 또는 해 지기 전',
                            visitTip: '이용 연령, 예약, 안전장비, 복장 규정과 체험 가능 시간을 사전에 확인해주셔유.',
                            weatherTip: '강풍·폭우·폭염 때는 운영이 제한될 수 있어 당일 날씨와 현장 공지를 확인해주셔유.',
                            moveTip: '체험 시작 20~30분 전에 도착하도록 여유 있게 이동하고, 장비 운반이 있다면 차량 접근성을 확인해주셔유.'
                        },
                        {
                            keys: ['문화시설', '박물관', '미술관', '전시'],
                            highlight: `${name}은 ${region}의 역사·예술·생활문화를 실내에서 살펴보기 좋은 문화 공간예유. 날씨 영향을 비교적 적게 받아 일정에 넣기 편해유.`,
                            duration: '약 1~2시간', audience: '가족 · 학생 · 문화여행객', bestTime: '오전 개관 직후',
                            visitTip: '휴관일, 전시 교체 기간, 해설·체험 프로그램 운영 시간을 먼저 확인해주셔유.',
                            weatherTip: '비·더위·추위가 강한 날의 실내 대체 코스로 활용하기 좋아유.',
                            moveTip: '관람 후 주변 원도심·시장·카페와 도보 코스로 연결하면 효율적이에유.'
                        },
                        {
                            keys: ['쇼핑', '시장', '상점'],
                            highlight: `${name}은 ${region}의 지역 상품과 생활 문화를 접하며 쇼핑을 즐길 수 있는 장소예유. 먹거리와 기념품 탐색을 함께 하기 좋아유.`,
                            duration: '약 1~2시간', audience: '가족 · 친구 · 쇼핑 여행객', bestTime: '오전 또는 늦은 오후',
                            visitTip: '시장 휴무일, 점포별 영업시간, 결제수단과 장날 여부를 미리 확인해주셔유.',
                            weatherTip: '전통시장이나 야외 상권은 비와 폭염 영향을 받을 수 있어 우산과 편한 신발을 준비해주셔유.',
                            moveTip: '주차 공간이 혼잡할 수 있어 대중교통 이용이나 인근 공영주차장 확인을 추천해유.'
                        },
                        {
                            keys: ['여행코스', '코스'],
                            highlight: `${name}은 ${region}의 여러 장소를 연결해 둘러볼 수 있도록 구성된 여행 코스예유. 이동 순서와 체류 시간을 조정하면 반나절 또는 하루 일정으로 활용하기 좋아유.`,
                            duration: '약 반나절~하루', audience: '가족 · 친구 · 자유여행객', bestTime: '오전 일찍 출발',
                            visitTip: '각 지점의 휴무일과 운영시간을 확인하고 식사·휴식 시간을 포함해 여유 있게 계획해주셔유.',
                            weatherTip: '야외 비중이 높다면 강수확률과 일몰 시간을 기준으로 순서를 조정해주셔유.',
                            moveTip: '장소 간 거리가 멀면 자동차 중심, 도심권은 대중교통과 도보를 섞어 계획하면 좋아유.'
                        },
                        {
                            keys: ['관광지', '자연', '명소'],
                            highlight: `${name}은 ${region}의 풍경과 지역 매력을 직접 느끼기 좋은 관광 명소예유. 산책, 사진 촬영, 주변 경관 감상 중심으로 둘러보기 좋아유.`,
                            duration: '약 40분~1시간 30분', audience: '가족 · 연인 · 사진여행객', bestTime: '오전 또는 일몰 전',
                            visitTip: '편한 신발을 준비하고 현장 안내판, 출입 제한 구간, 화장실·편의시설 위치를 먼저 확인해주셔유.',
                            weatherTip: '비가 온 뒤에는 산책로와 계단이 미끄러울 수 있고, 맑은 날에는 사진과 전망 감상에 더 좋아유.',
                            moveTip: '주소가 산·호수·외곽 지역이면 대중교통 배차가 적을 수 있어 복귀 시간과 주차 위치를 미리 확인해주셔유.'
                        }
                    ];

                    const preset = presets.find(item => item.keys.some(key => categoryKey.includes(normalizeCategory(key)))) || presets[presets.length - 1];
                    const hasCoordinates = Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lng));
                    const locationText = address !== '상세 주소 정보가 제공되지 않은 곳' ? `${address}에 위치해 있어유.` : '상세 위치는 지도 핀을 기준으로 확인해주셔유.';

                    return {
                        intro: `${name}은 ${region}에 위치한 ${category} 장소예유. ${locationText}`,
                        highlight: preset.highlight,
                        duration: preset.duration,
                        audience: preset.audience,
                        bestTime: preset.bestTime,
                        visitTip: preset.visitTip,
                        weatherTip: preset.weatherTip,
                        moveTip: hasCoordinates ? preset.moveTip : `${preset.moveTip} 정확한 좌표 정보가 없으면 출발 전에 주소를 다시 확인해주셔유.`
                    };
                };

                const initDetailMiniMap = async () => {
                    if (!selectedSpot.value || !selectedSpot.value.lat || !selectedSpot.value.lng) return;
                    const el = document.getElementById('detail-mini-map');
                    if (!el) return;
                    const { lat, lng } = selectedSpot.value;
                    if (detailMiniMap) { detailMiniMap.remove(); detailMiniMap = null; }
                    detailKakaoMap = null;
                    el.innerHTML = '';
                    if (mapEngine.value === 'kakao' && kakaoMapReady.value && window.kakao?.maps) {
                        const pos = new kakao.maps.LatLng(lat, lng);
                        detailKakaoMap = new kakao.maps.Map(el, { center: pos, level: 4 });
                        new kakao.maps.Marker({ position: pos, map: detailKakaoMap });
                        return;
                    }
                    detailMiniMap = L.map('detail-mini-map', {zoomControl:false, attributionControl:false, dragging:true, scrollWheelZoom:false}).setView([lat,lng],15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(detailMiniMap);
                    const style=getMarkerStyle(selectedSpot.value.category);
                    const icon=L.divIcon({className:'custom-div-icon',html:`<i class="fa-solid fa-location-pin text-3xl text-${style.color}-500 filter drop-shadow"></i>`,iconSize:[30,30],iconAnchor:[15,30]});
                    L.marker([lat,lng],{icon}).addTo(detailMiniMap);
                };

                const viewSpotDetail = (spot) => {
                    selectedSpot.value = spot;
                    spotWeather.value = null;
                    spotWeatherError.value = '';
                    placeSummary.value = buildPlaceSummary(spot);
                    fetchSpotWeather(spot);
                    nextTick(() => setTimeout(initDetailMiniMap, 80));
                };

                watch(selectedSpot, (newVal) => {
                    if (!newVal && detailMiniMap) {
                        detailMiniMap.remove();
                        detailMiniMap = null;
                    }
                });

                // 실제 사진 URL이 있어도 브라우저에서 로딩에 실패한 항목을 추적
                // (일러스트로 대체된 경우 배지를 정확히 표시하기 위함)
                const failedImageIds = ref(new Set());

                const handleImageError = (e, category, id) => {
                    e.target.src = CATEGORY_PLACEHOLDER[category] || DEFAULT_PLACEHOLDER;
                    if (id) {
                        failedImageIds.value.add(id);
                        // Set은 얕은 반응형이 아니므로 강제로 갱신 트리거
                        failedImageIds.value = new Set(failedImageIds.value);
                    }
                };

                const isShowingIllustration = (spot) => {
                    return !spot.hasRealImage || failedImageIds.value.has(spot.id);
                };

                // Anonymous Favorites state
                const favorites = ref([]);
                
                const loadFavorites = () => {
                    const stored = localStorage.getItem('localhub_favorites');
                    if (stored) {
                        try {
                            favorites.value = JSON.parse(stored);
                        } catch (err) {
                            favorites.value = [];
                        }
                    }
                };

                const toggleFavorite = (spot) => {
                    const idx = favorites.value.indexOf(spot.id);
                    if (idx > -1) {
                        favorites.value.splice(idx, 1);
                        showToast(`'${spot.name}'이(가) 보관함에서 해제됐어유.`);
                    } else {
                        favorites.value.push(spot.id);
                        showToast(`'${spot.name}'을(를) 찜했어유. [동선 플래너] 탭에서 동선선을 그려보셔유.`);
                    }
                    localStorage.setItem('localhub_favorites', JSON.stringify(favorites.value));
                    
                    if (currentTab.value === 'mypage') {
                        nextTick(() => {
                            drawMapMarkers();
                        });
                    }
                };

                const isFavorite = (id) => {
                    return favorites.value.includes(id);
                };

                const favoriteSpots = computed(() => {
                    return spotsData.filter(s => favorites.value.includes(s.id))
                        .sort((a, b) => favorites.value.indexOf(a.id) - favorites.value.indexOf(b.id));
                });

                // 동선 플래너 지도 표시 모드: 'favorites'(찜한 코스) | 'all'(현재 필터에 맞는 전체 데이터 핀)
                const mapViewMode = ref('favorites');
                const mapCategory = ref('전체'); // 지도 전용 카테고리 선택 (홈 탭과 별개로 조작 가능)
                const mapCity = ref('전체'); // 지역 지도 이미지에서 클릭한 시/군 단위 필터
                const MAP_ALL_PINS_LIMIT = 600; // 성능을 위해 지도에 표시할 최대 핀 개수 제한 (개별 카테고리는 모두 600건 미만)

                // 주소 문자열에서 실제 데이터가 존재하는 시/군 단위를 추출 (대전은 구 상관없이 하나로 묶음)
                const getCityFromAddress = (address) => {
                    if (!address) return null;
                    if (address.includes('대전')) return '대전';
                    if (address.includes('공주시')) return '공주';
                    if (address.includes('논산시')) return '논산';
                    if (address.includes('계룡시')) return '계룡';
                    if (address.includes('옥천군')) return '옥천';
                    return null;
                };

                const mapAllModeSpots = computed(() => {
                    // 지역 필터는 홈 탭과 공유, 카테고리/시군은 지도 전용 선택값 사용 (축제·행사도 포함)
                    const list = spotsData.filter(spot => {
                        const matchRegion = activeRegion.value === '전체' || spot.region === activeRegion.value;
                        const matchCategory = mapCategory.value === '전체' || spot.category === mapCategory.value;
                        const matchCity = mapCity.value === '전체' || getCityFromAddress(spot.address) === mapCity.value;
                        return matchRegion && matchCategory && matchCity;
                    });
                    return list.slice(0, MAP_ALL_PINS_LIMIT);
                });

                const mapAllModeTotalCount = computed(() => {
                    return spotsData.filter(spot => {
                        const matchRegion = activeRegion.value === '전체' || spot.region === activeRegion.value;
                        const matchCategory = mapCategory.value === '전체' || spot.category === mapCategory.value;
                        const matchCity = mapCity.value === '전체' || getCityFromAddress(spot.address) === mapCity.value;
                        return matchRegion && matchCategory && matchCity;
                    }).length;
                });

                const mapCityCount = (city) => {
                    return spotsData.filter(spot => getCityFromAddress(spot.address) === city).length;
                };

                const moveFav = (index, direction) => {
                    const newIndex = index + direction;
                    if (newIndex < 0 || newIndex >= favoriteSpots.value.length) return;
                    
                    const listCopy = [...favorites.value];
                    const activeFavList = favoriteSpots.value.map(s => s.id);
                    const itemToMove = activeFavList[index];
                    
                    activeFavList.splice(index, 1);
                    activeFavList.splice(newIndex, 0, itemToMove);
                    
                    favorites.value = activeFavList;
                    localStorage.setItem('localhub_favorites', JSON.stringify(favorites.value));
                    
                    nextTick(() => {
                        drawMapMarkers();
                    });
                };

                const aiBriefing = reactive({
                    trafficLevel: '보통',
                    trafficDesc: '대전 도심 주요 도로는 출퇴근 시간대를 제외하면 대체로 원활해유.',
                    routeSummary: '지역을 선택하고 새로고침하면 실제 데이터 기반 추천 코스를 만들어드려유.'
                });
                const loadingBriefing = ref(false);

                // ============ AI 추천 여행 경로 (실제 스팟 데이터 기반) ============
                const aiRouteStops = ref([]);

                // 선택한 지역의 실제 스팟 중, 카테고리가 겹치지 않도록 2~3곳을 골라 코스 후보로 구성
                const pickRouteCandidates = () => {
                    const region = activeRegion.value;
                    const pool = spotsData.filter(s =>
                        s.category !== '축제공연행사' &&
                        (region === '전체' || s.region === region) &&
                        Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)) &&
                        !(Number(s.lat) === 0 && Number(s.lng) === 0)
                    );
                    if (!pool.length) return [];

                    const pickOne = (keys, exclude = []) =>
                        pool.find(s => !exclude.includes(s.id) && keys.some(k => (s.category || '').includes(k)));

                    const stop1 = pickOne(['관광지', '자연', '명소']) || pool[0];
                    const stop2 = pickOne(['음식점', '맛집', '카페'], [stop1?.id]) || pool.find(s => s.id !== stop1?.id);
                    const stop3 = pickOne(['문화시설', '박물관', '쇼핑', '시장'], [stop1?.id, stop2?.id]);

                    return [stop1, stop2, stop3].filter(Boolean);
                };

                const buildRouteFallbackSummary = (stops) => {
                    if (stops.length < 2) return '이 지역엔 아직 추천할 코스 데이터가 부족해유. 다른 지역을 선택해보셔유.';
                    const names = stops.map(s => s.name).join(' → ');
                    return `${names} 순서로 둘러보면 이동 동선이 자연스러워유.`;
                };

                const applyLocalRouteFallback = () => {
                    const stops = pickRouteCandidates();
                    aiRouteStops.value = stops;
                    aiBriefing.routeSummary = buildRouteFallbackSummary(stops);
                };

                // AI 추천 여행 경로의 카카오맵 길찾기 URL (버튼이 아닌 실제 <a> 링크로 사용 → 팝업 차단 이슈 회피)
                const aiRouteKakaoUrl = computed(() => {
                    const stops = aiRouteStops.value;
                    if (!stops || stops.length < 2) return '';
                    const from = stops[0];
                    const to = stops[stops.length - 1];
                    const via = stops.slice(1, -1);
                    return buildKakaoRouteUrl(from, to, 'car', via);
                });

                const trafficColorClass = computed(() => {
                    if (aiBriefing.trafficLevel.includes('혼잡') || aiBriefing.trafficLevel.includes('정체')) {
                        return 'bg-red-500/20 text-red-400';
                    }
                    if (aiBriefing.trafficLevel.includes('서행') || aiBriefing.trafficLevel.includes('보통')) {
                        return 'bg-amber-500/20 text-amber-400';
                    }
                    return 'bg-brand-500/20 text-brand-400';
                });

                const applyLocalBriefingFallback = () => {
                    if (activeRegion.value === '충남') {
                        aiBriefing.trafficLevel = '보통';
                        aiBriefing.trafficDesc = '논산 시내와 탑정호 진입 구간은 주말 오후에 차량이 늘 수 있어유. 출발 전 카카오맵 실시간 교통을 확인해유.';
                    } else if (activeRegion.value === '충북') {
                        aiBriefing.trafficLevel = '보통';
                        aiBriefing.trafficDesc = '옥천IC와 전통문화체험관 주변은 관광 시간대에 잠시 붐빌 수 있어유. 나머지 구간은 대체로 원활해유.';
                    } else {
                        aiBriefing.trafficLevel = '보통';
                        aiBriefing.trafficDesc = '대전 도심 주요 교차로는 출퇴근 시간에 정체가 생길 수 있어유. 관광지 이동 전 카카오맵 교통정보를 확인해유.';
                    }
                    applyLocalRouteFallback();
                };

                // 혼잡도는 AI(또는 지역별 기본 정보)로, 여행 경로는 실제 스팟 데이터를 우선 사용하고
                // AI 키가 있으면 그 후보 장소들만 활용해 코스 설명 문장을 다듬습니다.
                const fetchAIBriefing = async () => {
                    loadingBriefing.value = true;

                    // 1) 항상 먼저 실제 데이터 기반 경로 후보를 채워둔다 (AI 실패해도 화면이 비지 않도록)
                    const stops = pickRouteCandidates();
                    aiRouteStops.value = stops;
                    aiBriefing.routeSummary = buildRouteFallbackSummary(stops);

                    const candidateNames = stops.map(s => s.name);

                    const systemPrompt = `당신은 충청도(대전, 충북, 충남) 지역민을 위한 지능형 로컬 리포터입니다.
아래 제공된 실제 후보 장소 목록만 사용해서 사용자가 선택한 지역에 어울리는 반나절 여행 코스를 설명하고, 교통 참고사항도 함께 알려주세요.
반드시 후보 목록에 있는 이름만 사용하고, 목록에 없는 장소를 새로 만들어내지 마세요.
반드시 아래 JSON 포맷을 지키고 추가 텍스트 없이 JSON만 반환하세요:
{
  "trafficLevel": "혼잡도 단어 (원활, 보통, 서행, 극심정체 중 택1)",
  "trafficDesc": "해당 지역 교통 참고사항 한 줄. 실시간 데이터라고 단정하지 말 것",
  "routeSummary": "제공된 후보 장소만 사용한 반나절 코스 추천 한 줄 설명 (예: A → B → C 순으로 돌아보면 좋아유)"
}`;

                    const target = activeRegion.value === '전체' ? '대전' : activeRegion.value;
                    const userQuery = `현재 선택 지역: [${target}]. 이용 가능한 실제 장소 후보: ${candidateNames.join(', ') || '없음'}. 이 후보만 사용해서 교통 참고사항과 반나절 코스를 추천해 주세요.`;

                    try {
                        if (!userApiKey.value) throw new Error('OpenAI API 키가 아직 설정되지 않았습니다.');
                        if (!candidateNames.length) throw new Error('추천할 장소 후보가 없습니다.');

                        const response = await fetch(OPENAI_CHAT_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${userApiKey.value}`
                            },
                            body: JSON.stringify({
                                model: OPENAI_MODEL,
                                response_format: { type: 'json_object' },
                                messages: [
                                    { role: 'system', content: systemPrompt },
                                    { role: 'user', content: userQuery }
                                ]
                            })
                        });

                        if (!response.ok) throw new Error(`OpenAI API 오류: ${response.status}`);
                        const result = await response.json();
                        const rawText = result.choices?.[0]?.message?.content;
                        if (!rawText) throw new Error('AI 브리핑 응답이 비어 있습니다.');

                        const parsed = JSON.parse(rawText);
                        aiBriefing.trafficLevel = parsed.trafficLevel || aiBriefing.trafficLevel;
                        aiBriefing.trafficDesc = parsed.trafficDesc || aiBriefing.trafficDesc;
                        aiBriefing.routeSummary = parsed.routeSummary || aiBriefing.routeSummary;
                    } catch (err) {
                        console.log('지역 브리핑 기본 데이터 사용:', err.message);
                        applyLocalBriefingFallback();
                    } finally {
                        loadingBriefing.value = false;
                    }
                };

                const refreshAIBriefing = () => {
                    fetchAIBriefing();
                };

                // Community Logic Implementation
                const posts = ref([]);
                const commFilterCategory = ref('전체');
                const commSearchQuery = ref('');
                const commPage = ref(1);
                const itemsPerPage = 8;

                const defaultPosts = [
                    { id: 'p1', region: '대전', category: '음식', title: '성심당 빵 보관 꿀팁 알려드려유!', content: '튀소는 에어프라이어에 180도 5분 돌리면 갓 구운 맛 그대로 복구돼유. 냉동실에 보관할 때는 무조건 밀봉해서 보관하셔야 빵이 퍼석하지 않어유.', author: '빵돌이임당', createdAt: Date.now() - 3600000, views: 120, likes: 14, password: '11' },
                    { id: 'p2', region: '대전', category: '자연', title: '장태산 메타세쿼이아 전망대에 유모차 갈 수 있나유?', content: '올라가는 스카이웨이 데크길이 계단 없이 경사로로 되어 있어서 유모차나 휠체어 충분히 올라갈 수 있어유! 단, 꼭대기 철골 전망대는 경사가 있으니 조심하셔유.', author: '대전아빠', createdAt: Date.now() - 7200000, views: 95, likes: 9, password: '22' },
                    { id: 'p3', region: '충남', category: '문화', title: '공주 공산성 야간입장 무료에유!', content: '저녁 6시 이후에 가면 매표소 마감해서 입장료 없이 산책로 다 둘러볼 수 있어유. 성곽 위 야경 조명이 금강에 비치는데 눈호강 제대루 하고 왔네유.', author: '백제공주', createdAt: Date.now() - 14400000, views: 231, likes: 27, password: '33' },
                    { id: 'p4', region: '대전', category: '자연', title: '유성온천 족욕체험장 완전 공짜에유', content: '유림공원 근처 족욕장 그냥 앉아서 발 담그면 돼유. 수건만 챙겨가시면 됨! 저녁에 가면 사람 적어서 여유롭게 즐길 수 있어유.', author: '온천지기', createdAt: Date.now() - 18000000, views: 76, likes: 11, password: '44' },
                    { id: 'p5', region: '충북', category: '문화', title: '옥천 정지용 생가 다녀왔어유', content: '향수길 따라 걷다보면 생가랑 문학관이 같이 있어서 한번에 둘러보기 좋아유. 문학관 안에 카페도 있어서 쉬었다 가기 딱이에유.', author: '향수여행자', createdAt: Date.now() - 25200000, views: 64, likes: 7, password: '55' },
                    { id: 'p6', region: '대전', category: '자연', title: '계족산 황톳길 맨발 걷기 후기', content: '주차장에서 초입까지 좀 걸어야 하는데, 황톳길 자체는 완전 부드러워서 발이 편해유. 발 씻을 수 있는 곳도 곳곳에 있으니 물티슈만 챙겨가셔도 됨.', author: '맨발걷기러', createdAt: Date.now() - 32400000, views: 142, likes: 19, password: '66' },
                    { id: 'p7', region: '충남', category: '자연', title: '논산 탑정호 출렁다리 야간 조명 진짜 예뻐유', content: '해질녘에 가면 노을이랑 다리 조명이 겹쳐서 사진 잘 나와유. 다리 흔들림이 좀 있으니 어지럼증 있으신 분은 천천히 건너보셔유.', author: '노을헌터', createdAt: Date.now() - 39600000, views: 88, likes: 13, password: '77' },
                    { id: 'p8', region: '충남', category: '음식', title: '강경젓갈시장 구경만 해도 재밌어유', content: '축제 기간 아니어도 상설시장이라 상시 구경 가능해유. 시식 코너 많으니 이것저것 맛보고 마음에 드는 것만 소량으로 사시는 걸 추천드려유.', author: '젓갈러버', createdAt: Date.now() - 46800000, views: 57, likes: 6, password: '88' },
                    { id: 'p9', region: '대전', category: '자연', title: '보문산 전망대에서 대전 야경 한눈에', content: '차로 올라갈 수 있어서 등산 안 좋아하셔도 부담 없어유. 전망대 카페에서 커피 한잔 하면서 야경 보는 코스 완전 강추.', author: '야경덕후', createdAt: Date.now() - 54000000, views: 103, likes: 15, password: '99' },
                    { id: 'p10', region: '대전', category: '자연', title: '한밭수목원 아침 산책 강추해유', content: '오전 일찍 가면 사람 없고 공기 좋아유. 동원이랑 서원 다 돌면 한시간 반 정도 걸리니께 시간 넉넉히 잡고 가셔유.', author: '아침산책러', createdAt: Date.now() - 61200000, views: 71, likes: 8, password: '10' },
                    { id: 'p11', region: '충남', category: '문화', title: '공주 한옥마을 하룻밤 자고 왔어유', content: '온돌방이라 겨울에 진짜 따뜻해유. 공산성이랑 가까워서 저녁 산책하기도 좋고, 조식으로 나오는 백제 정식도 정갈했어유.', author: '한옥나그네', createdAt: Date.now() - 68400000, views: 49, likes: 5, password: '20' },
                    { id: 'p12', region: '충북', category: '자연', title: '옥천 금강유원지 캠핑 다녀온 후기', content: '강 바로 옆이라 뷰는 최고인데 여름엔 벌레가 좀 있어유. 모기약 필수로 챙기시고, 근처 마트가 멀어서 장은 미리 봐가시는 게 좋아유.', author: '캠핑초보', createdAt: Date.now() - 75600000, views: 82, likes: 10, password: '30' },
                    { id: 'p13', region: '대전', category: '문화', title: '대전 스카이로드 은행동 야경 산책', content: '중앙로 지하상가 위에 있는 LED 조형물 거리인데 밤에 가면 색이 계속 바뀌면서 진짜 예뻐유. 근처 먹자골목이랑 붙어있어서 저녁 먹고 산책하기 좋아유.', author: '은행동토박이', createdAt: Date.now() - 82800000, views: 66, likes: 7, password: '40' },
                    { id: 'p14', region: '대전', category: '자연', title: '대청호 벚꽃길 4월초가 절정이에유', content: '차 타고 드라이브 코스로도 좋고, 자전거길도 잘 되어있어서 라이딩하시는 분들도 많아유. 주말엔 주차하기 좀 힘드니 오전 일찍 가시길 추천!', author: '벚꽃라이더', createdAt: Date.now() - 90000000, views: 119, likes: 16, password: '50' },
                    { id: 'p15', region: '대전', category: '자연', title: '대전오월드 놀이기구 대기시간 꿀팁', content: '평일 오전 개장 직후에 가면 인기 놀이기구도 대기 거의 없어유. 주동물원이랑 플라워랜드까지 다 보려면 하루 꽉 채워야 해유.', author: '오월드죽순이', createdAt: Date.now() - 97200000, views: 88, likes: 12, password: '51' },
                    { id: 'p16', region: '충남', category: '문화', title: '논산 관촉사 은진미륵 다녀왔어유', content: '국내 최대 규모 석조미륵보살입상이라던디 실제로 보믄 진짜 압도적이유. 계단이 좀 있으니 편한 신발 신고 가셔유.', author: '절탐방러', createdAt: Date.now() - 104400000, views: 54, likes: 6, password: '52' },
                    { id: 'p17', region: '충남', category: '자연', title: '계룡산 갑사 단풍 진짜 예술이에유', content: '가을에 가면 입구부터 절까지 단풍터널이 쫙 펼쳐져유. 산책하듯 걸을 수 있어서 등산 부담스러운 분들도 좋아하실 거예유.', author: '단풍헌터', createdAt: Date.now() - 111600000, views: 97, likes: 14, password: '53' },
                    { id: 'p18', region: '충남', category: '문화', title: '공주 마곡사 템플스테이 후기', content: '조용하니 힐링 제대로 됐어유. 새벽 예불 참여는 선택인데 한번쯤 경험해보는 것도 좋아유. 밥이 진짜 정갈하고 맛있었어유.', author: '템플스테이러', createdAt: Date.now() - 118800000, views: 43, likes: 5, password: '54' },
                    { id: 'p19', region: '대전', category: '문화', title: '3.8민주의거기념관 무료 관람이에유', content: '대전 근현대사 관심 있으신 분들한테 추천해유. 규모는 크지 않은디 알차게 잘 꾸며놨어유. 주차도 편해유.', author: '역사탐방', createdAt: Date.now() - 126000000, views: 38, likes: 4, password: '55' },
                    { id: 'p20', region: '대전', category: '자연', title: '뿌리공원 걷기 좋은 저녁 산책길', content: '성씨별 조형물 구경하면서 걷다보면 시간 금방 가유. 밤에는 조명 켜져서 분위기도 좋고, 반려견 산책하시는 분들도 많아유.', author: '저녁산책러', createdAt: Date.now() - 133200000, views: 71, likes: 9, password: '56' },
                    { id: 'p21', region: '대전', category: '자연', title: '대동하늘공원 노을 명당이에유', content: '언덕 위 풍차 앞에서 보는 노을이 진짜 예술이에유. 계단이 좀 가파르니까 운동화 신고 가시길 추천드려유.', author: '노을덕후', createdAt: Date.now() - 140400000, views: 82, likes: 11, password: '57' },
                    { id: 'p22', region: '대전', category: '자연', title: '갑천 자전거길 라이딩 코스 공유해유', content: '갑천 생태호수공원부터 쭉 이어지는 코스라 초보자도 부담 없어유. 중간중간 쉼터도 잘 되어있어서 물 마시면서 쉬기 좋아유.', author: '갑천라이더', createdAt: Date.now() - 147600000, views: 65, likes: 8, password: '58' },
                    { id: 'p23', region: '대전', category: '문화', title: '대전시민천문대 별 관측 프로그램 신청 팁', content: '주말 저녁 프로그램은 인기 많아서 예약 오픈하자마자 마감돼유. 날씨 흐리면 취소될 수 있으니 당일 공지 꼭 확인하셔유.', author: '별지기', createdAt: Date.now() - 154800000, views: 47, likes: 7, password: '59' },
                    { id: 'p24', region: '충남', category: '자연', title: '유구 색동수국정원 6월이 절정이에유', content: '수국이 색깔별로 쫙 펼쳐져 있어서 사진 찍기 진짜 좋아유. 평일에도 사람 꽤 있으니 오전에 가시는 걸 추천해유.', author: '수국러버', createdAt: Date.now() - 162000000, views: 59, likes: 9, password: '60' },
                    { id: 'p25', region: '충남', category: '자연', title: '계룡 신원사 벚꽃길 숨은 명소', content: '공산성이나 갑사보다는 덜 알려졌는디 벚꽃철엔 여기도 진짜 예뻐유. 사람 적어서 여유롭게 사진 찍기 좋아유.', author: '숨은명소헌터', createdAt: Date.now() - 169200000, views: 41, likes: 5, password: '61' },
                    { id: 'p26', region: '충북', category: '음식', title: '옥천 이원묘목시장 근처 맛집 있나유?', content: '묘목 사러 갔다가 근처에서 국밥 한그릇 했는디 양도 많고 국물이 진했어유. 시장 구경도 할 겸 같이 다녀오시길 추천!', author: '옥천장꾼', createdAt: Date.now() - 176400000, views: 33, likes: 4, password: '62' },
                    { id: 'p27', region: '대전', category: '자연', title: '유성 자운대 벚꽃길 드라이브 코스', content: '군부대 안쪽이라 평소엔 못 들어가는디 벚꽃철에 개방하는 구간이 있어유. 시기 놓치면 못 보니까 미리 검색하고 가셔유.', author: '벚꽃드라이버', createdAt: Date.now() - 183600000, views: 76, likes: 10, password: '63' },
                    { id: 'p28', region: '충남', category: '문화', title: '공주 무령왕릉 야간 개장 다녀왔어유', content: '낮에 가는 것도 좋은디 야간엔 조명이 은은하게 켜져서 분위기가 또 달라유. 근처 국립공주박물관이랑 같이 보시길 추천해유.', author: '백제유적러', createdAt: Date.now() - 190800000, views: 52, likes: 6, password: '64' },
                    { id: 'p29', region: '대전', category: '음식', title: '대덕구 계족산 맥주축제 시즌 후기', content: '황톳길 걷고 나서 맥주 한잔 하기 딱이에유. 푸드트럭도 많이 와서 먹거리 걱정 없이 하루 종일 놀 수 있어유.', author: '맥주덕후', createdAt: Date.now() - 198000000, views: 68, likes: 8, password: '65' },
                    { id: 'p30', region: '충북', category: '문화', title: '옥천 육영수 생가 조용히 둘러보기 좋아유', content: '한옥 그대로 잘 보존되어 있고 관람객도 많지 않아서 여유롭게 구경할 수 있어유. 근처 정지용 생가랑 묶어서 다녀오시길 추천해유.', author: '한옥산책', createdAt: Date.now() - 205200000, views: 29, likes: 3, password: '66' },
                    { id: 'p31', region: '충남', category: '음식', title: '논산훈련소 앞 맛집 정보 공유해유', content: '면회 갔다가 근처 식당에서 먹었는디 양 진짜 푸짐하게 줘서 놀랐어유. 대기 있을 수 있으니 시간 넉넉하게 잡고 가셔유.', author: '면회맘', createdAt: Date.now() - 212400000, views: 91, likes: 13, password: '67' },
                    { id: 'p32', region: '충남', category: '자연', title: '계룡산 국립공원 등산 코스 추천해유', content: '동학사 코스는 초보자도 무난하게 오를 수 있어유. 정상까지는 체력 좀 필요하니 물이랑 간식 넉넉히 챙겨가셔유.', author: '등산초보', createdAt: Date.now() - 219600000, views: 84, likes: 11, password: '68' },
                    { id: 'p33', region: '대전', category: '문화', title: '대전 회덕메타세쿼이아길 숨은 산책로', content: '고속도로 옆에 이런 숲길이 있는지 몰랐어유. 사람도 적고 조용해서 혼자 산책하기 딱 좋았어유.', author: '숲길산책러', createdAt: Date.now() - 226800000, views: 36, likes: 4, password: '69' },
                    { id: 'p34', region: '대전', category: '자연', title: '한밭수목원 열대식물원 겨울에도 따뜻해유', content: '겨울에 야외 산책 힘들 때 열대식물원 가면 따뜻하게 구경할 수 있어유. 아이들이랑 가기 딱 좋은 코스예유.', author: '겨울나들이', createdAt: Date.now() - 234000000, views: 58, likes: 7, password: '70' },
                    { id: 'p35', region: '대전', category: '음식', title: '중앙시장 근처 노포 맛집 리스트 공유', content: '오래된 노포들이 많아서 골라먹는 재미가 있어유. 현금만 받는 곳도 있으니 미리 준비해가시는 게 좋아유.', author: '노포탐방러', createdAt: Date.now() - 241200000, views: 103, likes: 15, password: '71' },
                    { id: 'p36', region: '대전', category: '자연', title: '한밭수목원 다녀온 후기 남겨유', content: '지난 주말에 한밭수목원 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '대전나그네', createdAt: Date.now() - 249281950, views: 43, likes: 7, password: '72' },
                    { id: 'p37', region: '대전', category: '자연', title: '계족산 황톳길 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '충남지기', createdAt: Date.now() - 258220576, views: 85, likes: 12, password: '73' },
                    { id: 'p38', region: '대전', category: '자연', title: '대청호 오백리길 평일이랑 주말 차이 엄청나네유', content: '평일엔 한산한디 주말엔 사람이 확 늘어나유. 여유롭게 보고 싶으시면 평일 추천드려유.', author: '충북입주민', createdAt: Date.now() - 260208639, views: 50, likes: 4, password: '74' },
                    { id: 'p39', region: '대전', category: '자연', title: '장태산자연휴양림 계절별로 분위기 다른가유?', content: '봄에 갔을 때랑 지금이랑 완전 다른 느낌이더라구유. 다른 계절엔 어떤지 아시는 분 공유 좀 해주셔유.', author: '유성덕후', createdAt: Date.now() - 264519580, views: 154, likes: 25, password: '75' },
                    { id: 'p40', region: '대전', category: '자연', title: '갑천 자전거길 아이랑 가도 괜찮을까유?', content: '저희는 유모차 끌고 갔는디 길이 대체로 평탄해서 괜찮았어유. 다만 화장실 위치는 미리 확인하고 가시는 게 좋아유.', author: '공주집사', createdAt: Date.now() - 280583525, views: 123, likes: 20, password: '76' },
                    { id: 'p41', region: '대전', category: '자연', title: '뿌리공원 사진 스팟 공유해유', content: '여기서 찍은 사진이 인생샷이 됐어유. 각도는 입구 쪽 계단에서 위로 찍으면 진짜 예술이에유.', author: '논산초보', createdAt: Date.now() - 274349868, views: 38, likes: 5, password: '77' },
                    { id: 'p42', region: '대전', category: '자연', title: '보문산 전망대 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '옥천곰신', createdAt: Date.now() - 285830950, views: 144, likes: 14, password: '78' },
                    { id: 'p43', region: '대전', category: '문화', title: '대전시립미술관 주차 팁 공유해유', content: '대전시립미술관 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '계룡토박이', createdAt: Date.now() - 285290392, views: 158, likes: 22, password: '79' },
                    { id: 'p44', region: '대전', category: '문화', title: '이응노미술관 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '둔산탐방러', createdAt: Date.now() - 316828827, views: 154, likes: 17, password: '80' },
                    { id: 'p45', region: '대전', category: '문화', title: '국립중앙과학관 반려동물 동반 가능한가유?', content: '저희 강아지랑 같이 갔었는디 목줄만 잘 하면 크게 제지는 안 하시더라구유. 배변봉투는 필수로 챙기셔유.', author: '은행동맛집러', createdAt: Date.now() - 304445940, views: 129, likes: 12, password: '81' },
                    { id: 'p46', region: '대전', category: '문화', title: '대전예술의전당 다녀온 후기 남겨유', content: '지난 주말에 대전예술의전당 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '한밭일상러', createdAt: Date.now() - 313434976, views: 16, likes: 1, password: '82' },
                    { id: 'p47', region: '대전', category: '문화', title: '헤레디움 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '금강산책러', createdAt: Date.now() - 346558200, views: 55, likes: 5, password: '83' },
                    { id: 'p48', region: '대전', category: '문화', title: '대전근현대사전시관 평일이랑 주말 차이 엄청나네유', content: '평일엔 한산한디 주말엔 사람이 확 늘어나유. 여유롭게 보고 싶으시면 평일 추천드려유.', author: '갑천마니아', createdAt: Date.now() - 334443449, views: 102, likes: 12, password: '84' },
                    { id: 'p49', region: '대전', category: '음식', title: '성심당 본점 계절별로 분위기 다른가유?', content: '봄에 갔을 때랑 지금이랑 완전 다른 느낌이더라구유. 다른 계절엔 어떤지 아시는 분 공유 좀 해주셔유.', author: '보문산여행자', createdAt: Date.now() - 325929792, views: 70, likes: 5, password: '85' },
                    { id: 'p50', region: '대전', category: '음식', title: '중앙시장 닭전골목 아이랑 가도 괜찮을까유?', content: '저희는 유모차 끌고 갔는디 길이 대체로 평탄해서 괜찮았어유. 다만 화장실 위치는 미리 확인하고 가시는 게 좋아유.', author: '송촌헌터', createdAt: Date.now() - 343376685, views: 41, likes: 6, password: '86' },
                    { id: 'p51', region: '대전', category: '음식', title: '유성 족욕거리 맛집 사진 스팟 공유해유', content: '여기서 찍은 사진이 인생샷이 됐어유. 각도는 입구 쪽 계단에서 위로 찍으면 진짜 예술이에유.', author: '대전나그네', createdAt: Date.now() - 353096480, views: 39, likes: 4, password: '87' },
                    { id: 'p52', region: '대전', category: '음식', title: '둔산동 카페거리 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '충남지기', createdAt: Date.now() - 393429033, views: 103, likes: 10, password: '88' },
                    { id: 'p53', region: '대전', category: '음식', title: '대흥동 노포 주차 팁 공유해유', content: '대흥동 노포 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '충북입주민', createdAt: Date.now() - 358370640, views: 26, likes: 2, password: '89' },
                    { id: 'p54', region: '대전', category: '자연', title: '유성온천공원 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '유성덕후', createdAt: Date.now() - 380412373, views: 152, likes: 25, password: '90' },
                    { id: 'p55', region: '대전', category: '자연', title: '대전오월드 반려동물 동반 가능한가유?', content: '저희 강아지랑 같이 갔었는디 목줄만 잘 하면 크게 제지는 안 하시더라구유. 배변봉투는 필수로 챙기셔유.', author: '공주집사', createdAt: Date.now() - 380953760, views: 35, likes: 3, password: '91' },
                    { id: 'p56', region: '충남', category: '자연', title: '공주 공산성 다녀온 후기 남겨유', content: '지난 주말에 공주 공산성 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '논산초보', createdAt: Date.now() - 380423238, views: 175, likes: 17, password: '92' },
                    { id: 'p57', region: '충남', category: '자연', title: '논산 탑정호 출렁다리 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '옥천곰신', createdAt: Date.now() - 393369754, views: 162, likes: 23, password: '93' },
                    { id: 'p58', region: '충남', category: '자연', title: '계룡산 갑사 평일이랑 주말 차이 엄청나네유', content: '평일엔 한산한디 주말엔 사람이 확 늘어나유. 여유롭게 보고 싶으시면 평일 추천드려유.', author: '계룡토박이', createdAt: Date.now() - 433369324, views: 32, likes: 5, password: '94' },
                    { id: 'p59', region: '충남', category: '자연', title: '유구색동수국정원 계절별로 분위기 다른가유?', content: '봄에 갔을 때랑 지금이랑 완전 다른 느낌이더라구유. 다른 계절엔 어떤지 아시는 분 공유 좀 해주셔유.', author: '둔산탐방러', createdAt: Date.now() - 437364936, views: 73, likes: 6, password: '95' },
                    { id: 'p60', region: '충남', category: '문화', title: '국립공주박물관 아이랑 가도 괜찮을까유?', content: '저희는 유모차 끌고 갔는디 길이 대체로 평탄해서 괜찮았어유. 다만 화장실 위치는 미리 확인하고 가시는 게 좋아유.', author: '은행동맛집러', createdAt: Date.now() - 406544525, views: 35, likes: 2, password: '96' },
                    { id: 'p61', region: '충남', category: '문화', title: '마곡사 사진 스팟 공유해유', content: '여기서 찍은 사진이 인생샷이 됐어유. 각도는 입구 쪽 계단에서 위로 찍으면 진짜 예술이에유.', author: '한밭일상러', createdAt: Date.now() - 406986270, views: 40, likes: 4, password: '97' },
                    { id: 'p62', region: '충남', category: '문화', title: '공주 무령왕릉 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '금강산책러', createdAt: Date.now() - 418479435, views: 131, likes: 11, password: '98' },
                    { id: 'p63', region: '충남', category: '문화', title: '논산 명재고택 주차 팁 공유해유', content: '논산 명재고택 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '갑천마니아', createdAt: Date.now() - 490358336, views: 108, likes: 15, password: '99' },
                    { id: 'p64', region: '충남', category: '음식', title: '강경젓갈시장 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '보문산여행자', createdAt: Date.now() - 442826879, views: 105, likes: 15, password: '100' },
                    { id: 'p65', region: '충남', category: '음식', title: '공주 한옥마을 백제정식 반려동물 동반 가능한가유?', content: '저희 강아지랑 같이 갔었는디 목줄만 잘 하면 크게 제지는 안 하시더라구유. 배변봉투는 필수로 챙기셔유.', author: '송촌헌터', createdAt: Date.now() - 487527540, views: 83, likes: 7, password: '101' },
                    { id: 'p66', region: '충남', category: '음식', title: '논산 딸기농장 다녀온 후기 남겨유', content: '지난 주말에 논산 딸기농장 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '대전나그네', createdAt: Date.now() - 497477186, views: 180, likes: 30, password: '102' },
                    { id: 'p67', region: '충남', category: '자연', title: '계룡산 신원사 벚꽃길 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '충남지기', createdAt: Date.now() - 495756160, views: 177, likes: 25, password: '103' },
                    { id: 'p68', region: '충남', category: '자연', title: '공주 고마나루 평일이랑 주말 차이 엄청나네유', content: '평일엔 한산한디 주말엔 사람이 확 늘어나유. 여유롭게 보고 싶으시면 평일 추천드려유.', author: '충북입주민', createdAt: Date.now() - 493331385, views: 77, likes: 11, password: '104' },
                    { id: 'p69', region: '충북', category: '자연', title: '옥천 금강유원지 계절별로 분위기 다른가유?', content: '봄에 갔을 때랑 지금이랑 완전 다른 느낌이더라구유. 다른 계절엔 어떤지 아시는 분 공유 좀 해주셔유.', author: '유성덕후', createdAt: Date.now() - 490721206, views: 112, likes: 14, password: '105' },
                    { id: 'p70', region: '충북', category: '자연', title: '부소담악(추소정) 아이랑 가도 괜찮을까유?', content: '저희는 유모차 끌고 갔는디 길이 대체로 평탄해서 괜찮았어유. 다만 화장실 위치는 미리 확인하고 가시는 게 좋아유.', author: '공주집사', createdAt: Date.now() - 524152355, views: 157, likes: 22, password: '106' },
                    { id: 'p71', region: '충북', category: '문화', title: '정지용 생가·문학관 사진 스팟 공유해유', content: '여기서 찍은 사진이 인생샷이 됐어유. 각도는 입구 쪽 계단에서 위로 찍으면 진짜 예술이에유.', author: '논산초보', createdAt: Date.now() - 538973280, views: 98, likes: 8, password: '107' },
                    { id: 'p72', region: '충북', category: '문화', title: '옥천 육영수 생가 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '옥천곰신', createdAt: Date.now() - 560233980, views: 29, likes: 4, password: '108' },
                    { id: 'p73', region: '충북', category: '음식', title: '옥천 향수길 국밥거리 주차 팁 공유해유', content: '옥천 향수길 국밥거리 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '계룡토박이', createdAt: Date.now() - 577381782, views: 23, likes: 1, password: '109' },
                    { id: 'p74', region: '충북', category: '자연', title: '장령산자연휴양림 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '둔산탐방러', createdAt: Date.now() - 503401095, views: 117, likes: 14, password: '110' },
                    { id: 'p75', region: '대전', category: '자연', title: '한밭수목원 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '은행동맛집러', createdAt: Date.now() - 468304600, views: 69, likes: 6, password: '111' },
                    { id: 'p76', region: '대전', category: '자연', title: '계족산 황톳길 주차 팁 공유해유', content: '계족산 황톳길 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '한밭일상러', createdAt: Date.now() - 586057150, views: 95, likes: 13, password: '112' },
                    { id: 'p77', region: '대전', category: '자연', title: '대청호 오백리길 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '금강산책러', createdAt: Date.now() - 583462578, views: 142, likes: 15, password: '113' },
                    { id: 'p78', region: '대전', category: '자연', title: '장태산자연휴양림 반려동물 동반 가능한가유?', content: '저희 강아지랑 같이 갔었는디 목줄만 잘 하면 크게 제지는 안 하시더라구유. 배변봉투는 필수로 챙기셔유.', author: '갑천마니아', createdAt: Date.now() - 589341588, views: 132, likes: 18, password: '114' },
                    { id: 'p79', region: '대전', category: '자연', title: '갑천 자전거길 다녀온 후기 남겨유', content: '지난 주말에 갑천 자전거길 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '보문산여행자', createdAt: Date.now() - 527683428, views: 50, likes: 7, password: '115' },
                    { id: 'p80', region: '대전', category: '자연', title: '뿌리공원 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '송촌헌터', createdAt: Date.now() - 624811950, views: 158, likes: 15, password: '116' },
                    { id: 'p81', region: '대전', category: '자연', title: '보문산 전망대 평일이랑 주말 차이 엄청나네유', content: '평일엔 한산한디 주말엔 사람이 확 늘어나유. 여유롭게 보고 싶으시면 평일 추천드려유.', author: '대전나그네', createdAt: Date.now() - 540292828, views: 164, likes: 18, password: '117' },
                    { id: 'p82', region: '대전', category: '문화', title: '대전시립미술관 계절별로 분위기 다른가유?', content: '봄에 갔을 때랑 지금이랑 완전 다른 느낌이더라구유. 다른 계절엔 어떤지 아시는 분 공유 좀 해주셔유.', author: '충남지기', createdAt: Date.now() - 610033158, views: 117, likes: 14, password: '118' },
                    { id: 'p83', region: '대전', category: '문화', title: '이응노미술관 아이랑 가도 괜찮을까유?', content: '저희는 유모차 끌고 갔는디 길이 대체로 평탄해서 괜찮았어유. 다만 화장실 위치는 미리 확인하고 가시는 게 좋아유.', author: '충북입주민', createdAt: Date.now() - 544555056, views: 50, likes: 5, password: '119' },
                    { id: 'p84', region: '대전', category: '문화', title: '국립중앙과학관 사진 스팟 공유해유', content: '여기서 찍은 사진이 인생샷이 됐어유. 각도는 입구 쪽 계단에서 위로 찍으면 진짜 예술이에유.', author: '유성덕후', createdAt: Date.now() - 607227795, views: 38, likes: 3, password: '120' },
                    { id: 'p85', region: '대전', category: '문화', title: '대전예술의전당 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '공주집사', createdAt: Date.now() - 521081000, views: 43, likes: 6, password: '121' },
                    { id: 'p86', region: '대전', category: '문화', title: '헤레디움 주차 팁 공유해유', content: '헤레디움 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '논산초보', createdAt: Date.now() - 650816649, views: 55, likes: 4, password: '122' },
                    { id: 'p87', region: '대전', category: '문화', title: '대전근현대사전시관 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '옥천곰신', createdAt: Date.now() - 670415540, views: 123, likes: 12, password: '123' },
                    { id: 'p88', region: '대전', category: '음식', title: '성심당 본점 반려동물 동반 가능한가유?', content: '저희 강아지랑 같이 갔었는디 목줄만 잘 하면 크게 제지는 안 하시더라구유. 배변봉투는 필수로 챙기셔유.', author: '계룡토박이', createdAt: Date.now() - 541522062, views: 113, likes: 12, password: '124' },
                    { id: 'p89', region: '대전', category: '음식', title: '중앙시장 닭전골목 다녀온 후기 남겨유', content: '지난 주말에 중앙시장 닭전골목 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '둔산탐방러', createdAt: Date.now() - 667764198, views: 134, likes: 13, password: '125' },
                    { id: 'p90', region: '대전', category: '음식', title: '유성 족욕거리 맛집 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '은행동맛집러', createdAt: Date.now() - 596197885, views: 156, likes: 13, password: '126' },
                    { id: 'p91', region: '대전', category: '음식', title: '둔산동 카페거리 평일이랑 주말 차이 엄청나네유', content: '평일엔 한산한디 주말엔 사람이 확 늘어나유. 여유롭게 보고 싶으시면 평일 추천드려유.', author: '한밭일상러', createdAt: Date.now() - 546296624, views: 44, likes: 4, password: '127' },
                    { id: 'p92', region: '대전', category: '음식', title: '대흥동 노포 계절별로 분위기 다른가유?', content: '봄에 갔을 때랑 지금이랑 완전 다른 느낌이더라구유. 다른 계절엔 어떤지 아시는 분 공유 좀 해주셔유.', author: '금강산책러', createdAt: Date.now() - 677376312, views: 83, likes: 6, password: '128' },
                    { id: 'p93', region: '대전', category: '자연', title: '유성온천공원 아이랑 가도 괜찮을까유?', content: '저희는 유모차 끌고 갔는디 길이 대체로 평탄해서 괜찮았어유. 다만 화장실 위치는 미리 확인하고 가시는 게 좋아유.', author: '갑천마니아', createdAt: Date.now() - 710326504, views: 102, likes: 17, password: '129' },
                    { id: 'p94', region: '대전', category: '자연', title: '대전오월드 사진 스팟 공유해유', content: '여기서 찍은 사진이 인생샷이 됐어유. 각도는 입구 쪽 계단에서 위로 찍으면 진짜 예술이에유.', author: '보문산여행자', createdAt: Date.now() - 632430652, views: 126, likes: 18, password: '130' },
                    { id: 'p95', region: '충남', category: '자연', title: '공주 공산성 여기 진짜 숨은 명소네유', content: '유명한 곳들에 밀려서 잘 안 알려진 것 같은디 실제로 가보니까 훨씬 여유롭고 좋았어유.', author: '송촌헌터', createdAt: Date.now() - 679383300, views: 15, likes: 1, password: '131' },
                    { id: 'p96', region: '충남', category: '자연', title: '논산 탑정호 출렁다리 주차 팁 공유해유', content: '논산 탑정호 출렁다리 근처에 무료 주차장이 있는디 아는 사람이 별로 없더라구유. 성수기엔 좀 일찍 가셔야 자리 잡기 편해유.', author: '대전나그네', createdAt: Date.now() - 754732099, views: 82, likes: 8, password: '132' },
                    { id: 'p97', region: '충남', category: '자연', title: '계룡산 갑사 근처 맛집 아시는 분?', content: '구경 다 하고 나니 배가 고픈디 근처에 뭐 먹을 만한 곳 있을까유? 아시는 분 댓글 부탁드려유.', author: '충남지기', createdAt: Date.now() - 774145862, views: 60, likes: 6, password: '133' },
                    { id: 'p98', region: '충남', category: '자연', title: '유구색동수국정원 반려동물 동반 가능한가유?', content: '저희 강아지랑 같이 갔었는디 목줄만 잘 하면 크게 제지는 안 하시더라구유. 배변봉투는 필수로 챙기셔유.', author: '충북입주민', createdAt: Date.now() - 609518097, views: 175, likes: 21, password: '134' },
                    { id: 'p99', region: '충남', category: '문화', title: '국립공주박물관 다녀온 후기 남겨유', content: '지난 주말에 국립공주박물관 다녀왔는디 생각보다 훨씬 좋았어유. 사람 많을 때는 피해서 평일 오전에 가시는 걸 추천드려유.', author: '유성덕후', createdAt: Date.now() - 812733888, views: 178, likes: 17, password: '135' },
                    { id: 'p100', region: '충남', category: '문화', title: '마곡사 요즘 어떤가유? 궁금해서 여쭤봐유', content: '예전에 가봤는디 최근에 리모델링했다는 소문 들어서유. 다녀오신 분 계시면 근황 좀 알려주셔유.', author: '공주집사', createdAt: Date.now() - 758223390, views: 65, likes: 9, password: '136' }
                ];

                // 커뮤니티 시드 데이터 버전 - defaultPosts를 새로 갱신할 때마다 값을 바꿔주면
                // 브라우저에 저장된 예전 캐시 대신 최신 예시 글이 다시 반영돼유.
                const POSTS_SEED_VERSION = 'v4-100posts';

                const loadPosts = () => {
                    const storedVersion = localStorage.getItem('localhub_posts_seed_version');
                    const stored = localStorage.getItem('localhub_posts');
                    if (stored && storedVersion === POSTS_SEED_VERSION) {
                        try {
                            posts.value = JSON.parse(stored);
                        } catch (err) {
                            posts.value = defaultPosts;
                        }
                    } else {
                        posts.value = defaultPosts;
                        localStorage.setItem('localhub_posts', JSON.stringify(posts.value));
                        localStorage.setItem('localhub_posts_seed_version', POSTS_SEED_VERSION);
                    }
                    // 기존 저장 데이터에 likes 필드가 없는 경우를 대비한 마이그레이션
                    posts.value.forEach(p => {
                        if (typeof p.likes !== 'number') p.likes = 0;
                    });
                };

                const persistPosts = () => {
                    localStorage.setItem('localhub_posts', JSON.stringify(posts.value));
                };

                // 브라우저(기기) 단위로 중복 조회수/좋아요를 막기 위한 이력 저장
                const viewedPostIds = ref([]);
                const likedPostIds = ref([]);

                const loadPostInteractionHistory = () => {
                    try {
                        viewedPostIds.value = JSON.parse(localStorage.getItem('localhub_viewed_posts') || '[]');
                    } catch (err) {
                        viewedPostIds.value = [];
                    }
                    try {
                        likedPostIds.value = JSON.parse(localStorage.getItem('localhub_liked_posts') || '[]');
                    } catch (err) {
                        likedPostIds.value = [];
                    }
                };

                const hasLiked = (postId) => likedPostIds.value.includes(postId);

                const toggleLikePost = (post) => {
                    if (hasLiked(post.id)) {
                        // 이미 좋아요를 누른 글은 취소(토글) 처리
                        likedPostIds.value = likedPostIds.value.filter(id => id !== post.id);
                        post.likes = Math.max(0, (post.likes || 0) - 1);
                        showToast('좋아요를 취소했어유.');
                    } else {
                        likedPostIds.value.push(post.id);
                        post.likes = (post.likes || 0) + 1;
                        showToast('따뜻한 공감 감사해유! 👍');
                    }
                    localStorage.setItem('localhub_liked_posts', JSON.stringify(likedPostIds.value));
                    persistPosts();
                };

                const commSortMode = ref('latest'); // 'latest' | 'likes'

                const filteredPostsList = computed(() => {
                    const list = posts.value.filter(post => {
                        const matchCat = commFilterCategory.value === '전체' || post.category === commFilterCategory.value;
                        const matchSearch = post.title.toLowerCase().includes(commSearchQuery.value.toLowerCase()) || 
                                            post.content.toLowerCase().includes(commSearchQuery.value.toLowerCase());
                        return matchCat && matchSearch;
                    });
                    if (commSortMode.value === 'likes') {
                        return list.sort((a, b) => (b.likes || 0) - (a.likes || 0) || b.createdAt - a.createdAt);
                    }
                    return list.sort((a, b) => b.createdAt - a.createdAt);
                });

                const topPosts = computed(() => {
                    return [...posts.value]
                        .sort((a, b) => b.views - a.views)
                        .slice(0, 5);
                });

                const paginatedPosts = computed(() => {
                    const start = (commPage.value - 1) * itemsPerPage;
                    return filteredPostsList.value.slice(start, start + itemsPerPage);
                });

                const totalPages = computed(() => {
                    return Math.ceil(filteredPostsList.value.length / itemsPerPage) || 1;
                });

                const selectedPost = ref(null);
                const postPassInput = ref('');
                
                const viewPost = (post) => {
                    selectedPost.value = post;
                    postPassInput.value = '';
                    // 같은 브라우저(기기)에서 이미 조회한 글은 조회수를 다시 올리지 않음
                    if (!viewedPostIds.value.includes(post.id)) {
                        post.views += 1;
                        viewedPostIds.value.push(post.id);
                        localStorage.setItem('localhub_viewed_posts', JSON.stringify(viewedPostIds.value));
                        persistPosts();
                    }
                };

                const postCreateModalOpen = ref(false);
                const isEditMode = ref(false);
                const editingPostId = ref(null);
                const newPost = reactive({
                    region: '대전',
                    category: '음식',
                    title: '',
                    content: '',
                    author: '',
                    password: ''
                });

                const openPostCreateModal = () => {
                    isEditMode.value = false;
                    editingPostId.value = null;
                    newPost.region = activeRegion.value === '전체' ? '대전' : activeRegion.value;
                    newPost.category = activeCategory.value === '음식' ? '음식' : '문화';
                    newPost.title = '';
                    newPost.content = '';
                    newPost.author = '';
                    newPost.password = '';
                    postCreateModalOpen.value = true;
                };

                // 상세 모달에서 비밀번호 확인 후 호출되는 수정 진입 함수
                const requestEditPost = (post) => {
                    if (postPassInput.value !== post.password) {
                        showToast('비밀번호가 일치하지 않아유. 다시 입력해보셔유.');
                        return;
                    }
                    isEditMode.value = true;
                    editingPostId.value = post.id;
                    newPost.region = post.region;
                    newPost.category = post.category;
                    newPost.title = post.title;
                    newPost.content = post.content;
                    newPost.author = post.author;
                    newPost.password = post.password;
                    selectedPost.value = null;
                    postCreateModalOpen.value = true;
                };

                const submitPost = () => {
                    if (isEditMode.value && editingPostId.value) {
                        // 수정 모드: 기존 글의 id/작성일/조회수/좋아요는 유지하고 내용만 갱신
                        const target = posts.value.find(p => p.id === editingPostId.value);
                        if (target) {
                            target.region = newPost.region;
                            target.category = newPost.category;
                            target.title = newPost.title;
                            target.content = newPost.content;
                            target.author = newPost.author || '익명충청인';
                            target.password = newPost.password || target.password;
                            target.updatedAt = Date.now();
                            persistPosts();
                            showToast('게시글이 성공적으로 수정됐어유.');
                        }
                        isEditMode.value = false;
                        editingPostId.value = null;
                        postCreateModalOpen.value = false;
                        return;
                    }

                    const postObj = {
                        id: 'post-' + Date.now(),
                        region: newPost.region,
                        category: newPost.category,
                        title: newPost.title,
                        content: newPost.content,
                        author: newPost.author || '익명충청인',
                        createdAt: Date.now(),
                        views: 0,
                        likes: 0,
                        password: newPost.password || '1234'
                    };

                    posts.value.unshift(postObj);
                    persistPosts();
                    postCreateModalOpen.value = false;
                    showToast('소중한 동네 소식이 익명 게시판에 성공적으로 등록됐어유.');
                };

                const deletePost = (post) => {
                    if (postPassInput.value !== post.password) {
                        showToast('비밀번호가 일치하지 않아유. 다시 입력해보셔유.');
                        return;
                    }

                    const index = posts.value.findIndex(p => p.id === post.id);
                    if (index > -1) {
                        posts.value.splice(index, 1);
                        persistPosts();
                        selectedPost.value = null;
                        showToast('소통글이 성공적으로 삭제됐어유.');
                    }
                };

                // ============ 익명 댓글·대댓글 (localStorage) ============
                const comments = ref([]);
                const newComment = reactive({ author:'', password:'', content:'' });
                const replyTarget = ref(null);

                // 익명 댓글 시드 데이터 (활발한 커뮤니티처럼 보이도록 예시 댓글을 미리 채워둠)
                const DEFAULT_COMMENTS = [
                    { id: 'seed-comment-1-0', postId: 'p1', parentId: null, anonymousName: '충남헌터', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '11', createdAt: Date.now() - 1865414 },
                    { id: 'seed-comment-1-1', postId: 'p1', parentId: 'seed-comment-1-0', anonymousName: '충북집사', content: '저도 다녀와서 후기 남길게유!', password: '12', createdAt: Date.now() - 3387609 },
                    { id: 'seed-comment-1-2', postId: 'p1', parentId: 'seed-comment-1-0', anonymousName: '유성여행자', content: '맞아유 저도 그렇게 느꼈어유!', password: '13', createdAt: Date.now() - 2825902 },
                    { id: 'seed-comment-2-0', postId: 'p2', parentId: null, anonymousName: '공주덕후', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '14', createdAt: Date.now() - 4107882 },
                    { id: 'seed-comment-2-1', postId: 'p2', parentId: 'seed-comment-2-0', anonymousName: '논산탐방러', content: '맞아유 저도 그렇게 느꼈어유!', password: '15', createdAt: Date.now() - 5593724 },
                    { id: 'seed-comment-2-2', postId: 'p2', parentId: 'seed-comment-2-0', anonymousName: '옥천주민', content: '오 그렇군요! 참고할게유.', password: '16', createdAt: Date.now() - 4967350 },
                    { id: 'seed-comment-3-0', postId: 'p3', parentId: null, anonymousName: '계룡토박이', content: '혹시 주차는 어렵지 않았나유?', password: '17', createdAt: Date.now() - 1015985 },
                    { id: 'seed-comment-3-1', postId: 'p3', parentId: null, anonymousName: '둔산마니아', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '18', createdAt: Date.now() - 1923339 },
                    { id: 'seed-comment-3-2', postId: 'p3', parentId: null, anonymousName: '은행동입주민', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '19', createdAt: Date.now() - 2110041 },
                    { id: 'seed-comment-4-0', postId: 'p4', parentId: null, anonymousName: '한밭산책러', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '20', createdAt: Date.now() - 2116042 },
                    { id: 'seed-comment-4-1', postId: 'p4', parentId: null, anonymousName: '금강지기', content: '혹시 주차는 어렵지 않았나유?', password: '21', createdAt: Date.now() - 3197016 },
                    { id: 'seed-comment-5-0', postId: 'p5', parentId: null, anonymousName: '갑천곰신', content: '저도 조만간 한번 가봐야겠어유~', password: '22', createdAt: Date.now() - 1126712 },
                    { id: 'seed-comment-6-0', postId: 'p6', parentId: null, anonymousName: '보문산나그네', content: '정보 감사해유 다음 주말에 가볼게유.', password: '23', createdAt: Date.now() - 4764226 },
                    { id: 'seed-comment-6-1', postId: 'p6', parentId: null, anonymousName: '송촌초보', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '24', createdAt: Date.now() - 6040663 },
                    { id: 'seed-comment-7-0', postId: 'p7', parentId: null, anonymousName: '서구일상러', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '25', createdAt: Date.now() - 3633172 },
                    { id: 'seed-comment-7-1', postId: 'p7', parentId: null, anonymousName: '동구방문객', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '26', createdAt: Date.now() - 4445079 },
                    { id: 'seed-comment-7-2', postId: 'p7', parentId: 'seed-comment-7-1', anonymousName: '중구맛집러', content: '오 그렇군요! 참고할게유.', password: '27', createdAt: Date.now() - 6309840 },
                    { id: 'seed-comment-7-3', postId: 'p7', parentId: null, anonymousName: '대전헌터', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '28', createdAt: Date.now() - 7356991 },
                    { id: 'seed-comment-8-0', postId: 'p8', parentId: null, anonymousName: '충남집사', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '29', createdAt: Date.now() - 1214053 },
                    { id: 'seed-comment-8-1', postId: 'p8', parentId: null, anonymousName: '충북여행자', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '30', createdAt: Date.now() - 2231396 },
                    { id: 'seed-comment-9-0', postId: 'p9', parentId: null, anonymousName: '유성덕후', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '31', createdAt: Date.now() - 4701719 },
                    { id: 'seed-comment-9-1', postId: 'p9', parentId: null, anonymousName: '공주탐방러', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '32', createdAt: Date.now() - 6172088 },
                    { id: 'seed-comment-10-0', postId: 'p10', parentId: null, anonymousName: '논산주민', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '33', createdAt: Date.now() - 3453153 },
                    { id: 'seed-comment-10-1', postId: 'p10', parentId: null, anonymousName: '옥천토박이', content: '저도 조만간 한번 가봐야겠어유~', password: '34', createdAt: Date.now() - 4709884 },
                    { id: 'seed-comment-10-2', postId: 'p10', parentId: 'seed-comment-10-0', anonymousName: '계룡마니아', content: '저도 다녀와서 후기 남길게유!', password: '35', createdAt: Date.now() - 6041665 },
                    { id: 'seed-comment-11-0', postId: 'p11', parentId: null, anonymousName: '둔산입주민', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '36', createdAt: Date.now() - 1108932 },
                    { id: 'seed-comment-12-0', postId: 'p12', parentId: null, anonymousName: '은행동산책러', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '37', createdAt: Date.now() - 4338305 },
                    { id: 'seed-comment-12-1', postId: 'p12', parentId: null, anonymousName: '한밭지기', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '38', createdAt: Date.now() - 4685622 },
                    { id: 'seed-comment-13-0', postId: 'p13', parentId: null, anonymousName: '금강곰신', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '39', createdAt: Date.now() - 3581849 },
                    { id: 'seed-comment-13-1', postId: 'p13', parentId: 'seed-comment-13-0', anonymousName: '갑천나그네', content: '네넵 강추드려유~', password: '40', createdAt: Date.now() - 4484637 },
                    { id: 'seed-comment-13-2', postId: 'p13', parentId: 'seed-comment-13-0', anonymousName: '보문산초보', content: '답변 감사해유 도움 많이 됐어유.', password: '41', createdAt: Date.now() - 5821609 },
                    { id: 'seed-comment-13-3', postId: 'p13', parentId: null, anonymousName: '송촌일상러', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '42', createdAt: Date.now() - 4988822 },
                    { id: 'seed-comment-14-0', postId: 'p14', parentId: null, anonymousName: '서구방문객', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '43', createdAt: Date.now() - 4368057 },
                    { id: 'seed-comment-14-1', postId: 'p14', parentId: 'seed-comment-14-0', anonymousName: '동구맛집러', content: '답변 감사해유 도움 많이 됐어유.', password: '44', createdAt: Date.now() - 5821951 },
                    { id: 'seed-comment-15-0', postId: 'p15', parentId: null, anonymousName: '중구헌터', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '45', createdAt: Date.now() - 4083759 },
                    { id: 'seed-comment-15-1', postId: 'p15', parentId: null, anonymousName: '대전집사', content: '혹시 주차는 어렵지 않았나유?', password: '46', createdAt: Date.now() - 4700263 },
                    { id: 'seed-comment-16-0', postId: 'p16', parentId: null, anonymousName: '충남여행자', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '47', createdAt: Date.now() - 2078221 },
                    { id: 'seed-comment-17-0', postId: 'p17', parentId: null, anonymousName: '충북덕후', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '48', createdAt: Date.now() - 701192 },
                    { id: 'seed-comment-17-1', postId: 'p17', parentId: 'seed-comment-17-0', anonymousName: '유성탐방러', content: '맞아유 저도 그렇게 느꼈어유!', password: '49', createdAt: Date.now() - 1306697 },
                    { id: 'seed-comment-18-0', postId: 'p18', parentId: null, anonymousName: '공주주민', content: '저도 조만간 한번 가봐야겠어유~', password: '50', createdAt: Date.now() - 3697523 },
                    { id: 'seed-comment-18-1', postId: 'p18', parentId: 'seed-comment-18-0', anonymousName: '논산토박이', content: '오 그렇군요! 참고할게유.', password: '51', createdAt: Date.now() - 5292708 },
                    { id: 'seed-comment-18-2', postId: 'p18', parentId: null, anonymousName: '옥천마니아', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '52', createdAt: Date.now() - 4523985 },
                    { id: 'seed-comment-19-0', postId: 'p19', parentId: null, anonymousName: '계룡입주민', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '53', createdAt: Date.now() - 3891512 },
                    { id: 'seed-comment-19-1', postId: 'p19', parentId: null, anonymousName: '둔산산책러', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '54', createdAt: Date.now() - 5521713 },
                    { id: 'seed-comment-19-2', postId: 'p19', parentId: null, anonymousName: '은행동지기', content: '혹시 주차는 어렵지 않았나유?', password: '55', createdAt: Date.now() - 4773988 },
                    { id: 'seed-comment-19-3', postId: 'p19', parentId: null, anonymousName: '한밭곰신', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '56', createdAt: Date.now() - 5812634 },
                    { id: 'seed-comment-20-0', postId: 'p20', parentId: null, anonymousName: '금강나그네', content: '저도 조만간 한번 가봐야겠어유~', password: '57', createdAt: Date.now() - 3452576 },
                    { id: 'seed-comment-21-0', postId: 'p21', parentId: null, anonymousName: '갑천초보', content: '저도 조만간 한번 가봐야겠어유~', password: '58', createdAt: Date.now() - 601956 },
                    { id: 'seed-comment-22-0', postId: 'p22', parentId: null, anonymousName: '보문산일상러', content: '저도 조만간 한번 가봐야겠어유~', password: '59', createdAt: Date.now() - 3650181 },
                    { id: 'seed-comment-23-0', postId: 'p23', parentId: null, anonymousName: '송촌방문객', content: '저도 조만간 한번 가봐야겠어유~', password: '60', createdAt: Date.now() - 2344433 },
                    { id: 'seed-comment-24-0', postId: 'p24', parentId: null, anonymousName: '서구맛집러', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '61', createdAt: Date.now() - 2716091 },
                    { id: 'seed-comment-24-1', postId: 'p24', parentId: null, anonymousName: '동구헌터', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '62', createdAt: Date.now() - 3258004 },
                    { id: 'seed-comment-25-0', postId: 'p25', parentId: null, anonymousName: '중구집사', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '63', createdAt: Date.now() - 4509002 },
                    { id: 'seed-comment-25-1', postId: 'p25', parentId: 'seed-comment-25-0', anonymousName: '대전여행자', content: '맞아유 저도 그렇게 느꼈어유!', password: '64', createdAt: Date.now() - 5527561 },
                    { id: 'seed-comment-25-2', postId: 'p25', parentId: null, anonymousName: '충남덕후', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '65', createdAt: Date.now() - 8011698 },
                    { id: 'seed-comment-25-3', postId: 'p25', parentId: 'seed-comment-25-0', anonymousName: '충북탐방러', content: '네넵 강추드려유~', password: '66', createdAt: Date.now() - 8732510 },
                    { id: 'seed-comment-26-0', postId: 'p26', parentId: null, anonymousName: '유성주민', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '67', createdAt: Date.now() - 1829791 },
                    { id: 'seed-comment-26-1', postId: 'p26', parentId: null, anonymousName: '공주토박이', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '68', createdAt: Date.now() - 3237316 },
                    { id: 'seed-comment-26-2', postId: 'p26', parentId: 'seed-comment-26-0', anonymousName: '논산마니아', content: '저도 다녀와서 후기 남길게유!', password: '69', createdAt: Date.now() - 4604105 },
                    { id: 'seed-comment-27-0', postId: 'p27', parentId: null, anonymousName: '옥천입주민', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '70', createdAt: Date.now() - 2001250 },
                    { id: 'seed-comment-27-1', postId: 'p27', parentId: null, anonymousName: '계룡산책러', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '71', createdAt: Date.now() - 3355482 },
                    { id: 'seed-comment-27-2', postId: 'p27', parentId: 'seed-comment-27-0', anonymousName: '둔산지기', content: '오 그렇군요! 참고할게유.', password: '72', createdAt: Date.now() - 3419750 },
                    { id: 'seed-comment-28-0', postId: 'p28', parentId: null, anonymousName: '은행동곰신', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '73', createdAt: Date.now() - 3961184 },
                    { id: 'seed-comment-28-1', postId: 'p28', parentId: 'seed-comment-28-0', anonymousName: '한밭나그네', content: '저도 다녀와서 후기 남길게유!', password: '74', createdAt: Date.now() - 4321959 },
                    { id: 'seed-comment-29-0', postId: 'p29', parentId: null, anonymousName: '금강초보', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '75', createdAt: Date.now() - 2943932 },
                    { id: 'seed-comment-30-0', postId: 'p30', parentId: null, anonymousName: '갑천일상러', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '76', createdAt: Date.now() - 3488037 },
                    { id: 'seed-comment-30-1', postId: 'p30', parentId: null, anonymousName: '보문산방문객', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '77', createdAt: Date.now() - 3956937 },
                    { id: 'seed-comment-31-0', postId: 'p31', parentId: null, anonymousName: '송촌맛집러', content: '혹시 주차는 어렵지 않았나유?', password: '78', createdAt: Date.now() - 1456956 },
                    { id: 'seed-comment-31-1', postId: 'p31', parentId: 'seed-comment-31-0', anonymousName: '서구헌터', content: '답변 감사해유 도움 많이 됐어유.', password: '79', createdAt: Date.now() - 3065718 },
                    { id: 'seed-comment-32-0', postId: 'p32', parentId: null, anonymousName: '동구집사', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '80', createdAt: Date.now() - 4622114 },
                    { id: 'seed-comment-33-0', postId: 'p33', parentId: null, anonymousName: '중구여행자', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '81', createdAt: Date.now() - 1311173 },
                    { id: 'seed-comment-33-1', postId: 'p33', parentId: 'seed-comment-33-0', anonymousName: '대전덕후', content: '네넵 강추드려유~', password: '82', createdAt: Date.now() - 2613680 },
                    { id: 'seed-comment-33-2', postId: 'p33', parentId: null, anonymousName: '충남탐방러', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '83', createdAt: Date.now() - 4578087 },
                    { id: 'seed-comment-34-0', postId: 'p34', parentId: null, anonymousName: '충북주민', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '84', createdAt: Date.now() - 1327710 },
                    { id: 'seed-comment-34-1', postId: 'p34', parentId: null, anonymousName: '유성토박이', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '85', createdAt: Date.now() - 1805798 },
                    { id: 'seed-comment-34-2', postId: 'p34', parentId: null, anonymousName: '공주마니아', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '86', createdAt: Date.now() - 2460546 },
                    { id: 'seed-comment-35-0', postId: 'p35', parentId: null, anonymousName: '논산입주민', content: '저도 조만간 한번 가봐야겠어유~', password: '87', createdAt: Date.now() - 1867943 },
                    { id: 'seed-comment-36-0', postId: 'p36', parentId: null, anonymousName: '옥천산책러', content: '정보 감사해유 다음 주말에 가볼게유.', password: '88', createdAt: Date.now() - 4579194 },
                    { id: 'seed-comment-36-1', postId: 'p36', parentId: 'seed-comment-36-0', anonymousName: '계룡지기', content: '맞아유 저도 그렇게 느꼈어유!', password: '89', createdAt: Date.now() - 4909063 },
                    { id: 'seed-comment-37-0', postId: 'p37', parentId: null, anonymousName: '둔산곰신', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '90', createdAt: Date.now() - 1768119 },
                    { id: 'seed-comment-38-0', postId: 'p38', parentId: null, anonymousName: '은행동나그네', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '91', createdAt: Date.now() - 834828 },
                    { id: 'seed-comment-38-1', postId: 'p38', parentId: 'seed-comment-38-0', anonymousName: '한밭초보', content: '오 그렇군요! 참고할게유.', password: '92', createdAt: Date.now() - 1818477 },
                    { id: 'seed-comment-39-0', postId: 'p39', parentId: null, anonymousName: '금강일상러', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '93', createdAt: Date.now() - 4114932 },
                    { id: 'seed-comment-39-1', postId: 'p39', parentId: 'seed-comment-39-0', anonymousName: '갑천방문객', content: '답변 감사해유 도움 많이 됐어유.', password: '94', createdAt: Date.now() - 5804242 },
                    { id: 'seed-comment-40-0', postId: 'p40', parentId: null, anonymousName: '보문산맛집러', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '95', createdAt: Date.now() - 4808136 },
                    { id: 'seed-comment-40-1', postId: 'p40', parentId: 'seed-comment-40-0', anonymousName: '송촌헌터', content: '답변 감사해유 도움 많이 됐어유.', password: '96', createdAt: Date.now() - 5492141 },
                    { id: 'seed-comment-40-2', postId: 'p40', parentId: null, anonymousName: '서구집사', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '97', createdAt: Date.now() - 6036452 },
                    { id: 'seed-comment-41-0', postId: 'p41', parentId: null, anonymousName: '동구여행자', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '98', createdAt: Date.now() - 1787482 },
                    { id: 'seed-comment-41-1', postId: 'p41', parentId: null, anonymousName: '중구덕후', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '10', createdAt: Date.now() - 2216992 },
                    { id: 'seed-comment-42-0', postId: 'p42', parentId: null, anonymousName: '대전탐방러', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '11', createdAt: Date.now() - 4948224 },
                    { id: 'seed-comment-42-1', postId: 'p42', parentId: null, anonymousName: '충남주민', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '12', createdAt: Date.now() - 5470751 },
                    { id: 'seed-comment-42-2', postId: 'p42', parentId: null, anonymousName: '충북토박이', content: '오 저도 여기 가보고 싶었는디 후기 감사해유!', password: '13', createdAt: Date.now() - 6590484 },
                    { id: 'seed-comment-43-0', postId: 'p43', parentId: null, anonymousName: '유성마니아', content: '오 저도 여기 가보고 싶었는디 후기 감사해유!', password: '14', createdAt: Date.now() - 2922948 },
                    { id: 'seed-comment-43-1', postId: 'p43', parentId: null, anonymousName: '공주입주민', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '15', createdAt: Date.now() - 3281386 },
                    { id: 'seed-comment-44-0', postId: 'p44', parentId: null, anonymousName: '논산산책러', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '16', createdAt: Date.now() - 4318237 },
                    { id: 'seed-comment-45-0', postId: 'p45', parentId: null, anonymousName: '옥천지기', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '17', createdAt: Date.now() - 2925200 },
                    { id: 'seed-comment-45-1', postId: 'p45', parentId: null, anonymousName: '계룡곰신', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '18', createdAt: Date.now() - 4290032 },
                    { id: 'seed-comment-46-0', postId: 'p46', parentId: null, anonymousName: '둔산나그네', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '19', createdAt: Date.now() - 4989000 },
                    { id: 'seed-comment-46-1', postId: 'p46', parentId: null, anonymousName: '은행동초보', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '20', createdAt: Date.now() - 5713858 },
                    { id: 'seed-comment-47-0', postId: 'p47', parentId: null, anonymousName: '한밭일상러', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '21', createdAt: Date.now() - 1750367 },
                    { id: 'seed-comment-47-1', postId: 'p47', parentId: null, anonymousName: '금강방문객', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '22', createdAt: Date.now() - 2202507 },
                    { id: 'seed-comment-47-2', postId: 'p47', parentId: null, anonymousName: '갑천맛집러', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '23', createdAt: Date.now() - 2657057 },
                    { id: 'seed-comment-47-3', postId: 'p47', parentId: 'seed-comment-47-1', anonymousName: '보문산헌터', content: '맞아유 저도 그렇게 느꼈어유!', password: '24', createdAt: Date.now() - 3622061 },
                    { id: 'seed-comment-48-0', postId: 'p48', parentId: null, anonymousName: '송촌집사', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '25', createdAt: Date.now() - 1799394 },
                    { id: 'seed-comment-48-1', postId: 'p48', parentId: null, anonymousName: '서구여행자', content: '혹시 주차는 어렵지 않았나유?', password: '26', createdAt: Date.now() - 2296789 },
                    { id: 'seed-comment-48-2', postId: 'p48', parentId: null, anonymousName: '동구덕후', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '27', createdAt: Date.now() - 3082206 },
                    { id: 'seed-comment-49-0', postId: 'p49', parentId: null, anonymousName: '중구탐방러', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '28', createdAt: Date.now() - 1954475 },
                    { id: 'seed-comment-49-1', postId: 'p49', parentId: null, anonymousName: '대전주민', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '29', createdAt: Date.now() - 2965653 },
                    { id: 'seed-comment-50-0', postId: 'p50', parentId: null, anonymousName: '충남토박이', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '30', createdAt: Date.now() - 2242025 },
                    { id: 'seed-comment-50-1', postId: 'p50', parentId: 'seed-comment-50-0', anonymousName: '충북마니아', content: '맞아유 저도 그렇게 느꼈어유!', password: '31', createdAt: Date.now() - 3250819 },
                    { id: 'seed-comment-50-2', postId: 'p50', parentId: null, anonymousName: '유성입주민', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '32', createdAt: Date.now() - 5791255 },
                    { id: 'seed-comment-51-0', postId: 'p51', parentId: null, anonymousName: '공주산책러', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '33', createdAt: Date.now() - 3824115 },
                    { id: 'seed-comment-52-0', postId: 'p52', parentId: null, anonymousName: '논산지기', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '34', createdAt: Date.now() - 4897167 },
                    { id: 'seed-comment-52-1', postId: 'p52', parentId: null, anonymousName: '옥천곰신', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '35', createdAt: Date.now() - 5676479 },
                    { id: 'seed-comment-53-0', postId: 'p53', parentId: null, anonymousName: '계룡나그네', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '36', createdAt: Date.now() - 1305157 },
                    { id: 'seed-comment-54-0', postId: 'p54', parentId: null, anonymousName: '둔산초보', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '37', createdAt: Date.now() - 2122963 },
                    { id: 'seed-comment-55-0', postId: 'p55', parentId: null, anonymousName: '은행동일상러', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '38', createdAt: Date.now() - 2769369 },
                    { id: 'seed-comment-55-1', postId: 'p55', parentId: null, anonymousName: '한밭방문객', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '39', createdAt: Date.now() - 4265993 },
                    { id: 'seed-comment-55-2', postId: 'p55', parentId: null, anonymousName: '금강맛집러', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '40', createdAt: Date.now() - 3744599 },
                    { id: 'seed-comment-56-0', postId: 'p56', parentId: null, anonymousName: '갑천헌터', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '41', createdAt: Date.now() - 1082567 },
                    { id: 'seed-comment-56-1', postId: 'p56', parentId: 'seed-comment-56-0', anonymousName: '보문산집사', content: '저도 다녀와서 후기 남길게유!', password: '42', createdAt: Date.now() - 1417865 },
                    { id: 'seed-comment-57-0', postId: 'p57', parentId: null, anonymousName: '송촌여행자', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '43', createdAt: Date.now() - 2785667 },
                    { id: 'seed-comment-58-0', postId: 'p58', parentId: null, anonymousName: '서구덕후', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '44', createdAt: Date.now() - 1158870 },
                    { id: 'seed-comment-58-1', postId: 'p58', parentId: null, anonymousName: '동구탐방러', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '45', createdAt: Date.now() - 2618729 },
                    { id: 'seed-comment-59-0', postId: 'p59', parentId: null, anonymousName: '중구주민', content: '저도 조만간 한번 가봐야겠어유~', password: '46', createdAt: Date.now() - 2846970 },
                    { id: 'seed-comment-59-1', postId: 'p59', parentId: 'seed-comment-59-0', anonymousName: '대전토박이', content: '맞아유 저도 그렇게 느꼈어유!', password: '47', createdAt: Date.now() - 3485553 },
                    { id: 'seed-comment-59-2', postId: 'p59', parentId: 'seed-comment-59-0', anonymousName: '충남마니아', content: '네넵 강추드려유~', password: '48', createdAt: Date.now() - 4755560 },
                    { id: 'seed-comment-60-0', postId: 'p60', parentId: null, anonymousName: '충북입주민', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '49', createdAt: Date.now() - 2326975 },
                    { id: 'seed-comment-60-1', postId: 'p60', parentId: null, anonymousName: '유성산책러', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '50', createdAt: Date.now() - 3194301 },
                    { id: 'seed-comment-61-0', postId: 'p61', parentId: null, anonymousName: '공주지기', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '51', createdAt: Date.now() - 752363 },
                    { id: 'seed-comment-61-1', postId: 'p61', parentId: 'seed-comment-61-0', anonymousName: '논산곰신', content: '오 그렇군요! 참고할게유.', password: '52', createdAt: Date.now() - 2048008 },
                    { id: 'seed-comment-61-2', postId: 'p61', parentId: 'seed-comment-61-0', anonymousName: '옥천나그네', content: '맞아유 저도 그렇게 느꼈어유!', password: '53', createdAt: Date.now() - 4113557 },
                    { id: 'seed-comment-62-0', postId: 'p62', parentId: null, anonymousName: '계룡초보', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '54', createdAt: Date.now() - 4752374 },
                    { id: 'seed-comment-62-1', postId: 'p62', parentId: null, anonymousName: '둔산일상러', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '55', createdAt: Date.now() - 6494672 },
                    { id: 'seed-comment-62-2', postId: 'p62', parentId: 'seed-comment-62-0', anonymousName: '은행동방문객', content: '저도 다녀와서 후기 남길게유!', password: '56', createdAt: Date.now() - 6185464 },
                    { id: 'seed-comment-63-0', postId: 'p63', parentId: null, anonymousName: '한밭맛집러', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '57', createdAt: Date.now() - 3994850 },
                    { id: 'seed-comment-63-1', postId: 'p63', parentId: null, anonymousName: '금강헌터', content: '오 저도 여기 가보고 싶었는디 후기 감사해유!', password: '58', createdAt: Date.now() - 4443166 },
                    { id: 'seed-comment-64-0', postId: 'p64', parentId: null, anonymousName: '갑천집사', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '59', createdAt: Date.now() - 4213314 },
                    { id: 'seed-comment-64-1', postId: 'p64', parentId: 'seed-comment-64-0', anonymousName: '보문산여행자', content: '오 그렇군요! 참고할게유.', password: '60', createdAt: Date.now() - 5919545 },
                    { id: 'seed-comment-65-0', postId: 'p65', parentId: null, anonymousName: '송촌덕후', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '61', createdAt: Date.now() - 2631829 },
                    { id: 'seed-comment-65-1', postId: 'p65', parentId: 'seed-comment-65-0', anonymousName: '서구탐방러', content: '네넵 강추드려유~', password: '62', createdAt: Date.now() - 3496039 },
                    { id: 'seed-comment-66-0', postId: 'p66', parentId: null, anonymousName: '동구주민', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '63', createdAt: Date.now() - 630389 },
                    { id: 'seed-comment-66-1', postId: 'p66', parentId: null, anonymousName: '중구토박이', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '64', createdAt: Date.now() - 1608888 },
                    { id: 'seed-comment-66-2', postId: 'p66', parentId: 'seed-comment-66-1', anonymousName: '대전마니아', content: '네넵 강추드려유~', password: '65', createdAt: Date.now() - 2726009 },
                    { id: 'seed-comment-66-3', postId: 'p66', parentId: 'seed-comment-66-1', anonymousName: '충남입주민', content: '답변 감사해유 도움 많이 됐어유.', password: '66', createdAt: Date.now() - 2058182 },
                    { id: 'seed-comment-67-0', postId: 'p67', parentId: null, anonymousName: '충북산책러', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '67', createdAt: Date.now() - 2939824 },
                    { id: 'seed-comment-67-1', postId: 'p67', parentId: 'seed-comment-67-0', anonymousName: '유성지기', content: '맞아유 저도 그렇게 느꼈어유!', password: '68', createdAt: Date.now() - 3793825 },
                    { id: 'seed-comment-67-2', postId: 'p67', parentId: null, anonymousName: '공주곰신', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '69', createdAt: Date.now() - 5215494 },
                    { id: 'seed-comment-67-3', postId: 'p67', parentId: null, anonymousName: '논산나그네', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '70', createdAt: Date.now() - 3981343 },
                    { id: 'seed-comment-68-0', postId: 'p68', parentId: null, anonymousName: '옥천초보', content: '정보 감사해유 다음 주말에 가볼게유.', password: '71', createdAt: Date.now() - 3152188 },
                    { id: 'seed-comment-68-1', postId: 'p68', parentId: 'seed-comment-68-0', anonymousName: '계룡일상러', content: '오 그렇군요! 참고할게유.', password: '72', createdAt: Date.now() - 4269063 },
                    { id: 'seed-comment-69-0', postId: 'p69', parentId: null, anonymousName: '둔산방문객', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '73', createdAt: Date.now() - 4745572 },
                    { id: 'seed-comment-69-1', postId: 'p69', parentId: null, anonymousName: '은행동맛집러', content: '정보 감사해유 다음 주말에 가볼게유.', password: '74', createdAt: Date.now() - 5349139 },
                    { id: 'seed-comment-69-2', postId: 'p69', parentId: 'seed-comment-69-1', anonymousName: '한밭헌터', content: '오 그렇군요! 참고할게유.', password: '75', createdAt: Date.now() - 5929870 },
                    { id: 'seed-comment-70-0', postId: 'p70', parentId: null, anonymousName: '금강집사', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '76', createdAt: Date.now() - 2528882 },
                    { id: 'seed-comment-71-0', postId: 'p71', parentId: null, anonymousName: '갑천여행자', content: '정보 감사해유 다음 주말에 가볼게유.', password: '77', createdAt: Date.now() - 1716466 },
                    { id: 'seed-comment-72-0', postId: 'p72', parentId: null, anonymousName: '보문산덕후', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '78', createdAt: Date.now() - 3759302 },
                    { id: 'seed-comment-73-0', postId: 'p73', parentId: null, anonymousName: '송촌탐방러', content: '정보 감사해유 다음 주말에 가볼게유.', password: '79', createdAt: Date.now() - 758047 },
                    { id: 'seed-comment-74-0', postId: 'p74', parentId: null, anonymousName: '서구주민', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '80', createdAt: Date.now() - 4704498 },
                    { id: 'seed-comment-74-1', postId: 'p74', parentId: null, anonymousName: '동구토박이', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '81', createdAt: Date.now() - 6059304 },
                    { id: 'seed-comment-75-0', postId: 'p75', parentId: null, anonymousName: '중구마니아', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '82', createdAt: Date.now() - 1154070 },
                    { id: 'seed-comment-76-0', postId: 'p76', parentId: null, anonymousName: '대전입주민', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '83', createdAt: Date.now() - 1224531 },
                    { id: 'seed-comment-76-1', postId: 'p76', parentId: 'seed-comment-76-0', anonymousName: '충남산책러', content: '네넵 강추드려유~', password: '84', createdAt: Date.now() - 2887537 },
                    { id: 'seed-comment-77-0', postId: 'p77', parentId: null, anonymousName: '충북지기', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '85', createdAt: Date.now() - 4743542 },
                    { id: 'seed-comment-77-1', postId: 'p77', parentId: 'seed-comment-77-0', anonymousName: '유성곰신', content: '맞아유 저도 그렇게 느꼈어유!', password: '86', createdAt: Date.now() - 6337430 },
                    { id: 'seed-comment-77-2', postId: 'p77', parentId: null, anonymousName: '공주나그네', content: '혹시 주차는 어렵지 않았나유?', password: '87', createdAt: Date.now() - 5668482 },
                    { id: 'seed-comment-77-3', postId: 'p77', parentId: null, anonymousName: '논산초보', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '88', createdAt: Date.now() - 7241195 },
                    { id: 'seed-comment-78-0', postId: 'p78', parentId: null, anonymousName: '옥천일상러', content: '오 저도 여기 가보고 싶었는디 후기 감사해유!', password: '89', createdAt: Date.now() - 1719384 },
                    { id: 'seed-comment-78-1', postId: 'p78', parentId: 'seed-comment-78-0', anonymousName: '계룡방문객', content: '맞아유 저도 그렇게 느꼈어유!', password: '90', createdAt: Date.now() - 3471001 },
                    { id: 'seed-comment-79-0', postId: 'p79', parentId: null, anonymousName: '둔산맛집러', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '91', createdAt: Date.now() - 4707182 },
                    { id: 'seed-comment-79-1', postId: 'p79', parentId: null, anonymousName: '은행동헌터', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '92', createdAt: Date.now() - 5984240 },
                    { id: 'seed-comment-80-0', postId: 'p80', parentId: null, anonymousName: '한밭집사', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '93', createdAt: Date.now() - 1594074 },
                    { id: 'seed-comment-80-1', postId: 'p80', parentId: 'seed-comment-80-0', anonymousName: '금강여행자', content: '답변 감사해유 도움 많이 됐어유.', password: '94', createdAt: Date.now() - 1930783 },
                    { id: 'seed-comment-80-2', postId: 'p80', parentId: 'seed-comment-80-0', anonymousName: '갑천덕후', content: '오 그렇군요! 참고할게유.', password: '95', createdAt: Date.now() - 4079206 },
                    { id: 'seed-comment-80-3', postId: 'p80', parentId: null, anonymousName: '보문산탐방러', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '96', createdAt: Date.now() - 3814254 },
                    { id: 'seed-comment-81-0', postId: 'p81', parentId: null, anonymousName: '송촌주민', content: '저도 조만간 한번 가봐야겠어유~', password: '97', createdAt: Date.now() - 1225898 },
                    { id: 'seed-comment-81-1', postId: 'p81', parentId: 'seed-comment-81-0', anonymousName: '서구토박이', content: '저도 다녀와서 후기 남길게유!', password: '98', createdAt: Date.now() - 1803990 },
                    { id: 'seed-comment-82-0', postId: 'p82', parentId: null, anonymousName: '동구마니아', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '10', createdAt: Date.now() - 1545207 },
                    { id: 'seed-comment-82-1', postId: 'p82', parentId: 'seed-comment-82-0', anonymousName: '중구입주민', content: '답변 감사해유 도움 많이 됐어유.', password: '11', createdAt: Date.now() - 1897288 },
                    { id: 'seed-comment-83-0', postId: 'p83', parentId: null, anonymousName: '대전산책러', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '12', createdAt: Date.now() - 630119 },
                    { id: 'seed-comment-83-1', postId: 'p83', parentId: null, anonymousName: '충남지기', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '13', createdAt: Date.now() - 1225203 },
                    { id: 'seed-comment-84-0', postId: 'p84', parentId: null, anonymousName: '충북곰신', content: '평일에 가는 게 낫겠네유 알려주셔서 감사해유.', password: '14', createdAt: Date.now() - 3485346 },
                    { id: 'seed-comment-84-1', postId: 'p84', parentId: 'seed-comment-84-0', anonymousName: '유성나그네', content: '맞아유 저도 그렇게 느꼈어유!', password: '15', createdAt: Date.now() - 4465971 },
                    { id: 'seed-comment-84-2', postId: 'p84', parentId: null, anonymousName: '공주초보', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '16', createdAt: Date.now() - 5755766 },
                    { id: 'seed-comment-85-0', postId: 'p85', parentId: null, anonymousName: '논산일상러', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '17', createdAt: Date.now() - 2241995 },
                    { id: 'seed-comment-86-0', postId: 'p86', parentId: null, anonymousName: '옥천방문객', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '18', createdAt: Date.now() - 2724098 },
                    { id: 'seed-comment-86-1', postId: 'p86', parentId: null, anonymousName: '계룡맛집러', content: '계절마다 느낌 다르다니 다시 가고 싶어지네유.', password: '19', createdAt: Date.now() - 4259691 },
                    { id: 'seed-comment-87-0', postId: 'p87', parentId: null, anonymousName: '둔산헌터', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '20', createdAt: Date.now() - 3625849 },
                    { id: 'seed-comment-88-0', postId: 'p88', parentId: null, anonymousName: '은행동집사', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '21', createdAt: Date.now() - 1004902 },
                    { id: 'seed-comment-88-1', postId: 'p88', parentId: 'seed-comment-88-0', anonymousName: '한밭여행자', content: '네넵 강추드려유~', password: '22', createdAt: Date.now() - 1827773 },
                    { id: 'seed-comment-89-0', postId: 'p89', parentId: null, anonymousName: '금강덕후', content: '근처에 맛집도 같이 다녀오면 딱이겠네유.', password: '23', createdAt: Date.now() - 4259452 },
                    { id: 'seed-comment-89-1', postId: 'p89', parentId: 'seed-comment-89-0', anonymousName: '갑천탐방러', content: '답변 감사해유 도움 많이 됐어유.', password: '24', createdAt: Date.now() - 4620293 },
                    { id: 'seed-comment-90-0', postId: 'p90', parentId: null, anonymousName: '보문산주민', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '25', createdAt: Date.now() - 2306543 },
                    { id: 'seed-comment-90-1', postId: 'p90', parentId: 'seed-comment-90-0', anonymousName: '송촌토박이', content: '답변 감사해유 도움 많이 됐어유.', password: '26', createdAt: Date.now() - 3896111 },
                    { id: 'seed-comment-90-2', postId: 'p90', parentId: null, anonymousName: '서구마니아', content: '정보 감사해유 다음 주말에 가볼게유.', password: '27', createdAt: Date.now() - 4106987 },
                    { id: 'seed-comment-91-0', postId: 'p91', parentId: null, anonymousName: '동구입주민', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '28', createdAt: Date.now() - 1010848 },
                    { id: 'seed-comment-91-1', postId: 'p91', parentId: 'seed-comment-91-0', anonymousName: '중구산책러', content: '답변 감사해유 도움 많이 됐어유.', password: '29', createdAt: Date.now() - 2031561 },
                    { id: 'seed-comment-91-2', postId: 'p91', parentId: 'seed-comment-91-0', anonymousName: '대전지기', content: '저도 다녀와서 후기 남길게유!', password: '30', createdAt: Date.now() - 3314612 },
                    { id: 'seed-comment-91-3', postId: 'p91', parentId: null, anonymousName: '충남곰신', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '31', createdAt: Date.now() - 4950766 },
                    { id: 'seed-comment-92-0', postId: 'p92', parentId: null, anonymousName: '충북나그네', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '32', createdAt: Date.now() - 1604473 },
                    { id: 'seed-comment-92-1', postId: 'p92', parentId: 'seed-comment-92-0', anonymousName: '유성초보', content: '오 그렇군요! 참고할게유.', password: '33', createdAt: Date.now() - 2946916 },
                    { id: 'seed-comment-92-2', postId: 'p92', parentId: null, anonymousName: '공주일상러', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '34', createdAt: Date.now() - 3600481 },
                    { id: 'seed-comment-93-0', postId: 'p93', parentId: null, anonymousName: '논산방문객', content: '저번에 가봤는디 진짜 좋더라구유 공감해유.', password: '35', createdAt: Date.now() - 4185484 },
                    { id: 'seed-comment-93-1', postId: 'p93', parentId: 'seed-comment-93-0', anonymousName: '옥천맛집러', content: '네넵 강추드려유~', password: '36', createdAt: Date.now() - 5202616 },
                    { id: 'seed-comment-93-2', postId: 'p93', parentId: null, anonymousName: '계룡헌터', content: '저는 아이랑 같이 가봤는디 괜찮았어유.', password: '37', createdAt: Date.now() - 5788452 },
                    { id: 'seed-comment-93-3', postId: 'p93', parentId: null, anonymousName: '둔산집사', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '38', createdAt: Date.now() - 8669206 },
                    { id: 'seed-comment-94-0', postId: 'p94', parentId: null, anonymousName: '은행동여행자', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '39', createdAt: Date.now() - 768457 },
                    { id: 'seed-comment-94-1', postId: 'p94', parentId: null, anonymousName: '한밭덕후', content: '여기 완전 숨은 명소 맞는 것 같아유.', password: '40', createdAt: Date.now() - 2167717 },
                    { id: 'seed-comment-95-0', postId: 'p95', parentId: null, anonymousName: '금강탐방러', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '41', createdAt: Date.now() - 3761379 },
                    { id: 'seed-comment-95-1', postId: 'p95', parentId: null, anonymousName: '갑천주민', content: '이 글 보고 바로 다녀왔는디 진짜 좋았어유!', password: '42', createdAt: Date.now() - 4643372 },
                    { id: 'seed-comment-96-0', postId: 'p96', parentId: null, anonymousName: '보문산토박이', content: '정보 감사해유 다음 주말에 가볼게유.', password: '43', createdAt: Date.now() - 1655905 },
                    { id: 'seed-comment-96-1', postId: 'p96', parentId: null, anonymousName: '송촌마니아', content: '반려동물이랑 가도 되는지 궁금했는디 도움 됐어유.', password: '44', createdAt: Date.now() - 2408812 },
                    { id: 'seed-comment-96-2', postId: 'p96', parentId: 'seed-comment-96-0', anonymousName: '서구입주민', content: '답변 감사해유 도움 많이 됐어유.', password: '45', createdAt: Date.now() - 3932607 },
                    { id: 'seed-comment-97-0', postId: 'p97', parentId: null, anonymousName: '동구산책러', content: '사진 보니까 저도 다녀오고 싶어지네유.', password: '46', createdAt: Date.now() - 4222508 },
                    { id: 'seed-comment-97-1', postId: 'p97', parentId: 'seed-comment-97-0', anonymousName: '중구지기', content: '답변 감사해유 도움 많이 됐어유.', password: '47', createdAt: Date.now() - 5753906 },
                    { id: 'seed-comment-97-2', postId: 'p97', parentId: null, anonymousName: '대전곰신', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '48', createdAt: Date.now() - 6464666 },
                    { id: 'seed-comment-97-3', postId: 'p97', parentId: null, anonymousName: '충남나그네', content: '이 글 저장 완료! 좋은 정보 감사해유.', password: '49', createdAt: Date.now() - 8443523 },
                    { id: 'seed-comment-98-0', postId: 'p98', parentId: null, anonymousName: '충북초보', content: '혹시 주차는 어렵지 않았나유?', password: '50', createdAt: Date.now() - 4366069 },
                    { id: 'seed-comment-98-1', postId: 'p98', parentId: 'seed-comment-98-0', anonymousName: '유성일상러', content: '오 그렇군요! 참고할게유.', password: '51', createdAt: Date.now() - 6096484 },
                    { id: 'seed-comment-98-2', postId: 'p98', parentId: 'seed-comment-98-0', anonymousName: '공주방문객', content: '맞아유 저도 그렇게 느꼈어유!', password: '52', createdAt: Date.now() - 7279231 },
                    { id: 'seed-comment-98-3', postId: 'p98', parentId: null, anonymousName: '논산맛집러', content: '오 저도 여기 가보고 싶었는디 후기 감사해유!', password: '53', createdAt: Date.now() - 6056599 },
                    { id: 'seed-comment-99-0', postId: 'p99', parentId: null, anonymousName: '옥천헌터', content: '정보 감사해유 다음 주말에 가볼게유.', password: '54', createdAt: Date.now() - 915342 },
                    { id: 'seed-comment-99-1', postId: 'p99', parentId: 'seed-comment-99-0', anonymousName: '계룡집사', content: '저도 다녀와서 후기 남길게유!', password: '55', createdAt: Date.now() - 2323169 },
                    { id: 'seed-comment-100-0', postId: 'p100', parentId: null, anonymousName: '둔산여행자', content: '이거 완전 꿀팁이네유 저장해갈게유~', password: '56', createdAt: Date.now() - 1540637 },
                    { id: 'seed-comment-100-1', postId: 'p100', parentId: 'seed-comment-100-0', anonymousName: '은행동덕후', content: '답변 감사해유 도움 많이 됐어유.', password: '57', createdAt: Date.now() - 2387745 },
                    { id: 'seed-comment-100-2', postId: 'p100', parentId: 'seed-comment-100-0', anonymousName: '한밭탐방러', content: '맞아유 저도 그렇게 느꼈어유!', password: '58', createdAt: Date.now() - 4394975 }
                ];
                // 댓글 시드 버전 - DEFAULT_COMMENTS를 새로 갱신할 때마다 값을 바꿔주면
                // 브라우저에 저장된 예전 캐시 대신 최신 예시 댓글이 다시 반영돼유.
                const COMMENTS_SEED_VERSION = 'v1-100posts-comments';

                const loadComments = () => {
                    const storedVersion = localStorage.getItem('localhub_comments_seed_version');
                    const stored = localStorage.getItem('localhub_comments');
                    if (stored && storedVersion === COMMENTS_SEED_VERSION) {
                        try {
                            comments.value = JSON.parse(stored);
                        } catch (err) {
                            comments.value = DEFAULT_COMMENTS;
                        }
                    } else {
                        comments.value = DEFAULT_COMMENTS;
                        localStorage.setItem('localhub_comments', JSON.stringify(comments.value));
                        localStorage.setItem('localhub_comments_seed_version', COMMENTS_SEED_VERSION);
                    }
                };
                const persistComments = () => localStorage.setItem('localhub_comments', JSON.stringify(comments.value));
                const selectedPostComments = computed(() => selectedPost.value ? comments.value.filter(c=>c.postId===selectedPost.value.id) : []);
                const rootComments = computed(() => selectedPostComments.value.filter(c=>!c.parentId).sort((a,b)=>a.createdAt-b.createdAt));
                const childComments = parentId => selectedPostComments.value.filter(c=>c.parentId===parentId).sort((a,b)=>a.createdAt-b.createdAt);
                const getPostCommentCount = postId => comments.value.filter(c=>c.postId===postId).length;
                const submitComment = () => {
                    if (!selectedPost.value || !newComment.content.trim() || newComment.password.length < 4) { showToast('댓글 내용과 4자 이상의 삭제 비밀번호를 입력해주셔유.'); return; }
                    const seq = selectedPostComments.value.length + 1;
                    comments.value.push({id:'comment-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),postId:selectedPost.value.id,parentId:replyTarget.value?.id||null,anonymousName:newComment.author.trim()||`익명${seq}`,content:newComment.content.trim(),password:newComment.password,createdAt:Date.now()});
                    persistComments(); newComment.author=''; newComment.password=''; newComment.content=''; replyTarget.value=null; showToast('익명 댓글이 등록됐어유.');
                };
                const startReply = comment => { replyTarget.value=comment; newComment.content=''; nextTick(()=>document.querySelector('textarea[placeholder="익명으로 댓글을 남겨보셔유."]')?.focus()); };
                const cancelReply = () => { replyTarget.value=null; };
                const requestDeleteComment = comment => { const pw=window.prompt('댓글 작성 시 입력한 삭제 비밀번호를 입력해주셔유.'); if(pw===null)return; if(pw!==comment.password){showToast('댓글 비밀번호가 일치하지 않아유.');return;} const ids=[comment.id,...comments.value.filter(c=>c.parentId===comment.id).map(c=>c.id)]; comments.value=comments.value.filter(c=>!ids.includes(c.id)); persistComments(); if(replyTarget.value?.id===comment.id)replyTarget.value=null; showToast('댓글이 삭제됐어유.'); };

                const chatbotOpen = ref(false);
                const chatInput = ref('');
                const chatHistory = ref([
                    { id: 'w1', role: 'assistant', text: "반가워유! 대전/충청 공식 로컬 스마트 도우미 '충청봇'이유. \n우리 고장 관광공사에서 엄선한 관광 명소나 맛집 주차 정보, 그리고 새롭게 추가된 스마트 축제 캘린더 등 궁금한 건 언제든 편하게 물어보셔유! 아주 친절히 답해드릴팅게유~ 😊" }
                ]);
                const loadingChat = ref(false);
                const recommendedQuestions = [
                    "이번 8월에 대전 대표축제가 머여유?",
                    "성심당 튀소 보관 어떻게 해유?",
                    "공산성 근처 백제축제는 언제 열려유?",
                    "대전오월드 놀이시설 어떤 게 있어유?"
                ];

                // ============ OpenAI API 키 사용자 입력 관리 ============
                // 코드에 키를 박아두지 않고, 사용자가 직접 입력한 값을 브라우저에만 저장해유.
                const userApiKey = ref('server-env');
                const apiKeyInputValue = ref('');
                const showApiKeySettings = ref(false);

                const openApiKeySettings = () => {
                    apiKeyInputValue.value = '';
                    showApiKeySettings.value = true;
                };

                const saveApiKey = () => {
                    showToast('OpenAI 키는 프로젝트 루트의 .env 파일에서 관리해유.');
                    showApiKeySettings.value = false;
                };

                const clearApiKey = () => {
                    showToast('OpenAI 키를 변경하려면 .env 파일을 수정한 뒤 서버를 다시 실행해유.');
                };

                const toggleChatbot = () => {
                    chatbotOpen.value = !chatbotOpen.value;
                    if (chatbotOpen.value) {
                        nextTick(() => {
                            scrollToBottom();
                        });
                    }
                };

                const scrollToBottom = () => {
                    const container = document.getElementById('chat-messages-container');
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                };

                const askBot = (question) => {
                    chatInput.value = question;
                    sendChat();
                };

                const sendChat = async () => {
                    if (!chatInput.value.trim() || loadingChat.value) return;

                    const userMsgText = chatInput.value;
                    chatHistory.value.push({
                        id: 'chat-' + Date.now(),
                        role: 'user',
                        text: userMsgText
                    });
                    chatInput.value = '';
                    loadingChat.value = true;
                    
                    nextTick(() => scrollToBottom());

                    const systemInstructions = `당신은 대한민국 대전광역시, 충청북도, 충청남도 로컬 여행 가이드이자 활기찬 지역민 가이드인 '충청봇'입니다.
질문에 정겨운 충청도 특유의 '유' 어투를 가미해서 구수하고 유쾌하게 대답해주세요. (예: "아따 거긴 가볼만해유~").
사용자가 장소, 주차장, 저작권, 혹은 특히 축제 캘린더 일정(8월 대전0시축제, 9~10월 공주 백제문화제, 10월 금산인삼축제 등)을 물어보면 구체적인 날짜 정보를 매핑하여 최고의 꿀팁을 주셔유.`;

                    // OpenAI Chat Completions 메시지 포맷으로 변환 (system + 대화 이력)
                    const chatHistoryPayload = chatHistory.value.map(c => ({
                        role: c.role === 'user' ? 'user' : 'assistant',
                        content: c.text
                    }));

                    try {
                        if (!userApiKey.value) {
                            throw new Error("OpenAI API 키가 아직 설정되지 않았습니다.");
                        }

                        const response = await fetch(OPENAI_CHAT_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${userApiKey.value}`
                            },
                            body: JSON.stringify({
                                model: OPENAI_MODEL,
                                messages: [
                                    { role: 'system', content: systemInstructions },
                                    ...chatHistoryPayload
                                ]
                            })
                        });

                        if (!response.ok) {
                            console.log('??????????')
                            console.log(process.env.OPENAI_API_KEY?.trim())
                            throw new Error(`OpenAI API 오류: ${response.status}`);
                        }

                        const result = await response.json();
                        const answerText = result.choices?.[0]?.message?.content;

                        if (answerText) {
                            chatHistory.value.push({
                                id: 'chat-ans-' + Date.now(),
                                role: 'assistant',
                                text: answerText
                            });
                        } else {
                            throw new Error("Invalid response");
                        }
                    } catch (err) {
                        console.error("Chatbot error:", err.message);
                        let fallbackText = "아이구, 인터넷 전파가 수풀에 걸렸나 대답이 늦었슈! 다시 편하게 말해주셔유.";
                        if (userMsgText.includes("0시") || userMsgText.includes("8월")) {
                            fallbackText = "아따 대전 0시 축제는 2026년 8월 9일부터 17일까지 대전역부터 옛 충남도청까지 도로를 싹 막고 밤새 놀아제끼는 초대형 야간축제여유! 노래방이랑 야시장 먹거리가 사방에 가득하니께 배 비우고 가셔유!";
                        } else if (userMsgText.includes("성심당")) {
                            fallbackText = "성심당 주말엔 주차 줄이 엄청 기니깐유, 본관 주차장 무리하지 마시구 옆에 '우리들공원 주차장'에 차 대는 게 신의 한 수여유! 1만원 이상 빵 사면 주차권 무료로 챙겨주니께 잊지 마셔유!";
                        } else if (userMsgText.includes("공산성") || userMsgText.includes("백제")) {
                            fallbackText = "공주 백제문화제는 2026년 9월 26일부터 10월 5일까지 한단구먼유! 금강에 유등 띄우고 불꽃놀이 밤하늘 가득 메우는데, 그거 보고 오면 1년치 힐링은 기냥 끝이여유!";
                        } else if (userMsgText.includes("오월드")) {
                            fallbackText = "대전오월드는 놀이시설(조이랜드)도 신나지만 가을철에 플라워랜드 국화 축제할 때 가보시면 정말 이뻐유! 꽃이랑 동물 한꺼번에 보려면 반나절은 훅 지나가니께 편한 운동화 필수여유.";
                        }
                        chatHistory.value.push({
                            id: 'chat-ans-fb-' + Date.now(),
                            role: 'assistant',
                            text: fallbackText
                        });
                    } finally {
                        loadingChat.value = false;
                        nextTick(() => scrollToBottom());
                    }
                };

                // ============ Kakao Maps 동적 로더 + Leaflet 안전 폴백 ============
                const savedKakaoKey = import.meta.env.VITE_KAKAO_JS_KEY || localStorage.getItem('localhub_kakao_js_key') || '';
                const mapEngine = ref(localStorage.getItem('localhub_map_engine') || (savedKakaoKey ? 'kakao' : 'leaflet'));
                const kakaoMapKey = ref(savedKakaoKey);
                const kakaoMapKeyInput = ref(savedKakaoKey);
                const showKakaoKeyEditor = ref(!savedKakaoKey);
                const kakaoMapReady = ref(false);
                const kakaoMapType = ref('roadmap');
                const kakaoTrafficOn = ref(false);
                const kakaoRoadviewRoadOn = ref(false);
                let kakaoMap = null;
                let kakaoMarkers = [];
                let activeKakaoInfoWindow = null;
                let kakaoPolyline = null;
                let kakaoSdkPromise = null;

                const loadKakaoMapsSdk = () => {
                    if (window.kakao?.maps) {
                        return new Promise((resolve) => {
                            window.kakao.maps.load(() => {
                                kakaoMapReady.value = true;
                                resolve();
                            });
                        });
                    }
                    if (!kakaoMapKey.value) return Promise.reject(new Error('KAKAO_KEY_MISSING'));
                    if (kakaoSdkPromise) return kakaoSdkPromise;

                    kakaoSdkPromise = new Promise((resolve, reject) => {
                        let script = document.getElementById('kakao-maps-sdk');
                        const finishLoad = () => {
                            if (!window.kakao?.maps) {
                                kakaoSdkPromise = null;
                                reject(new Error('KAKAO_SDK_INIT_FAILED'));
                                return;
                            }
                            window.kakao.maps.load(() => {
                                kakaoMapReady.value = true;
                                resolve();
                            });
                        };

                        if (script) {
                            script.addEventListener('load', finishLoad, { once: true });
                            script.addEventListener('error', () => {
                                kakaoSdkPromise = null;
                                reject(new Error('KAKAO_SDK_LOAD_FAILED'));
                            }, { once: true });
                            return;
                        }

                        script = document.createElement('script');
                        script.id = 'kakao-maps-sdk';
                        script.async = true;
                        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoMapKey.value)}&autoload=false&libraries=services`;
                        script.onload = finishLoad;
                        script.onerror = () => {
                            kakaoSdkPromise = null;
                            reject(new Error('KAKAO_SDK_LOAD_FAILED'));
                        };
                        document.head.appendChild(script);
                    });
                    return kakaoSdkPromise;
                };

                const saveKakaoMapKey = () => {
                    if (import.meta.env.VITE_KAKAO_JS_KEY) {
                        showToast('카카오맵 키는 .env 파일에서 관리해유.');
                        showKakaoKeyEditor.value = false;
                        return;
                    }
                    const nextKey = kakaoMapKeyInput.value.trim();
                    if (!nextKey) {
                        showToast('카카오 JavaScript 키를 입력해주셔유.');
                        return;
                    }
                    const keyChanged = kakaoMapKey.value && kakaoMapKey.value !== nextKey;
                    kakaoMapKey.value = nextKey;
                    localStorage.setItem('localhub_kakao_js_key', nextKey);
                    localStorage.setItem('localhub_map_engine', 'kakao');
                    mapEngine.value = 'kakao';
                    showKakaoKeyEditor.value = false;
                    showToast(keyChanged ? '새 키를 저장했어유. 지도를 다시 연결할게유.' : '카카오맵 키를 저장했어유. 이후 자동 적용돼유.');
                    // SDK는 페이지에서 한 번 초기화되므로 키가 변경된 경우 새로고침하여 확실히 재연결한다.
                    window.setTimeout(() => window.location.reload(), 350);
                };
                const cancelKakaoKeyEdit = () => {
                    kakaoMapKeyInput.value = kakaoMapKey.value;
                    showKakaoKeyEditor.value = false;
                };
                const clearKakaoMapKey = () => {
                    if (import.meta.env.VITE_KAKAO_JS_KEY) {
                        showToast('카카오맵 키를 제거하려면 .env 파일의 VITE_KAKAO_JS_KEY를 비워주셔유.');
                        return;
                    }
                    localStorage.removeItem('localhub_kakao_js_key');
                    localStorage.setItem('localhub_map_engine', 'leaflet');
                    window.location.reload();
                };
                const setMapEngine = async (engine) => {
                    if (engine === 'kakao' && !kakaoMapKey.value) {
                        mapEngine.value = 'kakao';
                        showKakaoKeyEditor.value = true;
                        showToast('최초 1회만 카카오 JavaScript 키를 저장해주셔유.');
                        return;
                    }
                    mapEngine.value = engine;
                    localStorage.setItem('localhub_map_engine', engine);
                    if (engine === 'kakao') {
                        try {
                            await loadKakaoMapsSdk();
                        } catch (e) {
                            console.error(e);
                            showToast('카카오맵 연결을 확인할 수 없어 기존 지도를 표시해유.');
                            mapEngine.value = 'leaflet';
                        }
                    }
                    initMap();
                };
                const setKakaoMapType = type => {kakaoMapType.value=type;if(kakaoMap)kakaoMap.setMapTypeId(type==='skyview'?kakao.maps.MapTypeId.HYBRID:kakao.maps.MapTypeId.ROADMAP);};
                const toggleKakaoTraffic = () => {if(!kakaoMap)return;kakaoTrafficOn.value=!kakaoTrafficOn.value;kakaoTrafficOn.value?kakaoMap.addOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC):kakaoMap.removeOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC);};
                const toggleKakaoRoadviewRoad = () => {if(!kakaoMap)return;kakaoRoadviewRoadOn.value=!kakaoRoadviewRoadOn.value;kakaoRoadviewRoadOn.value?kakaoMap.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW):kakaoMap.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);};

                const roadviewModalOpen = ref(false);
                const roadviewSpot = ref(null);
                const roadviewLoading = ref(false);
                const roadviewError = ref('');
                let kakaoRoadview = null;
                let kakaoRoadviewMarker = null;
                let roadviewRequestToken = 0;

                const findNearestPanoId = (client, position, radii = [50, 100, 250, 500, 1000], index = 0) => new Promise((resolve) => {
                    if (index >= radii.length) {
                        resolve(null);
                        return;
                    }
                    client.getNearestPanoId(position, radii[index], (panoId) => {
                        if (panoId) resolve({ panoId, radius: radii[index] });
                        else findNearestPanoId(client, position, radii, index + 1).then(resolve);
                    });
                });

                const renderRoadview = async (spot) => {
                    const requestToken = ++roadviewRequestToken;
                    roadviewLoading.value = true;
                    roadviewError.value = '';
                    try {
                        await loadKakaoMapsSdk();
                        await nextTick();
                        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                        if (requestToken !== roadviewRequestToken) return;

                        const el = document.getElementById('kakao-roadview');
                        if (!el) throw new Error('ROADVIEW_ELEMENT_MISSING');
                        el.innerHTML = '';

                        const position = new kakao.maps.LatLng(Number(spot.lat), Number(spot.lng));
                        const client = new kakao.maps.RoadviewClient();
                        const nearest = await findNearestPanoId(client, position);
                        if (requestToken !== roadviewRequestToken) return;
                        if (!nearest) {
                            roadviewError.value = '이 장소 주변 1km 안에서 제공되는 로드뷰를 찾지 못했어유.';
                            roadviewLoading.value = false;
                            return;
                        }

                        kakaoRoadview = new kakao.maps.Roadview(el);
                        kakao.maps.event.addListener(kakaoRoadview, 'init', () => {
                            if (requestToken !== roadviewRequestToken) return;
                            kakaoRoadviewMarker = new kakao.maps.Marker({
                                position,
                                map: kakaoRoadview,
                                title: spot.name
                            });
                            kakaoRoadview.relayout();
                            roadviewLoading.value = false;
                        });
                        kakaoRoadview.setPanoId(nearest.panoId, position);

                        window.setTimeout(() => {
                            if (requestToken === roadviewRequestToken && roadviewLoading.value && kakaoRoadview) {
                                kakaoRoadview.relayout();
                            }
                        }, 500);
                    } catch (e) {
                        console.error(e);
                        if (requestToken !== roadviewRequestToken) return;
                        roadviewError.value = kakaoMapKey.value
                            ? '로드뷰 연결에 실패했어유. 카카오 Developers의 웹 플랫폼 실행 주소와 JavaScript 키를 확인해주셔유.'
                            : '카카오 JavaScript 키를 먼저 저장해주셔유.';
                        roadviewLoading.value = false;
                    }
                };

                const openRoadview = async (spot) => {
                    roadviewSpot.value = spot;
                    roadviewModalOpen.value = true;
                    await renderRoadview(spot);
                };
                const retryRoadview = () => {
                    if (roadviewSpot.value) renderRoadview(roadviewSpot.value);
                };
                const closeRoadview = () => {
                    roadviewRequestToken += 1;
                    if (kakaoRoadviewMarker) kakaoRoadviewMarker.setMap(null);
                    kakaoRoadviewMarker = null;
                    kakaoRoadview = null;
                    roadviewModalOpen.value = false;
                    roadviewSpot.value = null;
                    roadviewLoading.value = false;
                    roadviewError.value = '';
                };

                let map = null;
                let activeMarkers = [];
                let activePolyline = null;

                const initMap = async () => {
                    const centerLat=36.3504, centerLng=127.3845;
                    if(map){map.remove();map=null;} if(activeKakaoInfoWindow){activeKakaoInfoWindow.close();activeKakaoInfoWindow=null;} kakaoMap=null; activeMarkers=[]; kakaoMarkers=[]; activePolyline=null; kakaoPolyline=null;
                    await nextTick(); const mapContainer=document.getElementById('course-map'); if(!mapContainer)return; mapContainer.innerHTML='';
                    if(mapEngine.value==='kakao'&&kakaoMapKey.value){
                        try{await loadKakaoMapsSdk();const center=new kakao.maps.LatLng(centerLat,centerLng);kakaoMap=new kakao.maps.Map(mapContainer,{center,level:9});kakaoMap.setMapTypeId(kakaoMapType.value==='skyview'?kakao.maps.MapTypeId.HYBRID:kakao.maps.MapTypeId.ROADMAP);drawMapMarkers();return;}catch(e){console.error(e);showToast('카카오맵 로딩에 실패해 기존 Leaflet 지도로 전환했어유.');}
                    }
                    map=L.map(mapContainer,{zoomControl:true,attributionControl:false}).setView([centerLat,centerLng],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);drawMapMarkers();
                };

                const getMarkerStyle = (category) => {
                    return CATEGORY_MARKER_STYLE[category] || { icon: 'fa-location-dot', color: 'slate' };
                };

                // ============ 이동 경로/시간 검색 (OSRM 공개 데모 서버 이용) ============
                // 주의: OSRM 공개 데모 서버는 자동차(driving) 경로만 안정적으로 지원해유.
                // 도보/대중교통 프로파일은 데모 서버에서 정확히 동작하지 않아 자동차 기준으로만 제공해유.
                const routeInfo = ref(null); // { totalDistanceKm, totalDurationMin, legs: [...] }
                const routeLoading = ref(false);
                const routeError = ref('');
                let realRouteCoords = null; // 실제 도로 기반 경로 좌표 (지도에 그릴 때 사용)

                const kakaoRoutePoint = (spot) => `${encodeURIComponent(spot.name)},${Number(spot.lat)},${Number(spot.lng)}`;
                const buildKakaoRouteUrl = (from, to, mode = 'car', via = []) => {
                    const points = [from, ...via, to].map(kakaoRoutePoint).join('/');
                    return `https://map.kakao.com/link/by/${mode}/${points}`;
                };
                const getTransitHint = (from, to, distanceKm) => {
                    const fromCity = getCityFromAddress(from.address);
                    const toCity = getCityFromAddress(to.address);
                    const d = Number(distanceKm);
                    if (d <= 1.5) return '도보 이동 후 가까운 버스 정류장 이용을 추천해유.';
                    if (fromCity === '대전' && toCity === '대전') return '대전 시내버스 또는 지하철 환승 경로를 카카오맵에서 확인해유.';
                    if (fromCity && toCity && fromCity !== toCity) return '시외·광역버스와 지역버스 환승이 필요할 수 있어유.';
                    if (d >= 20) return '광역·시외버스 중심 경로가 유리해유.';
                    return '지역 시내버스 중심 경로를 확인해유.';
                };
                const openKakaoLegRoute = (leg, mode = 'traffic') => {
                    const url = buildKakaoRouteUrl(leg.fromSpot, leg.toSpot, mode);
                    window.open(url, '_blank', 'noopener,noreferrer');
                };
                const openKakaoFullRoute = (mode = 'car') => {
                    if (favoriteSpots.value.length < 2) return;
                    if (mode === 'traffic') {
                        routeInfo.value?.legs?.forEach((leg, index) => {
                            window.setTimeout(() => openKakaoLegRoute(leg, 'traffic'), index * 250);
                        });
                        showToast('대중교통은 경유지 전체 연결을 지원하지 않아 구간별 카카오맵 길찾기를 열어드려유.');
                        return;
                    }
                    const from = favoriteSpots.value[0];
                    const to = favoriteSpots.value[favoriteSpots.value.length - 1];
                    const via = favoriteSpots.value.slice(1, -1).slice(0, 5);
                    window.open(buildKakaoRouteUrl(from, to, mode, via), '_blank', 'noopener,noreferrer');
                };

                const fetchRouteInfo = async () => {
                    if (favoriteSpots.value.length < 2) return;
                    routeLoading.value = true;
                    routeError.value = '';
                    routeInfo.value = null;
                    realRouteCoords = null;

                    const coordsStr = favoriteSpots.value
                        .map(s => `${s.lng},${s.lat}`)
                        .join(';');
                    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`;

                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`OSRM 응답 오류: ${res.status}`);
                        const data = await res.json();
                        if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
                            throw new Error('경로를 찾을 수 없어유');
                        }
                        const route = data.routes[0];
                        realRouteCoords = route.geometry.coordinates.map(c => [c[1], c[0]]); // [lng,lat] -> [lat,lng]

                        const legs = route.legs.map((leg, i) => {
                            const fromSpot = favoriteSpots.value[i];
                            const toSpot = favoriteSpots.value[i + 1];
                            const distanceKm = (leg.distance / 1000).toFixed(1);
                            return {
                                fromName: fromSpot.name,
                                toName: toSpot.name,
                                fromSpot,
                                toSpot,
                                distanceKm,
                                durationMin: Math.round(leg.duration / 60),
                                transitHint: getTransitHint(fromSpot, toSpot, distanceKm)
                            };
                        });

                        routeInfo.value = {
                            totalDistanceKm: (route.distance / 1000).toFixed(1),
                            totalDurationMin: Math.round(route.duration / 60),
                            legs
                        };

                        nextTick(() => drawMapMarkers());
                    } catch (err) {
                        console.error('경로 검색 실패:', err);
                        routeError.value = '경로 검색에 실패했어유. 잠시 후 다시 시도해보셔유 (공개 데모 서버라 가끔 불안정할 수 있어유).';
                    } finally {
                        routeLoading.value = false;
                    }
                };

                watch(favoriteSpots, () => {
                    routeInfo.value = null;
                    realRouteCoords = null;
                });

                const drawMapMarkers = () => {
                    const isKakao=!!kakaoMap && mapEngine.value==='kakao';
                    if(!isKakao&&!map)return;
                    const points=[]; const isRouteMode=mapViewMode.value==='favorites'; const spotsToShow=isRouteMode?favoriteSpots.value:mapAllModeSpots.value;
                    if(isKakao){if(activeKakaoInfoWindow){activeKakaoInfoWindow.close();activeKakaoInfoWindow=null;}kakaoMarkers.forEach(m=>m.setMap(null));kakaoMarkers=[];if(kakaoPolyline){kakaoPolyline.setMap(null);kakaoPolyline=null;}}
                    else{activeMarkers.forEach(m=>map.removeLayer(m));activeMarkers=[];if(activePolyline){map.removeLayer(activePolyline);activePolyline=null;}}
                    spotsToShow.forEach((spot,idx)=>{if(!spot.lat||!spot.lng||spot.lat<34.5||spot.lat>38.5||spot.lng<125.5||spot.lng>129.5)return;points.push([spot.lat,spot.lng]);
                        if(isKakao){
                            const pos=new kakao.maps.LatLng(spot.lat,spot.lng);
                            const marker=new kakao.maps.Marker({position:pos,map:kakaoMap,title:spot.name});
                            const safeName=String(spot.name||'').replace(/[<>&"']/g,m=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
                            const safeAddress=String(spot.address||'주소 정보 없음').replace(/[<>&"']/g,m=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
                            const photo=spot.hasRealImage&&spot.image?`<img src="${spot.image}" alt="" style="width:82px;height:72px;object-fit:cover;border-radius:10px;flex:none" onerror="this.style.display='none'">`:'';
                            const iw=new kakao.maps.InfoWindow({content:`<div style="padding:12px;min-width:285px;max-width:330px;font-family:'Noto Sans KR',sans-serif;background:#fff"><div style="display:flex;gap:10px">${photo}<div style="min-width:0;flex:1"><b style="display:block;font-size:14px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isRouteMode?(idx+1)+'. ':''}${safeName}</b><span style="display:inline-block;margin-top:4px;font-size:10px;color:#b45309;background:#fffbeb;padding:2px 6px;border-radius:999px">${spot.category} · ${spot.region}</span><p style="margin:6px 0 0;font-size:10px;line-height:1.45;color:#64748b;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${safeAddress}</p></div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:10px"><button style="border:0;border-radius:8px;padding:7px 4px;background:#d97706;color:white;font-size:10px;font-weight:800;cursor:pointer" onclick="window.__yogiuOpenSpot('${spot.id}')">상세·날씨</button><button style="border:0;border-radius:8px;padding:7px 4px;background:#2563eb;color:white;font-size:10px;font-weight:800;cursor:pointer" onclick="window.__yogiuRoadview('${spot.id}')">로드뷰</button><button style="border:0;border-radius:8px;padding:7px 4px;background:#fde047;color:#111827;font-size:10px;font-weight:800;cursor:pointer" onclick="window.__yogiuDirections('${spot.id}')">길찾기</button></div></div>`});
                            kakao.maps.event.addListener(marker,'click',()=>{if(activeKakaoInfoWindow&&activeKakaoInfoWindow!==iw){activeKakaoInfoWindow.close();}iw.open(kakaoMap,marker);activeKakaoInfoWindow=iw;});
                            kakaoMarkers.push(marker);
                        }
                        else{const style=getMarkerStyle(spot.category);const icon=L.divIcon({className:'custom-div-icon',html:`<div class="relative flex items-center justify-center">${isRouteMode?`<span class="absolute text-[10px] font-black text-white z-20 pb-1.5">${idx+1}</span>`:''}<div class="relative"><i class="fa-solid fa-location-pin text-3xl text-${style.color}-500 filter drop-shadow"></i><i class="fa-solid ${style.icon} absolute inset-0 flex items-center justify-center text-white text-[10px]" style="top:-6px;"></i></div></div>`,iconSize:[30,30],iconAnchor:[15,30]});const marker=L.marker([spot.lat,spot.lng],{icon}).addTo(map).bindPopup(`<b class="text-xs">${isRouteMode?(idx+1)+'. ':''}${spot.name}</b><p class="text-[10px] text-slate-500">${spot.category} | ${spot.region}</p>`);marker.on('click',()=>{});activeMarkers.push(marker);}
                    });
                    if(isRouteMode&&points.length>1){const path=(realRouteCoords&&realRouteCoords.length>1)?realRouteCoords:points;if(isKakao){kakaoPolyline=new kakao.maps.Polyline({path:path.map(p=>new kakao.maps.LatLng(p[0],p[1])),strokeWeight:5,strokeColor:'#d97706',strokeOpacity:.85,strokeStyle:(realRouteCoords?'solid':'shortdash')});kakaoPolyline.setMap(kakaoMap);}else activePolyline=L.polyline(path,{color:'#d97706',weight:5,opacity:.85,dashArray:realRouteCoords?null:'8, 8'}).addTo(map);}
                    if(points.length){if(isKakao){const bounds=new kakao.maps.LatLngBounds();points.forEach(p=>bounds.extend(new kakao.maps.LatLng(p[0],p[1])));if(points.length>1)kakaoMap.setBounds(bounds,60,60,60,60);else{kakaoMap.setCenter(new kakao.maps.LatLng(points[0][0],points[0][1]));kakaoMap.setLevel(5);}}else if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[50,50]});else map.setView(points[0],12);}
                };
                const findSpotById = id => {
                    const list = Array.isArray(spotsData.value) ? spotsData.value : spotsData;
                    return list.find(s => String(s.id) === String(id));
                };
                window.__yogiuOpenSpot = id => {const spot=findSpotById(id);if(spot)viewSpotDetail(spot);};
                window.__yogiuRoadview = id => {const spot=findSpotById(id);if(spot)openRoadview(spot);};
                window.__yogiuDirections = id => {const spot=findSpotById(id);if(spot)window.open(`https://map.kakao.com/link/to/${encodeURIComponent(spot.name)},${spot.lat},${spot.lng}`,'_blank','noopener,noreferrer');};

                watch(mapViewMode, () => {
                    nextTick(() => drawMapMarkers());
                });
                watch(mapAllModeSpots, () => {
                    if (mapViewMode.value === 'all') {
                        nextTick(() => drawMapMarkers());
                    }
                });

                const toggleDarkMode = () => {
                    isDark.value = !isDark.value;
                    const root = document.documentElement;
                    if (isDark.value) {
                        root.classList.add('dark');
                    } else {
                        root.classList.remove('dark');
                    }
                };

                const selectRegion = (region) => {
                    activeRegion.value = region;
                    fetchAIBriefing();
                    showToast(`${region} 지역 맞춤 로컬 데이터로 화면을 구성했어유.`);
                    
                    if (currentTab.value === 'mypage') {
                        const centers={대전:[36.3504,127.3845,5],충북:[36.9852,128.3639,8],충남:[36.4629,127.1267,8],전체:[36.3504,127.3845,10]};const c=centers[region]||centers.전체;
                        if(kakaoMap) { kakaoMap.setCenter(new kakao.maps.LatLng(c[0],c[1])); kakaoMap.setLevel(c[2]); }
                        else if(map) map.setView([c[0],c[1]], region==='대전'?11:region==='전체'?8:10);
                    }
                };

                const goToCommunityPage = () => {
                    currentTab.value = 'community';
                };

                const changeTab = (tab) => {
                    currentTab.value = tab;
                    if (tab === 'mypage') {
                        setTimeout(() => {
                            initMap();
                        }, 250);
                    }
                };

                const timeAgo = (timestamp) => {
                    const diff = Date.now() - timestamp;
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return '방금 전';
                    if (mins < 60) return `${mins}분 전`;
                    const hours = Math.floor(mins / 60);
                    if (hours < 24) return `${hours}시간 전`;
                    const days = Math.floor(hours / 24);
                    return `${days}일 전`;
                };

                const formatDate = (timestamp) => {
                    const date = new Date(timestamp);
                    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
                };

                onMounted(async () => {
                    await hydrateData();
                    loadFavorites();
                    loadPosts();
                loadComments();
                    loadPostInteractionHistory();
                    fetchAIBriefing();
                });

                return {
                    currentTab,
                    isDark,
                    activeRegion,
                    activeCategory,
                    toastMsg,
                    showToast,
                    spotsData,
                    dataSource,
                    dataLoadError,
                    spotSearchQuery,
                    filteredSpots,
                    paginatedSpots,
                    totalSpotPages,
                    spotPage,
                    festivalSpots,
                    festivalViewMode,
                    calendarYear,
                    calendarMonth,
                    calendarDays,
                    selectedCalDateStr,
                    selectedCalDateFestivals,
                    moveCalMonth,
                    selectedSpot,
                    viewSpotDetail,
                    handleImageError,
                    isShowingIllustration,
                    daejeonMascotImg,
                    favorites,
                    toggleFavorite,
                    isFavorite,
                    favoriteSpots,
                    moveFav,
                    routeInfo,
                    routeLoading,
                    routeError,
                    fetchRouteInfo,
                    openKakaoLegRoute,
                    openKakaoFullRoute,
                    mapViewMode,
                    mapCategory,
                    mapAllModeSpots,
                    mapAllModeTotalCount,
                    mapCity,
                    mapCityCount,
                    regionMapImg,
                    chatbotMascotImg,
                    chungbukBannerImg,
                    chungnamBannerImg,
                    currentBannerImg,
                    aiBriefing,
                    loadingBriefing,
                    trafficColorClass,
                    aiRouteStops,
                    aiRouteKakaoUrl,
                    refreshAIBriefing,
                    posts,
                    commFilterCategory,
                    commSearchQuery,
                    commPage,
                    paginatedPosts,
                    totalPages,
                    selectedPost,
                    postPassInput,
                    viewPost,
                    postCreateModalOpen,
                    newPost,
                    openPostCreateModal,
                    submitPost,
                    deletePost,
                    isEditMode,
                    requestEditPost,
                    commSortMode,
                    hasLiked,
                    toggleLikePost,
                    spotWeather,
                    spotWeatherLoading,
                    spotWeatherError,
                    fetchSpotWeather,
                    placeSummary,
                    buildPlaceSummary,
                    mapEngine,
                    kakaoMapKey,
                    kakaoMapKeyInput,
                    showKakaoKeyEditor,
                    kakaoMapReady,
                    kakaoMapType,
                    kakaoTrafficOn,
                    kakaoRoadviewRoadOn,
                    setMapEngine,
                    saveKakaoMapKey,
                    clearKakaoMapKey,
                    setKakaoMapType,
                    toggleKakaoTraffic,
                    toggleKakaoRoadviewRoad,
                    roadviewModalOpen,
                    roadviewSpot,
                    roadviewLoading,
                    roadviewError,
                    openRoadview,
                    retryRoadview,
                    closeRoadview,
                    comments,
                    newComment,
                    replyTarget,
                    selectedPostComments,
                    rootComments,
                    childComments,
                    getPostCommentCount,
                    submitComment,
                    startReply,
                    cancelReply,
                    requestDeleteComment,
                    chatbotOpen,
                    chatInput,
                    chatHistory,
                    loadingChat,
                    recommendedQuestions,
                    toggleChatbot,
                    userApiKey,
                    apiKeyInputValue,
                    showApiKeySettings,
                    openApiKeySettings,
                    saveApiKey,
                    clearApiKey,
                    askBot,
                    sendChat,
                    toggleDarkMode,
                    selectRegion,
                    goToCommunityPage,
                    changeTab,
                    timeAgo,
                    formatDate,
                    topPosts,
                    filteredPostsList,
                    getLicenseName,
                    getLicenseShort,
                    getYoutubeSearchUrl,
                    getInstagramSearchUrl
                };
}
