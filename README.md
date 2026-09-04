# Dana Office

다나나인 버추얼 오피스 — 픽셀아트 가상 사무실 + 프로젝트 편성·호출제로 일하는 AI 담당자.

- 기획서: [docs/PLAN.md](docs/PLAN.md)
- 동작 프로토타입: [prototype/index.html](prototype/index.html) — 브라우저에서 파일을 열면 바로 실행 (빌드 불필요)

## 프로토타입 조작
- 방향키: 대표 캐릭터 이동
- Space: 옆 AI에게 업무 지시(큐 +1)
- 프로젝트 버튼: 편성 변경 → 필요 없는 AI는 정문으로 퇴근, 필요한 AI는 출근
- 호출 / 내보내기: 개별 AI 출퇴근

## 본 구축 (P1~)
Next.js App Router + TypeScript + SQLite(better-sqlite3). `app/office` 로 시작.
자세한 구조는 기획서 §9.
