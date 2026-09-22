import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chooseMove, CPU_LEVEL_LABEL, type CpuLevel } from '../ai'
import { calcReward, type GameResult, type Progress } from '../progress'
import {
  applyMove,
  countDiscs,
  createInitialBoard,
  evaluateTurn,
  getFlips,
  getLegalMoves,
  opponent,
  type Board as BoardCells,
  type Player,
} from '../reversi'
import { findBoardSkin, findStoneSkin, type StoneSkin } from '../skins'
import { Board } from './Board'
import { Menu } from './Menu'
import { StoneFace } from './Stone'

export type GameMode = { kind: 'pvp' } | { kind: 'cpu'; level: CpuLevel }

/** CPU 戦では人が黒（先手）、CPU が白 */
const HUMAN: Player = 1
const CPU: Player = 2
/** CPU が打つまでの間。考えている感じを出す */
const CPU_DELAY_MS = 650

type Snapshot = {
  board: BoardCells
  turn: Player
  lastMove: number | null
  /** この局面の直前に起きたパス */
  passedBy: Player | null
}

const INITIAL: Snapshot = { board: createInitialBoard(), turn: 1, lastMove: null, passedBy: null }

/** 着手して次の局面を作る。打てない場所なら null */
function advance(snap: Snapshot, at: number): Snapshot | null {
  const flips = getFlips(snap.board, at, snap.turn)
  if (flips.length === 0) return null
  const board = applyMove(snap.board, at, snap.turn, flips)
  const outcome = evaluateTurn(board, opponent(snap.turn))
  const passed = outcome.kind === 'pass'
  return {
    board,
    // 相手がパスなら手番が戻ってくる
    turn: passed ? snap.turn : opponent(snap.turn),
    lastMove: at,
    passedBy: passed ? opponent(snap.turn) : null,
  }
}

type Props = {
  mode: GameMode
  progress: Progress
  onProgress: (update: (p: Progress) => Progress) => void
  onExit: () => void
}

export function GameScreen({ mode, progress, onProgress, onExit }: Props) {
  const [gameId, setGameId] = useState(0)
  const [history, setHistory] = useState<Snapshot[]>([INITIAL])
  const [showHints, setShowHints] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  /** この対局で受け取ったコイン。1局につき1回だけ（戻して打ち直しても増えない） */
  const [reward, setReward] = useState<{ gameId: number; coins: number; fresh: boolean } | null>(null)
  const rewardedGame = useRef<number | null>(null)

  const current = history[history.length - 1]
  const legalMoves = useMemo(() => getLegalMoves(current.board, current.turn), [current])
  const score = useMemo(() => countDiscs(current.board), [current])
  const finished = legalMoves.size === 0
  const winner: Player | null = score.black === score.white ? null : score.black > score.white ? 1 : 2

  const isCpuTurn = mode.kind === 'cpu' && current.turn === CPU && !finished
  const boardSkin = findBoardSkin(progress.equipped.board)
  const stoneSkin = findStoneSkin(progress.equipped.stone)

  const play = useCallback((at: number) => {
    setHistory((prev) => {
      const next = advance(prev[prev.length - 1], at)
      return next ? [...prev, next] : prev
    })
  }, [])

  const playable = useMemo<ReadonlySet<number>>(
    () => (finished || isCpuTurn || menuOpen ? new Set() : new Set(legalMoves.keys())),
    [finished, isCpuTurn, menuOpen, legalMoves],
  )

  // CPU の手番。メニューを開いている間は待つ
  useEffect(() => {
    if (!isCpuTurn || menuOpen || mode.kind !== 'cpu') return
    const timer = window.setTimeout(() => {
      const move = chooseMove(current.board, CPU, mode.level)
      if (move !== null) play(move)
    }, CPU_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [current, isCpuTurn, menuOpen, mode, play])

  // 終局したら結果を出し、コインを渡す
  useEffect(() => {
    if (!finished) return
    setResultOpen(true)
    if (rewardedGame.current === gameId) {
      setReward((r) => (r && r.gameId === gameId ? { ...r, fresh: false } : r))
      return
    }
    rewardedGame.current = gameId
    const result: GameResult = winner === null ? 'draw' : winner === HUMAN ? 'win' : 'lose'
    const coins = calcReward(mode, result)
    setReward({ gameId, coins, fresh: true })
    onProgress((p) => ({ ...p, coins: p.coins + coins }))
    // finished が立った瞬間だけ動かしたい
  }, [finished])

  const canUndo = history.length > 1

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev
      let next = prev.slice(0, -1)
      // CPU 戦では、CPU の手もまとめて戻して自分の番に戻す
      if (mode.kind === 'cpu') {
        while (next.length > 1 && next[next.length - 1].turn !== HUMAN) next = next.slice(0, -1)
      }
      return next
    })
    setResultOpen(false)
  }, [mode.kind])

  const restart = useCallback(() => {
    setGameId((g) => g + 1)
    setHistory([INITIAL])
    setResultOpen(false)
    setMenuOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || menuOpen) return
      if (e.key === 'u' || e.key === 'U') undo()
      else if (e.key === 'h' || e.key === 'H') setShowHints((v) => !v)
      else if (e.key === 'Escape') setMenuOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, undo])

  const facing = mode.kind === 'pvp'
  const nameOf = (p: Player) => {
    if (mode.kind === 'cpu') return p === HUMAN ? 'あなた' : `CPU（${CPU_LEVEL_LABEL[mode.level]}）`
    return p === 1 ? '黒' : '白'
  }

  const statusOf = (p: Player): string => {
    if (finished) return winner === null ? '引き分け' : winner === p ? '勝ち！' : '負け'
    const isTurn = current.turn === p
    if (mode.kind === 'cpu' && p === CPU) return isTurn ? '考え中…' : current.passedBy === CPU ? 'パス' : ''
    if (isTurn) return current.passedBy !== null && current.passedBy !== p ? '相手はパス。続けてあなたの番' : 'あなたの番'
    if (current.passedBy === p) return '置ける場所がないのでパス'
    return ''
  }

  const panel = (p: Player, flipped: boolean) => (
    <PlayerPanel
      player={p}
      name={nameOf(p)}
      count={p === 1 ? score.black : score.white}
      status={statusOf(p)}
      active={!finished && current.turn === p}
      thinking={isCpuTurn && p === CPU}
      flipped={flipped}
      skin={stoneSkin}
    />
  )

  return (
    <main className={`game-screen ${facing ? 'facing' : ''}`}>
      <div className="game-row top">
        <button type="button" className="corner-button" onClick={() => setMenuOpen(true)} aria-label="メニュー">
          <span className="menu-glyph" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        {panel(2, facing)}
        {finished && !resultOpen ? (
          <button type="button" className="corner-button" onClick={() => setResultOpen(true)} aria-label="結果を見る">
            🏁
          </button>
        ) : (
          <span className="corner-spacer" />
        )}
      </div>

      <div className="board-area">
        <Board
          cells={current.board}
          boardSkin={boardSkin}
          stoneSkin={stoneSkin}
          playable={playable}
          showHints={showHints}
          lastMove={current.lastMove}
          onPlay={play}
        />
      </div>

      <div className="game-row bottom">
        <button
          type="button"
          className={`corner-button ${showHints ? '' : 'off'}`}
          onClick={() => setShowHints((v) => !v)}
          aria-pressed={showHints}
          aria-label={showHints ? '置ける場所を隠す' : '置ける場所を表示'}
        >
          👁️
        </button>
        {panel(1, false)}
        <button type="button" className="corner-button" onClick={undo} disabled={!canUndo} aria-label="1手戻す">
          ↩️
        </button>
      </div>

      {finished && resultOpen && (
        <ResultOverlay
          mode={mode}
          winner={winner}
          black={score.black}
          white={score.white}
          reward={reward && reward.gameId === gameId ? reward : null}
          skin={stoneSkin}
          onAgain={restart}
          onView={() => setResultOpen(false)}
          onTitle={onExit}
        />
      )}

      {menuOpen && (
        <Menu
          progress={progress}
          onProgress={onProgress}
          onClose={() => setMenuOpen(false)}
          onRestart={restart}
          onTitle={onExit}
        />
      )}
    </main>
  )
}

