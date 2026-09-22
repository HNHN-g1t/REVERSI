/**
 * スキンのカタログ。
 *
 * 見た目は CSS で描いているが、images にパスを書けば PNG に差し替わる。
 * PNG は public/skins/ 以下に置く（詳しくは README の「スキンを PNG に差し替える」）。
 *
 *   images: { black: skinAsset('stones/crystal/black.png') }
 *
 * のように、置いたファイルだけ指定すればよい。指定のないものは CSS のまま。
 */

export type SkinKind = 'board' | 'stone'

export type BoardSkin = {
  id: string
  name: string
  /** 0 なら最初から持っている */
  price: number
  /** CSS で描くときの色。PNG を使う場合も枠線やハイライトに使われる */
  colors: {
    square: string
    squareHover: string
    line: string
    frame: string
    hint: string
    lastMove: string
  }
  images?: {
    /** 1マスぶんのタイル画像（正方形。マスごとに敷き詰める） */
    square?: string
    /** 盤全体の画像（正方形。マス目の線も含めて描いたもの） */
    board?: string
  }
}

export type StoneSkin = {
  id: string
  name: string
  price: number
  images?: {
    /** 黒石（先手）の画像。背景透過の正方形 PNG */
    black?: string
    /** 白石（後手）の画像 */
    white?: string
  }
}

/** public/skins/ 以下のファイルを指すパスを作る */
export const skinAsset = (path: string) => `${import.meta.env.BASE_URL}skins/${path}`

export const BOARD_SKINS: readonly BoardSkin[] = [
  {
    id: 'green',
    name: 'クラシック グリーン',
    price: 0,
    colors: {
      square: '#1f7a4d',
      squareHover: '#248c58',
      line: '#0d3f27',
      frame: '#0a3320',
      hint: 'rgba(255, 255, 255, 0.35)',
      lastMove: 'rgba(255, 220, 120, 0.9)',
    },
  },
  {
    id: 'slate',
    name: '石板グレー',
    price: 60,
    colors: {
      square: '#4f5458',
      squareHover: '#5c6266',
      line: '#26292c',
      frame: '#1c1e20',
      hint: 'rgba(235, 240, 245, 0.35)',
      lastMove: 'rgba(160, 210, 255, 0.9)',
    },
  },
]

export const STONE_SKINS: readonly StoneSkin[] = [
  { id: 'classic', name: 'クラシック 白黒', price: 0 },
  { id: 'crystal', name: '水晶（透明 × 黒）', price: 100 },
]

export const DEFAULT_BOARD_SKIN = BOARD_SKINS[0].id
export const DEFAULT_STONE_SKIN = STONE_SKINS[0].id

export function findBoardSkin(id: string): BoardSkin {
  return BOARD_SKINS.find((s) => s.id === id) ?? BOARD_SKINS[0]
}

export function findStoneSkin(id: string): StoneSkin {
  return STONE_SKINS.find((s) => s.id === id) ?? STONE_SKINS[0]
}

export function skinsOf(kind: SkinKind): readonly (BoardSkin | StoneSkin)[] {
  return kind === 'board' ? BOARD_SKINS : STONE_SKINS
}
