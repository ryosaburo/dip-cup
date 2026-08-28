import type { CardType } from "@battle/shared";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** ブラウザの自動再生制限を回避するため、ユーザーの操作（クリック）内で呼んでおく */
export function unlockAudio(): void {
  getAudioContext();
}

/** 妄想演出音：天国に登っていくような、ふわ〜っと上昇するきらめき音 */
function playDelusionChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.32, now + 0.2);
  master.gain.linearRampToValueAtTime(0.2, now + 1.1);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
  master.connect(ctx.destination);

  // ふわっと上昇していくアルペジオ（ペンタトニック）
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, i) => {
    const startAt = now + i * 0.16;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 0.97, startAt);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, startAt + 1.3);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, startAt);
    g.gain.linearRampToValueAtTime(0.45, startAt + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.5);

    osc.connect(g);
    g.connect(master);
    osc.start(startAt);
    osc.stop(startAt + 1.6);
  });

  // 下から支える持続ドローンでふわふわした浮遊感を足す
  const drone = ctx.createOscillator();
  drone.type = "sine";
  drone.frequency.setValueAtTime(261.63, now);
  drone.frequency.exponentialRampToValueAtTime(392.0, now + 2.0);
  const droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.0001, now);
  droneGain.gain.linearRampToValueAtTime(0.1, now + 0.4);
  droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
  drone.connect(droneGain);
  droneGain.connect(master);
  drone.start(now);
  drone.stop(now + 2.3);
}

/** 現実演出音：ずしんとダメージを受けるような衝撃音 */
function playRealityImpact(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.7, now);
  master.connect(ctx.destination);

  // 低音の "ドン" という衝撃
  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(150, now);
  thump.frequency.exponentialRampToValueAtTime(42, now + 0.35);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.9, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  thump.connect(thumpGain);
  thumpGain.connect(master);
  thump.start(now);
  thump.stop(now + 0.5);

  // ノイズバースト（ガシャッという衝撃の質感）
  const bufferSize = Math.floor(ctx.sampleRate * 0.3);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
  noise.stop(now + 0.3);
}

/** カード種別に応じた見破り演出音を再生する（妄想＝上昇するきらめき音／現実＝衝撃音） */
export function playRevealSound(cardType: CardType): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (cardType === "delusion") {
    playDelusionChime(ctx);
  } else {
    playRealityImpact(ctx);
  }
}
