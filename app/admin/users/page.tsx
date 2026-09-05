import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/queries";
import { UsersAdmin } from "./client";
export const dynamic = "force-dynamic";
export default async function AdminUsers() { const s = await getSession(); if (!s || s.role !== "ceo") redirect("/office"); return <UsersAdmin users={listUsers()} />; }
