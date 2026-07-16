# YOGIU Vue 통합 서버 버전

Vue(Vite) 화면과 Express API를 하나의 서버/포트에서 실행하는 버전입니다.

## 1. 환경변수 설정

프로젝트 루트의 `.env` 파일에 키를 입력합니다.

```env
VITE_KAKAO_JS_KEY=카카오_JavaScript_키
OPENAI_API_KEY=OpenAI_API_키
OPENAI_MODEL=gpt-5-mini
SERVER_PORT=5173
```

## 2. 개발 실행

```bash
npm install
npm run dev
```

접속 주소:

```text
http://localhost:5173
```

API도 같은 주소를 사용합니다.

```text
http://localhost:5173/api/health
http://localhost:5173/api/openai/chat
```

개발 모드에서 Express가 Vite를 미들웨어로 포함하므로 별도의 Vite 서버나 API 서버를 실행하지 않습니다.

## 3. 배포 실행

```bash
npm run build
npm start
```

`npm start` 시 동일한 Express 서버가 `dist` 정적 파일과 `/api`를 함께 제공합니다.

## 주요 변경사항

- `concurrently` 제거
- Vite 프록시 제거
- API 서버와 Vue 개발 서버 통합
- 단일 프로세스, 단일 포트 사용
- Express 5 와일드카드 경로 오류 제거
