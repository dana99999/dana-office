import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OfficeView } from "@/components/office-view";
import { listProjects } from "@/lib/queries";
export const dynamic = "force-dynamic";
export default async function OfficePage() {
  const s = await getSession(); if (!s) redirect("/login");
  const projects = listProjects().filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name }));
  return <OfficeView me={{ id: s.uid, name: s.name, role: s.role }} projects={projects} />;
}
