import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listProjects, listProjectTypes, listAgents, assignmentsOf } from "@/lib/queries";
import { db } from "@/lib/db";
import { ProjectsClient } from "./client";
export const dynamic = "force-dynamic";
export default async function Projects() {
  const s = await getSession(); if (!s) redirect("/login");
  const projects = listProjects().map((p) => ({ ...p, team: assignmentsOf(p.id), tasks: (db().prepare("SELECT status, COUNT(*) c FROM tasks WHERE project_id = ? GROUP BY status").all(p.id) as { status: string; c: number }[]) }));
  return <ProjectsClient projects={projects} types={listProjectTypes()} agents={listAgents().filter((a) => a.active).map((a) => ({ id: a.id, name: a.name, role: a.role_title, slug: a.slug }))} />;
}
