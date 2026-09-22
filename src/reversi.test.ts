import { describe, expect, it } from 'vitest'
import {
  applyMove,
  countDiscs,
  createInitialBoard,
  evaluateTurn,
  getFlips,
  getLegalMoves,
  index,
  opponent,
  toNotation,
  type Board,
  type Cell,
} from './reversi'

/** 8 行の文字列から盤面を作る。'.' 空き / 'b' 黒 / 'w' 白 */
function boardFrom(rows: string[]): Board {
  const cells: Cell[] = []
  for (const row of rows) {
    for (const ch of row) {
      cells.push(ch === 'b' ? 1 : ch === 'w' ? 2 : 0)
    }
  }
  return cells
}

describe('初期盤面', () => {
  it('中央に4石が置かれている', () => {
    expect(countDiscs(createInitialBoard())).toEqual({ black: 2, white: 2, empty: 60 })
  })

  it('黒の初手は4通り', () => {
    const moves = getLegalMoves(createInitialBoard(), 1)
    expect([...moves.keys()].map(toNotation).sort()).toEqual(['c4', 'd3', 'e6', 'f5'])
  })
})

describe('getFlips', () => {
  it('挟んだ石だけを返す', () => {
    const board = createInitialBoard()
    expect(getFlips(board, index(2, 3), 1)).toEqual([index(3, 3)])
  })

  it('石があるマスには打てない', () => {
    const board = createInitialBoard()
    expect(getFlips(board, index(3, 3), 1)).toEqual([])
  })

  it('挟めない場所は打てない', () => {
    const board = createInitialBoard()
    expect(getFlips(board, index(0, 0), 1)).toEqual([])
  })

  it('端で途切れる列は挟めない', () => {
    const board = boardFrom([
      '.wwwwwww',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(getFlips(board, index(0, 0), 1)).toEqual([])
  })

  it('複数方向を同時にひっくり返す', () => {
    const board = boardFrom([
      '........',
      '........',
      '..b.b...',
      '...ww...',
      '..bw....',
      '........',
      '........',
      '........',
    ])
    const flips = getFlips(board, index(4, 4), 1).sort((a, b) => a - b)
    expect(flips.map(toNotation).sort()).toEqual(['d4', 'd5', 'e4'])
  })
})

describe('applyMove', () => {
  it('元の盤面を壊さない', () => {
    const board = createInitialBoard()
    const at = index(2, 3)
    applyMove(board, at, 1, getFlips(board, at, 1))
    expect(countDiscs(board)).toEqual({ black: 2, white: 2, empty: 60 })
  })

  it('着手ぶんと反転ぶんが黒になる', () => {
    const board = createInitialBoard()
    const at = index(2, 3)
    const next = applyMove(board, at, 1, getFlips(board, at, 1))
    expect(countDiscs(next)).toEqual({ black: 4, white: 1, empty: 59 })
  })
})

describe('evaluateTurn', () => {
  it('打てる手があれば続行', () => {
    expect(evaluateTurn(createInitialBoard(), 1)).toEqual({ kind: 'playing' })
  })

  it('片方だけ打てないならパス', () => {
    // 白は打てず、黒だけが打てる配置
    const board = boardFrom([
      'bbbbbbbb',
      'b......b',
      'b......b',
      'b..ww..b',
      'b..ww..b',
      'b......b',
      'b.....wb',
      'bbbbbb.b',
    ])
    expect(evaluateTurn(board, 2)).toEqual({ kind: 'pass', player: 2 })
  })

  it('盤が埋まったら石数の多いほうが勝ち', () => {
    const board = boardFrom([
      'bbbbbbbb',
      'bbbbbbbb',
      'bbbbbbbb',
      'bbbbbbbb',
      'wwwwwwww',
      'wwwwwwww',
      'wwwwwwww',
      'wwwwwwwb',
    ])
    expect(evaluateTurn(board, 1)).toEqual({ kind: 'finished', winner: 1 })
  })

  it('同数なら引き分け', () => {
    const board = boardFrom([
      'bbbbbbbb',
      'bbbbbbbb',
      'bbbbbbbb',
      'bbbbbbbb',
      'wwwwwwww',
      'wwwwwwww',
      'wwwwwwww',
      'wwwwwwww',
    ])
    expect(evaluateTurn(board, 1)).toEqual({ kind: 'finished', winner: null })
  })

  it('空きがあっても両者打てなければ終局', () => {
    const board = boardFrom([
      'bb......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
    ])
    expect(evaluateTurn(board, 2)).toEqual({ kind: 'finished', winner: 1 })
  })
})

describe('小物', () => {
  it('opponent は手番を入れ替える', () => {
    expect(opponent(1)).toBe(2)
    expect(opponent(2)).toBe(1)
  })

  it('toNotation は左上が a1', () => {
    expect(toNotation(index(0, 0))).toBe('a1')
    expect(toNotation(index(7, 7))).toBe('h8')
  })
})
