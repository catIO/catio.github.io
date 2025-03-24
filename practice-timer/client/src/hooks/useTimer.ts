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
  const startTimeRef = useRef<number | null>(null);
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
        startTimeRef.current = Date.now();
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
    startTimeRef.current = null;
    
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
    startTimeRef.current = null;
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

  // Save session to server with retry logic
  const saveSession = useCallback(async (sessionData: any) => {
    try {
      // Store in localStorage first as backup
      const pendingSessions = JSON.parse(localStorage.getItem('pendingSessions') || '[]');
      pendingSessions.push(sessionData);
      localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));

      // Try to save to server
      await apiRequest('POST', '/api/sessions', sessionData);
      
      // If successful, remove from pending sessions
      const updatedPendingSessions = pendingSessions.filter(
        (session: any) => session.startTime !== sessionData.startTime
      );
      localStorage.setItem('pendingSessions', JSON.stringify(updatedPendingSessions));
    } catch (error) {
      console.error('Error saving session:', error);
      // Session is already saved in localStorage, so we can safely ignore the error
    }
  }, []);

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

    // Save session to server without blocking
    try {
      const sessionData = {
        type: mode,
        startTime: new Date(Date.now() - (mode === 'work' ? settings.workDuration : settings.breakDuration) * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: mode === 'work' ? settings.workDuration : settings.breakDuration,
        completed: true
      };
      
      // Fire and forget the session save
      saveSession(sessionData);
    } catch (error) {
      console.error('Error preparing session data:', error);
    }
  }, [mode, settings, onComplete, initializeTimer, currentIteration, totalIterations, showNotification, saveSession]);

  // Timer logic
  useEffect(() => {
    // Clear any existing interval when running state changes
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isRunning && startTimeRef.current) {
      const startTime = startTimeRef.current;
      const endTime = startTime + (totalTime * 1000);

      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

        setTimeRemaining(remaining);

        if (remaining <= 0) {
          // Timer complete
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsRunning(false);
          completeSession();
        }
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, completeSession, totalTime]);

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
