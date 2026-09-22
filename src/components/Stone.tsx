import type { CSSProperties } from 'react'
import type { Player } from '../reversi'
import type { StoneSkin } from '../skins'

/** 石の片面。スキンに PNG があればそれを、なければ CSS で描く */
export function StoneFace({ skin, color, className = '' }: { skin: StoneSkin; color: Player; className?: string }) {
  const side = color === 1 ? 'black' : 'white'
  const image = skin.images?.[side]
  const style: CSSProperties | undefined = image ? { backgroundImage: `url("${image}")` } : undefined
  return (
    <span
      className={`stone-face stone-${skin.id}-${side} ${image ? 'has-image' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

/** 盤上の石。表が黒・裏が白で、色が変わると回転して裏返る */
export function Disc({ skin, color }: { skin: StoneSkin; color: Player }) {
  return (
    <span className={`disc ${color === 1 ? 'is-black' : 'is-white'}`} aria-hidden="true">
      <StoneFace skin={skin} color={1} className="front" />
      <StoneFace skin={skin} color={2} className="back" />
    </span>
  )
}
