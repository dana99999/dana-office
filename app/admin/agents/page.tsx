import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listAgents, listUsers } from "@/lib/queries";
import { AgentsAdmin } from "./client";
export const dynamic = "force-dynamic";
export default async function AdminAgents() { const s = await getSession(); if (!s || s.role !== "ceo") redirect("/office"); return <AgentsAdmin agents={listAgents()} users={listUsers().map((u) => ({ id: u.id, name: u.display_name }))} />; }
