import type { CSSProperties } from 'react'
import { colOf, rowOf, type Board as BoardCells, type Player } from '../reversi'
import type { BoardSkin, StoneSkin } from '../skins'
import { Disc } from './Stone'

const COLUMN_LABELS = 'abcdefgh'
const COLOR_NAME: Record<Player, string> = { 1: '黒', 2: '白' }

export function boardStyle(skin: BoardSkin): CSSProperties {
  return {
    '--square': skin.colors.square,
    '--square-hover': skin.colors.squareHover,
    '--line': skin.colors.line,
    '--frame': skin.colors.frame,
    '--hint': skin.colors.hint,
    '--last-move': skin.colors.lastMove,
    ...(skin.images?.board ? { backgroundImage: `url("${skin.images.board}")` } : {}),
  } as CSSProperties
}

export function boardClassName(skin: BoardSkin): string {
  return [
    'board',
    `board-${skin.id}`,
    skin.images?.board ? 'has-board-image' : '',
    skin.images?.square ? 'has-square-image' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function squareStyle(skin: BoardSkin): CSSProperties | undefined {
  return skin.images?.square ? { backgroundImage: `url("${skin.images.square}")` } : undefined
}

type Props = {
  cells: BoardCells
  boardSkin: BoardSkin
  stoneSkin: StoneSkin
  /** いま置けるマス。空なら盤は操作できない */
  playable: ReadonlySet<number>
  showHints: boolean
  lastMove: number | null
  onPlay: (at: number) => void
}

export function Board({ cells, boardSkin, stoneSkin, playable, showHints, lastMove, onPlay }: Props) {
  const sq = squareStyle(boardSkin)
  return (
    <div className={boardClassName(boardSkin)} style={boardStyle(boardSkin)} role="grid" aria-label="盤面">
      {cells.map((cell, i) => {
        const canPlay = playable.has(i)
        const name = `${COLUMN_LABELS[colOf(i)]}${rowOf(i) + 1}`
        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            className={['square', canPlay ? 'playable' : '', i === lastMove ? 'last-move' : ''].filter(Boolean).join(' ')}
            style={sq}
            onClick={() => onPlay(i)}
            disabled={!canPlay}
            aria-label={`${name} ${cell === 0 ? (canPlay ? '置けます' : '空き') : COLOR_NAME[cell]}`}
          >
            {cell !== 0 && <Disc skin={stoneSkin} color={cell} />}
            {cell === 0 && canPlay && showHints && <span className="hint-dot" />}
          </button>
        )
      })}
    </div>
  )
}
