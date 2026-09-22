import { useState } from 'react'
import { CPU_LEVELS, CPU_LEVEL_LABEL, type CpuLevel } from '../ai'
import { CPU_WIN_REWARD, type Progress } from '../progress'
import { findStoneSkin } from '../skins'
import type { GameMode } from './GameScreen'
import { CoinBadge } from './Menu'
import { StoneFace } from './Stone'

type Props = {
  progress: Progress
  onProgress: (update: (p: Progress) => Progress) => void
  onStart: (mode: GameMode) => void
}

export function TitleScreen({ progress, onProgress, onStart }: Props) {
  const [step, setStep] = useState<'title' | 'mode'>('title')
  const stoneSkin = findStoneSkin(progress.equipped.stone)
  const level = progress.cpuLevel

  const setLevel = (next: CpuLevel) => onProgress((p) => ({ ...p, cpuLevel: next }))

  return (
    <main className="title-screen">
      <div className="title-coins">
        <CoinBadge coins={progress.coins} />
      </div>

      <div className="logo">
        <div className="logo-stones" aria-hidden="true">
          <StoneFace skin={stoneSkin} color={1} className="logo-stone" />
          <StoneFace skin={stoneSkin} color={2} className="logo-stone" />
        </div>
        <h1 className="logo-text">REVERSI</h1>
        <p className="logo-sub">リバーシ</p>
      </div>

      {step === 'title' ? (
        <button type="button" className="start-button" onClick={() => setStep('mode')} autoFocus>
          START
        </button>
      ) : (
        <div className="mode-select">
          <section className="mode-card">
            <h2>VS CPU</h2>
            <div className="level-picker" role="radiogroup" aria-label="CPU の強さ">
              {CPU_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={level === l}
                  className={`level ${level === l ? 'selected' : ''}`}
                  onClick={() => setLevel(l)}
                >
                  {CPU_LEVEL_LABEL[l]}
                  <span className="level-reward">勝ち 🪙{CPU_WIN_REWARD[l]}</span>
                </button>
              ))}
            </div>
            <button type="button" className="primary-button" onClick={() => onStart({ kind: 'cpu', level })}>
              CPU と対戦
            </button>
            <p className="mode-note">あなたが黒（先手）です</p>
          </section>

          <section className="mode-card">
            <h2>ふたりで対戦</h2>
            <p className="mode-note">画面をはさんで向かい合って遊べます</p>
            <button type="button" className="primary-button" onClick={() => onStart({ kind: 'pvp' })}>
              ふたりで対戦
            </button>
          </section>

          <button type="button" className="text-button" onClick={() => setStep('title')}>
            もどる
          </button>
        </div>
      )}
    </main>
  )
}