type PanelProps = {
  player: Player
  name: string
  count: number
  status: string
  active: boolean
  thinking: boolean
  flipped: boolean
  skin: StoneSkin
}

function PlayerPanel({ player, name, count, status, active, thinking, flipped, skin }: PanelProps) {
  return (
    <section
      className={['player-panel', active ? 'active' : '', thinking ? 'thinking' : '', flipped ? 'flipped' : ''].filter(Boolean).join(' ')}
      aria-label={`${name} ${count}枚 ${status}`}
    >
      <StoneFace skin={skin} color={player} className="panel-stone" />
      <div className="panel-text">
        <span className="panel-name">{name}</span>
        <span className="panel-status" aria-live="polite">
          {status}
        </span>
      </div>
      <span className="panel-count">{count}</span>
    </section>
  )
}

type ResultProps = {
  mode: GameMode
  winner: Player | null
  black: number
  white: number
  reward: { coins: number; fresh: boolean } | null
  skin: StoneSkin
  onAgain: () => void
  onView: () => void
  onTitle: () => void
}

function ResultOverlay({ mode, winner, black, white, reward, skin, onAgain, onView, onTitle }: ResultProps) {
  const card = (viewer: Player | null, flipped: boolean) => {
    let headline: string
    if (winner === null) headline = '引き分け'
    else if (mode.kind === 'cpu') headline = winner === HUMAN ? 'あなたの勝ち！' : 'CPU の勝ち'
    else headline = winner === viewer ? 'あなたの勝ち！' : 'あなたの負け'

    const good = winner !== null && (mode.kind === 'cpu' ? winner === HUMAN : winner === viewer)
    const mine: Player = viewer ?? HUMAN

    return (
      <div className={`result-card ${good ? 'good' : ''} ${flipped ? 'flipped' : ''}`}>
        <p className="result-headline">{headline}</p>
        {/* 見ている人の石数を先に出す */}
        <p className="result-score">
          <StoneFace skin={skin} color={mine} className="result-stone" />
          <span>{mine === 1 ? black : white}</span>
          <span className="result-dash">–</span>
          <span>{mine === 1 ? white : black}</span>
          <StoneFace skin={skin} color={opponent(mine)} className="result-stone" />
        </p>
        {reward && (
          <p className="result-reward">
            {reward.fresh ? `🪙 +${reward.coins} コイン獲得` : `この対局のコイン（🪙${reward.coins}）は受け取り済み`}
          </p>
        )}
        <div className="result-actions">
          <button type="button" className="primary-button" onClick={onAgain}>
            もう一度
          </button>
          <button type="button" className="text-button" onClick={onView}>
            盤面を見る
          </button>
          <button type="button" className="text-button" onClick={onTitle}>
            タイトルへ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`overlay result-overlay ${mode.kind === 'pvp' ? 'facing' : ''}`} role="dialog" aria-modal="true" aria-label="対局結果">
      {mode.kind === 'pvp' ? (
        <>
          {card(2, true)}
          {card(1, false)}
        </>
      ) : (
        card(HUMAN, false)
      )}
    </div>
  )
}
