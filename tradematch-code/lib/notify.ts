let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

/** 短いビープ音を2回鳴らす */
function playBeep() {
  const ctx = getAudioContext()
  if (!ctx) return

  const playTone = (startTime: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration)
  }

  const now = ctx.currentTime
  playTone(now, 880, 0.15)
  playTone(now + 0.2, 1100, 0.2)
}

/** バイブレーション（対応端末のみ） */
function vibrate() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([200, 100, 200])
  }
}

/** マッチング通知: 音 + バイブレーション */
export function notifyMatch() {
  playBeep()
  vibrate()
}
