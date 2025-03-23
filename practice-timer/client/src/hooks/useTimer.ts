import { useState, useEffect, useRef, useCallback } from 'react';
import { SettingsType } from '@/lib/timerService';
import { apiRequest } from '@/lib/queryClient';
import { useNotification } from './useNotification';
import { useToast } from '@/hooks/use-toast';
import { resumeAudioContext } from '@/lib/soundEffects';

interface UseTimerProps {
  initialSettings: SettingsType;
  onComplete?: () => void;
}

export function useTimer({ initialSettings, onComplete }: UseTimerProps) {
  const [settings, setSettings] = useState<SettingsType>(initialSettings);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeRemaining, setTimeRemaining] = useState(initialSettings.workDuration * 60);
  const [totalTime, setTotalTime] = useState(initialSettings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [totalIterations, setTotalIterations] = useState(initialSettings.iterations || 4);
  
  const timerRef = useRef<number | null>(null);
  const { showNotification } = useNotification();
  const { toast } = useToast();

  // Initialize timer based on current mode and settings
  const initializeTimer = useCallback((currentMode: 'work' | 'break', currentSettings: SettingsType) => {
    const duration = currentMode === 'work' 
      ? currentSettings.workDuration 
      : currentSettings.breakDuration;
    
    setTimeRemaining(duration * 60);
    setTotalTime(duration * 60);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: SettingsType) => {
    setSettings(newSettings);
    setTotalIterations(newSettings.iterations);
    initializeTimer(mode, newSettings);
  }, [mode, initializeTimer]);

  // Start timer
  const startTimer = useCallback(async () => {
    if (!isRunning) {
      try {
        // Resume audio context for sound
        await resumeAudioContext();
        setIsRunning(true);
      } catch (error) {
        console.error('Error starting timer:', error);
        toast({
          title: "Error Starting Timer",
          description: "Could not start the timer. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [isRunning, toast]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    }
  }, [isRunning]);

  // Reset timer
  const resetTimer = useCallback((currentTimerOnly = false) => {
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRunning(false);
    
    if (currentTimerOnly) {
      // Only reset the current timer duration
      initializeTimer(mode, settings);
    } else {
      // Reset to work mode and first iteration
      setMode('work');
      setCurrentIteration(1);
      // Initialize timer for work mode
      initializeTimer('work', settings);
    }
  }, [settings, mode, initializeTimer]);

  // Skip timer
  const skipTimer = useCallback(() => {
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRunning(false);
    const nextMode = mode === 'work' ? 'break' : 'work';
    
    // If we're switching from break to work, increment iteration
    if (mode === 'break') {
      setCurrentIteration(prev => {
        const next = prev + 1;
        if (next > totalIterations) {
          // Reset to first iteration if we've completed all iterations
          return 1;
        }
        return next;
      });
    }
    
    setMode(nextMode);
    initializeTimer(nextMode, settings);
  }, [mode, settings, initializeTimer, totalIterations]);

  // Complete current session and start next one
  const completeSession = useCallback(async () => {
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (onComplete) {
      onComplete();
    }
    
    // Handle iteration management
    let nextMode: 'work' | 'break' = mode === 'work' ? 'break' : 'work';
    let nextIteration = currentIteration;
    
    // If we're finishing a break session, increment the iteration counter
    if (mode === 'break') {
      nextIteration = currentIteration + 1;
    }
    
    // Check if we've completed all iterations
    if (nextIteration > totalIterations && mode === 'break') {
      // Reset for a new cycle
      nextMode = 'work';
      nextIteration = 1;
      
      // Show completion notification
      if (settings.browserNotificationsEnabled) {
        showNotification('Practice Cycle Complete! 🎉', {
          body: 'Great job! You\'ve completed all your practice sessions.',
        });
      }
    } else {
      // Show session completion notification
      if (settings.browserNotificationsEnabled) {
        showNotification(`${nextMode === 'work' ? 'Work' : 'Break'} Session Complete! ${nextMode === 'work' ? '💪' : '☕'}`, {
          body: `Time for a ${nextMode === 'work' ? 'break' : 'work'} session.`,
        });
      }
    }
    
    setMode(nextMode);
    setCurrentIteration(nextIteration);
    initializeTimer(nextMode, settings);

    // Save session to server
    try {
      await apiRequest('POST', '/api/sessions', {
        type: mode,
        startTime: new Date(Date.now() - (mode === 'work' ? settings.workDuration : settings.breakDuration) * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: mode === 'work' ? settings.workDuration : settings.breakDuration,
        completed: true
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [mode, settings, onComplete, initializeTimer, currentIteration, totalIterations, showNotification]);

  // Timer logic
  useEffect(() => {
    // Clear any existing interval when running state changes
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            // Timer complete
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setIsRunning(false);
            completeSession();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, completeSession]);

  // Initialize timer when mode changes
  useEffect(() => {
    initializeTimer(mode, settings);
  }, [mode, settings, initializeTimer]);

  return {
    timeRemaining,
    totalTime,
    isRunning,
    mode,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipTimer,
    updateSettings,
    currentIteration,
    totalIterations
  };
}
