import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listTasks, listProjects, listAgents } from "@/lib/queries";
import { TasksClient } from "./client";
export const dynamic = "force-dynamic";
export default async function Tasks() {
  const s = await getSession(); if (!s) redirect("/login");
  return <TasksClient tasks={listTasks()} projects={listProjects().filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name }))} agents={listAgents().filter((a) => a.active).map((a) => ({ id: a.id, name: a.name, role: a.role_title }))} />;
}
