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
  // All state hooks at the top
  const [settings, setSettings] = useState<SettingsType>(initialSettings);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeRemaining, setTimeRemaining] = useState(initialSettings.workDuration * 60);
  const [totalTime, setTotalTime] = useState(initialSettings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [totalIterations, setTotalIterations] = useState(initialSettings.iterations || 4);
  
  // All refs at the top
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastCheckRef = useRef<number>(Date.now());
  
  // All custom hooks at the top
  const { showNotification, playSound } = useNotification();
  const { toast } = useToast();

  // Initialize timer based on current mode and settings
  const initializeTimer = useCallback((currentMode: 'work' | 'break', currentSettings: SettingsType) => {
    const duration = currentMode === 'work' 
      ? currentSettings.workDuration 
      : currentSettings.breakDuration;
    
    setTimeRemaining(duration * 60);
    setTotalTime(duration * 60);
  }, []);

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
    console.log('Timer finished! Mode:', mode, 'Iteration:', currentIteration);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Ensure audio context is resumed for sound
    try {
      console.log('Attempting to resume audio context...');
      await resumeAudioContext();
      console.log('Audio context resumed successfully');
    } catch (error) {
      console.error('Error resuming audio context:', error);
    }
    
    if (onComplete) {
      console.log('Calling onComplete callback...');
      onComplete();
    }
    
    // Handle iteration management
    let nextMode: 'work' | 'break' = mode === 'work' ? 'break' : 'work';
    let nextIteration = currentIteration;
    
    // If we're finishing a break session, increment the iteration counter
    if (mode === 'break') {
      nextIteration = currentIteration + 1;
    }
    
    console.log('Next session:', { nextMode, nextIteration, totalIterations });
    
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
    
    // Update state in the correct order
    setIsRunning(false);
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
    const updateTimer = () => {
      if (!isRunning || !startTimeRef.current) return;

      const startTime = startTimeRef.current;
      const endTime = startTime + (totalTime * 1000);
      const now = Date.now();
      
      // Only adjust start time if we've missed more than 10 seconds of updates
      if (now - lastCheckRef.current > 10000) {
        console.log('Timer update delayed, adjusting start time');
        startTimeRef.current = now - (totalTime * 1000 - timeRemaining * 1000);
      }
      
      if (now >= endTime) {
        console.log('Timer reached end time!', {
          now,
          endTime,
          timeRemaining,
          mode,
          currentIteration
        });
        setIsRunning(false);
        completeSession();
      } else {
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        setTimeRemaining(remaining);
      }
      
      lastCheckRef.current = now;
    };

    if (isRunning) {
      console.log('Timer is running, setting up interval');
      // Update immediately
      updateTimer();
      
      // Set up interval for updates
      timerRef.current = window.setInterval(updateTimer, 1000);
    }

    // Cleanup function
    return () => {
      if (timerRef.current !== null) {
        console.log('Cleaning up timer interval');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, completeSession]);

  // Start timer
  const startTimer = useCallback(async () => {
    if (!isRunning) {
      try {
        console.log('Starting timer...', { mode, currentIteration, totalTime });
        // Resume audio context for sound
        await resumeAudioContext();
        startTimeRef.current = Date.now();
        lastCheckRef.current = Date.now();
        setIsRunning(true);
        console.log('Timer started successfully');
      } catch (error) {
        console.error('Error starting timer:', error);
        toast({
          title: "Error Starting Timer",
          description: "Could not start the timer. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      console.log('Timer is already running');
    }
  }, [isRunning, toast, mode, currentIteration, totalTime]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    }
  }, [isRunning]);

  // Reset timer
  const resetTimer = useCallback((currentTimerOnly = false) => {
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

  // Update settings
  const updateSettings = useCallback((newSettings: SettingsType) => {
    setSettings(newSettings);
    setTotalIterations(newSettings.iterations);
    
    // If timer is running, stop it before updating duration
    if (isRunning) {
      setIsRunning(false);
      startTimeRef.current = null;
    }
    
    // Initialize timer with new settings
    initializeTimer(mode, newSettings);
  }, [mode, initializeTimer, isRunning]);

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
