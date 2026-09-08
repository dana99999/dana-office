/**
 * 전체 지시(브로드캐스트) — 사람이 특정 담당자를 부르지 않고 업무를 말하면
 * PM(무결)이 접수 → 관련 담당자들이 각자 역할을 선언하고 작업에 들어감 → 모두 끝나면 PM이 종합 정리 → 아카이브.
 * 역할 선언·접수 문장은 저장된 템플릿(LLM 호출 없음). 실제 산출물은 기존 runQueuedTask 경로(mock/live)로만 만들어진다.
 */
import { db } from "../db";
import type { Agent, Artifact, Project, Task, User } from "../types";

export interface DirectiveRow { id: number; source: string; body: string; requester_id: number | null; requester_name: string; project_id: number; member_task_ids: string; summary_task_id: number | null; summary_artifact_id: number | null; status: "open" | "summarizing" | "archived"; created_at: string; archived_at: string | null; }
export interface WorldPort { say(kind: "agent" | "human" | "system", id: number, name: string, body: string): void; summon(agentId: number): void; notifyTasksChanged(): void; }

export const PM_SLUG = "mugyeol";
const BROADCAST_RE = /^\s*@(전체|모두|팀|all|team)\b/i;
const TASK_HINT = /(해\s?줘|해주세요|해\s?주라|해\s?봐|부탁(해|드려|합니다)|만들어|작성해|준비해|정리해|기획해|제작해|조사해|분석해|검토해|설계해|뽑아|잡아|짜\s?줘|짜\s?봐|올려\s?줘|시작해|진행해|착수)/;
/** 특정 담당자 멘션이 없고 업무 지시로 읽히면 전체 지시로 본다 */
export function isBroadcast(body: string): boolean {
  if (BROADCAST_RE.test(body)) return true;
  if (/@[^\s@]+/.test(body)) return false;
  return body.trim().length >= 8 && TASK_HINT.test(body); // 명령형 어미가 없으면 잡담으로 본다 (비용 0)
}
export function stripBroadcast(body: string) { return body.replace(BROADCAST_RE, "").trim(); }

const RULES: [RegExp, string][] = [
  [/디자인|시안|무드보드|컨셉|비주얼|아트|브랜드 방향|BI|CI|로고|리브랜딩/i, "sora"],
  [/상세페이지|레이아웃|배너|썸네일|카드뉴스|패키지|이미지|SNS|인스타|비주얼 제작/i, "dodam"],
  [/카피|문구|네이밍|슬로건|톤앤매너|헤드라인|문안|소개글|메시지/i, "yeoul"],
  [/광고|퍼포먼스|ROAS|CPA|예산|메타|소재 테스트|성과|전환/i, "haram"],
  [/시딩|인플루언서|해외|글로벌|아웃리치|틱톡|유튜버|크리에이터|북미|일본/i, "sia"],
  [/조사|리서치|경쟁사|트렌드|사례|레퍼런스|분석|인사이트|시장|벤치마킹/i, "naru"],
  [/제안서|견적|영업|세일즈|리드|미팅|피칭|계약|수주/i, "hangyeol"],
  [/CS|문의|응대|온보딩|킥오프|고객 리포트|보고서|고객|클라이언트 공유/i, "onyu"],
];
const DEFAULT_TEAM = ["naru", "sora", "yeoul"];
const MAX_MEMBERS = 4;

