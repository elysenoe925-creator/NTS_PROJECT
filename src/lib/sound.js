
import { getSettings } from './settingsStore'

// Simple beep sounds using Web Audio API to avoid external assets for now
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

export function playAlertSound(type = 'info') {
    const { soundEnabled } = getSettings()
    if (!soundEnabled) return

    try {
        if (type === 'error') {
            playTone(150, 'sawtooth', 0.4) // Low buzzing for error
            setTimeout(() => playTone(100, 'sawtooth', 0.4), 100)
        } else if (type === 'success') {
            playTone(600, 'sine', 0.1) // High ping for success
            setTimeout(() => playTone(800, 'sine', 0.2), 100)
        } else if (type === 'warning') {
            playTone(400, 'triangle', 0.3)
        } else {
            playTone(500, 'sine', 0.1) // Generic blip
        }
    } catch (e) {
        console.error("Audio playback failed", e)
    }
}
