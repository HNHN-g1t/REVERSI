/** 盤面まわりの純粋なロジック。UI からは切り離してあるのでテストしやすい。 */

export const SIZE = 8

/** 0 = 空き, 1 = 黒, 2 = 白 */
export type Cell = 0 | 1 | 2
export type Player = 1 | 2
export type Board = readonly Cell[]

/** 手番と、そのとき置ける場所（index -> ひっくり返る石の index 一覧）*/
export type LegalMoves = ReadonlyMap<number, readonly number[]>

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const

export function opponent(player: Player): Player {
  return player === 1 ? 2 : 1
}

export const index = (row: number, col: number) => row * SIZE + col
export const rowOf = (i: number) => Math.floor(i / SIZE)
export const colOf = (i: number) => i % SIZE

export function createInitialBoard(): Board {
  const board: Cell[] = new Array(SIZE * SIZE).fill(0)
  board[index(3, 3)] = 2
  board[index(3, 4)] = 1
  board[index(4, 3)] = 1
  board[index(4, 4)] = 2
  return board
}

/**
 * そのマスに player が打ったときにひっくり返る石を返す。
 * 打てない場所なら空配列。
 */
export function getFlips(board: Board, at: number, player: Player): number[] {
  if (board[at] !== 0) return []

  const foe = opponent(player)
  const row = rowOf(at)
  const col = colOf(at)
  const flips: number[] = []

  for (const [dr, dc] of DIRECTIONS) {
    const line: number[] = []
    let r = row + dr
    let c = col + dc

    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[index(r, c)] === foe) {
      line.push(index(r, c))
      r += dr
      c += dc
    }

    // 相手の石が続いた先に自分の石があれば、そのぶんを挟める
    if (line.length > 0 && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[index(r, c)] === player) {
      flips.push(...line)
    }
  }

  return flips
}

export function getLegalMoves(board: Board, player: Player): LegalMoves {
  const moves = new Map<number, readonly number[]>()
  for (let i = 0; i < board.length; i++) {
    const flips = getFlips(board, i, player)
    if (flips.length > 0) moves.set(i, flips)
  }
  return moves
}

/** 着手を反映した新しい盤面を返す（元の盤面は変更しない）。 */
export function applyMove(board: Board, at: number, player: Player, flips: readonly number[]): Board {
  const next = board.slice() as Cell[]
  next[at] = player
  for (const i of flips) next[i] = player
  return next
}

export type Score = { black: number; white: number; empty: number }

export function countDiscs(board: Board): Score {
  let black = 0
  let white = 0
  for (const cell of board) {
    if (cell === 1) black++
    else if (cell === 2) white++
  }
  return { black, white, empty: board.length - black - white }
}

export type Outcome =
  | { kind: 'playing' }
  | { kind: 'pass'; player: Player }
  | { kind: 'finished'; winner: Player | null }

/**
 * 着手後の状況を判定する。
 * - 次の手番が打てる          -> playing
 * - 次の手番は打てないが相手は打てる -> pass（手番は戻る）
 * - どちらも打てない          -> finished
 */
export function evaluateTurn(board: Board, nextPlayer: Player): Outcome {
  if (getLegalMoves(board, nextPlayer).size > 0) return { kind: 'playing' }

  const other = opponent(nextPlayer)
  if (getLegalMoves(board, other).size > 0) return { kind: 'pass', player: nextPlayer }

  const { black, white } = countDiscs(board)
  const winner: Player | null = black === white ? null : black > white ? 1 : 2
  return { kind: 'finished', winner }
}

/** "d3" のような棋譜表記。列が a-h、行が 1-8。 */
export function toNotation(at: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + colOf(at)) + (rowOf(at) + 1)
}
