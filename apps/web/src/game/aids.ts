export type Sound = 'knock' | 'chime';

/** Elapsed time as `m:ss`, or `h:mm:ss` from one hour. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Sounds for a change in the move count: a knock, then a chime if someone is still to move. */
export function soundsFor(before: number, after: number, over: boolean): Sound[] {
  if (after <= before) return [];
  return over ? ['knock'] : ['knock', 'chime'];
}

/**
 * Plays a sound made in the browser with Web Audio (no audio files, so nothing to license).
 * Silent where Web Audio is missing or blocked.
 */
export function play(sounds: Sound[]): void {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    shared ??= new Ctx();
    const ctx = shared;
    void ctx.resume();
    let at = ctx.currentTime;
    for (const sound of sounds) {
      const knock = sound === 'knock';
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = knock ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(knock ? 160 : 880, at);
      if (knock) osc.frequency.exponentialRampToValueAtTime(70, at + 0.08);
      const len = knock ? 0.12 : 0.4;
      gain.gain.setValueAtTime(knock ? 0.5 : 0.18, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + len);
      at += knock ? 0.15 : 0;
    }
  } catch {
    // Sound is a nicety; never break play.
  }
}

let shared: AudioContext | undefined;
