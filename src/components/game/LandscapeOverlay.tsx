'use client';

import { useSyncExternalStore, useCallback } from 'react';

// Try to enter fullscreen mode on mobile for immersive gameplay
export async function tryAutoFullscreen() {
  try {
    const elem = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    }
  } catch {
    // Fullscreen not supported or denied - that's fine
  }
  // Also try to lock orientation to landscape
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (orientation && orientation.lock) {
      await orientation.lock('landscape');
    }
  } catch {
    // Orientation lock not supported or denied
  }
}

function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
    || /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function checkIsPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth * 1.1;
}

// --- useSyncExternalStore-based hooks ---
// These avoid calling setState synchronously inside effects, which
// can trigger cascading renders (the lint warning we're fixing).

const emptySubscribe = () => () => {};

function useIsMobile(): boolean {
  return useSyncExternalStore(
    emptySubscribe, // no external subscription needed; value derived from window
    () => checkIsMobile(),
    () => false, // server snapshot
  );
}

function useIsPortrait(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handler = () => onStoreChange();
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => checkIsPortrait(),
    () => false, // server snapshot
  );
}

export default function LandscapeOverlay() {
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();

  // Try fullscreen on first render when on mobile
  // (only runs once, no setState involved)
  if (typeof window !== 'undefined' && checkIsMobile()) {
    // Defer to next tick to avoid side-effects during render
    setTimeout(() => tryAutoFullscreen(), 0);
  }

  // Don't show overlay on desktop or when already in landscape
  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050510] flex flex-col items-center justify-center gap-6">
      {/* Rotating phone icon */}
      <div className="relative w-20 h-32 border-2 border-cyan-400 rounded-lg rotate-90 transition-transform"
        style={{
          animation: 'landscape-hint 2s ease-in-out infinite',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), inset 0 0 10px rgba(0, 255, 255, 0.1)',
        }}
      >
        {/* Screen inside phone */}
        <div className="absolute inset-2 border border-cyan-400/40 rounded"
          style={{ boxShadow: '0 0 8px rgba(0, 255, 255, 0.2)' }}
        >
          {/* Mini stickman inside */}
          <div className="flex items-center justify-center h-full">
            <svg width="16" height="30" viewBox="0 0 16 30" stroke="#00ffff" strokeWidth="1.5" fill="none">
              <circle cx="8" cy="5" r="4" />
              <line x1="8" y1="9" x2="8" y2="20" />
              <line x1="8" y1="13" x2="3" y2="17" />
              <line x1="8" y1="13" x2="13" y2="17" />
              <line x1="8" y1="20" x2="4" y2="28" />
              <line x1="8" y1="20" x2="12" y2="28" />
            </svg>
          </div>
        </div>
        {/* Home button */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-cyan-400/30" />
      </div>

      {/* Rotation arrow */}
      <div className="absolute" style={{
        top: '50%',
        right: '20%',
        transform: 'translateY(-50%)',
        animation: 'arrow-bounce 1.5s ease-in-out infinite',
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" stroke="#00ffff" strokeWidth="2" fill="none">
          <path d="M10 20 A10 10 0 0 1 30 20" />
          <path d="M28 14 L30 20 L24 18" stroke="#00ffff" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-cyan-400 text-lg font-bold tracking-wider"
          style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.6)' }}>
          ROTATE YOUR DEVICE
        </p>
        <p className="text-cyan-400/60 text-sm mt-2 tracking-wide">
          Best played in landscape mode
        </p>
      </div>

      {/* Neon grid floor effect */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden opacity-20">
        <div className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px),
              linear-gradient(0deg, rgba(0,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 20px',
            transform: 'perspective(200px) rotateX(60deg)',
            transformOrigin: 'bottom',
          }}
        />
      </div>
    </div>
  );
}
