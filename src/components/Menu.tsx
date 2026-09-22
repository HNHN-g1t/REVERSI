import { useEffect, useState } from 'react'
import { purchaseSkin, equipSkin, type Progress } from '../progress'
import { BOARD_SKINS, STONE_SKINS, findBoardSkin, findStoneSkin, type SkinKind } from '../skins'
import { SkinPreview } from './SkinPreview'

type View = 'main' | SkinKind

type Props = {
  progress: Progress
  onProgress: (update: (p: Progress) => Progress) => void
  onClose: () => void
  onRestart: () => void
  onTitle: () => void
}

export function Menu({ progress, onProgress, onClose, onRestart, onTitle }: Props) {
  const [view, setView] = useState<View>('main')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (view === 'main' ? onClose : () => setView('main'))()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, view])

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="メニュー" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          {view === 'main' ? (
            <h2>メニュー</h2>
          ) : (
            <button type="button" className="back-button" onClick={() => setView('main')}>
              ‹ もどる
            </button>
          )}
          <CoinBadge coins={progress.coins} />
        </header>

        {view === 'main' && (
          <nav className="menu-list">
            <button type="button" className="menu-item" onClick={onRestart}>
              <span className="menu-icon">🔄</span>最初から
            </button>
            <button type="button" className="menu-item" onClick={() => setView('board')}>
              <span className="menu-icon">🟩</span>盤面のデザイン
              <span className="menu-sub">{findBoardSkin(progress.equipped.board).name}</span>
            </button>
            <button type="button" className="menu-item" onClick={() => setView('stone')}>
              <span className="menu-icon">⚫</span>石のデザイン
              <span className="menu-sub">{findStoneSkin(progress.equipped.stone).name}</span>
            </button>
            <button type="button" className="menu-item" onClick={onTitle}>
              <span className="menu-icon">🏠</span>タイトルへ
            </button>
            <button type="button" className="menu-item subtle" onClick={onClose}>
              とじる
            </button>
          </nav>
        )}

        {view !== 'main' && <SkinShop kind={view} progress={progress} onProgress={onProgress} />}
      </div>
    </div>
  )
}

export function CoinBadge({ coins }: { coins: number }) {
  return (
    <span className="coin-badge" aria-label={`コイン ${coins} 枚`}>
      <span aria-hidden="true">🪙</span>
      {coins.toLocaleString()}
    </span>
  )
}

function SkinShop({ kind, progress, onProgress }: { kind: SkinKind; progress: Progress; onProgress: Props['onProgress'] }) {
  // 誤タップで買わないよう、購入は2回タップで確定する
  const [confirming, setConfirming] = useState<string | null>(null)
  const skins = kind === 'board' ? BOARD_SKINS : STONE_SKINS
  const equippedBoard = findBoardSkin(progress.equipped.board)
  const equippedStone = findStoneSkin(progress.equipped.stone)

  return (
    <div className="skin-grid">
      {skins.map((skin) => {
        const owned = progress.owned[kind].includes(skin.id)
        const equipped = progress.equipped[kind] === skin.id
        const affordable = progress.coins >= skin.price

        const preview =
          kind === 'board' ? (
            <SkinPreview boardSkin={findBoardSkin(skin.id)} stoneSkin={equippedStone} />
          ) : (
            <SkinPreview boardSkin={equippedBoard} stoneSkin={findStoneSkin(skin.id)} />
          )

        let action
        if (equipped) {
          action = <span className="skin-state">使用中</span>
        } else if (owned) {
          action = (
            <button type="button" className="skin-button" onClick={() => onProgress((p) => equipSkin(p, kind, skin.id))}>
              使う
            </button>
          )
        } else if (confirming === skin.id) {
          action = (
            <button
              type="button"
              className="skin-button buy confirm"
              onClick={() => {
                onProgress((p) => {
                  const result = purchaseSkin(p, kind, skin.id)
                  return result.ok ? result.progress : p
                })
                setConfirming(null)
              }}
            >
              買う？ 🪙{skin.price}
            </button>
          )
        } else {
          action = (
            <button
              type="button"
              className="skin-button buy"
              disabled={!affordable}
              onClick={() => setConfirming(skin.id)}
            >
              🪙 {skin.price}
              {!affordable && <span className="skin-short">あと {skin.price - progress.coins}</span>}
            </button>
          )
        }

        return (
          <div key={skin.id} className={`skin-card ${equipped ? 'equipped' : ''} ${owned ? '' : 'locked'}`}>
            {preview}
            <span className="skin-name">{skin.name}</span>
            {action}
          </div>
        )
      })}
    </div>
  )
}
