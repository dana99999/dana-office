/** 아주 작은 마크다운 → HTML (제목·목록·표·인용·굵게·코드·이미지). 입력은 먼저 이스케이프 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
function inline(s: string) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/_(.+?)_/g, "<i>$1</i>"); }
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n"); const out: string[] = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { i++; continue; }
    const h = l.match(/^(#{1,3})\s+(.*)/); if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^>\s?/.test(l)) { const b: string[] = []; while (i < lines.length && /^>\s?/.test(lines[i])) b.push(inline(lines[i].replace(/^>\s?/, ""))); out.push(`<blockquote>${b.join("<br>")}</blockquote>`); continue; }
    if (/^\|/.test(l)) { const rows: string[][] = []; while (i < lines.length && /^\|/.test(lines[i])) { const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells); i++; }
      if (rows.length) { const [head, ...body] = rows; out.push(`<div class="scroll"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); } continue; }
    if (/^\s*[-*]\s+/.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`), i++; out.push(`<ul>${items.join("")}</ul>`); continue; }
    if (/^\s*\d+\.\s+/.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`), i++; out.push(`<ol>${items.join("")}</ol>`); continue; }
    const img = l.match(/^!\[(.*?)\]\((\S+)\)/); if (img && /^(https?:\/\/|\/api\/files\/)/.test(img[2])) { out.push(`<img alt="${esc(img[1])}" src="${esc(img[2])}">`); i++; continue; }
    const p: string[] = []; while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|>|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) p.push(inline(lines[i])), i++; out.push(`<p>${p.join("<br>")}</p>`);
  }
  return out.join("\n");
}
