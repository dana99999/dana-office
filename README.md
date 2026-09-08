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
| 김효태 (대표) | `ted` | `.env`의 `CEO_PASSWORD` (기본 `dana-office-2026`) | 로그인 후 즉시 변경 권장 |
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

## 전체 지시 · PM 종합 아카이브

오피스 채팅에서 담당자를 부르지 않고 업무를 말하면(또는 `@전체 …`) **전체 지시**로 처리됩니다 (`lib/world/directive.ts`).
1. PM 무결이 접수 문장을 남기고 키워드로 관련 담당자(최대 4명)를 고른다.
2. 담당자들이 순서대로 자기 역할을 선언하고 각자 작업이 큐에 들어간다 (선언 문장은 템플릿, LLM 호출 없음).
3. 담당자 산출물이 모두 들어오면 PM에게 `[종합] …` 작업이 생성되고, 기존 `runQueuedTask` 경로(mock/live)로 종합 문서를 만든다.
4. 완료되면 `directives` 행이 `archived`로 바뀌고 **아카이브** 메뉴(`/archive`)에 담당자별 산출물·종합 정리 링크가 걸린다.

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
- 사무실 맥(현재 운영): `com.dananine.office` LaunchAgent(:3400) + Cloudflare Tunnel `dana-office`(`com.dananine.cloudflared`, `~/.cloudflared/config.yml`) → https://office.dananine.com . DNS는 Cloudflare(네임서버 salvador/sunny), 도메인 등록은 가비아.

## 구조

```
lib/world/map.ts        맵·BFS (서버/클라이언트 공용)
lib/world/engine.ts     서버 권위 월드 엔진 — 250ms tick, 출퇴근 상태머신, 작업 러너, SSE 브로드캐스트
lib/agent/invoke.ts     단일 진입점 + 4중 잠금
lib/agent/live.ts       Anthropic SDK 호출 (structured output, 캐싱, usage → 원장)
lib/agent/mock.ts       mock 두뇌
lib/billing.ts          단가표·원장·한도·요약
lib/image/genspark.ts   이미지 요청 핸드오프/api
lib/hd/chars.ts         HD 벡터 캐릭터 (모던 캐주얼 게임 스타일)
lib/hd/world.ts         HD 벡터 환경 렌더러 (48px 타일, 소프트 섀도·그라디언트)
app/api/**              라우트 핸들러 (office/stream = SSE)
components/office-view  캔버스·채팅·편성 패널·터치 조작
```

## 모바일로 확인하기 (같은 Wi-Fi)

```bash
npm install
npm run lan        # 빌드 → LAN 주소 출력 → 서버 시작
```

터미널에 뜨는 `http://192.168.x.x:3000` 을 폰 브라우저에 입력하면 됩니다.
로그인 `hyotae` / `dana-office-2026` (`CEO_PASSWORD` 로 변경). 직원 초대코드는 관리자 › 직원·초대 에서 확인.
PC 방화벽이 3000 포트를 막으면 한 번 허용해 주세요. 외부(다른 네트워크)에서 보려면 `npx cloudflared tunnel --url http://localhost:3000` 같은 터널을 쓰세요.

## 운영 배포 — office.dananine.com

홈페이지(dananine.com)는 Vercel에 있고 DNS도 Vercel이 관리하므로, **홈페이지는 그대로 두고** 사무실 앱만 별도 호스트에 올린 뒤 Vercel DNS에 `office` 레코드 한 줄을 추가합니다. 이 앱은 SSE·SQLite·24시간 월드 틱 때문에 Vercel(서버리스)에는 올릴 수 없습니다.

### 방법 A — Fly.io (권장: 서버 관리 없음, 월 $5 내외)

```bash
fly launch --copy-config --no-deploy          # fly.toml 그대로 사용
fly volumes create office_data -r nrt -s 1    # DB·업로드 저장 1GB
fly secrets set AUTH_SECRET=$(openssl rand -hex 32) CEO_PASSWORD=원하는비밀번호
fly deploy
fly certs add office.dananine.com             # 화면에 뜨는 레코드를 Vercel DNS에 추가
```

Vercel 대시보드 → 프로젝트 → Settings → Domains → `dananine.com` DNS Records 에서
`office  CNAME  dana-office.fly.dev` (또는 안내된 A/AAAA) 추가 → 몇 분 뒤 `https://office.dananine.com`.

### 방법 B — 직접 서버(VPS) + Docker



이 앱은 SSE 실시간 스트림·SQLite·24시간 월드 틱 때문에 **항상 켜져 있는 서버 1대**가 필요합니다 (정적 호스팅·서버리스 불가). 홈페이지와 같은 서버여도 되고, 작은 VPS(2vCPU/2GB면 충분)여도 됩니다.

```bash
git clone https://github.com/dana99999/dana-office && cd dana-office
cp deploy/.env.example deploy/.env && nano deploy/.env      # AUTH_SECRET, CEO_PASSWORD
docker compose -f deploy/docker-compose.yml up -d --build   # 앱 + HTTPS(Caddy) 기동
```

1. 홈페이지 DNS에 `office.dananine.com  A  <서버 IP>` 한 줄 추가
2. 서버 80/443 포트 오픈
3. 위 명령 실행 → 인증서는 자동 발급, `https://office.dananine.com` 접속

업데이트는 `git pull && docker compose -f deploy/docker-compose.yml up -d --build`. 데이터(DB·업로드)는 `office-data` 볼륨에 남습니다.
