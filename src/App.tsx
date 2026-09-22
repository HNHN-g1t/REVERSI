import { useCallback, useEffect, useState } from 'react'
import { GameScreen, type GameMode } from './components/GameScreen'
import { TitleScreen } from './components/TitleScreen'
import { loadProgress, saveProgress, type Progress } from './progress'

type Screen = { kind: 'title' } | { kind: 'game'; mode: GameMode; key: number }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'title' })
  const [progress, setProgress] = useState<Progress>(loadProgress)

  useEffect(() => saveProgress(progress), [progress])

  const updateProgress = useCallback((update: (p: Progress) => Progress) => setProgress(update), [])

  if (screen.kind === 'game') {
    return (
      <GameScreen
        key={screen.key}
        mode={screen.mode}
        progress={progress}
        onProgress={updateProgress}
        onExit={() => setScreen({ kind: 'title' })}
      />
    )
  }

  return (
    <TitleScreen
      progress={progress}
      onProgress={updateProgress}
      onStart={(mode) => setScreen({ kind: 'game', mode, key: Date.now() })}
    />
  )
}
