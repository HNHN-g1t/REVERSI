import { describe, expect, it } from 'vitest'
import { calcReward, createInitialProgress, equipSkin, normalizeProgress, purchaseSkin } from './progress'

describe('初期データ', () => {
  it('無料のスキンだけを持っていて、コインは0', () => {
    const p = createInitialProgress()
    expect(p.coins).toBe(0)
    expect(p.owned.board).toEqual(['green'])
    expect(p.owned.stone).toEqual(['classic'])
    expect(p.equipped).toEqual({ board: 'green', stone: 'classic' })
  })
})

describe('purchaseSkin', () => {
  it('コインが足りれば買えて、そのまま装備される', () => {
    const p = { ...createInitialProgress(), coins: 150 }
    const r = purchaseSkin(p, 'stone', 'crystal')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.progress.coins).toBe(50)
    expect(r.progress.owned.stone).toContain('crystal')
    expect(r.progress.equipped.stone).toBe('crystal')
  })

  it('コインが足りなければ買えない', () => {
    const p = { ...createInitialProgress(), coins: 10 }
    expect(purchaseSkin(p, 'board', 'slate')).toEqual({ ok: false, reason: 'coins' })
  })

  it('持っているものは二重に買えない', () => {
    const p = { ...createInitialProgress(), coins: 999 }
    expect(purchaseSkin(p, 'board', 'green')).toEqual({ ok: false, reason: 'owned' })
  })

  it('存在しないスキンは買えない', () => {
    const p = { ...createInitialProgress(), coins: 999 }
    expect(purchaseSkin(p, 'board', 'nope')).toEqual({ ok: false, reason: 'unknown' })
  })
})

describe('equipSkin', () => {
  it('持っていないスキンは装備できない', () => {
    const p = createInitialProgress()
    expect(equipSkin(p, 'board', 'slate')).toBe(p)
  })
})

describe('normalizeProgress', () => {
  it('壊れたデータでも初期値で補う', () => {
    expect(normalizeProgress(null)).toEqual(createInitialProgress())
    expect(normalizeProgress('garbage')).toEqual(createInitialProgress())
    const p = normalizeProgress({ coins: -5, owned: { board: 'x', stone: [1, 'crystal'] }, equipped: { board: 'slate' } })
    expect(p.coins).toBe(0)
    expect(p.owned.board).toEqual(['green'])
    expect(p.owned.stone).toEqual(['classic', 'crystal'])
    // 持っていない盤は装備扱いにしない
    expect(p.equipped.board).toBe('green')
  })

  it('正しいデータはそのまま残る', () => {
    const saved = {
      coins: 42,
      owned: { board: ['green', 'slate'], stone: ['classic'] },
      equipped: { board: 'slate', stone: 'classic' },
      cpuLevel: 'hard',
    }
    expect(normalizeProgress(saved)).toEqual(saved)
  })
})

describe('calcReward', () => {
  it('CPU 戦は強い相手に勝つほど多い', () => {
    expect(calcReward({ kind: 'cpu', level: 'easy' }, 'win')).toBe(10)
    expect(calcReward({ kind: 'cpu', level: 'normal' }, 'win')).toBe(20)
    expect(calcReward({ kind: 'cpu', level: 'hard' }, 'win')).toBe(40)
  })

  it('引き分けは半分、負けても参加賞', () => {
    expect(calcReward({ kind: 'cpu', level: 'hard' }, 'draw')).toBe(20)
    expect(calcReward({ kind: 'cpu', level: 'hard' }, 'lose')).toBe(3)
  })

  it('ふたりで対戦は一律', () => {
    expect(calcReward({ kind: 'pvp' }, 'win')).toBe(10)
  })
})
