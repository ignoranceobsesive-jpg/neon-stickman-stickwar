// ====== NEON STICKMAN: AD MANAGER ======
// AdMob integration with simulated ads for web testing
// When wrapped in Capacitor for Android, replace simulate* with real AdMob SDK calls

export const ADMOB_CONFIG = {
  appId: 'ca-app-pub-6439599735010649~1983422275',
  rewardedAdId: 'ca-app-pub-6439599735010649/4027131683',
  interstitialAdId: 'ca-app-pub-6439599735010649/8990244364',
  bannerAdId: 'ca-app-pub-6439599735010649/7774805003',
};

// Result of a rewarded ad — tells the caller whether the user earned the reward
export type RewardedAdResult = {
  /** True if the user watched the full ad and earned the reward */
  rewarded: boolean;
  /** Reason if not rewarded: 'skipped' | 'error' | 'closed_early' */
  reason?: string;
  /** Duration in ms the ad was shown */
  durationMs: number;
};

// Callback types for ad events
export type AdProgressCallback = (progress: number, elapsedMs: number) => void;
export type AdCompleteCallback = () => void;

// Ad state for UI binding
export type AdState = 'idle' | 'loading' | 'showing' | 'completed' | 'error';

export class AdManager {
  private static instance: AdManager;
  private levelsCompleted = 0;
  private readonly INTERSTITIAL_INTERVAL = 3; // Show interstitial every 3 levels

  // Banner state
  private bannerVisible = false;

  // Cooldown to prevent spamming ads
  private lastAdTime = 0;
  private readonly AD_COOLDOWN_MS = 5000; // 5s between ads

  private constructor() {}

  static getInstance(): AdManager {
    if (!AdManager.instance) AdManager.instance = new AdManager();
    return AdManager.instance;
  }

  // Track level completion for interstitial timing
  onLevelComplete(): boolean {
    this.levelsCompleted++;
    return this.levelsCompleted % this.INTERSTITIAL_INTERVAL === 0;
  }

  /**
   * Show a rewarded ad (5-15 seconds simulation).
   * In production: calls AdMob rewarded ad SDK.
   * In web: simulates with a progress timer.
   *
   * @param onProgress - Optional callback for progress updates (0-100)
   * @returns RewardedAdResult indicating whether the user earned the reward
   */
  async showRewardedAd(onProgress?: AdProgressCallback): Promise<RewardedAdResult> {
    // Enforce cooldown
    if (Date.now() - this.lastAdTime < this.AD_COOLDOWN_MS) {
      return { rewarded: false, reason: 'cooldown', durationMs: 0 };
    }
    this.lastAdTime = Date.now();

    // Simulated duration: 5-15 seconds (randomized for realism)
    const durationMs = 5000 + Math.random() * 10000; // 5-15s
    const startTime = Date.now();

    return new Promise<RewardedAdResult>((resolve) => {
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / durationMs) * 100);

        if (onProgress) {
          onProgress(progress, elapsed);
        }

        if (elapsed >= durationMs) {
          clearInterval(progressInterval);
          resolve({
            rewarded: true,
            durationMs: elapsed,
          });
        }
      }, 50); // Update progress every 50ms for smooth UI

      // In a real app, the AdMob SDK would handle the ad lifecycle.
      // For simulation, the ad always completes successfully.
      // To test "skipped" behavior, you could add a skip mechanism here.
    });
  }

  /**
   * Show an interstitial ad (5 seconds simulation).
   * In production: calls AdMob interstitial ad SDK.
   *
   * @param onProgress - Optional callback for progress updates (0-100)
   * @returns Promise that resolves when the ad is done
   */
  async showInterstitialAd(onProgress?: AdProgressCallback): Promise<void> {
    // Enforce cooldown
    if (Date.now() - this.lastAdTime < this.AD_COOLDOWN_MS) {
      return;
    }
    this.lastAdTime = Date.now();

    const durationMs = 5000; // Fixed 5 seconds for interstitial
    const startTime = Date.now();

    return new Promise<void>((resolve) => {
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / durationMs) * 100);

        if (onProgress) {
          onProgress(progress, elapsed);
        }

        if (elapsed >= durationMs) {
          clearInterval(progressInterval);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Show a banner ad at the bottom of the screen.
   * In production: calls AdMob banner ad SDK.
   * In web: sets a flag for the UI to show a simulated banner.
   */
  showBannerAd(): void {
    this.bannerVisible = true;
    // In production: AdMob.showBanner(AdMob.BannerSize.SMART_BANNER, AdMob.Position.BOTTOM)
  }

  /**
   * Hide the banner ad.
   */
  hideBannerAd(): void {
    this.bannerVisible = false;
    // In production: AdMob.hideBanner()
  }

  /**
   * Check if banner ad is currently visible.
   */
  isBannerVisible(): boolean {
    return this.bannerVisible;
  }

  // Get current level count since last interstitial
  getLevelsCompleted(): number {
    return this.levelsCompleted;
  }

  // Reset level counter
  reset(): void {
    this.levelsCompleted = 0;
  }

  /**
   * Convenience method: show rewarded ad and handle result.
   * Calls onReward callback only if the ad was watched successfully.
   * Calls onSkipped callback if the ad was not completed.
   */
  async showRewardedAdWithCallbacks(
    onReward: () => void,
    onSkipped?: (reason: string) => void,
    onProgress?: AdProgressCallback,
  ): Promise<void> {
    const result = await this.showRewardedAd(onProgress);
    if (result.rewarded) {
      onReward();
    } else if (onSkipped && result.reason) {
      onSkipped(result.reason);
    }
  }
}
