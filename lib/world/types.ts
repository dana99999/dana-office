import type { Look, PresenceState } from "../types";
export type Dir = "up" | "down" | "left" | "right";
export interface ActorSnap {
  kind: "agent" | "human"; id: number; name: string; role: string; look: Look; zone: string;
  seat: [number, number]; x: number; y: number; px: number; py: number; dir: Dir; moving: boolean;
  state: PresenceState | "online"; mode: "work" | "idle" | "talk" | "meet" | "busy"; queue: number; screen: string; present: boolean;
}
export interface WorldSnapshot { t: number; hour: number; actors: ActorSnap[]; }
export type WorldEvent =
  | { type: "snapshot"; data: WorldSnapshot }
  | { type: "say"; data: { kind: "agent" | "human" | "system"; id: number; name: string; body: string; ts: string; channel: string } }
  | { type: "presence"; data: { agentId: number; state: PresenceState; name: string } }
  | { type: "task"; data: { taskId: number; status: string; agentId: number | null; title: string } }
  | { type: "alert"; data: { level: string; body: string } };
