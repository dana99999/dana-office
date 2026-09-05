/** 툴 레지스트리 — 관리자 화면 체크박스와 시스템 프롬프트가 같은 목록을 씀 */
export interface ToolDef { id: string; label: string; desc: string; needsFeature?: string; external?: boolean; }
export const TOOLS: ToolDef[] = [
  { id: "create_artifact", label: "산출물 작성", desc: "마크다운 산출물을 승인 큐에 올린다." },
  { id: "post_message", label: "메시지 게시", desc: "오피스 채팅에 한 줄 보고를 남긴다." },
  { id: "request_image", label: "이미지 생성 요청 (젠스파크)", desc: "이미지 프롬프트를 작성해 젠스파크 생성 요청 카드를 만든다. 사람이 생성·업로드한다.", needsFeature: "image_genspark" },
  { id: "search_web", label: "웹 검색", desc: "리서치를 위한 웹 검색 (live 모드에서 서버 툴 web_search 사용).", external: true },
  { id: "seedscope_discover", label: "SeedScope 인플루언서 발굴", desc: "SeedScope API로 후보를 조회한다.", needsFeature: "seedscope", external: true },
  { id: "draft_outreach", label: "아웃리치 초안", desc: "메일 초안만 작성. 발송은 절대 하지 않는다." },
  { id: "assign_task", label: "작업 배정 (PM 전용)", desc: "동료 AI에게 작업을 배정·호출한다." },
];
export const toolById = (id: string) => TOOLS.find((t) => t.id === id);
