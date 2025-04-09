import { useEffect, useCallback, useState } from "react";
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
import { Settings } from "lucide-react";
import "@/assets/headerBlur.css";

export default function Home() {
  // Get settings from local storage
  const settings: SettingsType = getSettings();
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Setup notifications and toast
  const { toast } = useToast();
  const { playSound } = useNotification();

  const {
    timeRemaining,
    totalTime,
    isRunning,
    mode,
    startTimer,
    pauseTimer,
    resetTimer,
    skipTimer,
    currentIteration,
    totalIterations
  } = useTimer({
    initialSettings: settings,
    onComplete: useCallback(() => {
      console.log('Timer completed');
      console.log('Number of beeps setting:', settings.numberOfBeeps);
      console.log('Volume setting:', settings.volume);
      console.log('Sound type setting:', settings.soundType);
      playSound(settings);
      toast({
        title: 'Timer Complete',
        description: 'Your timer has finished!',
      });
    }, [settings, toast, playSound])
  });

  // Initialize audio context on first user interaction
  const initializeAudio = async () => {
    if (!audioInitialized) {
      try {
        await resumeAudioContext();
        setAudioInitialized(true);
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    }
  };

  // Handle reset all (reset to first iteration)
  const handleResetAll = useCallback(async () => {
    await initializeAudio();
    resetTimer();
  }, [resetTimer, initializeAudio]);

  // Handle reset current (keep current iteration)
  const handleResetCurrent = useCallback(async () => {
    await initializeAudio();
    resetTimer();
  }, [resetTimer, initializeAudio]);

  // Handle skip current session
  const handleSkip = useCallback(async () => {
    await initializeAudio();
    skipTimer();
  }, [skipTimer, initializeAudio]);

  // Handle start timer
  const handleStart = useCallback(async () => {
    await initializeAudio();
    startTimer();
  }, [startTimer, initializeAudio]);

  // Handle pause timer
  const handlePause = useCallback(async () => {
    await initializeAudio();
    pauseTimer();
  }, [pauseTimer, initializeAudio]);

  return (
    <div className="text-foreground font-sans min-h-screen">
      <div className="max-w-2xl mx-auto">
        <header className="relative p-4 flex items-center justify-between overflow-hidden">
          <div className="relative z-10 flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold text-primary">Practice Timer</h1>
            <Link to="/settings">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary/80"
              >
                <span className="material-icons">settings</span>
              </Button>
            </Link>
          </div>
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
              onStart={handleStart}
              onPause={handlePause}
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
