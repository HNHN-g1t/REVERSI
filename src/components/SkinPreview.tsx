import type { BoardSkin, StoneSkin } from '../skins'
import { boardClassName, boardStyle, squareStyle } from './Board'
import { StoneFace } from './Stone'

/** 3×3 の小さな盤。スキン選びの見本に使う */
const PATTERN = [0, 2, 0, 1, 2, 1, 0, 1, 0] as const

export function SkinPreview({ boardSkin, stoneSkin }: { boardSkin: BoardSkin; stoneSkin: StoneSkin }) {
  const sq = squareStyle(boardSkin)
  return (
    <div className={`${boardClassName(boardSkin)} preview-board`} style={boardStyle(boardSkin)} aria-hidden="true">
      {PATTERN.map((cell, i) => (
        <span key={i} className="square" style={sq}>
          {cell !== 0 && <StoneFace skin={stoneSkin} color={cell} className="preview-stone" />}
        </span>
      ))}
    </div>
  )
}
