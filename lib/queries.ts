import { db } from "./db";
import type { Agent, Artifact, ImageRequest, Project, ProjectType, Task, User } from "./types";
export const listAgents = () => db().prepare("SELECT * FROM agents ORDER BY id").all() as Agent[];
export const listProjects = () => db().prepare("SELECT * FROM projects ORDER BY status = 'active' DESC, id DESC").all() as Project[];
export const listProjectTypes = () => db().prepare("SELECT * FROM project_types ORDER BY id").all() as ProjectType[];
export const listUsers = () => db().prepare("SELECT id, username, role, display_name, sprite_json, invite_code, onboarded, seat_x, seat_y, created_at FROM users ORDER BY id").all() as User[];
export type TaskRow = Task & { agent_name: string | null; project_name: string; artifact_id: number | null; artifact_status: string | null };
export const listTasks = (where = "1=1", ...args: unknown[]) => db().prepare(`SELECT t.*, a.name AS agent_name, p.name AS project_name,
  (SELECT id FROM artifacts x WHERE x.task_id = t.id ORDER BY x.id DESC LIMIT 1) AS artifact_id,
  (SELECT status FROM artifacts x WHERE x.task_id = t.id ORDER BY x.id DESC LIMIT 1) AS artifact_status
  FROM tasks t LEFT JOIN agents a ON a.id = t.assignee_agent_id JOIN projects p ON p.id = t.project_id WHERE ${where} ORDER BY t.priority, t.id DESC`).all(...args) as TaskRow[];
export type ArtifactRow = Artifact & { agent_name: string; task_title: string; project_name: string; project_id: number; approver_user_id: number | null; image_request_id: number | null; image_prompt: string | null; image_status: string | null };
export const listArtifacts = (where = "1=1", ...args: unknown[]) => db().prepare(`SELECT ar.*, ag.name AS agent_name, ag.approver_user_id, t.title AS task_title, p.name AS project_name, p.id AS project_id,
  ir.id AS image_request_id, ir.prompt AS image_prompt, ir.status AS image_status
  FROM artifacts ar JOIN agents ag ON ag.id = ar.agent_id JOIN tasks t ON t.id = ar.task_id JOIN projects p ON p.id = t.project_id
  LEFT JOIN image_requests ir ON ir.artifact_id = ar.id WHERE ${where} ORDER BY ar.id DESC`).all(...args) as ArtifactRow[];
export const listImageRequests = () => db().prepare("SELECT ir.*, a.name AS agent_name, t.title AS task_title FROM image_requests ir JOIN agents a ON a.id = ir.agent_id JOIN tasks t ON t.id = ir.task_id ORDER BY ir.id DESC").all() as (ImageRequest & { agent_name: string; task_title: string })[];
export const assignmentsOf = (projectId: number) => (db().prepare("SELECT agent_id FROM assignments WHERE project_id = ?").all(projectId) as { agent_id: number }[]).map((r) => r.agent_id);
export const unreadAlerts = () => db().prepare("SELECT * FROM alerts WHERE read = 0 ORDER BY id DESC LIMIT 5").all() as { id: number; ts: string; level: string; body: string }[];
