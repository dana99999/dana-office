/** 정산 · 계약 — 화면/서버 공용 상수·타입·포맷 (DB 의존 없음, 클라이언트에서도 import 가능) */
export type DealStatus = "quote" | "active" | "delivered" | "settled" | "hold" | "lost";
export type EntryKind = "in" | "out" | "inv_out" | "inv_in" | "contract" | "quote" | "note";
export type EntryStatus = "plan" | "done" | "cancel";

/** pass_through = 경유 자금(받아서 그대로 넘기고 수수료만 남는 건) — 받을 돈·줄 돈 합계와 따로 본다 */
export type Deal = { id: number; client: string; name: string; status: DealStatus; folder: string; memo: string; due_date: string | null; pass_through: number; created_at: string; updated_at: string };
export type Entry = { id: number; deal_id: number; kind: EntryKind; status: EntryStatus; date: string | null; due_date: string | null; party: string; title: string; amount: number; vat: number; memo: string; source: string; created_at: string; updated_at: string };
export type DealSum = { contract: number; quote: number; received: number; receivable: number; receivableVat: number; paid: number; payable: number; margin: number; openMargin: number; invOut: number; invOutPlan: number; invInPlan: number; overdue: number; next: Entry | null };
export type DealView = Deal & { sum: DealSum; entries: Entry[] };

/** [라벨, chip 클래스] */
export const DEAL_STATUS: Record<DealStatus, [string, string]> = {
  quote: ["견적", "away"], active: ["진행", "work"], delivered: ["납품 · 검수", "idle"], settled: ["정산 완료", "away"], hold: ["보류", "bad"], lost: ["무산", "away"],
};
export const DEAL_ORDER: DealStatus[] = ["active", "delivered", "quote", "hold", "settled", "lost"];

/** 같은 kind라도 예정/완료에 따라 부르는 이름이 다르다 (받을 돈 → 입금) */
export const KIND: Record<EntryKind, { label: string; plan: string; done: string; chip: string }> = {
  in: { label: "입금", plan: "받을 돈", done: "입금", chip: "work" },
  out: { label: "지급", plan: "줄 돈", done: "지급", chip: "move" },
  inv_out: { label: "매출 계산서", plan: "발행 예정", done: "계산서 발행", chip: "inv-out" },
  inv_in: { label: "매입 계산서", plan: "받아야 함", done: "계산서 받음", chip: "inv-in" },
  contract: { label: "계약", plan: "계약 예정", done: "계약", chip: "client" },
  quote: { label: "견적", plan: "견적 대기", done: "견적 확정", chip: "away" },
  note: { label: "메모", plan: "메모", done: "메모", chip: "away" },
};
export const KINDS = Object.keys(KIND) as EntryKind[];
export const ENTRY_STATUS: Record<EntryStatus, string> = { plan: "예정", done: "완료", cancel: "취소" };

export const kindLabel = (e: Pick<Entry, "kind" | "status">) => (e.status === "plan" ? KIND[e.kind].plan : KIND[e.kind].done);
export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
/** 2,664.65만 같은 만원 단위 */
export const man = (n: number) => { const v = Math.round(n / 100) / 100; return `${v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}만`; };
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
export const md = (d: string | null) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : "—");
export const isLate = (e: Entry, td = today()) => e.status === "plan" && !!e.due_date && e.due_date < td && (e.kind === "in" || e.kind === "out" || e.kind === "inv_out" || e.kind === "inv_in");
