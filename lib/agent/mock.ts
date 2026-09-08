import type { Agent, Project, Task } from "../types";
import type { AgentOutput } from "./schema";

/** mock 두뇌 — API 호출 없이 직무별 그럴듯한 산출물을 만든다 (테스트·시연용, 비용 0) */
export function mockRun(agent: Agent, task: Task, project: Project): { out: AgentOutput; usage: { input_tokens: number; cached_tokens: number; output_tokens: number } } {
  const t = task.title, b = task.brief || project.brief;
  const zone = agent.zone;
  let out: AgentOutput;
  if (agent.slug === "mugyeol" && /^\[종합\]/.test(t)) out = pmSummary(t, b, project);
  else if (zone === "design" && agent.slug === "sora") out = {
    kind: "concept", title: `${t} — 컨셉 방향`,
    body_md: `# ${t}\n\n**프로젝트** ${project.name} · ${project.client}\n\n## 1안 · Quiet Proof\n- 키워드: 투명 / 정제 / 근거\n- 컬러: 웜 그레이 + 세이지 포인트\n- 레퍼런스 유형: 성분표를 그래픽으로 쓰는 스킨케어 패키지\n\n## 2안 · Clinical Warmth\n- 키워드: 신뢰 / 온기 / 정확\n- 컬러: 오프화이트 + 딥 네이비\n- 레퍼런스 유형: 병원 사인 시스템의 위계 + 부드러운 서체\n\n## 3안 · Field Notes\n- 키워드: 원료 / 기록 / 손글씨\n- 컬러: 크라프트 + 블랙\n- 레퍼런스 유형: 식물학 도감\n\n> 추천: 2안. 브리프의 '성분 투명성'을 신뢰감으로 번역하기 가장 쉬움.\n\n_브리프_: ${b}`,
    message: `「${t}」 3안 정리했습니다. 2안 추천드려요.`,
  };
  else if (zone === "design" && agent.slug === "dodam") out = {
    kind: "layout", title: `${t} — 레이아웃 안`,
    body_md: `# ${t}\n\n## 섹션 구조\n1. 히어로 — 헤드카피 + 제품 1컷 (여백 40%)\n2. 성분 투명성 — 성분표를 그래픽화, 3열\n3. 사용 전후 — 좌우 비교, 캡션 12px\n4. 리뷰 3건 — 카드형\n5. CTA — 단일 버튼\n\n## 카피 배치\n- 헤드: 좌상단, 최대 2줄\n- 서브: 헤드 아래 8px\n\n## 이미지 생성 요청\n젠스파크 프롬프트를 별도 카드로 올렸습니다.`,
    message: `「${t}」 레이아웃 안과 이미지 프롬프트 올렸습니다.`,
    image_request: { prompt: `Minimal skincare product hero shot, off-white background, soft daylight, deep navy accent, ingredient list rendered as elegant typography, editorial, 4:5`, style: "editorial-minimal", size: "1024x1280" },
  };
  else if (zone === "design") out = {
    kind: "copy", title: `${t} — 카피`,
    body_md: `# ${t}\n\n| # | 한글 | 영문 | 상표 검색 키워드 |\n|---|---|---|---|\n| 1 | 맑음 | Malgeum | 맑음, MALGEUM |\n| 2 | 결 | Gyeol | 결, GYEOL |\n| 3 | 온결 | Ongyeol | 온결 |\n| 4 | 투명한 | Clearly | CLEARLY |\n| 5 | 성분노트 | Ingredient Note | 성분노트 |\n\n> **상표 검색 필요** — KIPRIS에서 위 키워드로 3류(화장품) 검색 후 승인.\n\n_톤_: 과장 없이, 짧게.`,
    message: `「${t}」 후보 올렸습니다. 상표 검색 키워드 포함.`,
  };
  else if (zone === "growth" && agent.slug === "sia") out = {
    kind: "list", title: `${t} — 후보 리스트`,
    body_md: `# ${t}\n\n| 핸들 | 플랫폼 | 팔로워 | 참여율 | 적합 이유 |\n|---|---|---|---|---|\n| @linh.skin | Instagram | 42K | 5.1% | 성분 리뷰 중심, 베트남 |\n| @mai_glow | TikTok | 88K | 7.4% | 비포애프터 포맷 |\n| @clean.jules | Instagram | 23K | 6.2% | 클린뷰티 |\n\n(mock 데이터 — SeedScope 연동 시 실측으로 대체)\n\n## 아웃리치 초안\n안녕하세요, ${project.client} 브랜드 팀입니다… (발송 전 승인 필요)`,
    message: `「${t}」 후보 3명과 아웃리치 초안 올렸습니다. 발송은 승인 대기.`,
  };
  else if (zone === "growth") out = {
    kind: "brief", title: `${t} — 브리프`,
    body_md: `# ${t}\n\n## 요약\n- 최근 2년 리브랜딩은 '성분 가시화'와 '무향·저자극' 메시지로 수렴 (추정)\n- 패키지: 단색 + 큰 타이포 + 번호 체계\n\n## 사례\n1. 사례 A — 로고 단순화, 매출 반응 긍정 (출처 확인 필요)\n2. 사례 B — 컬러 시스템 도입\n3. 사례 C — 성분표 전면 배치\n4. 사례 D — 서브 브랜드 분리\n5. 사례 E — 리필 패키지\n\n_모든 수치는 '추정'으로 표시. 출처 확인 후 승인 요청._`,
    message: `「${t}」 브리프 올렸습니다. 출처 확인 표시해 뒀어요.`,
  };
  else if (zone === "sales") out = {
    kind: "proposal", title: `${t} — 초안`,
    body_md: `# ${t}\n\n## 제안 개요\n- 범위: BI 리뉴얼 + 상세페이지 3종\n- 기간: 6주\n- 견적 레인지: ₩18,000,000 – ₩24,000,000 (확정은 대표 승인 후)\n\n## 팔로업 시퀀스\n1. D+0 제안서 발송\n2. D+3 확인 메일\n3. D+7 통화 제안`,
    message: `「${t}」 초안 작성했습니다. 견적은 레인지로.`,
  };
  else out = {
    kind: "report", title: `${t} — 정리`,
    body_md: `# ${t}\n\n- 승인 대기 정리 완료\n- 편성: ${project.name}\n- 다음 액션: 대표 승인`,
    message: `「${t}」 정리해 두었습니다.`,
  };
  const input = 2400 + Math.min(4000, (b.length + agent.persona.length) * 2);
  return { out, usage: { input_tokens: Math.round(input * 0.3), cached_tokens: Math.round(input * 0.7), output_tokens: 400 + Math.round(out.body_md.length * 0.9) } };
}

