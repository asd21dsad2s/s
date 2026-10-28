/**
 * GymLite Android Lockscreen & Homescreen Rest Timer Integration
 * 
 * Uses HTML5 Audio + Media Session API to broadcast real-time rest timer updates
 * to Android Lock Screen, Always-On Display (AOD), and the Notification Drawer.
 * 
 * Also syncs with document.title and Web Notification API.
 */

class MediaSessionTimerManager {
  private silentAudio: HTMLAudioElement | null = null;
  private isRunning: boolean = false;
  private notificationInstance: Notification | null = null;
  private originalDocumentTitle: string = 'GymLite';
  private onSubtract15Callback: (() => void) | null = null;
  private onSkipCallback: (() => void) | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.originalDocumentTitle = document.title || 'GymLite';
    }
  }

  /**
   * Request browser notification permission (optional enhancement)
   */
  public async requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore
        }
      }
    }
  }

  /**
   * Start or update the timer display (zero audio ducking - never plays background audio)
   */
  public updateLockscreenTimer(
    remainingSeconds: number,
    totalSeconds: number,
    exerciseName?: string,
    callbacks?: { onSubtract15?: () => void; onSkip?: () => void }
  ) {
    if (callbacks?.onSubtract15) this.onSubtract15Callback = callbacks.onSubtract15;
    if (callbacks?.onSkip) this.onSkipCallback = callbacks.onSkip;

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // 1. Update document title (shows on homescreen task switcher, notification bar, and PWA title)
    if (typeof document !== 'undefined') {
      document.title = `(${timeFormatted}) Rest · GymLite`;
    }

    // 2. Update Android Lockscreen & Notification Drawer bubble
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const exerciseText = exerciseName ? `Next: ${exerciseName}` : 'Rest in progress';
        new Notification(`⏱️ Rest: ${timeFormatted}`, {
          body: `${exerciseText} · Tap to open GymLite`,
          icon: '/favicon.svg',
          tag: 'gymlite-rest-timer',
          renotify: false,
          silent: true
        } as any);
      } catch {
        // Safe fallback if blocked
      }
    }
  }

  /**
   * Called when timer hits 0:00 or is dismissed
   */
  public finishOrStopTimer(completedNormally: boolean = false, exerciseName?: string) {
    this.isRunning = false;

    // Reset document title
    if (typeof document !== 'undefined') {
      document.title = this.originalDocumentTitle || 'GymLite';
    }

    // Display rest finished notification on lockscreen
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (completedNormally) {
          new Notification('⚡ Rest Finished! Time to lift!', {
            body: exerciseName ? `Ready for your next set of ${exerciseName}!` : 'Time for your next set!',
            icon: '/favicon.svg',
            tag: 'gymlite-rest-timer',
            renotify: true,
            silent: true
          } as any);
        }
      } catch {
        // Ignore
      }
    }
  }
}

export const lockscreenTimer = new MediaSessionTimerManager();