/** 역할 선언 문장 + 작업 제목 접미 (템플릿, 비용 0) */
const ROLE: Record<string, { claim: (d: string) => string; suffix: string; brief: (d: string) => string }> = {
  sora: { claim: () => "컨셉 방향은 제가 잡겠습니다. 키워드·컬러·레퍼런스 유형으로 3안 정리해 올릴게요.", suffix: "컨셉 방향", brief: (d) => `전체 지시 「${d}」에 대한 아트 디렉션. 방향 3안, 각 안마다 키워드 3개·컬러·레퍼런스 유형. 추천안 1개 명시.` },
  dodam: { claim: () => "레이아웃과 이미지 프롬프트는 제가 맡습니다. 섹션 구조·카피 배치·젠스파크 요청까지 준비할게요.", suffix: "레이아웃 안", brief: (d) => `전체 지시 「${d}」에 필요한 레이아웃 안. 섹션 구조, 카피 배치, 시각 위계. 이미지가 필요하면 생성 프롬프트를 요청 카드로.` },
  yeoul: { claim: () => "카피는 제가요. 톤앤매너 정리하고 후보 문안 뽑겠습니다. 네이밍이 섞이면 상표 검색 키워드도 붙일게요.", suffix: "카피 · 톤앤매너", brief: (d) => `전체 지시 「${d}」의 카피. 톤앤매너 3줄 + 헤드/서브 카피 후보. 네이밍이면 한/영 병기와 상표 검색 키워드 포함. 과장·최상급 금지.` },
  haram: { claim: () => "성과 쪽은 제가 봅니다. 채널·예산·소재 테스트 설계안으로 정리하겠습니다.", suffix: "퍼포먼스 설계", brief: (d) => `전체 지시 「${d}」의 퍼포먼스 마케팅 설계. 채널 조합, 예산 배분안, 소재 테스트 매트릭스, 핵심 지표. 숫자는 근거 표시.` },
  sia: { claim: () => "해외 시딩 후보 리스트와 아웃리치 초안은 제가 준비합니다. 발송은 승인 뒤에요.", suffix: "시딩 후보 · 아웃리치", brief: (d) => `전체 지시 「${d}」에 맞는 해외 인플루언서 후보 리스트(플랫폼·팔로워·참여율·적합 이유)와 아웃리치 메일 초안. 발송 금지, 초안만.` },
  naru: { claim: () => "리서치는 제가 맡겠습니다. 경쟁사·사례·트렌드 브리프로 정리하고 출처를 표시해 올릴게요.", suffix: "리서치 브리프", brief: (d) => `전체 지시 「${d}」를 위한 리서치 브리프. 경쟁사·사례·트렌드 5건, 시사점 3줄. 출처 명시, 미확인 수치는 '추정'.` },
  hangyeol: { claim: () => "제안·견적 레인지는 제가 잡겠습니다. 팔로업 시퀀스도 함께 붙일게요.", suffix: "제안 · 견적 레인지", brief: (d) => `전체 지시 「${d}」의 제안 개요와 견적 레인지, 팔로업 시퀀스. 확정 금액은 대표 승인 후.` },
  onyu: { claim: () => "광고주 커뮤니케이션 초안과 킥오프 문서는 제가 정리하겠습니다.", suffix: "광고주 커뮤니케이션", brief: (d) => `전체 지시 「${d}」 관련 광고주 안내 메일 초안 또는 킥오프 문서. 발송·게시 금지, 초안만.` },
};

export function pickTeam(body: string, agents: Agent[]): Agent[] {
  const slugs: string[] = [];
  for (const [re, slug] of RULES) if (re.test(body) && !slugs.includes(slug)) slugs.push(slug);
  const chosen = (slugs.length ? slugs : DEFAULT_TEAM).slice(0, MAX_MEMBERS);
  return chosen.map((s) => agents.find((a) => a.slug === s && a.active)).filter((a): a is Agent => !!a);
}
export function shortTitle(body: string) { const t = stripBroadcast(body).replace(/\s+/g, " "); return t.length > 34 ? t.slice(0, 34).trimEnd() + "…" : t; }

function resolveProject(d: ReturnType<typeof db>, body: string, agentIds: number[]): Project {
  const active = d.prepare("SELECT * FROM projects WHERE status='active' ORDER BY id DESC").all() as Project[];
  const hit = active.find((p) => p.type !== "직접 지시" && p.name && body.includes(p.name));
  let p = hit || active.find((x) => x.type === "직접 지시");
  if (!p) {
    const r = d.prepare("INSERT INTO projects (client, name, type, brief, budget_usd) VALUES ('내부','직접 지시','직접 지시','채팅·프로필에서 바로 시킨 단건 업무',30)").run();
    p = d.prepare("SELECT * FROM projects WHERE id = ?").get(Number(r.lastInsertRowid)) as Project;
  }
  const ins = d.prepare("INSERT OR IGNORE INTO assignments (project_id, agent_id) VALUES (?,?)");
  for (const id of agentIds) ins.run(p.id, id);
  return p;
}