/** PM 종합 정리 (mock) — 브리프에 붙어 온 담당자별 산출물의 제목·소제목을 묶어 아카이브 문서를 만든다 */
function pmSummary(t: string, brief: string, project: Project): AgentOutput {
  const head = brief.split("\n\n")[0] || ""; const directive = (head.match(/^지시:\s*(.*)$/m) || [])[1] || t.replace(/^\[종합\]\s*/, ""); const who = (head.match(/^지시자:\s*(.*)$/m) || [])[1] || "대표";
  const parts = brief.split(/\n(?=### )/).filter((p) => p.startsWith("### "));
  const secs = parts.map((p) => { const [h, ...rest] = p.split("\n"); const lines = rest.filter((l) => /^(## |- |\d+\. |> )/.test(l)).slice(0, 5).map((l) => l.replace(/^## /, "**").replace(/^\*\*(.*)$/, "**$1**").replace(/^> /, "  › ")); return `## ${h.slice(4)}\n${lines.join("\n") || "- (본문 요약 없음)"}`; });
  const names = parts.map((p) => p.slice(4).split(" · ")[0]);
  return {
    kind: "report", title: `${directive} — 종합 아카이브`.slice(0, 80),
    body_md: `# ${directive}\n\n**지시자** ${who} · **프로젝트** ${project.name} · **참여** ${names.join(", ") || "-"}\n\n## 지시 요약\n${directive}\n\n${secs.join("\n\n")}\n\n## 산출물 간 충돌·공백\n- 담당자 간 톤 차이는 승인 단계에서 조정 필요 (mock 요약 — 실제 API 모드에서는 내용 기반으로 판단)\n\n## 다음 액션\n1. 승인 큐에서 담당자별 산출물 검토\n2. 반려 항목은 사유와 함께 재배정\n3. 승인분은 갤러리로, 본 문서는 아카이브에 보관`,
    message: `「${directive.length > 20 ? directive.slice(0, 20) + "…" : directive}」 종합 정리 올렸습니다. 아카이브 보관.`,
  };
}
