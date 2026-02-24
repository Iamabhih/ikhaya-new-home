import { useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const PWAUpdatePrompt = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;

      // Hourly check — catches users who leave a tab open for a long time
      intervalRef.current = setInterval(() => registration.update(), 60 * 60 * 1000);

      // Visibility check — fires when the user switches back to this tab
      const onVisible = () => {
        if (document.visibilityState === 'visible') registration.update();
      };
      document.addEventListener('visibilitychange', onVisible);

      // Cleanup on SW unregistration (rare, but correct)
      registration.addEventListener('updatefound', () => {
        clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', onVisible);
      });
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs bg-card border border-border shadow-xl rounded-xl p-4 flex items-start gap-3">
      <RefreshCw className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">Update available</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          A new version is ready. Reload to get the latest.
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-3"
            onClick={() => setNeedRefresh(false)}
          >
            Later
          </Button>
          <Button
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
};
