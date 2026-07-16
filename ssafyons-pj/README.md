# 요기유 Vue — JSON + .env 연동 최종본

## 1. 환경변수 입력
프로젝트 루트의 `.env` 파일을 열고 키를 입력합니다.

```env
VITE_KAKAO_JS_KEY=카카오_JavaScript_키
OPENAI_API_KEY=OpenAI_API_키
OPENAI_MODEL=gpt-5-mini
VITE_OPENAI_MODEL=gpt-5-mini
SERVER_PORT=8787
```

- `VITE_KAKAO_JS_KEY`: 브라우저에서 카카오 지도 SDK가 사용하는 공개 JavaScript 키입니다.
- `OPENAI_API_KEY`: Node 서버에서만 읽으며 브라우저 코드에는 포함되지 않습니다.
- `.env`를 수정한 뒤에는 실행 중인 서버를 종료하고 다시 시작해야 합니다.

## 2. JSON 데이터 넣기
8개 JSON 파일을 다음 폴더에 넣습니다.

```text
public/data/대전_충청권/
```

## 3. 개발 실행

```bash
npm install
npm run dev
```

- 웹 화면: `http://localhost:5173`
- 내부 API 서버: `http://localhost:8787`

`npm run dev`가 두 서버를 동시에 실행합니다.

## 4. 카카오 도메인 등록
카카오 Developers 앱의 웹 도메인에 실행 주소를 등록합니다.

```text
http://localhost:5173
```

## 5. 배포 실행

```bash
npm run build
npm start
```

기본 주소는 `http://localhost:8787`입니다. 배포 환경에서도 `OPENAI_API_KEY`는 서버 환경변수로 설정해야 합니다.

## 보안
`.env`는 `.gitignore`에 포함되어 있습니다. 실제 키가 들어간 `.env` 파일을 GitHub에 올리지 마세요.
