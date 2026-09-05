import { getSession, userById } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./client";
import { defaultLook } from "@/lib/world/engine";
import type { Look } from "@/lib/types";
export default async function Onboarding() {
  const s = await getSession(); if (!s) redirect("/login");
  const u = userById(s.uid)!;
  const look: Look = u.sprite_json ? JSON.parse(u.sprite_json) : defaultLook();
  return <OnboardingClient initial={look} name={u.display_name} first={!u.onboarded} />;
}
