import { Injectable, signal } from '@angular/core';

export type AudioTrack = 
  | 'main_menu'
  | 'matchmaking'
  | 'draw_phase'
  | 'gallery'
  | 'voting_phase'
  | 'tie_break'
  | 'impostor_wins'
  | 'painters_win';

export type SFXTrack = 'fail_sound';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  /** True si el audio está silenciado (por defecto o por elección del usuario) */
  readonly isMuted = signal(true);

  private readonly tracks: Record<AudioTrack, string> = {
    main_menu: '/music/main_menu.mp3',
    matchmaking: '/music/matchmaking.mp3',
    draw_phase: '/music/draw_phase.mp3',
    gallery: '/music/gallery.mp3',
    voting_phase: '/music/voting_phase.mp3',
    tie_break: '/music/tie_break.mp3',
    impostor_wins: '/music/impostor_wins.mp3',
    painters_win: '/music/painters_win.mp3',
  };

  private readonly sfxTracks: Record<SFXTrack, string> = {
    fail_sound: '/music/fail_sound.mp3',
  };

  private currentAudio: HTMLAudioElement | null = null;
  private currentTrackId: AudioTrack | null = null;
  private fadeInterval: any = null;

  private readonly FADE_DURATION_MS = 1500; // 1.5 seconds cross-fade
  private readonly MAX_VOLUME = 0.3; // Volumen máximo general para que no atrone

  constructor() {
    // Si estamos en navegador, inicializamos
    if (typeof window !== 'undefined') {
      this.initFirstInteraction();
    }
  }

  /**
   * Cambia el estado de silencio. Si se desactiva el silencio,
   * reanuda la pista actual si existe. Si se activa, pausa.
   */
  toggleMute(): void {
    const wasMuted = this.isMuted();
    this.isMuted.set(!wasMuted);

    if (this.currentAudio) {
      if (this.isMuted()) {
        this.currentAudio.pause();
      } else {
        this.currentAudio.play().catch(() => {
          // El navegador bloqueó, se mantiene muteado
          this.isMuted.set(true);
        });
      }
    }
  }

  /**
   * Reproduce una pista, haciendo cross-fade si ya hay una sonando.
   */
  playTrack(trackId: AudioTrack): void {
    // No hacer nada si ya está sonando esta pista
    if (this.currentTrackId === trackId && this.currentAudio) {
      if (!this.isMuted() && this.currentAudio.paused) {
        this.currentAudio.play().catch(e => console.warn('Audio blocked', e));
      }
      return;
    }

    if (typeof Audio === 'undefined') return;

    this.currentTrackId = trackId;
    const src = this.tracks[trackId];
    
    // Crear la nueva pista
    const nextAudio = new Audio(src);
    // Configurar bucle (menos para las victorias, que suelen ser stingers o dejar silencio)
    nextAudio.loop = trackId !== 'impostor_wins' && trackId !== 'painters_win';
    nextAudio.volume = 0;

    // Si está silenciado, la preparamos pero no la reproducimos
    if (this.isMuted()) {
      if (this.currentAudio) {
        this.currentAudio.pause();
      }
      nextAudio.volume = this.MAX_VOLUME;
      this.currentAudio = nextAudio;
      return;
    }

    // Intentar reproducir la nueva pista (fade-in inicial)
    nextAudio.play().then(() => {
      this.executeCrossFade(this.currentAudio, nextAudio);
      this.currentAudio = nextAudio;
    }).catch(err => {
      console.warn("Autoplay bloqueado por el navegador", err);
      // Fallback: lo dejamos listo y marcamos como silenciado
      this.isMuted.set(true);
      if (this.currentAudio) this.currentAudio.pause();
      nextAudio.volume = this.MAX_VOLUME;
      this.currentAudio = nextAudio;
    });
  }

  /**
   * Reproduce un efecto de sonido por encima de la música de fondo.
   * @param durationMs Si se especifica, detiene el sonido después de este tiempo.
   */
  playEffect(trackId: SFXTrack, durationMs?: number): void {
    if (this.isMuted() || typeof Audio === 'undefined') return;

    const sfxAudio = new Audio(this.sfxTracks[trackId]);
    sfxAudio.volume = this.MAX_VOLUME * 1.5; // Los efectos pueden sonar un poco más fuerte
    
    sfxAudio.play().catch(e => console.warn('SFX blocked', e));

    if (durationMs) {
      setTimeout(() => {
        sfxAudio.pause();
        sfxAudio.src = ''; // Limpiar memoria
      }, durationMs);
    }
  }

  private executeCrossFade(oldAudio: HTMLAudioElement | null, newAudio: HTMLAudioElement): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const steps = 30; // 30 pasos de volumen
    const stepTime = this.FADE_DURATION_MS / steps;
    let stepCount = 0;

    this.fadeInterval = setInterval(() => {
      stepCount++;
      const progress = stepCount / steps; // de 0 a 1

      // Fade In nueva
      newAudio.volume = Math.min(progress * this.MAX_VOLUME, this.MAX_VOLUME);

      // Fade Out antigua
      if (oldAudio) {
        oldAudio.volume = Math.max((1 - progress) * this.MAX_VOLUME, 0);
      }

      if (stepCount >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (oldAudio) {
          oldAudio.pause();
          oldAudio.src = ''; // Limpiar memoria
        }
      }
    }, stepTime);
  }

  /**
   * Escucha la primera interacción del usuario en la página para desbloquear el audio.
   */
  private initFirstInteraction(): void {
    const unlockAudio = () => {
      if (this.isMuted()) {
        this.toggleMute(); // Quita el mute y reproduce lo que deba
      }
      // Quitar los listeners una vez desbloqueado
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }
}
