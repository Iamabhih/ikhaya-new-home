import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';

export const BackgroundAudioPlayer = () => {
  const { isMuted, toggleMute, isPlaying } = useAudio();

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        className={cn(
          "h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground transition-all",
          isPlaying && !isMuted && "text-primary animate-pulse"
        )}
        aria-label={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? (
          <VolumeX className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
        )}
      </Button>
    </div>
  );
};
