import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillingClient } from "./client";
export const dynamic = "force-dynamic";
export default async function Billing() { const s = await getSession(); if (!s) redirect("/login"); if (s.role !== "ceo") redirect("/office"); return <BillingClient />; }