/** 전체 지시 시작: PM 접수 → 담당자 역할 선언(순차) → 작업 생성 */
export function startDirective(w: WorldPort, u: User, body: string, opts: { source?: string; context?: string } = {}): DirectiveRow | null {
  const d = db();
  const agents = d.prepare("SELECT * FROM agents WHERE active = 1").all() as Agent[];
  const pm = agents.find((a) => a.slug === PM_SLUG); if (!pm) return null;
  const team = pickTeam(body, agents); if (!team.length) return null;
  const project = resolveProject(d, body, [pm.id, ...team.map((a) => a.id)]);
  const clean = stripBroadcast(body); const short = shortTitle(body);
  const ins = d.prepare("INSERT INTO tasks (project_id, title, brief, requester_id, assignee_agent_id, priority) VALUES (?,?,?,?,?,2)");
  const taskIds: number[] = [];
  const ctx = opts.context ? `\n\n[지시자가 함께 넘긴 맥락]\n${opts.context}` : "";
  for (const a of team) { const r = ROLE[a.slug]; const t = ins.run(project.id, `${short} — ${r?.suffix || a.role_title}`.slice(0, 120), ((r ? r.brief(clean) : `전체 지시 「${clean}」 중 ${a.role_title} 담당 몫.`) + ctx).slice(0, 4000), u.id, a.id); taskIds.push(Number(t.lastInsertRowid)); }
  const row = d.prepare("INSERT INTO directives (body, requester_id, requester_name, project_id, member_task_ids, source) VALUES (?,?,?,?,?,?)").run(clean, u.id, u.display_name, project.id, JSON.stringify(taskIds), opts.source || "office");
  const dir = d.prepare("SELECT * FROM directives WHERE id = ?").get(Number(row.lastInsertRowid)) as DirectiveRow;
  // PM 접수 → 담당자 순차 역할 선언 → 출근·작업 시작
  const names = team.map((a) => `${a.name}(${a.role_title})`).join(", ");
  w.summon(pm.id);
  if (opts.source && opts.source !== "office") w.say("system", 0, "무결", `${opts.source}에서 넘어온 지시: 「${short}」`);
  setTimeout(() => w.say("agent", pm.id, pm.name, `${u.display_name}님 지시 접수했습니다. 「${short}」 — 참여: ${names}. 각자 역할 정리해 주세요. 산출물이 모두 들어오면 제가 종합해서 아카이브합니다.`), 700);
  team.forEach((a, i) => setTimeout(() => { w.summon(a.id); w.say("agent", a.id, a.name, ROLE[a.slug]?.claim(clean) || `${a.role_title} 몫은 제가 맡겠습니다.`); }, 1800 + i * 1300));
  setTimeout(() => w.notifyTasksChanged(), 1800 + team.length * 1300);
  return dir;
}

const TERMINAL = new Set(["review", "approved", "rejected", "blocked"]);
/** 작업 하나가 끝났을 때 — 소속 지시의 진척 확인 → 종합 작업 생성 또는 아카이브 확정 */
export function onTaskFinished(w: WorldPort, taskId: number, artifactId?: number) {
  const d = db();
  const asSummary = d.prepare("SELECT * FROM directives WHERE summary_task_id = ? AND status = 'summarizing'").get(taskId) as DirectiveRow | undefined;
  if (asSummary) {
    d.prepare("UPDATE directives SET status='archived', summary_artifact_id=?, archived_at=datetime('now') WHERE id = ?").run(artifactId ?? null, asSummary.id);
    const pm = d.prepare("SELECT * FROM agents WHERE slug = ?").get(PM_SLUG) as Agent | undefined;
    if (pm) w.say("agent", pm.id, pm.name, `「${shortTitle(asSummary.body)}」 종합 정리 끝. 담당자별 산출물 묶어서 아카이브에 보관했습니다. (아카이브 #${asSummary.id})`);
    return;
  }
  const open = d.prepare("SELECT * FROM directives WHERE status = 'open'").all() as DirectiveRow[];
  for (const dir of open) {
    const ids = JSON.parse(dir.member_task_ids) as number[]; if (!ids.includes(taskId)) continue;
    const tasks = ids.map((id) => d.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined).filter((t): t is Task => !!t);
    if (!tasks.every((t) => TERMINAL.has(t.status))) return;
    const pm = d.prepare("SELECT * FROM agents WHERE slug = ?").get(PM_SLUG) as Agent | undefined; if (!pm) return;
    // 종합 브리프: 지시 원문 + 담당자별 산출물 본문
    const secs = tasks.map((t) => {
      const a = d.prepare("SELECT name, role_title FROM agents WHERE id = ?").get(t.assignee_agent_id) as { name: string; role_title: string } | undefined;
      const art = d.prepare("SELECT * FROM artifacts WHERE task_id = ? ORDER BY id DESC LIMIT 1").get(t.id) as Artifact | undefined;
      return `### ${a?.name || "?"} · ${art?.title || t.title} [${t.status}]\n${art ? art.body_md : `(산출물 없음 — 작업 상태 ${t.status})`}`;
    });
    const brief = `지시: ${dir.body}\n지시자: ${dir.requester_name}\n참여: ${tasks.map((t) => (d.prepare("SELECT name FROM agents WHERE id = ?").get(t.assignee_agent_id) as { name: string } | undefined)?.name).filter(Boolean).join(", ")}\n\n담당자별 산출물을 아래에 붙였다. 이를 종합해 (1) 지시 요약 (2) 담당자별 핵심 결론 (3) 산출물 간 충돌·공백 (4) 다음 액션 순으로 정리한 아카이브 문서를 만들 것.\n\n${secs.join("\n\n")}`.slice(0, 60000);
    const r = d.prepare("INSERT INTO tasks (project_id, title, brief, requester_id, assignee_agent_id, priority) VALUES (?,?,?,?,?,1)").run(dir.project_id, `[종합] ${shortTitle(dir.body)}`.slice(0, 120), brief, dir.requester_id, pm.id);
    d.prepare("UPDATE directives SET status='summarizing', summary_task_id=? WHERE id = ?").run(Number(r.lastInsertRowid), dir.id);
    w.summon(pm.id);
    setTimeout(() => w.say("agent", pm.id, pm.name, `「${shortTitle(dir.body)}」 담당자 산출물이 모두 들어왔습니다. 종합 정리 들어갑니다.`), 600);
    w.notifyTasksChanged();
    return;
  }
}

