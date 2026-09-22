/**
 * CPU の思考ルーチン。盤面ロジック（reversi.ts）だけに依存する純粋な関数群。
 *
 * - よわい : 合法手からランダム
 * - ふつう : 2手先読み + ゆらぎ（たまに悪手も打つ）
 * - つよい : 5手先読み（αβ枝刈り）。残り12マス以下は最後まで読み切る
 */
import { applyMove, getFlips, opponent, SIZE, type Board, type Player } from './reversi'

export type CpuLevel = 'easy' | 'normal' | 'hard'

export const CPU_LEVELS: readonly CpuLevel[] = ['easy', 'normal', 'hard']

export const CPU_LEVEL_LABEL: Record<CpuLevel, string> = {
  easy: 'よわい',
  normal: 'ふつう',
  hard: 'つよい',
}

/** 位置の価値。角が最重要、角のとなり（X/C打ち）は危険 */
const BASE_WEIGHTS: readonly number[] = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
]

/** 角と、その角が埋まると危険でなくなるマス */
const CORNER_NEIGHBORS: ReadonlyArray<readonly [number, readonly number[]]> = [
  [0, [1, 8, 9]],
  [7, [6, 15, 14]],
  [56, [57, 48, 49]],
  [63, [62, 55, 54]],
]

const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9] as const

/** 着手可能か（反転する石が1つでもあるか）をアロケーションなしで調べる */
function canPlace(board: Board, at: number, player: Player): boolean {
  if (board[at] !== 0) return false
  const foe = opponent(player)
  const col = at % SIZE

  for (const d of DIRECTIONS) {
    const dc = d === -9 || d === -1 || d === 7 ? -1 : d === -7 || d === 1 || d === 9 ? 1 : 0
    let i = at + d
    let c = col + dc
    let seen = 0
    while (i >= 0 && i < 64 && c >= 0 && c < SIZE && board[i] === foe) {
      i += d
      c += dc
      seen++
    }
    if (seen > 0 && i >= 0 && i < 64 && c >= 0 && c < SIZE && board[i] === player) return true
  }
  return false
}

export function listMoves(board: Board, player: Player): number[] {
  const moves: number[] = []
  for (let i = 0; i < 64; i++) if (canPlace(board, i, player)) moves.push(i)
  return moves
}

function weightsFor(board: Board): number[] {
  const w = BASE_WEIGHTS.slice()
  for (const [corner, neighbors] of CORNER_NEIGHBORS) {
    if (board[corner] !== 0) for (const n of neighbors) w[n] = 5
  }
  return w
}

function discDiff(board: Board, player: Player): { diff: number; empty: number } {
  let diff = 0
  let empty = 0
  for (const cell of board) {
    if (cell === 0) empty++
    else diff += cell === player ? 1 : -1
  }
  return { diff, empty }
}

const WIN_SCORE = 100_000

/** 終局時のスコア。勝ちは大きく、さらに石差が大きいほど良い */
function terminalScore(board: Board, player: Player): number {
  const { diff } = discDiff(board, player)
  if (diff > 0) return WIN_SCORE + diff
  if (diff < 0) return -WIN_SCORE + diff
  return 0
}

/** 手番側から見た局面の評価値 */
export function evaluate(board: Board, player: Player): number {
  const foe = opponent(player)
  const w = weightsFor(board)
  let positional = 0
  for (let i = 0; i < 64; i++) {
    if (board[i] === player) positional += w[i]
    else if (board[i] === foe) positional -= w[i]
  }

  const myMoves = listMoves(board, player).length
  const foeMoves = listMoves(board, foe).length
  const mobility = (myMoves - foeMoves) * 8

  const { diff, empty } = discDiff(board, player)
  // 終盤ほど石数そのものを重視する
  const material = empty < 16 ? diff * (16 - empty) : 0

  return positional + mobility + material
}

function orderMoves(moves: number[]): number[] {
  return moves.sort((a, b) => BASE_WEIGHTS[b] - BASE_WEIGHTS[a])
}

function negamax(board: Board, player: Player, depth: number, alpha: number, beta: number, passed: boolean): number {
  const { empty } = discDiff(board, player)
  if (empty === 0) return terminalScore(board, player)
  if (depth <= 0) return evaluate(board, player)

  const moves = listMoves(board, player)
  if (moves.length === 0) {
    if (passed) return terminalScore(board, player)
    return -negamax(board, opponent(player), depth, -beta, -alpha, true)
  }

  let best = -Infinity
  for (const m of orderMoves(moves)) {
    const child = applyMove(board, m, player, getFlips(board, m, player))
    const score = -negamax(child, opponent(player), depth - 1, -beta, -alpha, false)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

type SearchOptions = { depth: number; endgameEmpties: number; noise: number; blunderRate: number }

const SETTINGS: Record<Exclude<CpuLevel, 'easy'>, SearchOptions> = {
  normal: { depth: 2, endgameEmpties: 0, noise: 25, blunderRate: 0.12 },
  hard: { depth: 5, endgameEmpties: 12, noise: 0, blunderRate: 0 },
}

/**
 * CPU の着手を決める。打てる手がなければ null。
 * rng を差し替えられるようにしてあるのはテストのため。
 */
export function chooseMove(board: Board, player: Player, level: CpuLevel, rng: () => number = Math.random): number | null {
  const moves = listMoves(board, player)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  const pickRandom = () => moves[Math.floor(rng() * moves.length)]
  if (level === 'easy') return pickRandom()

  const opts = SETTINGS[level]
  if (rng() < opts.blunderRate) return pickRandom()

  const { empty } = discDiff(board, player)
  const depth = empty <= opts.endgameEmpties ? empty : opts.depth

  let bestMove = moves[0]
  let bestScore = -Infinity
  let alpha = -Infinity
  const beta = Infinity

  for (const m of orderMoves(moves)) {
    const child = applyMove(board, m, player, getFlips(board, m, player))
    let score = -negamax(child, opponent(player), depth - 1, -beta, -alpha, false)
    if (opts.noise > 0) score += (rng() * 2 - 1) * opts.noise
    if (score > bestScore) {
      bestScore = score
      bestMove = m
    }
    // ゆらぎを入れるレベルでは枝刈りの基準を固定しない（ゆらぎで順位が変わるため）
    if (opts.noise === 0 && bestScore > alpha) alpha = bestScore
  }
  return bestMove
}
