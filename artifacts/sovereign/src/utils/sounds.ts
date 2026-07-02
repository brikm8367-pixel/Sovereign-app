// Premium psychological audio design using Web Audio API
// Sounds designed to trigger positive emotional responses (dopamine, safety, curiosity)

let audioCtx: AudioContext | null = null;
let ringtoneInterval: number | null = null;
let ringingInterval: number | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// Helper: play a warm reverb-like tail
function addWarmth(ctx: AudioContext, destination: AudioNode, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 220; // A3 — deep warmth
  gain.gain.value = 0;
  osc.connect(gain).connect(destination);
  osc.start(startTime);
  gain.gain.linearRampToValueAtTime(0.015, startTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.stop(startTime + duration);
}

/** Caller hears while waiting — psychological "reassurance" pattern
 * G4→A4 soft rising interval = "everything is okay, connection is happening"
 * Inspired by luxury hotel elevator chimes */
export function startRingingSound() {
  stopRingingSound();
  const play = () => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;

      // First note: G4 (392Hz) — grounding
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 392;
      g1.gain.value = 0;
      osc1.connect(g1).connect(ctx.destination);
      osc1.start(t);
      g1.gain.linearRampToValueAtTime(0.07, t + 0.06);
      g1.gain.setValueAtTime(0.07, t + 0.35);
      g1.gain.linearRampToValueAtTime(0, t + 0.55);
      osc1.stop(t + 0.6);

      // Second note: A4 (440Hz) — resolution, upward = hope
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 440;
      g2.gain.value = 0;
      osc2.connect(g2).connect(ctx.destination);
      osc2.start(t + 0.65);
      g2.gain.linearRampToValueAtTime(0.07, t + 0.71);
      g2.gain.setValueAtTime(0.07, t + 1.0);
      g2.gain.linearRampToValueAtTime(0, t + 1.2);
      osc2.stop(t + 1.25);

      addWarmth(ctx, ctx.destination, t + 0.1, 1.2);
    } catch {}
  };
  play();
  ringingInterval = window.setInterval(play, 3000);
}

export function stopRingingSound() {
  if (ringingInterval) { clearInterval(ringingInterval); ringingInterval = null; }
}

/** Incoming call ringtone — ascending triad C5→E5→G5
 * Major chord = safety, joy, invitation
 * Spacing creates anticipation without urgency */
export function startRingtone() {
  stopRingtone();
  const play = () => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(gain).connect(ctx.destination);
        const s = t + i * 0.2;
        osc.start(s);
        gain.gain.linearRampToValueAtTime(0.1, s + 0.04);
        gain.gain.setValueAtTime(0.1, s + 0.22);
        gain.gain.linearRampToValueAtTime(0, s + 0.38);
        osc.stop(s + 0.42);
      });

      // Octave shimmer at the end — delight
      const shimmer = ctx.createOscillator();
      const sg = ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.value = 1046.5; // C6
      sg.gain.value = 0;
      shimmer.connect(sg).connect(ctx.destination);
      shimmer.start(t + 0.65);
      sg.gain.linearRampToValueAtTime(0.04, t + 0.7);
      sg.gain.linearRampToValueAtTime(0, t + 1.0);
      shimmer.stop(t + 1.05);
    } catch {}
  };
  play();
  ringtoneInterval = window.setInterval(play, 2200);
}

export function stopRingtone() {
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
}

/** Work notification — professional, confident double-tap
 * F5→A5 = "attention, opportunity" */
export function playWorkNotificationSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    [698.46, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0;
      osc.connect(g).connect(ctx.destination);
      const s = t + i * 0.12;
      osc.start(s);
      g.gain.linearRampToValueAtTime(0.09, s + 0.02);
      g.gain.setValueAtTime(0.09, s + 0.08);
      g.gain.linearRampToValueAtTime(0, s + 0.15);
      osc.stop(s + 0.16);
    });
  } catch {}
}

/** Private notification — warm, gentle single tone
 * D5 soft fade = "someone you love" */
export function playPrivateNotificationSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 587.33; // D5
    g.gain.value = 0;
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.04);
    g.gain.setValueAtTime(0.06, t + 0.2);
    g.gain.linearRampToValueAtTime(0, t + 0.45);
    osc.stop(t + 0.5);
    addWarmth(ctx, ctx.destination, t, 0.5);
  } catch {}
}

/** General notification sound — soft chime */
export function playNotificationSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 587.33;
    g.gain.value = 0;
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.02);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    g.gain.setValueAtTime(0.08, t + 0.12);
    g.gain.linearRampToValueAtTime(0, t + 0.25);
    osc.stop(t + 0.25);
  } catch {}
}

/** Splash screen — premium "bloom" with harmonic overtone */
export function playSplashSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    g.gain.value = 0;
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.2);
    g.gain.setValueAtTime(0.05, t + 0.2);
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    osc.stop(t + 0.55);

    // Overtone shimmer
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 880;
    g2.gain.value = 0;
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t + 0.05);
    g2.gain.linearRampToValueAtTime(0.025, t + 0.15);
    g2.gain.linearRampToValueAtTime(0, t + 0.4);
    osc2.stop(t + 0.45);
  } catch {}
}

/** Success sound — "task completed" satisfaction
 * Quick ascending = dopamine reward */
export function playSuccessSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0;
      osc.connect(g).connect(ctx.destination);
      const s = t + i * 0.08;
      osc.start(s);
      g.gain.linearRampToValueAtTime(0.06, s + 0.02);
      g.gain.linearRampToValueAtTime(0, s + 0.12);
      osc.stop(s + 0.13);
    });
  } catch {}
}
