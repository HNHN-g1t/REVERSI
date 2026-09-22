import { useCallback, useEffect, useMemo, useState } from 'react'
import { playCue } from './sound'
import {
  applyMove,
  colOf,
  countDiscs,
  createInitialBoard,
  evaluateTurn,
  getLegalMoves,
  opponent,
  rowOf,
  SIZE,
  toNotation,
  type Board,
  type Player,
} from './reversi'

const COLUMN_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

const PLAYER_NAME: Record<Player, string> = { 1: '黒', 2: '白' }

type Snapshot = {
  board: Board
  turn: Player
  /** 直前に置かれたマス。盤面上の目印に使う */
  lastMove: number | null
  /** この局面に来るまでに起きたパス（表示用） */
  passedBy: Player | null
}

type Status =
  | { kind: 'playing' }
  | { kind: 'finished'; winner: Player | null }

const initialSnapshot: Snapshot = {
  board: createInitialBoard(),
  turn: 1,
  lastMove: null,
  passedBy: null,
}

export default function App() {
  const [history, setHistory] = useState<Snapshot[]>([initialSnapshot])
  const [status, setStatus] = useState<Status>({ kind: 'playing' })
  const [showHints, setShowHints] = useState(true)
  const [soundOn, setSoundOn] = useState(false)

  const current = history[history.length - 1]
  const { board, turn, lastMove, passedBy } = current

  const legalMoves = useMemo(() => getLegalMoves(board, turn), [board, turn])
  const score = useMemo(() => countDiscs(board), [board])

  const play = useCallback(
    (at: number) => {
      if (status.kind === 'finished') return
      const flips = legalMoves.get(at)
      if (!flips) return

      const nextBoard = applyMove(board, at, turn, flips)
      const outcome = evaluateTurn(nextBoard, opponent(turn))

      const snapshot: Snapshot = {
        board: nextBoard,
        // パスのときは手番が戻ってくる
        turn: outcome.kind === 'pass' ? turn : opponent(turn),
        lastMove: at,
        passedBy: outcome.kind === 'pass' ? opponent(turn) : null,
      }

      setHistory((prev) => [...prev, snapshot])
      setStatus(outcome.kind === 'finished' ? { kind: 'finished', winner: outcome.winner } : { kind: 'playing' })
      playCue('place', soundOn)
      if (flips.length) window.setTimeout(() => playCue('flip', soundOn), 110)
      if (outcome.kind === 'pass') window.setTimeout(() => playCue('pass', soundOn), 360)
      if (outcome.kind === 'finished') window.setTimeout(() => playCue(outcome.winner === null ? 'draw' : 'win', soundOn), 380)
    },
    [board, legalMoves, soundOn, status.kind, turn],
  )

  const undo = useCallback(() => {
    if (history.length > 1) playCue('undo', soundOn)
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
    setStatus({ kind: 'playing' })
  }, [history.length, soundOn])

  const reset = useCallback(() => {
    setHistory([initialSnapshot])
    setStatus({ kind: 'playing' })
  }, [])

  // キーボードからも操作できるように
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'u' || event.key === 'U') undo()
      if (event.key === 'r' || event.key === 'R') reset()
      if (event.key === 'h' || event.key === 'H') setShowHints((v) => !v)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [reset, undo])

  return (
    <main className="app">
      <header className="header">
        <h1>オセロ</h1>
        <p className="subtitle">2人で交互に打つローカル対戦</p>
      </header>

      <section className="scoreboard" aria-label="スコア">
        <ScorePanel player={1} count={score.black} active={status.kind === 'playing' && turn === 1} />
        <div className="scoreboard-gap">
          <span className="move-count">{history.length - 1} 手目</span>
          <span className="empty-count">残り {score.empty}</span>
        </div>
        <ScorePanel player={2} count={score.white} active={status.kind === 'playing' && turn === 2} />
      </section>

      <p className="status" role="status">
        {status.kind === 'finished'
          ? status.winner === null
            ? '引き分け'
            : `${PLAYER_NAME[status.winner]}の勝ち（${Math.max(score.black, score.white)} 対 ${Math.min(score.black, score.white)}）`
          : passedBy !== null
            ? `${PLAYER_NAME[passedBy]}は打てる場所がないためパス。続けて${PLAYER_NAME[turn]}の番です`
            : `${PLAYER_NAME[turn]}の番（${legalMoves.size} か所に置けます）`}
      </p>

      <div className="board-wrap">
        <div className="board" role="grid" aria-label="オセロ盤">
          {board.map((cell, i) => {
            const playable = status.kind === 'playing' && legalMoves.has(i)
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={[
                  'square',
                  playable ? 'playable' : '',
                  playable && showHints ? 'hinted' : '',
                  i === lastMove ? 'last-move' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => play(i)}
                disabled={!playable}
                aria-label={`${COLUMN_LABELS[colOf(i)]}${rowOf(i) + 1} ${
                  cell === 0 ? (playable ? '空き・ここに置けます' : '空き') : PLAYER_NAME[cell]
                }`}
              >
                {cell !== 0 && (
                  <span className={`disc ${cell === 1 ? 'black' : 'white'}`}>
                    <span className="disc-face front" />
                    <span className="disc-face back" />
                  </span>
                )}
                {cell === 0 && playable && showHints && <span className="hint-dot" />}
              </button>
            )
          })}
        </div>
      </div>

      <section className="controls">
        <button type="button" onClick={undo} disabled={history.length <= 1}>
          １手戻す<kbd>U</kbd>
        </button>
        <button type="button" onClick={reset}>
          最初から<kbd>R</kbd>
        </button>
        <button type="button" onClick={() => setShowHints((v) => !v)} aria-pressed={showHints}>
          置ける場所{showHints ? 'を隠す' : 'を表示'}
          <kbd>H</kbd>
        </button>
        <button type="button" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} aria-label={`効果音${soundOn ? 'オン' : 'オフ'}`}>
          効果音 {soundOn ? 'ON' : 'OFF'}
        </button>
      </section>

      <footer className="footer">
        {lastMove !== null && <span>直前の手: {toNotation(lastMove)}</span>}
        <span>
          {SIZE}×{SIZE} / 黒が先手
        </span>
      </footer>
    </main>
  )
}

function ScorePanel({ player, count, active }: { player: Player; count: number; active: boolean }) {
  return (
    <div className={`score-panel ${active ? 'active' : ''}`}>
      <span className={`score-disc ${player === 1 ? 'black' : 'white'}`} aria-hidden="true" />
      <span className="score-label">{PLAYER_NAME[player]}</span>
      <span className="score-count">{count}</span>
    </div>
  )
}
