'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/game-store';
import { soundEngine } from '@/lib/sound-engine';
import { CYAN, GOLD, ORANGE, PURPLE, LIME, getRankForElo, RANK_THRESHOLDS } from '@/lib/game-types';
import { onAuthChange, signInAnon, signInWithGoogle, signOutUser, getUserInfo, type AuthState } from '@/lib/firebase-auth';
import { uploadSaveToCloud, downloadSaveFromCloud } from '@/lib/firebase-firestore';

const AVATARS = ['⚔️', '🗡️', '🔥', '⚡', '💀', '👑', '🎮', '🕹️', '🌟', '💎', '🦊', '🐺', '🐉', '🔮', '🎯', '🛡️'];
const NATIONALITIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'South Korea', 'Brazil', 'India', 'Mexico', 'Russia', 'China', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Poland', 'Turkey', 'Other'];

const MAX_IMAGE_SIZE = 100; // px
const MAX_IMAGE_STORAGE_KB = 20; // KB - keep base64 small for localStorage

function resizeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        // Scale down to fit MAX_IMAGE_SIZE
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with quality 0.7
        let quality = 0.7;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        // If still too large, reduce quality further
        while (dataUrl.length > MAX_IMAGE_STORAGE_KB * 1024 * 1.37 && quality > 0.1) { // base64 is ~37% larger
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function isDataUrlAvatar(avatar: string): boolean {
  return avatar.startsWith('data:');
}

export default function ProfilePanel() {
  const saveData = useGameStore(s => s.saveData);
  const updateProfile = useGameStore(s => s.updateProfile);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const loadGame = useGameStore(s => s.loadGame);

  const loadCloudSave = useGameStore(s => s.loadCloudSave);

  const [username, setUsername] = useState(saveData.username);
  const [avatar, setAvatar] = useState(saveData.avatar);
  const [about, setAbout] = useState(saveData.about);
  const [nationality, setNationality] = useState(saveData.nationality);
  const [saved, setSaved] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ user: null, loading: true, error: null, isAnonymous: false });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'uploading' | 'downloading' | 'done' | 'error'>('idle');
  const [imageUploading, setImageUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthChange((state) => {
      setAuthState(state);
    });
    return unsub;
  }, []);

  const rankInfo = getRankForElo(saveData.rankingData.elo);
  const userInfo = getUserInfo();

  // Calculate level progress (next rank threshold)
  const currentRankIdx = RANK_THRESHOLDS.reduce((lastIdx, t, idx) => saveData.rankingData.elo >= t.min ? idx : lastIdx, 0);
  const nextRank = currentRankIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[currentRankIdx + 1] : null;
  const eloProgress = nextRank
    ? Math.round(((saveData.rankingData.elo - RANK_THRESHOLDS[currentRankIdx].min) / (nextRank.min - RANK_THRESHOLDS[currentRankIdx].min)) * 100)
    : 100;

  // Keyboard event handler that stops propagation to prevent GameCanvas from capturing keys
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleSave = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'NeonWarrior';
    updateProfile({
      username: cleanUsername,
      avatar,
      about: about.slice(0, 50),
      nationality,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBack = () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    setGamePhase('menu');
  };

  const handleAnonymousSignIn = useCallback(async () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    const user = await signInAnon();
    if (user) {
      if (saveData.username === 'NeonWarrior') {
        updateProfile({ username: `Player${user.uid.slice(0, 6)}` });
        setUsername(`Player${user.uid.slice(0, 6)}`);
      }
    }
  }, [saveData.username, updateProfile]);

  const handleGoogleSignIn = useCallback(async () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    const user = await signInWithGoogle();
    if (user && user.displayName) {
      updateProfile({ username: user.displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'NeonWarrior' });
      setUsername(user.displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'NeonWarrior');
    }
  }, [updateProfile]);

  const handleSignOut = useCallback(async () => {
    soundEngine.init();
    soundEngine.playMenuClick();
    await signOutUser();
  }, []);

  const handleCloudUpload = useCallback(async () => {
    if (!authState.user) return;
    setSyncStatus('uploading');
    soundEngine.init();
    soundEngine.playMenuClick();
    const success = await uploadSaveToCloud(saveData);
    setSyncStatus(success ? 'done' : 'error');
    if (success) {
      setTimeout(() => setSyncStatus('idle'), 2000);
    } else {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [authState.user, saveData]);

  const handleCloudDownload = useCallback(async () => {
    if (!authState.user) return;
    setSyncStatus('downloading');
    soundEngine.init();
    soundEngine.playMenuClick();
    const cloudSave = await downloadSaveFromCloud();
    if (cloudSave) {
      // Merge cloud save with local save and update store
      loadCloudSave(cloudSave);
      setSyncStatus('done');
    } else {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus('idle'), 2000);
  }, [authState.user, loadCloudSave]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setImageUploading(true);
    try {
      const dataUrl = await resizeImageToBase64(file);
      setAvatar(dataUrl);
      soundEngine.init();
      soundEngine.playMenuClick();
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setImageUploading(false);
      // Reset the input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // Stats summary
  const winRate = saveData.rankingData.wins + saveData.rankingData.losses > 0
    ? Math.round((saveData.rankingData.wins / (saveData.rankingData.wins + saveData.rankingData.losses)) * 100)
    : 0;

  // Render avatar display (emoji or image)
  const renderAvatar = (size: number = 36) => {
    if (isDataUrlAvatar(avatar)) {
      return (
        <img
          src={avatar}
          alt="Profile"
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      );
    }
    return <span style={{ fontSize: size * 0.5 }}>{avatar}</span>;
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="w-full max-w-md p-4 rounded-lg mx-4 pointer-events-auto max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'rgba(5,5,20,0.95)',
          border: '2px solid #aa00ff',
          boxShadow: '0 0 30px #aa00ff20',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
        // Stop keydown events from propagating to the window (GameCanvas)
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2
          className="text-xl font-bold text-center tracking-wider mb-3 font-mono"
          style={{ color: PURPLE, textShadow: '0 0 10px #aa00ff' }}
        >
          PROFILE
        </h2>

        {/* Profile Picture & Rank Banner */}
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid #333' }}>
          {/* Avatar display */}
          <div className="relative">
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 64, height: 64,
                backgroundColor: 'rgba(0,255,255,0.1)',
                border: '2px solid #00ffff40',
                boxShadow: '0 0 12px #aa00ff40',
              }}
            >
              {renderAvatar(64)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{rankInfo.icon}</span>
              <span className="font-mono font-bold text-sm" style={{ color: GOLD, textShadow: '0 0 5px #ffd700' }}>
                {rankInfo.rank}
              </span>
            </div>
            <div className="font-mono text-xs mt-0.5" style={{ color: '#888' }}>
              ELO: <span style={{ color: CYAN }}>{saveData.rankingData.elo}</span>
              {nextRank && (
                <>
                  {' '}→ <span style={{ color: GOLD }}>{nextRank.rank}</span>
                  <div className="w-full h-1.5 rounded-full mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${eloProgress}%`,
                        backgroundColor: GOLD,
                        boxShadow: '0 0 4px #ffd700',
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="font-mono text-[10px] mt-1" style={{ color: '#666' }}>
              W/R: {winRate}% | {saveData.rankingData.wins}W {saveData.rankingData.losses}L
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mb-3 p-2.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid #222' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px]" style={{ color: '#888' }}>LEVEL PROGRESS</span>
            <span className="font-mono text-xs font-bold" style={{ color: CYAN }}>Zone {saveData.highestLevel}</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(0,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((saveData.highestLevel / 100) * 100, 100)}%`,
                backgroundColor: CYAN,
                boxShadow: '0 0 6px #00ffff',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[9px]" style={{ color: '#555' }}>Zone 1</span>
            <span className="font-mono text-[9px]" style={{ color: '#555' }}>Zone 100+</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="text-center p-1.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #222' }}>
            <div className="font-mono text-[9px]" style={{ color: '#888' }}>Level</div>
            <div className="font-mono text-xs font-bold" style={{ color: CYAN }}>{saveData.highestLevel}</div>
          </div>
          <div className="text-center p-1.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #222' }}>
            <div className="font-mono text-[9px]" style={{ color: '#888' }}>Kills</div>
            <div className="font-mono text-xs font-bold" style={{ color: ORANGE }}>{saveData.totalKills}</div>
          </div>
          <div className="text-center p-1.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #222' }}>
            <div className="font-mono text-[9px]" style={{ color: '#888' }}>Coins</div>
            <div className="font-mono text-xs font-bold" style={{ color: GOLD }}>{saveData.totalCoins}</div>
          </div>
          <div className="text-center p-1.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid #222' }}>
            <div className="font-mono text-[9px]" style={{ color: '#888' }}>Skills</div>
            <div className="font-mono text-xs font-bold" style={{ color: PURPLE }}>{saveData.unlockedSkills.length}</div>
          </div>
        </div>

        {/* Firebase Auth Section */}
        <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid #333' }}>
          <div className="text-xs font-mono font-bold mb-2" style={{ color: CYAN }}>
            CLOUD SAVE
          </div>

          {authState.loading ? (
            <div className="text-xs font-mono text-center py-2" style={{ color: '#888' }}>
              Connecting...
            </div>
          ) : authState.user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'rgba(0,255,255,0.1)', border: '1px solid #00ffff40' }}>
                  {userInfo?.photoURL ? (
                    <img src={userInfo.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    renderAvatar(32)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: authState.isAnonymous ? ORANGE : LIME,
                        boxShadow: `0 0 4px ${authState.isAnonymous ? ORANGE : LIME}`,
                      }}
                    />
                    <span className="font-mono text-xs font-bold truncate" style={{ color: authState.isAnonymous ? ORANGE : LIME }}>
                      {authState.isAnonymous ? 'Guest' : (userInfo?.displayName || 'Signed In')}
                    </span>
                  </div>
                  {userInfo?.email && (
                    <div className="font-mono text-[10px] truncate" style={{ color: '#666' }}>
                      {userInfo.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Cloud Sync Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCloudUpload}
                  disabled={syncStatus === 'uploading'}
                  className="flex-1 py-1.5 px-2 text-[10px] font-mono font-bold rounded"
                  style={{
                    backgroundColor: syncStatus === 'done' ? 'rgba(0,255,102,0.15)' : 'rgba(0,255,255,0.08)',
                    border: `1px solid ${syncStatus === 'done' ? LIME : syncStatus === 'error' ? '#ff3333' : CYAN}`,
                    color: syncStatus === 'done' ? LIME : syncStatus === 'error' ? '#ff3333' : CYAN,
                    opacity: syncStatus === 'uploading' ? 0.5 : 1,
                  }}
                >
                  {syncStatus === 'uploading' ? '⬆ SYNCING...' : syncStatus === 'done' ? '✓ UPLOADED' : syncStatus === 'error' ? '✗ FAILED' : '⬆ UPLOAD'}
                </button>
                <button
                  onClick={handleCloudDownload}
                  disabled={syncStatus === 'downloading'}
                  className="flex-1 py-1.5 px-2 text-[10px] font-mono font-bold rounded"
                  style={{
                    backgroundColor: 'rgba(255,102,0,0.08)',
                    border: `1px solid ${syncStatus === 'error' ? '#ff3333' : ORANGE}`,
                    color: syncStatus === 'error' ? '#ff3333' : ORANGE,
                    opacity: syncStatus === 'downloading' ? 0.5 : 1,
                  }}
                >
                  {syncStatus === 'downloading' ? '⬇ LOADING...' : '⬇ DOWNLOAD'}
                </button>
              </div>

              {/* Upgrade to Google */}
              {authState.isAnonymous && (
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full py-1.5 px-2 text-[10px] font-mono font-bold rounded flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: 'rgba(255,215,0,0.08)',
                    border: '1px solid #ffd70060',
                    color: GOLD,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  LINK GOOGLE ACCOUNT
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="w-full py-1 px-2 text-[9px] font-mono rounded"
                style={{ border: '1px solid #444', color: '#666' }}
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] font-mono mb-2" style={{ color: '#888' }}>
                Sign in to save your progress to the cloud
              </div>
              <button
                onClick={handleAnonymousSignIn}
                className="w-full py-2 px-3 text-xs font-mono font-bold rounded"
                style={{
                  backgroundColor: 'rgba(0,255,255,0.08)',
                  border: '1px solid #00ffff60',
                  color: CYAN,
                }}
              >
                PLAY AS GUEST
              </button>
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-2 px-3 text-xs font-mono font-bold rounded flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'rgba(255,215,0,0.08)',
                  border: '1px solid #ffd70060',
                  color: GOLD,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                SIGN IN WITH GOOGLE
              </button>
            </div>
          )}
        </div>

        {/* Avatar selector */}
        <div className="mb-3">
          <label className="text-xs font-mono mb-1.5 block" style={{ color: '#888' }}>AVATAR</label>
          {/* Current avatar preview + image upload */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 48, height: 48,
                backgroundColor: 'rgba(170,0,255,0.15)',
                border: '2px solid #aa00ff',
                boxShadow: '0 0 10px #aa00ff40',
              }}
            >
              {renderAvatar(48)}
            </div>
            <div className="flex-1 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="flex-1 py-1.5 px-2 text-[10px] font-mono font-bold rounded"
                style={{
                  backgroundColor: 'rgba(170,0,255,0.08)',
                  border: '1px solid #aa00ff60',
                  color: PURPLE,
                  opacity: imageUploading ? 0.5 : 1,
                }}
              >
                {imageUploading ? '⏳ PROCESSING...' : '📷 UPLOAD IMAGE'}
              </button>
              {isDataUrlAvatar(avatar) && (
                <button
                  onClick={() => { setAvatar('⚔️'); soundEngine.init(); soundEngine.playMenuClick(); }}
                  className="py-1.5 px-2 text-[10px] font-mono font-bold rounded"
                  style={{
                    backgroundColor: 'rgba(255,51,51,0.08)',
                    border: '1px solid #ff333360',
                    color: '#ff3333',
                  }}
                >
                  ✕ REMOVE
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          {/* Preset emoji avatars */}
          <div className="flex flex-wrap gap-1.5">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => { setAvatar(a); soundEngine.init(); soundEngine.playMenuClick(); }}
                className="w-8 h-8 text-base rounded flex items-center justify-center transition-all"
                style={{
                  backgroundColor: avatar === a && !isDataUrlAvatar(avatar) ? 'rgba(170,0,255,0.2)' : 'rgba(0,0,0,0.3)',
                  border: avatar === a && !isDataUrlAvatar(avatar) ? '2px solid #aa00ff' : '1px solid #333',
                  boxShadow: avatar === a && !isDataUrlAvatar(avatar) ? '0 0 8px #aa00ff' : 'none',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Username */}
        <div className="mb-3">
          <label className="text-xs font-mono mb-1 block" style={{ color: '#888' }}>USERNAME</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 15))}
            onKeyDown={handleInputKeyDown}
            className="w-full px-3 py-2 rounded font-mono text-sm"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid #444',
              color: CYAN,
              outline: 'none',
            }}
            maxLength={15}
          />
          <span className="text-[10px] font-mono" style={{ color: '#555' }}>{username.length}/15</span>
        </div>

        {/* About */}
        <div className="mb-3">
          <label className="text-xs font-mono mb-1 block" style={{ color: '#888' }}>ABOUT</label>
          <input
            type="text"
            value={about}
            onChange={(e) => setAbout(e.target.value.slice(0, 50))}
            onKeyDown={handleInputKeyDown}
            className="w-full px-3 py-2 rounded font-mono text-sm"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid #444',
              color: '#ddd',
              outline: 'none',
            }}
            maxLength={50}
            placeholder="Tell us about yourself..."
          />
          <span className="text-[10px] font-mono" style={{ color: '#555' }}>{about.length}/50</span>
        </div>

        {/* Nationality */}
        <div className="mb-3">
          <label className="text-xs font-mono mb-1 block" style={{ color: '#888' }}>NATIONALITY</label>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full px-3 py-2 rounded font-mono text-sm"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid #444',
              color: '#ddd',
              outline: 'none',
            }}
          >
            <option value="">Select...</option>
            {NATIONALITIES.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="neon-btn w-full py-2.5 px-6 text-base font-bold font-mono tracking-wider mb-2"
          style={{
            borderColor: saved ? LIME : PURPLE,
            color: saved ? LIME : PURPLE,
            textShadow: saved ? '0 0 10px #00ff66' : '0 0 10px #aa00ff',
          }}
        >
          {saved ? '✓ SAVED!' : 'SAVE'}
        </button>

        <button
          onClick={handleBack}
          className="neon-btn w-full py-2 px-4 text-sm tracking-wider"
          style={{ borderColor: '#666', color: '#888' }}
        >
          BACK
        </button>
      </div>
    </div>
  );
}
