import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  hasInteracted: boolean;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  markInteraction: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider = ({ children }: AudioProviderProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('ozz-audio-muted');
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('ozz-audio-volume');
    return saved ? parseFloat(saved) : 0.3;
  });
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio('/audio/ozz-background.mp3');
    audioRef.current.volume = volume;
    audioRef.current.muted = isMuted;

    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        const timeLeft = audioRef.current.duration - audioRef.current.currentTime;
        if (timeLeft <= 3 && timeLeft > 0 && !audioRef.current.muted) {
          startFadeOut(3000);
        }
      }
    };

    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      localStorage.setItem('ozz-audio-volume', volume.toString());
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      localStorage.setItem('ozz-audio-muted', JSON.stringify(isMuted));
    }
  }, [isMuted]);

  const startFadeOut = (duration: number = 3000) => {
    if (!audioRef.current) return;
    
    const startVolume = audioRef.current.volume;
    const startTime = Date.now();
    
    const fade = () => {
      if (!audioRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        audioRef.current.volume = startVolume * (1 - progress);
        requestAnimationFrame(fade);
      } else {
        audioRef.current.volume = 0;
        audioRef.current.pause();
      }
    };
    
    requestAnimationFrame(fade);
  };

  const markInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      
      const hasPlayed = sessionStorage.getItem('ozz-welcome-audio-played');
      
      if (!hasPlayed && !isMuted && audioRef.current) {
        audioRef.current.play().catch(console.error);
        sessionStorage.setItem('ozz-welcome-audio-played', 'true');
      }
    }
  };

  const play = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  };

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        hasInteracted,
        toggleMute,
        setVolume,
        play,
        pause,
        markInteraction,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};
