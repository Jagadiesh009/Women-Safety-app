/**
 * SafeHer Web Emergency Audio Alert Utility
 * Uses the Web Audio API to synthesize emergency tones reliably
 * without external audio file dependencies.
 */

class EmergencySoundAlert {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private intervalId: any = null;

  constructor() {
    // Check localStorage preference
    const saved = localStorage.getItem('safeher_police_alert_muted');
    this.isMuted = saved === 'true';
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('safeher_police_alert_muted', String(muted));
    if (muted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play a dual-tone emergency police dispatcher chirp
   */
  public playChirp() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Emergency frequency sweep 880Hz -> 1320Hz -> 880Hz
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(1320, now + 0.15);
      osc.frequency.linearRampToValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('[AudioAlert] Web Audio playback error:', e);
    }
  }

  /**
   * Start looping the emergency alarm until stopped
   */
  public startAlertLoop() {
    if (this.isMuted || this.intervalId) return;
    this.playChirp();
    this.intervalId = setInterval(() => {
      this.playChirp();
    }, 1600);
  }

  /**
   * Stop the looping alarm
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const emergencySound = new EmergencySoundAlert();