export interface DirectiveView extends DirectiveRow { project_name: string; members: { task_id: number; agent_name: string; role_title: string; title: string; status: string; artifact_id: number | null }[]; summary_title: string | null; }
export function listDirectives(): DirectiveView[] {
  const d = db();
  const rows = d.prepare("SELECT dr.*, p.name AS project_name FROM directives dr JOIN projects p ON p.id = dr.project_id ORDER BY dr.id DESC").all() as (DirectiveRow & { project_name: string })[];
  return rows.map((r) => {
    const ids = JSON.parse(r.member_task_ids) as number[];
    const members = ids.map((id) => d.prepare("SELECT t.id AS task_id, a.name AS agent_name, a.role_title, t.title, t.status, (SELECT x.id FROM artifacts x WHERE x.task_id = t.id ORDER BY x.id DESC LIMIT 1) AS artifact_id FROM tasks t LEFT JOIN agents a ON a.id = t.assignee_agent_id WHERE t.id = ?").get(id) as DirectiveView["members"][number] | undefined).filter((m): m is DirectiveView["members"][number] => !!m);
    const st = r.summary_artifact_id ? (d.prepare("SELECT title FROM artifacts WHERE id = ?").get(r.summary_artifact_id) as { title: string } | undefined)?.title || null : null;
    return { ...r, members, summary_title: st };
  });
}

/** 외부(클로드 코드 등)에서 넘어온 내용을 곧바로 아카이브 문서로 보관 — LLM 호출 없음, 비용 0 */
export function archiveExternal(w: WorldPort, u: User, input: { title: string; body: string; source: string }): { directiveId: number; artifactId: number } {
  const d = db();
  const pm = d.prepare("SELECT * FROM agents WHERE slug = ?").get(PM_SLUG) as Agent | undefined; if (!pm) throw new Error("PM 에이전트 없음");
  const project = resolveProject(d, input.title, [pm.id]);
  const title = input.title.trim().slice(0, 120);
  const t = d.prepare("INSERT INTO tasks (project_id, title, brief, requester_id, assignee_agent_id, status, priority) VALUES (?,?,?,?,?,'approved',3)").run(project.id, `[아카이브] ${title}`.slice(0, 120), `${input.source}에서 넘어온 기록`, u.id, pm.id);
  const body = `# ${title}\n\n**출처** ${input.source} · **기록자** ${u.display_name} · **일시** ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}\n\n${input.body.trim()}`;
  const a = d.prepare("INSERT INTO artifacts (task_id, agent_id, kind, title, body_md, status, approved_by) VALUES (?,?,?,?,?,'approved',?)").run(Number(t.lastInsertRowid), pm.id, "report", title.slice(0, 80), body.slice(0, 200000), u.id);
  const r = d.prepare("INSERT INTO directives (body, requester_id, requester_name, project_id, member_task_ids, summary_task_id, summary_artifact_id, status, archived_at, source) VALUES (?,?,?,?,'[]',?,?,'archived',datetime('now'),?)").run(title, u.id, u.display_name, project.id, Number(t.lastInsertRowid), Number(a.lastInsertRowid), input.source);
  w.say("system", 0, "무결", `${input.source}에서 아카이브 추가: 「${title}」 (아카이브 #${Number(r.lastInsertRowid)})`);
  return { directiveId: Number(r.lastInsertRowid), artifactId: Number(a.lastInsertRowid) };
}
