/** 맵·경로 — 서버/클라이언트 공용 (순수 함수만) */
export const TS = 48, COLS = 24, ROWS = 13;
export const W = COLS * TS, H = ROWS * TS;
export const MAP = [
  "########################",
  "#.....#..........#.....#",
  "#.....#..........#.....#",
  "#..D..#.D.D.D.D..#.D.D.#",
  "#....B#P........P#O...P#",
  "E......................#",
  "#...............D......#",
  "#.....#..........#.....#",
  "#.C...#.D.D.D.D..#.TTT.#",
  "#.C.K.#..........#.TTT.#",
  "#.....#..........#.....#",
  "#.PP.W#P........P#....S#",
  "########################",
];
export const ENTRANCE: [number, number] = [0, 5];
export const WINDOWS = [1, 4, 7, 15, 18, 22];
export type Tile = [number, number];
export interface Zone { key: string; x1: number; y1: number; x2: number; y2: number; rug: [string, string]; border: string; inner: string; }
export const ZONES: Zone[] = [
  { key: "ceo", x1: 1, y1: 1, x2: 5, y2: 4, rug: ["#c9bfd9", "#bfb4d1"], border: "#ada0c4", inner: "#d7cfe4" },
  { key: "design", x1: 7, y1: 1, x2: 16, y2: 4, rug: ["#a9c9cf", "#9fc0c7"], border: "#8fb2ba", inner: "#bcd6db" },
  { key: "sales", x1: 18, y1: 1, x2: 22, y2: 4, rug: ["#e9c6ae", "#e0bba2"], border: "#d1a98f", inner: "#f0d5c2" },
  { key: "growth", x1: 7, y1: 7, x2: 16, y2: 11, rug: ["#b6cfb4", "#acc6aa"], border: "#9bb899", inner: "#c8dcc6" },
  { key: "meet", x1: 18, y1: 7, x2: 22, y2: 11, rug: ["#c8c2d8", "#bfb8d0"], border: "#ada5c2", inner: "#d6d1e2" },
];
export const LOUNGE = { x1: 1, y1: 7, x2: 5, y2: 11 };
export const WANDER = {
  lounge: [[1, 8], [3, 8], [1, 9], [3, 9], [4, 10], [3, 10]] as Tile[],
  meet: [[18, 8], [18, 9], [22, 8], [22, 9], [19, 7], [21, 7], [19, 10], [21, 10]] as Tile[],
  corridor: [[4, 5], [7, 6], [12, 5], [19, 6], [2, 6], [21, 5]] as Tile[],
};
/** 방 라벨 — 복도(5·6행)에, 방 가로 중앙 정렬 */
export const ZONE_LABELS: [string, number, number][] = [["대표실", 3.5, 5.45], ["디자인", 12, 5.45], ["세일즈", 20.5, 5.45], ["탕비실", 3.5, 6.55], ["그로스", 12, 6.55], ["회의실", 20.5, 6.55], ["서버룸", 22.2, 11.9]];
/** 사람용 예비 좌석 (책상 위 타일) */
export const FREE_SEATS: Tile[] = [[14, 2], [14, 9], [8, 2], [8, 9]];

export function at(x: number, y: number): string { if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return "#"; return MAP[y][x]; }
export function blocked(x: number, y: number): boolean { return "#DBTCKPSOW".indexOf(at(x, y)) >= 0; } // R(구 리셉션 사인 자리)은 통행 가능
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

/** 좌석 타일 기준 책상 방향: 책상이 아래(y+1)면 "down", 위(y-1)면 "up" */
export type Facing = "down" | "up";
export function deskOf(seat: Tile): { desk: Tile; facing: Facing } | null {
  if (at(seat[0], seat[1] + 1) === "D") return { desk: [seat[0], seat[1] + 1], facing: "down" };
  if (at(seat[0], seat[1] - 1) === "D") return { desk: [seat[0], seat[1] - 1], facing: "up" };
  return null;
}
/** 책상 타일 기준 방향: 위쪽이 방의 위 절반(1~4행)이면 의자가 위(down), 아래 절반이면 의자가 아래(up) */
export function deskFacing(x: number, y: number): Facing { return y >= 7 ? "up" : "down"; }
