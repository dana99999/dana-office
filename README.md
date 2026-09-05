# Dana Office

다나나인 버추얼 오피스 — 픽셀아트 가상 사무실 + 프로젝트 편성·호출제로 일하는 AI 담당자.

- 기획서 v3: [docs/PLAN.md](docs/PLAN.md) · 초기 프로토타입: [prototype/index.html](prototype/index.html)
- 본 앱: Next.js 16 (App Router) · TypeScript · SQLite(better-sqlite3) · Anthropic SDK

## 로컬 실행

```bash
cp .env.example .env.local     # AUTH_SECRET, CEO_PASSWORD 수정
npm install
npm run dev                    # http://localhost:3000
```

첫 실행 시 `data/dana-office.db`가 자동 생성·시드됩니다.

| 계정 | 아이디 | 비밀번호 | 비고 |
|---|---|---|---|
| 김효태 (대표) | `hyotae` | `.env`의 `CEO_PASSWORD` (기본 `dana-office-2026`) | 로그인 후 즉시 변경 권장 |
| 김정기 (디자이너) | `jungki` | 초대 코드로 첫 출근 | 코드는 관리자 › 직원·초대 에서 확인 |
| 김성헌 (마케터) | `seongheon` | 초대 코드로 첫 출근 | " |

## 모드

| 모드 | 조건 | 동작 |
|---|---|---|
| **mock** (기본) | `ANTHROPIC_API_KEY` 없음 또는 기능 「실제 API 호출」 꺼짐 | API 호출 없이 직무별 산출물을 생성. 비용 화면의 수치는 정가 기준 시뮬레이션, 크레딧 차감 없음. **테스트는 전부 이 모드로 끝낼 수 있음** |
| **live** | `.env`에 API 키 + 관리자 › 기능에서 「실제 API 호출」 켬 | Anthropic API 호출. 응답의 usage로 원장 기록, 잔여 크레딧 = 충전 기록 − 누적 실비 |

서버는 **API 키만** 사용합니다. Claude Max 등 구독 계정 토큰을 서버에 넣는 것은 약관 위반이므로 지원하지 않습니다.

## 과금 0 보장

`lib/agent/invoke.ts`의 `runQueuedTask`가 SDK를 호출하는 **유일한 경로**이고, `gate()`가 ① 근무 상태 ② 배정된 작업 ③ 프로젝트 `ai_allowed` ④ 한도(크레딧·월·프로젝트·에이전트) 를 모두 통과해야 실행됩니다. 대기·부재 AI에게 말을 걸면 저장된 문장으로만 답합니다. `npm test`의 `gate.test.ts`가 이 잠금을 검증합니다.

## 이미지 — 젠스파크

AI 디자이너가 이미지가 필요하면 프롬프트를 작성해 **이미지 생성 요청 카드**를 만듭니다(승인 큐 상단). 사람이 프롬프트를 복사해 젠스파크에서 생성한 뒤 결과를 업로드하면 산출물에 붙습니다(핸드오프 모드). 젠스파크가 프로그램 호출용 API를 제공하면 `GENSPARK_API_URL`/`GENSPARK_API_KEY`를 채워 api 모드로 전환됩니다 (`lib/image/genspark.ts`).

## 검증

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## 배포

월드 상태가 메모리에 살아 있어야 하므로 **상시 실행되는 단일 프로세스**가 필요합니다 (서버리스 부적합).

- Railway / Render: 빌드 `npm run build`, 시작 `npm run start`, 볼륨을 `/app/data`에 마운트, 환경변수 `TZ=Asia/Seoul`·`AUTH_SECRET`·`CEO_PASSWORD`(·`ANTHROPIC_API_KEY`)
- Docker: `docker build -t dana-office . && docker run -p 3000:3000 -v dana-data:/app/data -e AUTH_SECRET=... dana-office`
- 사무실 맥: `npm run build && npm run start` 를 LaunchAgent로 상시 실행 + Tailscale

## 구조

```
lib/world/map.ts        맵·BFS (서버/클라이언트 공용)
lib/world/engine.ts     서버 권위 월드 엔진 — 250ms tick, 출퇴근 상태머신, 작업 러너, SSE 브로드캐스트
lib/agent/invoke.ts     단일 진입점 + 4중 잠금
lib/agent/live.ts       Anthropic SDK 호출 (structured output, 캐싱, usage → 원장)
lib/agent/mock.ts       mock 두뇌
lib/billing.ts          단가표·원장·한도·요약
lib/image/genspark.ts   이미지 요청 핸드오프/api
lib/pixel/*             스프라이트 템플릿·환경 렌더러 (클라이언트)
app/api/**              라우트 핸들러 (office/stream = SSE)
components/office-view  캔버스·채팅·편성 패널·터치 조작
```
