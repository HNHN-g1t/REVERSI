// Short, synthesized cues avoid external assets and start only after a user action.
export type Cue = 'place' | 'flip' | 'pass' | 'win' | 'draw' | 'undo'

let context: AudioContext | null = null

export function playCue(cue: Cue, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    const notes: Record<Cue, Array<[number, number, number]>> = {
      place: [[220, 0, 0.075]],
      flip: [[440, 0.055, 0.075]],
      pass: [[330, 0, 0.1], [260, 0.12, 0.15]],
      win: [[392, 0, 0.12], [494, 0.13, 0.12], [587, 0.26, 0.28]],
      draw: [[392, 0, 0.15], [392, 0.17, 0.2]],
      undo: [[350, 0, 0.07], [260, 0.07, 0.09]],
    }
    for (const [frequency, delay, duration] of notes[cue]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = cue === 'place' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, now + delay)
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.09, now + delay + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now + delay)
      oscillator.stop(now + delay + duration + 0.01)
    }
  } catch {
    // Gameplay remains usable when audio is unavailable.
  }
}
