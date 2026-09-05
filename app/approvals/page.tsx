import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listArtifacts, listImageRequests } from "@/lib/queries";
import { gensparkUrl, imageMode } from "@/lib/image/genspark";
import { ApprovalsClient } from "./client";
export const dynamic = "force-dynamic";
export default async function Approvals() {
  const s = await getSession(); if (!s) redirect("/login");
  const mine = s.role === "ceo" ? listArtifacts("ar.status = 'review'") : listArtifacts("ar.status = 'review' AND (ag.approver_user_id = ? OR ag.approver_user_id IS NULL)", s.uid);
  const images = listImageRequests().filter((i) => i.status === "pending");
  return <ApprovalsClient items={mine} images={images} me={{ id: s.uid, role: s.role }} genspark={{ url: gensparkUrl(), mode: imageMode() }} />;
}
