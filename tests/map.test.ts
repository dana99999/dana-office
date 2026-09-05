import { test } from "node:test";
import assert from "node:assert/strict";
import { MAP, COLS, ROWS, findPath, blocked, ENTRANCE, WANDER, FREE_SEATS, at } from "../lib/world/map";

test("맵 행 길이가 모두 22", () => { assert.equal(MAP.length, ROWS); for (const r of MAP) assert.equal(r.length, COLS); });
const seats: [number, number][] = [[3, 1], [12, 3], [12, 9], [8, 1], [12, 1], [8, 3], [8, 7], [12, 7], [8, 9], [18, 1], [18, 3], [10, 5]];
test("모든 좌석·라운지·회의실·예비 좌석이 정문에서 도달 가능", () => {
  for (const t of [...seats, ...WANDER.lounge, ...WANDER.meet, ...WANDER.corridor, ...FREE_SEATS]) { assert.equal(blocked(t[0], t[1]), false, `blocked ${t}`); assert.ok(findPath(ENTRANCE, t).length > 0, `unreachable ${t}`); }
});
test("좌석 아래에는 책상이 있다 (리셉션 제외)", () => { for (const s of seats) if (!(s[0] === 10 && s[1] === 5)) assert.equal(at(s[0], s[1] + 1), "D", `no desk under ${s}`); });
test("막힌 타일로는 경로 없음, 같은 자리면 빈 경로", () => { assert.equal(findPath([1, 5], [0, 0]).length, 0); assert.equal(findPath([1, 5], [1, 5]).length, 0); });
test("BFS는 최단 경로 (정문 → 대표 좌석)", () => { const p = findPath(ENTRANCE, [3, 1]); assert.equal(p.length, 7); assert.deepEqual(p[p.length - 1], [3, 1]); });
