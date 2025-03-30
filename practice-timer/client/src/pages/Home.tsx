import { useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Timer from "@/components/Timer";
import TimerControls from "@/components/TimerControls";
import IterationTracker from "@/components/IterationTracker";
import { useTimer } from "@/hooks/useTimer";
import { useNotification } from "@/hooks/useNotification";
import { useToast } from "@/hooks/use-toast";
import { SettingsType, DEFAULT_SETTINGS } from "@/lib/timerService";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { resumeAudioContext } from "@/lib/soundEffects";
import { getQueryFn } from "@/lib/queryClient";

export default function Home() {
  // Fetch user settings from the server
  const { data: settings, isLoading: isLoadingSettings } = useQuery<SettingsType>({
    queryKey: ['/api/settings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (newSettings: SettingsType) => 
      apiRequest('POST', '/api/settings', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    }
  });

  // Get the current settings with fallback to defaults
  const currentSettings: SettingsType = settings || DEFAULT_SETTINGS;
  
  // Initialize the timer with default settings and update with server settings when loaded
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
    initialSettings: currentSettings,
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

  // Handle pause/resume
  const handlePauseResume = useCallback(async () => {
    if (isRunning) {
      pauseTimer();
    } else {
      try {
        await resumeAudioContext();
        startTimer();
      } catch (error) {
        console.error('Error starting timer:', error);
        toast({
          title: "Error Starting Timer",
          description: "Could not start the timer. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [isRunning, pauseTimer, startTimer, toast]);

  // Initialize audio context on mount
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

  // Handle user interaction with notifications
  const handleInteraction = useCallback(async () => {
    try {
      await resumeAudioContext();
    } catch (error) {
      console.error('Error resuming audio context:', error);
    }
  }, []);

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <header className="p-4 bg-card shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full bg-muted text-foreground hover:bg-red-100 hover:text-red-500 transition-colors"
              onClick={handleResetAll}
              aria-label="Reset to first iteration"
              title="Reset to first work session"
            >
              <span className="material-icons">restart_alt</span>
            </Button>
            <h1 className="text-2xl font-medium">Practice Timer</h1>
          </div>
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground"
            >
              <span className="material-icons">settings</span>
            </Button>
          </Link>
        </header>

        {/* Timer Section */}
        <section className="p-6 flex flex-col items-center justify-center">
          <div className="mb-4 text-lg font-medium" style={{ color: mode === 'work' ? 'hsl(4, 90%, 58%)' : 'hsl(122, 39%, 49%)' }}>
            {mode === 'work' ? 'Work Time' : 'Break Time'}
          </div>
          
          <Timer 
            timeRemaining={timeRemaining} 
            totalTime={totalTime} 
            mode={mode} 
            isRunning={isRunning} 
          />
          
          <div className="w-full max-w-xs mt-4 mb-6">
            <IterationTracker 
              currentIteration={currentIteration}
              totalIterations={totalIterations}
              mode={mode}
            />
          </div>
          
          <TimerControls 
            isRunning={isRunning} 
            onStart={startTimer} 
            onPause={pauseTimer} 
            onReset={handleResetCurrent}
            onSkip={handleSkip} 
          />
        </section>
      </div>
    </div>
  );
}
