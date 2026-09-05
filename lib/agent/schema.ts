export interface AgentOutput {
  kind: "concept" | "copy" | "layout" | "list" | "report" | "brief" | "proposal" | "other";
  title: string;
  body_md: string;
  message: string;
  image_request?: { prompt: string; style?: string; size?: string } | null;
}
export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "title", "body_md", "message", "image_request"],
  properties: {
    kind: { type: "string", enum: ["concept", "copy", "layout", "list", "report", "brief", "proposal", "other"] },
    title: { type: "string", description: "산출물 제목 (40자 이내)" },
    body_md: { type: "string", description: "산출물 본문. 마크다운. 승인자가 바로 읽을 수 있게 구조화." },
    message: { type: "string", description: "오피스 채팅에 남길 한 줄 보고 (60자 이내)" },
    image_request: {
      anyOf: [
        { type: "null" },
        { type: "object", additionalProperties: false, required: ["prompt", "style", "size"], properties: { prompt: { type: "string", description: "영문 이미지 생성 프롬프트 (젠스파크용)" }, style: { type: "string" }, size: { type: "string", enum: ["1024x1024", "1024x1280", "1280x1024", "1024x1792"] } } },
      ],
      description: "이미지가 필요할 때만. request_image 툴이 없으면 null.",
    },
  },
} as const;
