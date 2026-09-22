/**
 * コイン・所持スキン・選択中スキンなど、端末に保存する進行データ。
 * 保存・読み込みと、購入や報酬の計算を分けてあるので計算部分はテストできる。
 */
import type { CpuLevel } from './ai'
import { BOARD_SKINS, DEFAULT_BOARD_SKIN, DEFAULT_STONE_SKIN, STONE_SKINS, type SkinKind } from './skins'

export type Progress = {
  coins: number
  owned: { board: string[]; stone: string[] }
  equipped: { board: string; stone: string }
  cpuLevel: CpuLevel
}

const STORAGE_KEY = 'reversi:progress:v1'

export function createInitialProgress(): Progress {
  return {
    coins: 0,
    owned: {
      board: BOARD_SKINS.filter((s) => s.price === 0).map((s) => s.id),
      stone: STONE_SKINS.filter((s) => s.price === 0).map((s) => s.id),
    },
    equipped: { board: DEFAULT_BOARD_SKIN, stone: DEFAULT_STONE_SKIN },
    cpuLevel: 'normal',
  }
}

/** 壊れたデータや古い形式が来ても、初期値で補って必ず使える形にする */
export function normalizeProgress(raw: unknown): Progress {
  const base = createInitialProgress()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Progress>

  const coins = typeof r.coins === 'number' && Number.isFinite(r.coins) && r.coins >= 0 ? Math.floor(r.coins) : 0

  const known = { board: BOARD_SKINS.map((s) => s.id), stone: STONE_SKINS.map((s) => s.id) }
  const owned = {
    board: unique([...base.owned.board, ...listOf(r.owned?.board).filter((id) => known.board.includes(id))]),
    stone: unique([...base.owned.stone, ...listOf(r.owned?.stone).filter((id) => known.stone.includes(id))]),
  }

  const equipped = {
    board: r.equipped?.board && owned.board.includes(r.equipped.board) ? r.equipped.board : base.equipped.board,
    stone: r.equipped?.stone && owned.stone.includes(r.equipped.stone) ? r.equipped.stone : base.equipped.stone,
  }

  const cpuLevel = r.cpuLevel === 'easy' || r.cpuLevel === 'normal' || r.cpuLevel === 'hard' ? r.cpuLevel : base.cpuLevel

  return { coins, owned, equipped, cpuLevel }
}

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function loadProgress(): Progress {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY)
    return normalizeProgress(text ? JSON.parse(text) : null)
  } catch {
    return createInitialProgress()
  }
}

export function saveProgress(progress: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // プライベートブラウズなどで保存できなくても遊べるようにする
  }
}

export type PurchaseResult = { ok: true; progress: Progress } | { ok: false; reason: 'owned' | 'coins' | 'unknown' }

export function purchaseSkin(progress: Progress, kind: SkinKind, id: string): PurchaseResult {
  const catalog = kind === 'board' ? BOARD_SKINS : STONE_SKINS
  const skin = catalog.find((s) => s.id === id)
  if (!skin) return { ok: false, reason: 'unknown' }
  if (progress.owned[kind].includes(id)) return { ok: false, reason: 'owned' }
  if (progress.coins < skin.price) return { ok: false, reason: 'coins' }

  return {
    ok: true,
    progress: {
      ...progress,
      coins: progress.coins - skin.price,
      owned: { ...progress.owned, [kind]: [...progress.owned[kind], id] },
      // 買ったらそのまま着ける
      equipped: { ...progress.equipped, [kind]: id },
    },
  }
}

export function equipSkin(progress: Progress, kind: SkinKind, id: string): Progress {
  if (!progress.owned[kind].includes(id)) return progress
  return { ...progress, equipped: { ...progress.equipped, [kind]: id } }
}

export type GameResult = 'win' | 'draw' | 'lose'

/** CPU 戦で勝ったときのコイン。強い相手ほど多い */
export const CPU_WIN_REWARD: Record<CpuLevel, number> = { easy: 10, normal: 20, hard: 40 }

/** 対局を最後まで打ち切ったときにもらえるコイン */
export function calcReward(mode: { kind: 'cpu'; level: CpuLevel } | { kind: 'pvp' }, result: GameResult): number {
  if (mode.kind === 'pvp') return 10
  const win = CPU_WIN_REWARD[mode.level]
  if (result === 'win') return win
  if (result === 'draw') return Math.floor(win / 2)
  return 3
}
