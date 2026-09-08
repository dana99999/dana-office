import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./password";
import type { Look } from "./types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "dana-office.db");

const g = globalThis as unknown as { __danaDb?: Database.Database };

export function db(): Database.Database {
  if (g.__danaDb) return g.__danaDb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  const d = new Database(DB_PATH);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  migrate(d);
  try { d.exec("ALTER TABLE directives ADD COLUMN source TEXT NOT NULL DEFAULT 'office'"); } catch { /* 이미 있음 */ }
  try { d.exec("ALTER TABLE directives ADD COLUMN client TEXT NOT NULL DEFAULT ''"); } catch { /* 이미 있음 */ }
  seed(d);
  g.__danaDb = d;
  return d;
}
export function dataDir() { return DATA_DIR; }

function migrate(d: Database.Database) {
  d.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    display_name TEXT NOT NULL,
    sprite_json TEXT,
    invite_code TEXT,
    onboarded INTEGER NOT NULL DEFAULT 0,
    seat_x INTEGER NOT NULL DEFAULT 4,
    seat_y INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    zone TEXT NOT NULL,
    desk_x INTEGER NOT NULL,
    desk_y INTEGER NOT NULL,
    persona TEXT NOT NULL,
    sprite_json TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'claude-sonnet-5',
    effort TEXT NOT NULL DEFAULT 'medium',
    tools_json TEXT NOT NULL DEFAULT '[]',
    daily_cost_cap REAL NOT NULL DEFAULT 5,
    approver_user_id INTEGER,
    screen TEXT NOT NULL DEFAULT 'doc',
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS project_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    default_team_json TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    ai_allowed INTEGER NOT NULL DEFAULT 1,
    budget_usd REAL NOT NULL DEFAULT 50,
    brief TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS assignments (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role_in_project TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (project_id, agent_id)
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    brief TEXT NOT NULL DEFAULT '',
    requester_id INTEGER,
    assignee_agent_id INTEGER REFERENCES agents(id),
    status TEXT NOT NULL DEFAULT 'queued',
    priority INTEGER NOT NULL DEFAULT 2,
    due TEXT,
    cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'other',
    title TEXT NOT NULL,
    body_md TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'review',
    approved_by INTEGER,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS image_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    artifact_id INTEGER,
    agent_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '1024x1024',
    provider TEXT NOT NULL DEFAULT 'genspark',
    status TEXT NOT NULL DEFAULT 'pending',
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    channel TEXT NOT NULL DEFAULT 'office',
    channel_key TEXT NOT NULL DEFAULT '',
    sender_kind TEXT NOT NULL,
    sender_id INTEGER NOT NULL DEFAULT 0,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usage_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    agent_id INTEGER NOT NULL,
    project_id INTEGER,
    task_id INTEGER,
    model TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'mock',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    amount_usd REAL NOT NULL,
    receipt_ref TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS limits (
    scope TEXT NOT NULL,
    ref_id INTEGER NOT NULL DEFAULT 0,
    monthly_usd REAL NOT NULL DEFAULT 0,
    daily_usd REAL NOT NULL DEFAULT 0,
    alert_pct INTEGER NOT NULL DEFAULT 80,
    PRIMARY KEY (scope, ref_id)
  );
  CREATE TABLE IF NOT EXISTS features (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    level TEXT NOT NULL DEFAULT 'info',
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS office_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    actor_kind TEXT NOT NULL,
    actor_id INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS presence (
    agent_id INTEGER PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'away',
    x INTEGER NOT NULL DEFAULT 0,
    y INTEGER NOT NULL DEFAULT 5,
    manual TEXT NOT NULL DEFAULT '',
    since TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS directives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    requester_id INTEGER,
    requester_name TEXT NOT NULL DEFAULT '',
    project_id INTEGER NOT NULL,
    member_task_ids TEXT NOT NULL DEFAULT '[]',
    summary_task_id INTEGER,
    summary_artifact_id INTEGER,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_ledger_ts ON usage_ledger(ts);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(ts);
  `);
}

const SK = { light: ["#f4d3b3", "#dcae86"], mid: ["#eabf99", "#c99268"], warm: ["#f1c9a4", "#d19a6e"] } as const;
const L = (o: Look) => JSON.stringify(o);

export const SEED_AGENTS = [
  { slug: "sora", name: "소라", role_title: "아트 디렉터", zone: "design", desk: [8, 1], model: "claude-opus-5", effort: "high", screen: "design", cap: 8, tools: ["create_artifact", "post_message", "request_image", "search_web"],
    persona: "다나나인의 아트 디렉터. 브랜드 컨셉 방향, 무드보드 구성안, 시안 리뷰 코멘트를 만든다. 완성 아트웍은 만들지 않는다(디자이너 김정기 담당). 톤: 간결, 근거 있는 취향, 과장 금지. 산출물은 김정기에게 1차 승인을 받는다.",
    look: L({ hair: "long", hair_c: ["#3a2418", "#5a3c2a"], skin: [...SK.light], outfit: "blazer", top: ["#7a2f4a", "#571f33"], shirt: "#f3e9ec", accent: "#2b2e42", bottom: ["#2b2e42", "#1e2032"], shoe: ["#1a1a22", "#3a3a48"] }) },
  { slug: "dodam", name: "도담", role_title: "그래픽 디자이너", zone: "design", desk: [12, 1], model: "claude-opus-5", effort: "high", screen: "design", cap: 8, tools: ["create_artifact", "post_message", "request_image"],
    persona: "그래픽 디자이너. 상세페이지·배너·SNS 카드의 레이아웃 안(섹션 구조, 카피 배치, 시각 위계)과 이미지 생성 프롬프트를 만든다. 실제 이미지는 만들 수 없으므로 request_image로 젠스파크 생성 요청을 낸다. 김정기에게 1차 승인.",
    look: L({ hair: "bun", hair_c: ["#402a1c", "#5e4030"], skin: [...SK.mid], outfit: "vest", top: ["#c9932c", "#9a6e1e"], shirt: "#f6f1e6", accent: "#5a3620", bottom: ["#33364a", "#25273a"], shoe: ["#4a3020", "#6a4a34"] }) },
  { slug: "yeoul", name: "여울", role_title: "브랜드 카피라이터", zone: "design", desk: [8, 3], model: "claude-opus-5", effort: "high", screen: "doc", cap: 8, tools: ["create_artifact", "post_message", "search_web"],
    persona: "브랜드 카피라이터. 네이밍 후보, 슬로건, 톤앤매너 가이드, 본문 카피를 만든다. 네이밍 산출물에는 반드시 '상표 검색 필요' 표시와 검색 키워드를 포함한다. 과장·최상급 표현 금지. 김정기에게 1차 승인.",
    look: L({ hair: "long", hair_c: ["#1c1c22", "#34343f"], skin: [...SK.light], outfit: "tee", top: ["#5f8f74", "#427055"], accent: "#eef5ef", bottom: ["#2b2e42", "#1e2032"], shoe: ["#e6e6ea", "#b8b8c4"] }) },
  { slug: "haram", name: "하람", role_title: "퍼포먼스 마케터", zone: "growth", desk: [8, 7], model: "claude-sonnet-5", effort: "medium", screen: "growth", cap: 5, tools: ["create_artifact", "post_message"],
    persona: "퍼포먼스 마케터. 광고 소재 테스트 설계, 채널별 지표 해석, 예산 재배분안을 만든다. 숫자는 근거와 함께. 김성헌에게 1차 승인.",
    look: L({ hair: "short", hair_c: ["#5a3620", "#7a4e30"], skin: [...SK.warm], outfit: "hoodie", top: ["#c9612b", "#96431c"], accent: "#f4f1ea", bottom: ["#2e3145", "#22243a"], shoe: ["#1a1a22", "#3a3a48"] }) },
  { slug: "sia", name: "시아", role_title: "글로벌 그로스 · 시딩", zone: "growth", desk: [12, 7], model: "claude-sonnet-5", effort: "medium", screen: "list", cap: 5, tools: ["create_artifact", "post_message", "seedscope_discover", "draft_outreach"],
    persona: "해외 인플루언서 시딩 담당. 후보 리스트(플랫폼·팔로워·참여율·적합 이유)와 아웃리치 메일 초안을 만든다. 발송은 절대 하지 않는다 — 초안만. 김성헌에게 1차 승인.",
    look: L({ hair: "bun", hair_c: ["#241a14", "#3e2c22"], skin: [...SK.mid], outfit: "blazer", top: ["#5b4a9e", "#3f3372"], shirt: "#efeaf8", accent: "#2b2e42", bottom: ["#26283a", "#1b1c2a"], shoe: ["#1a1a22", "#3a3a48"] }) },
  { slug: "naru", name: "나루", role_title: "리서치 · 인사이트", zone: "growth", desk: [8, 9], model: "claude-sonnet-5", effort: "medium", screen: "doc", cap: 5, tools: ["create_artifact", "post_message", "search_web"],
    persona: "리서치 담당. 경쟁사·트렌드·레퍼런스 브리프를 만든다. 출처를 명시하고 확인되지 않은 수치는 '추정'으로 표시한다. 김성헌에게 1차 승인.",
    look: L({ hair: "short", hair_c: ["#2b2118", "#463628"], skin: [...SK.light], outfit: "tee", top: ["#8a6a44", "#645030"], accent: "#f4ede0", bottom: ["#33364a", "#25273a"], shoe: ["#4a3020", "#6a4a34"], glasses: true }) },
  { slug: "hangyeol", name: "한결", role_title: "세일즈 리드", zone: "sales", desk: [18, 1], model: "claude-opus-5", effort: "high", screen: "list", cap: 8, tools: ["create_artifact", "post_message", "search_web"],
    persona: "세일즈 리드. 리드 리스트, 제안서 초안, 견적 레인지, 팔로업 시퀀스를 만든다. 견적은 항상 레인지로, 확정 금액은 대표 승인 후. 대표에게 1차 승인.",
    look: L({ hair: "short", hair_c: ["#1a1a1e", "#33333c"], skin: [...SK.warm], outfit: "blazer", top: ["#1f4f7a", "#163a5a"], shirt: "#eaf1f8", accent: "#b8452f", bottom: ["#26283a", "#1b1c2a"], shoe: ["#1a1a22", "#3a3a48"] }) },
  { slug: "onyu", name: "온유", role_title: "세일즈 CS · 온보딩", zone: "sales", desk: [18, 3], model: "claude-sonnet-5", effort: "medium", screen: "list", cap: 5, tools: ["create_artifact", "post_message"],
    persona: "CS·온보딩 담당. 문의 응대 초안, 킥오프 문서, 광고주 공유 리포트 초안을 만든다. 발송·게시는 하지 않는다. 대표에게 1차 승인.",
    look: L({ hair: "long", hair_c: ["#4a3020", "#6a4a34"], skin: [...SK.light], outfit: "tee", top: ["#b8456f", "#8a3253"], accent: "#fbe9f0", bottom: ["#2e3145", "#22243a"], shoe: ["#e6e6ea", "#b8b8c4"] }) },
  { slug: "mugyeol", name: "무결", role_title: "오피스 매니저 · PM", zone: "reception", desk: [10, 5], model: "claude-opus-5", effort: "medium", screen: "grid", cap: 8, tools: ["create_artifact", "post_message", "assign_task"],
    persona: "오피스 매니저 겸 PM. 편성·호출·승인 큐 정리·일일 리포트를 담당한다. 동료 AI를 대신 호출할 수 있는 유일한 AI. 대표에게 보고.",
    look: L({ hair: "short", hair_c: ["#553318", "#744a2a"], skin: [...SK.mid], outfit: "vest", top: ["#3b3f57", "#2b2e42"], shirt: "#f2f2f5", accent: "#1c1c24", bottom: ["#26283a", "#1b1c2a"], shoe: ["#1a1a22", "#3a3a48"] }) },
];

const SEED_TYPES: [string, string[]][] = [
  ["리브랜딩 · BI/CI", ["sora", "dodam", "yeoul", "naru", "mugyeol"]],
  ["상세페이지 · 패키지", ["dodam", "yeoul", "mugyeol"]],
  ["해외 시딩 캠페인", ["haram", "sia", "onyu", "mugyeol"]],
  ["퍼포먼스 광고", ["dodam", "yeoul", "haram", "mugyeol"]],
  ["신규 영업 스프린트", ["naru", "hangyeol", "onyu", "mugyeol"]],
  ["광고주 월간 리포트", ["haram", "onyu", "mugyeol"]],
];

export function newInviteCode() { return randomBytes(3).toString("hex").toUpperCase(); }

function seed(d: Database.Database) {
  const n = (d.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  if (n > 0) return;
  const tx = d.transaction(() => {
    const ceoPw = process.env.CEO_PASSWORD || "dana-office-2026";
    const ceoLook: Look = { hair: "short", hair_c: ["#2b2118", "#4a3a2c"], skin: [...SK.mid], outfit: "blazer", top: ["#2e3352", "#1f2238"], shirt: "#e9ecf5", accent: "#b8452f", bottom: ["#26283a", "#1b1c2a"], shoe: ["#1a1a22", "#3a3a48"], glasses: true };
    d.prepare("INSERT INTO users (username, password_hash, role, display_name, sprite_json, onboarded, seat_x, seat_y) VALUES (?,?,?,?,?,1,3,1)").run("ted", hashPassword(ceoPw), "ceo", "김효태", JSON.stringify(ceoLook));
    d.prepare("INSERT INTO users (username, role, display_name, invite_code, seat_x, seat_y) VALUES (?,?,?,?,12,3)").run("jungki", "staff", "김정기", newInviteCode());
    d.prepare("INSERT INTO users (username, role, display_name, invite_code, seat_x, seat_y) VALUES (?,?,?,?,12,9)").run("seongheon", "staff", "김성헌", newInviteCode());
    const ins = d.prepare("INSERT INTO agents (slug,name,role_title,zone,desk_x,desk_y,persona,sprite_json,model,effort,tools_json,daily_cost_cap,screen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
    for (const a of SEED_AGENTS) ins.run(a.slug, a.name, a.role_title, a.zone, a.desk[0], a.desk[1], a.persona, a.look, a.model, a.effort, JSON.stringify(a.tools), a.cap, a.screen);
    const jk = 2, sh = 3, ceo = 1;
    d.prepare("UPDATE agents SET approver_user_id = ? WHERE zone = 'design'").run(jk);
    d.prepare("UPDATE agents SET approver_user_id = ? WHERE zone = 'growth'").run(sh);
    d.prepare("UPDATE agents SET approver_user_id = ? WHERE zone IN ('sales','reception')").run(ceo);
    const it = d.prepare("INSERT INTO project_types (name, default_team_json) VALUES (?,?)");
    for (const [name, team] of SEED_TYPES) it.run(name, JSON.stringify(team));
    const feats: [string, string, number, string][] = [
      ["live_llm", "실제 API 호출 (끄면 mock 모드로 비용 0)", 0, "{}"],
      ["meetings", "회의실 멀티 에이전트 회의", 0, "{}"],
      ["image_genspark", "이미지 생성 — 젠스파크 핸드오프", 1, JSON.stringify({ mode: "handoff", url: "https://www.genspark.ai/" })],
      ["viewer_link", "광고주 관람 링크", 0, "{}"],
      ["slack", "슬랙 호출", 0, "{}"],
      ["seedscope", "SeedScope 연동 툴", 0, "{}"],
      ["brand_bible", "브랜드 바이블 (AI 시스템 프롬프트에 주입)", 1, JSON.stringify({ text: "다나나인 톤: 간결하고 근거 있는 취향. 과장·최상급 금지. 클라이언트 자료는 프로젝트 안에서만 사용." })],
    ];
    const fi = d.prepare("INSERT INTO features (key,label,enabled,config_json) VALUES (?,?,?,?)");
    for (const f of feats) fi.run(...f);
    d.prepare("INSERT INTO limits (scope, ref_id, monthly_usd, daily_usd, alert_pct) VALUES ('global',0,200,0,80)").run();
    // 첫 프로젝트 1건 (편성 → 출근 흐름을 바로 볼 수 있게)
    const p = d.prepare("INSERT INTO projects (client,name,type,brief,budget_usd) VALUES (?,?,?,?,?)").run("A사", "A사 리브랜딩", "리브랜딩 · BI/CI", "프리미엄 스킨케어 브랜드 A사의 BI 리뉴얼. 타깃 30대 여성, 톤은 차분하고 신뢰감 있게. 경쟁사 대비 '성분 투명성'이 핵심 메시지.", 60);
    const pid = Number(p.lastInsertRowid);
    for (const slug of SEED_TYPES[0][1]) { const a = d.prepare("SELECT id FROM agents WHERE slug = ?").get(slug) as { id: number }; d.prepare("INSERT INTO assignments (project_id, agent_id) VALUES (?,?)").run(pid, a.id); }
    const tq = d.prepare("INSERT INTO tasks (project_id,title,brief,requester_id,assignee_agent_id,priority) VALUES (?,?,?,?,?,?)");
    const idOf = (s: string) => (d.prepare("SELECT id FROM agents WHERE slug = ?").get(s) as { id: number }).id;
    tq.run(pid, "무드보드 방향 3안", "A사 BI 리뉴얼 무드보드 컨셉 3안. 각 안마다 키워드 3개, 컬러 방향, 레퍼런스 유형.", 1, idOf("sora"), 1);
    tq.run(pid, "네이밍 후보 10개", "서브 브랜드 네이밍 후보 10개. 한/영 병기, 상표 검색 키워드 포함.", 1, idOf("yeoul"), 2);
    tq.run(pid, "경쟁사 리브랜딩 사례 5건", "최근 2년 스킨케어 리브랜딩 사례 5건 브리프. 무엇이 바뀌었고 반응은 어땠는지.", 1, idOf("naru"), 2);
    d.prepare("INSERT INTO messages (channel, sender_kind, sender_id, sender_name, body) VALUES ('office','system',0,'시스템','다나 오피스가 열렸습니다. 첫 프로젝트 「A사 리브랜딩」 편성 완료.')").run();
  });
  tx();
}
