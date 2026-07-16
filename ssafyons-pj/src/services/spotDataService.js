const DATA_BASE_PATH = '/data/대전_충청권';

export const SPOT_DATA_FILES = [
  { category: '관광지', file: '대전_충청권_관광지.json' },
  { category: '레포츠', file: '대전_충청권_레포츠.json' },
  { category: '문화시설', file: '대전_충청권_문화시설.json' },
  { category: '쇼핑', file: '대전_충청권_쇼핑.json' },
  { category: '숙박', file: '대전_충청권_숙박.json' },
  { category: '여행코스', file: '대전_충청권_여행코스.json' },
  { category: '음식점', file: '대전_충청권_음식점.json' },
  { category: '축제공연행사', file: '대전_충청권_축제공연행사.json' },
];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.items,
    payload?.data,
    payload?.item,
    payload?.response?.body?.items?.item,
    payload?.response?.body?.items,
    payload?.response?.body?.data,
    payload?.body?.items?.item,
    payload?.body?.items,
    payload?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') return asArray(candidate);
  }

  return [];
}

function detectRegion(address = '') {
  if (address.includes('대전')) return '대전';
  if (address.includes('충청남도') || address.includes('충남')) return '충남';
  if (address.includes('충청북도') || address.includes('충북')) return '충북';
  return '기타';
}

function firstNonEmpty(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeLicense(item) {
  const raw = String(firstNonEmpty(
    item.license,
    item.licenseType,
    item.copyrightType,
    item.copyrighttype,
    item.cpyrhtDivCd,
  ) ?? '');

  if (/4/.test(raw)) return 'Type4';
  if (/3/.test(raw)) return 'Type3';
  if (/2/.test(raw)) return 'Type2';
  return 'Type1';
}

function normalizeSpot(item, category, index) {
  const name = String(firstNonEmpty(item.name, item.title, item.facilityName, item.placeName) ?? '이름 없는 장소').trim();
  const address = String(firstNonEmpty(item.address, item.addr1, item.roadAddress, item.addr, item.address1) ?? '').trim();
  const image = String(firstNonEmpty(
    item.image,
    item.firstimage,
    item.firstImage,
    item.thumbnail,
    item.imageUrl,
    item.firstimage2,
  ) ?? '').trim();
  const id = String(firstNonEmpty(item.id, item.contentid, item.contentId, item.uid) ?? `${category}-${index}-${name}`);

  const lat = toNumber(firstNonEmpty(item.lat, item.latitude, item.mapy, item.mapY, item.y));
  const lng = toNumber(firstNonEmpty(item.lng, item.longitude, item.mapx, item.mapX, item.x));

  return {
    ...item,
    id,
    name,
    category,
    region: firstNonEmpty(item.region, item.sido, item.areaName) || detectRegion(address),
    address,
    tel: String(firstNonEmpty(item.tel, item.tel1, item.phone, item.telephone) ?? '').trim(),
    image,
    hasRealImage: Boolean(image && !image.startsWith('data:image/svg+xml')),
    lat,
    lng,
    license: normalizeLicense(item),
    overview: String(firstNonEmpty(item.overview, item.description, item.summary) ?? ''),
    eventStartDate: firstNonEmpty(item.eventStartDate, item.eventstartdate, item.startDate),
    eventEndDate: firstNonEmpty(item.eventEndDate, item.eventenddate, item.endDate),
  };
}

async function fetchJsonFile({ category, file }) {
  const url = `${DATA_BASE_PATH}/${encodeURIComponent(file)}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`${file} (${response.status})`);
  }

  const payload = await response.json();
  return extractItems(payload).map((item, index) => normalizeSpot(item, category, index));
}

/**
 * public/data/대전_충청권 폴더의 8개 JSON을 병렬로 읽습니다.
 * 파일이 없거나 형식이 잘못되면 호출부에서 내장 데이터로 대체할 수 있도록 오류를 던집니다.
 */
export async function loadExternalSpotData() {
  const settled = await Promise.allSettled(SPOT_DATA_FILES.map(fetchJsonFile));
  const loaded = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  const failed = settled
    .map((result, index) => ({ result, config: SPOT_DATA_FILES[index] }))
    .filter(({ result }) => result.status === 'rejected');

  if (loaded.length === 0) {
    const details = failed.map(({ config, result }) => `${config.file}: ${result.reason?.message ?? '불러오기 실패'}`).join('\n');
    throw new Error(`외부 장소 JSON을 불러오지 못했습니다.\n${details}`);
  }

  if (failed.length > 0) {
    console.warn('[YOGIU] 일부 JSON 파일을 불러오지 못했습니다.', failed);
  }

  return loaded;
}
