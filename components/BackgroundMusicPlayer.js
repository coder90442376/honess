'use client';

import { useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function BackgroundMusicPlayer() {
  const audioRef = useRef(null);
  const duckedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pathname = usePathname();

  // The chat composer lives at the bottom-right of /messages and this floating
  // button covered its send button (user-reported). Keep the <audio> mounted so
  // music continues seamlessly across navigation — only the button hides.
  const hideButton = pathname?.startsWith('/messages');

  useEffect(() => {
    // Restore user preference from localStorage
    const savedPref = localStorage.getItem('hn_music_muted');
    if (savedPref === 'false') {
      setIsMuted(false);
    }

    // Attempt play on first user interaction (browser autoplay policy)
    const handleFirstInteraction = () => {
      if (audioRef.current && !hasInteracted) {
        audioRef.current.play().catch(() => {});
        setHasInteracted(true);
      }
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    // Sync muted state to audio element and localStorage
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
    localStorage.setItem('hn_music_muted', isMuted.toString());
  }, [isMuted]);

  // Auto-pause ("duck") background music while other media (e.g. the demo
  // video) is playing, then resume afterwards. Coordinated via window events
  // so any player on the page can request ducking without a shared store.
  useEffect(() => {
    const audio = audioRef.current;

    const handleDuck = () => {
      if (audio && !audio.paused) {
        audio.pause();
        duckedRef.current = true;
      }
    };

    const handleUnduck = () => {
      if (audio && duckedRef.current) {
        duckedRef.current = false;
        // Resume regardless of mute state to keep the element "primed";
        // the muted attribute still controls whether it's audible.
        audio.play().catch(() => {});
      }
    };

    window.addEventListener('hn:duck-audio', handleDuck);
    window.addEventListener('hn:unduck-audio', handleUnduck);
    return () => {
      window.removeEventListener('hn:duck-audio', handleDuck);
      window.removeEventListener('hn:unduck-audio', handleUnduck);
    };
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.muted = false;
      audio.play().catch((err) => {
        console.warn('[HonestNeed] Audio play failed:', err.message);
      });
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        // Served from Cloudinary rather than /public: the track is ~10MB and
        // every visitor would otherwise pull it from the app server.
        src="https://res.cloudinary.com/dctvil2gu/video/upload/v1788547765/honestneed-background-music-v3.mp3"
        loop
        autoPlay
        muted
        preload="auto"
        style={{ display: 'none' }}
      />

      {!hideButton && (
      <button
        id="hn-music-btn"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
        title={isMuted ? 'Click to play music' : 'Click to mute'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '48px',
          height: '48px',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease, filter 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.filter = 'brightness(1.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      )}

      {/* Pulse ring animation when playing */}
      {!hideButton && !isMuted && (
        <div
          id="hn-music-pulse"
          aria-hidden="true"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            width: '48px',
            height: '48px',
            borderRadius: '9999px',
            border: '2px solid rgba(255,255,255,0.4)',
            animation: 'hn-pulse 2s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <style>{`
        @keyframes hn-pulse {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.6);  opacity: 0;   }
        }
      `}</style>
    </>
  );
}
