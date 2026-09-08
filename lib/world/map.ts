/** 맵·경로 — 서버/클라이언트 공용 (순수 함수만) */
export const TS = 48, COLS = 22, ROWS = 13;
export const W = COLS * TS, H = ROWS * TS;
export const MAP = [
  "######################",
  "#.....#........#.....#",
  "#..D..#.D...D..#..D.O#",
  "#.TT..#........#.....#",
  "#....B#.D...D..#..D..#",
  "E....................#",
  "#.........R..........#",
  "#.....#........#.....#",
  "#.C...#.D...D..#.TTT.#",
  "#.C.K.#........#.TTT.#",
  "#.....#.D...D..#.....#",
  "#.PP.W#........#....S#",
  "######################",
];
export const ENTRANCE: [number, number] = [0, 5];
export const WINDOWS = [1, 4, 7, 12, 16, 19];
export type Tile = [number, number];
export interface Zone { key: string; x1: number; y1: number; x2: number; y2: number; rug: [string, string]; border: string; inner: string; }
export const ZONES: Zone[] = [
  { key: "ceo", x1: 1, y1: 1, x2: 5, y2: 4, rug: ["#c9bfd9", "#bfb4d1"], border: "#ada0c4", inner: "#d7cfe4" },
  { key: "design", x1: 7, y1: 1, x2: 14, y2: 4, rug: ["#a9c9cf", "#9fc0c7"], border: "#8fb2ba", inner: "#bcd6db" },
  { key: "sales", x1: 16, y1: 1, x2: 20, y2: 4, rug: ["#e9c6ae", "#e0bba2"], border: "#d1a98f", inner: "#f0d5c2" },
  { key: "growth", x1: 7, y1: 7, x2: 14, y2: 11, rug: ["#b6cfb4", "#acc6aa"], border: "#9bb899", inner: "#c8dcc6" },
  { key: "meet", x1: 16, y1: 7, x2: 20, y2: 11, rug: ["#c8c2d8", "#bfb8d0"], border: "#ada5c2", inner: "#d6d1e2" },
];
export const LOUNGE = { x1: 1, y1: 7, x2: 5, y2: 11 };
export const WANDER = {
  lounge: [[1, 8], [3, 8], [1, 9], [3, 9], [4, 10], [3, 10]] as Tile[],
  meet: [[16, 8], [16, 9], [20, 8], [20, 9], [17, 7], [19, 7], [17, 10], [19, 10]] as Tile[],
  corridor: [[4, 5], [7, 6], [14, 5], [17, 6], [2, 6], [19, 5]] as Tile[],
};
export const ZONE_LABELS: [string, number, number][] = [["대표실", 2.6, 4.5], ["디자인", 10.5, 4.5], ["세일즈", 16.6, 4.5], ["정문 · 리셉션", 3.4, 5.5], ["갤러리 · 라운지", 3.5, 6.55], ["그로스", 13.4, 6.55], ["회의실", 18, 6.55], ["서버룸", 20.2, 11.9]];
/** 사람용 예비 좌석 (책상 위 타일) */
export const FREE_SEATS: Tile[] = [[4, 3], [16, 9], [20, 5], [2, 4]];

export function at(x: number, y: number): string { if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return "#"; return MAP[y][x]; }
export function blocked(x: number, y: number): boolean { return "#DBTCKPSORW".indexOf(at(x, y)) >= 0; }
export function inZone(x: number, y: number): Zone | null { for (const z of ZONES) if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) return z; return null; }
export function inLounge(x: number, y: number) { return x >= LOUNGE.x1 && x <= LOUNGE.x2 && y >= LOUNGE.y1 && y <= LOUNGE.y2; }

/** BFS 최단 경로 — from 제외, to 포함. 도달 불가 시 [] */
export function findPath(from: Tile, to: Tile): Tile[] {
  if (from[0] === to[0] && from[1] === to[1]) return [];
  if (blocked(to[0], to[1])) return [];
  const q: Tile[] = [from]; const prev = new Map<string, Tile>(); const seen = new Set<string>([from.join(",")]);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = c[0] + dx, ny = c[1] + dy, k = `${nx},${ny}`;
      if (seen.has(k) || blocked(nx, ny)) continue;
      seen.add(k); prev.set(k, c);
      if (nx === to[0] && ny === to[1]) {
        const out: Tile[] = [[nx, ny]]; let cur: Tile | undefined = c;
        while (cur && !(cur[0] === from[0] && cur[1] === from[1])) { out.unshift(cur); cur = prev.get(cur.join(",")); }
        return out;
      }
      q.push([nx, ny]);
    }
  }
  return [];
}
export function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
