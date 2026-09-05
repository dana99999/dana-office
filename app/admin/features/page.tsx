import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listProjectTypes, listAgents } from "@/lib/queries";
import type { Feature } from "@/lib/types";
import { FeaturesAdmin } from "./client";
export const dynamic = "force-dynamic";
export default async function AdminFeatures() {
  const s = await getSession(); if (!s || s.role !== "ceo") redirect("/office");
  return <FeaturesAdmin features={db().prepare("SELECT * FROM features ORDER BY rowid").all() as Feature[]} types={listProjectTypes()} agents={listAgents().filter((a) => a.active).map((a) => ({ slug: a.slug, name: a.name }))} env={{ apiKey: !!process.env.ANTHROPIC_API_KEY, genspark: !!process.env.GENSPARK_API_URL, seedscope: !!process.env.SEEDSCOPE_URL }} />;
}
