import { describe, expect, it } from 'vitest'
import { chooseMove, CPU_LEVELS, listMoves } from './ai'
import { applyMove, createInitialBoard, getFlips, getLegalMoves, index, opponent, type Board, type Cell, type Player } from './reversi'

function boardFrom(rows: string[]): Board {
  const cells: Cell[] = []
  for (const row of rows) for (const ch of row) cells.push(ch === 'b' ? 1 : ch === 'w' ? 2 : 0)
  return cells
}

/** 再現性のある乱数 */
function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
}

describe('listMoves', () => {
  it('盤面ロジックの合法手と一致する', () => {
    const board = createInitialBoard()
    expect(listMoves(board, 1).sort()).toEqual([...getLegalMoves(board, 1).keys()].sort())
    expect(listMoves(board, 2).sort()).toEqual([...getLegalMoves(board, 2).keys()].sort())
  })

  it('盤の端をまたいで反対側に回り込まない', () => {
    // h1 の白と a2 の黒は隣の index だが、盤上ではつながっていない
    const board = boardFrom([
      '......wb',
      'b.......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(listMoves(board, 1)).toEqual([index(0, 5)])
  })
})

describe('chooseMove', () => {
  it.each(CPU_LEVELS)('%s は必ず合法手を返す', (level) => {
    const board = createInitialBoard()
    const legal = new Set(getLegalMoves(board, 2).keys())
    const rng = seeded(7)
    for (let i = 0; i < 20; i++) {
      const move = chooseMove(board, 2, level, rng)
      expect(move).not.toBeNull()
      expect(legal.has(move!)).toBe(true)
    }
  })

  it('打てる手がなければ null', () => {
    const board = boardFrom(['bb......', '........', '........', '........', '........', '........', '........', '........'])
    expect(chooseMove(board, 2, 'hard')).toBeNull()
  })

  it('つよい は取れる角を逃さない', () => {
    // 白が a1 に打てば角が取れる。ほかの手もある局面
    const board = boardFrom([
      '.bbbbbw.',
      'bb......',
      'b.b.....',
      'b..bw...',
      'b...w...',
      'w.......',
      '........',
      '........',
    ])
    expect(getLegalMoves(board, 2).has(index(0, 0))).toBe(true)
    expect(getLegalMoves(board, 2).size).toBeGreaterThan(1)
    expect(chooseMove(board, 2, 'hard', seeded(1))).toBe(index(0, 0))
  })

  it('つよい は終盤で総当たりの最善手と同じ結果を出す', () => {
    // 乱数で終盤まで進めた局面を複数作り、総当たりで求めた最終石差と比べる
    let checked = 0
    for (let seed = 1; checked < 8 && seed < 200; seed++) {
      const rng = seeded(seed)
      let board: Board = createInitialBoard()
      let turn: Player = 1
      while (board.filter((c) => c === 0).length > 9) {
        const moves = listMoves(board, turn)
        if (moves.length === 0) {
          if (listMoves(board, opponent(turn)).length === 0) break
          turn = opponent(turn)
          continue
        }
        const m = moves[Math.floor(rng() * moves.length)]
        board = applyMove(board, m, turn, getFlips(board, m, turn))
        turn = opponent(turn)
      }
      if (listMoves(board, turn).length < 2) continue

      const best = Math.max(...listMoves(board, turn).map((m) => -solve(applyMove(board, m, turn, getFlips(board, m, turn)), opponent(turn))))
      const chosen = chooseMove(board, turn, 'hard')!
      const got = -solve(applyMove(board, chosen, turn, getFlips(board, chosen, turn)), opponent(turn))
      expect(got).toBe(best)
      checked++
    }
    expect(checked).toBe(8)
  })
})

/** 最後まで総当たりした最終石差（手番側から見て） */
function solve(board: Board, turn: Player, passed = false): number {
  const moves = listMoves(board, turn)
  if (moves.length === 0) {
    if (passed) {
      let d = 0
      for (const c of board) if (c !== 0) d += c === turn ? 1 : -1
      return d
    }
    return -solve(board, opponent(turn), true)
  }
  let best = -Infinity
  for (const m of moves) best = Math.max(best, -solve(applyMove(board, m, turn, getFlips(board, m, turn)), opponent(turn)))
  return best
}
