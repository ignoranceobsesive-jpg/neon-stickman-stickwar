'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';
import { soundEngine } from '@/lib/sound-engine';
import { CYAN, LIME, ORANGE, MAGENTA, YELLOW, PURPLE } from '@/lib/game-types';

export default function SettingsPanel() {
  const soundSettings = useGameStore(s => s.soundSettings);
  const setSoundSettings = useGameStore(s => s.setSoundSettings);
  const backToMenu = useGameStore(s => s.backToMenu);
  const setGamePhase = useGameStore(s => s.setGamePhase);
  const wasPlaying = useGameStore(s => s.currentLevel > 0); // If we have a level, we were playing

  const handleSliderChange = (key: 'masterVolume' | 'sfxVolume' | 'musicVolume', value: number) => {
    setSoundSettings({ [key]: value / 100 });
    soundEngine.init();
    soundEngine.playMenuClick();
  };

  const handleToggle = (key: 'musicEnabled' | 'sfxEnabled', value: boolean) => {
    setSoundSettings({ [key]: value });
    soundEngine.init();
    soundEngine.playMenuClick();
  };

  const handleBack = () => {
    soundEngine.playMenuClick();
    backToMenu();
  };

  const handleResume = () => {
    soundEngine.playMenuClick();
    setGamePhase('playing');
  };

  const sliderStyle = (color: string) => ({
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: `linear-gradient(to right, ${color} 0%, ${color} var(--value), #222 var(--value), #222 100%)`,
    outline: 'none',
    cursor: 'pointer',
  });

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 pointer-events-auto mx-4"
        style={{
          backgroundColor: 'rgba(5, 5, 20, 0.97)',
          border: '2px solid #00ffff',
          boxShadow: '0 0 30px #00ffff20',
        }}
      >
        <h1
          className="text-3xl font-bold text-center tracking-wider mb-6 font-mono"
          style={{ color: LIME, textShadow: '0 0 10px #00ff66' }}
        >
          {wasPlaying ? 'PAUSED' : 'SETTINGS'}
        </h1>

        {/* Volume Controls */}
        <div className="space-y-5 mb-6">
          {/* Master Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-mono font-bold" style={{ color: CYAN, textShadow: '0 0 5px #00ffff' }}>
                MASTER VOLUME
              </label>
              <span className="text-sm font-mono" style={{ color: CYAN }}>
                {Math.round(soundSettings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(soundSettings.masterVolume * 100)}
              onChange={(e) => handleSliderChange('masterVolume', parseInt(e.target.value))}
              className="w-full"
              style={{
                ...sliderStyle(CYAN),
                '--value': `${soundSettings.masterVolume * 100}%`,
              } as React.CSSProperties}
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-mono font-bold" style={{ color: ORANGE, textShadow: '0 0 5px #ff6600' }}>
                SFX VOLUME
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono" style={{ color: ORANGE }}>
                  {Math.round(soundSettings.sfxVolume * 100)}%
                </span>
                <button
                  onClick={() => handleToggle('sfxEnabled', !soundSettings.sfxEnabled)}
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded"
                  style={{
                    border: `1px solid ${soundSettings.sfxEnabled ? LIME : '#555'}`,
                    color: soundSettings.sfxEnabled ? LIME : '#555',
                    backgroundColor: soundSettings.sfxEnabled ? 'rgba(0,255,102,0.1)' : 'transparent',
                  }}
                >
                  {soundSettings.sfxEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(soundSettings.sfxVolume * 100)}
              onChange={(e) => handleSliderChange('sfxVolume', parseInt(e.target.value))}
              className="w-full"
              style={{
                ...sliderStyle(ORANGE),
                '--value': `${soundSettings.sfxVolume * 100}%`,
              } as React.CSSProperties}
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-mono font-bold" style={{ color: MAGENTA, textShadow: '0 0 5px #ff00ff' }}>
                MUSIC VOLUME
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono" style={{ color: MAGENTA }}>
                  {Math.round(soundSettings.musicVolume * 100)}%
                </span>
                <button
                  onClick={() => handleToggle('musicEnabled', !soundSettings.musicEnabled)}
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded"
                  style={{
                    border: `1px solid ${soundSettings.musicEnabled ? LIME : '#555'}`,
                    color: soundSettings.musicEnabled ? LIME : '#555',
                    backgroundColor: soundSettings.musicEnabled ? 'rgba(0,255,102,0.1)' : 'transparent',
                  }}
                >
                  {soundSettings.musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(soundSettings.musicVolume * 100)}
              onChange={(e) => handleSliderChange('musicVolume', parseInt(e.target.value))}
              className="w-full"
              style={{
                ...sliderStyle(MAGENTA),
                '--value': `${soundSettings.musicVolume * 100}%`,
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Controls Reference */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: 'rgba(0,255,255,0.03)',
            border: '1px solid rgba(0,255,255,0.15)',
          }}
        >
          <h3 className="text-sm font-mono font-bold mb-3" style={{ color: YELLOW, textShadow: '0 0 5px #ffff00' }}>
            CONTROLS
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Keyboard */}
            <div>
              <div className="text-xs font-mono font-bold mb-1.5" style={{ color: CYAN }}>
                KEYBOARD
              </div>
              <div className="text-[10px] font-mono space-y-0.5" style={{ color: '#888' }}>
                <p>A/D — Move</p>
                <p>W — Jump</p>
                <p>Space — Shoot</p>
                <p>Shift — Dash/Skill 1</p>
                <p>E — Shield/Skill 2</p>
                <p>F — Special/Skill 3</p>
              </div>
            </div>

            {/* Mobile */}
            <div>
              <div className="text-xs font-mono font-bold mb-1.5" style={{ color: PURPLE }}>
                MOBILE
              </div>
              <div className="text-[10px] font-mono space-y-0.5" style={{ color: '#888' }}>
                <p>Joystick — Move</p>
                <p>⬆ — Jump</p>
                <p>🔥 — Shoot</p>
                <p>⚡ — Dash/Skill 1</p>
                <p>🛡 — Shield/Skill 2</p>
                <p>✦ — Special/Skill 3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resume / Back Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleResume}
            className="neon-btn flex-1 py-3 px-4 text-lg font-bold font-mono tracking-wider"
            style={{
              borderColor: LIME,
              color: LIME,
              textShadow: '0 0 10px #00ff66',
            }}
          >
            RESUME
          </button>
          <button
            onClick={handleBack}
            className="neon-btn flex-1 py-3 px-4 text-sm font-bold font-mono tracking-wider"
            style={{
              borderColor: '#666',
              color: '#888',
              textShadow: 'none',
            }}
          >
            QUIT
          </button>
        </div>
      </div>
    </div>
  );
}
