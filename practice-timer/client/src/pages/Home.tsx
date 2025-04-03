import { useEffect, useCallback } from "react";
import Timer from "@/components/Timer";
import TimerControls from "@/components/TimerControls";
import IterationTracker from "@/components/IterationTracker";
import { useTimer } from "@/hooks/useTimer";
import { useNotification } from "@/hooks/useNotification";
import { useToast } from "@/hooks/use-toast";
import { SettingsType } from "@/lib/timerService";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { resumeAudioContext } from "@/lib/soundEffects";
import { getSettings } from "@/lib/localStorage";

export default function Home() {
  // Get settings from local storage
  const settings: SettingsType = getSettings();
  
  // Initialize the timer with settings from local storage
  const { 
    timeRemaining, 
    totalTime, 
    isRunning, 
    mode, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    skipTimer,
    updateSettings,
    currentIteration,
    totalIterations
  } = useTimer({
    initialSettings: settings,
    onComplete: async () => {
      // Trigger notification and sound
      if (settings?.soundEnabled) {
        console.log('Timer completed, current settings:', settings);
        console.log('Number of beeps setting:', settings.numberOfBeeps);
        playSound(settings);
      }
      if (settings?.browserNotificationsEnabled) {
        showNotification('Timer Complete!', {
          body: 'Time to take a break!',
          silent: false,
          tag: 'timer-complete',
          requireInteraction: true
        });
      }
    }
  });

  // Setup notifications and toast
  const { playSound, requestNotificationPermission, showNotification } = useNotification();
  const { toast } = useToast();

  // Initialize notifications on mount
  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('Initializing notifications...');
        const granted = await requestNotificationPermission();
        console.log('Notification permission status:', granted);
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();
  }, [requestNotificationPermission]);

  // Handle reset all (reset to first iteration)
  const handleResetAll = useCallback(() => {
    resetTimer(false);
  }, [resetTimer]);

  // Handle reset current (keep current iteration)
  const handleResetCurrent = useCallback(() => {
    resetTimer(true);
  }, [resetTimer]);

  // Handle skip current session
  const handleSkip = useCallback(() => {
    skipTimer();
  }, [skipTimer]);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = async () => {
      try {
        await resumeAudioContext();
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initAudio();
  }, []);

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      <div className="max-w-2xl mx-auto">
        <header className="p-4 bg-card shadow-sm flex items-center justify-between">
          <h1 className="text-2xl font-medium">Practice Timer</h1>
          <Link to="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground"
            >
              <span className="material-icons">settings</span>
            </Button>
          </Link>
        </header>

        <main className="p-6">
          <div className="space-y-8">
            <Timer
              timeRemaining={timeRemaining}
              totalTime={totalTime}
              mode={mode}
              isRunning={isRunning}
            />

            <TimerControls
              isRunning={isRunning}
              onStart={startTimer}
              onPause={pauseTimer}
              onReset={handleResetAll}
              onSkip={handleSkip}
            />

            <IterationTracker
              currentIteration={currentIteration}
              totalIterations={totalIterations}
              mode={mode}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
