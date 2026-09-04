# Dana Office

다나나인 버추얼 오피스 — 픽셀아트 가상 사무실 + 프로젝트 편성·호출제로 일하는 AI 담당자.

- 기획서 v3: [docs/PLAN.md](docs/PLAN.md)
- 동작 프로토타입: [prototype/index.html](prototype/index.html) — 브라우저에서 파일을 열면 바로 실행 (빌드 불필요)
  - 사무실: 방향키 이동 · Space 업무 지시 · 프로젝트 편성 버튼 · 호출/내보내기
  - 캐릭터 만들기: 헤어·의상·색·안경 조합 실시간 미리보기 (§08)
  - 비용·크레딧 화면 목업(예시 데이터), 로그인·관리자 목업

## 본 구축 (P1~)
Next.js App Router + TypeScript + SQLite(better-sqlite3). 구조는 기획서 §11.
서버는 Anthropic **API 키**만 사용한다 (구독 계정 토큰 사용 금지 — 기획서 §7).
