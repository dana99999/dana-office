export type Role = "ceo" | "staff" | "viewer";
export type Pair = [string, string];
export interface Look {
  hair: "short" | "long" | "bun" | "cap" | "part";
  hair_c: Pair;
  cap?: Pair;
  skin: Pair;
  outfit: "tee" | "hoodie" | "blazer" | "vest";
  top: Pair;
  shirt?: string;
  accent?: string;
  bottom: Pair;
  shoe: Pair;
  glasses?: boolean;
  glasses_c?: string;
  earrings?: boolean;
}
export type PresenceState = "away" | "arriving" | "work" | "idle" | "leaving";
export type TaskStatus = "queued" | "doing" | "review" | "approved" | "rejected" | "blocked";
export type ArtifactKind = "concept" | "copy" | "layout" | "list" | "report" | "brief" | "proposal" | "image_brief" | "other";

export interface User { id: number; username: string; role: Role; display_name: string; sprite_json: string | null; invite_code: string | null; onboarded: number; seat_x: number; seat_y: number; created_at: string; }
export interface Agent { id: number; slug: string; name: string; role_title: string; zone: string; desk_x: number; desk_y: number; persona: string; sprite_json: string; model: string; effort: string; tools_json: string; daily_cost_cap: number; approver_user_id: number | null; screen: string; active: number; }
export interface ProjectType { id: number; name: string; default_team_json: string; }
export interface Project { id: number; client: string; name: string; type: string; status: "active" | "done" | "paused"; ai_allowed: number; budget_usd: number; brief: string; created_at: string; }
export interface Task { id: number; project_id: number; title: string; brief: string; requester_id: number | null; assignee_agent_id: number | null; status: TaskStatus; priority: number; due: string | null; cost_usd: number; created_at: string; updated_at: string; }
export interface Artifact { id: number; task_id: number; agent_id: number; kind: ArtifactKind; title: string; body_md: string; image_url: string | null; status: "review" | "approved" | "rejected"; approved_by: number | null; reason: string | null; created_at: string; }
export interface ImageRequest { id: number; task_id: number; artifact_id: number | null; agent_id: number; prompt: string; style: string; size: string; provider: string; status: "pending" | "done" | "skipped"; image_url: string | null; created_at: string; }
export interface Message { id: number; ts: string; channel: string; channel_key: string; sender_kind: "human" | "agent" | "system"; sender_id: number; sender_name: string; body: string; }
export interface LedgerRow { id: number; ts: string; agent_id: number; project_id: number | null; task_id: number | null; model: string; mode: "mock" | "live"; input_tokens: number; cached_tokens: number; output_tokens: number; cost_usd: number; }
export interface Feature { key: string; enabled: number; config_json: string; label: string; }
