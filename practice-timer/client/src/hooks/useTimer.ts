import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/hooks/useNotification';
import { useToast } from '@/hooks/use-toast';
import { resumeAudioContext } from '@/lib/soundEffects';

interface WakeLock {
  released: boolean;
  release: () => Promise<void>;
}

interface UseTimerProps {
  initialSettings: {
    workDuration: number;
    breakDuration: number;
    iterations?: number;
    soundEnabled: boolean;
    browserNotificationsEnabled: boolean;
    numberOfBeeps: number;
    mode: string;
  };
  onComplete?: () => void;
}

export function useTimer({ initialSettings, onComplete }: UseTimerProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeRemaining, setTimeRemaining] = useState(initialSettings.workDuration * 60);
  const [totalTime, setTotalTime] = useState(initialSettings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [totalIterations, setTotalIterations] = useState(initialSettings.iterations || 4);
  
  const workerRef = useRef<Worker | null>(null);
  const { showNotification } = useNotification();
  const wakeLockRef = useRef<WakeLock | null>(null);
  const { toast } = useToast();
  const startTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const lastSecondRef = useRef<number>(0);

  // Complete current session and start next one
  const completeSession = useCallback(async () => {
    // Update iterations and mode
    setCurrentIteration(prev => {
      const newIteration = prev + 1;
      if (newIteration > totalIterations) {
        // All iterations completed
        setIsRunning(false);
        setMode('work');
        setCurrentIteration(1);
        setTimeRemaining(settings.workDuration * 60);
        setTotalTime(settings.workDuration * 60);

        // Show completion notification
        if (settings.browserNotificationsEnabled) {
          showNotification('Practice Cycle Complete! 🎉', {
            body: 'Great job! You\'ve completed all your practice sessions.',
          });
        }

        return 1;
      } else {
        // Switch mode
        const newMode = mode === 'work' ? 'break' : 'work';
        setMode(newMode);
        setTimeRemaining(newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);
        setTotalTime(newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60);

        // Show session completion notification
        if (settings.browserNotificationsEnabled) {
          showNotification(`${newMode === 'work' ? 'Work' : 'Break'} Session Complete! ${newMode === 'work' ? '💪' : '☕'}`, {
            body: `Time for a ${newMode === 'work' ? 'break' : 'work'} session.`,
          });
        }

        return newIteration;
      }
    });
  }, [mode, settings, totalIterations, showNotification]);

  // Setup worker message handler
  useEffect(() => {
    if (!workerRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'TICK':
          setTimeRemaining(payload.timeRemaining);
          break;
        case 'COMPLETE':
          setIsRunning(false);
          if (onComplete) {
            console.log('Timer completed, calling onComplete callback');
            onComplete();
          }
          completeSession();
          break;
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
    return () => {
      workerRef.current?.removeEventListener('message', handleMessage);
    };
  }, [completeSession, onComplete]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/timerWorker.ts', import.meta.url));
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Initialize timer with current settings
  const initializeTimer = useCallback((currentMode: 'work' | 'break', currentSettings: typeof settings) => {
    const duration = currentMode === 'work' 
      ? currentSettings.workDuration 
      : currentSettings.breakDuration;
    
    setTimeRemaining(duration * 60);
    setTotalTime(duration * 60);
    
    // Update worker with new time
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_TIME',
        payload: { timeRemaining: duration * 60 }
      });
    }
  }, []);

  const updateSettings = useCallback((newSettings: typeof settings) => {
    console.log('Updating settings:', newSettings);
    setSettings(newSettings);
    setTotalIterations(newSettings.iterations || 4);
    
    // If we're in break mode, update the break duration
    if (mode === 'break') {
      initializeTimer('break', newSettings);
    }
    // If we're in work mode, update the work duration
    else {
      initializeTimer('work', newSettings);
    }
  }, [mode, initializeTimer]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({ type: 'PAUSE' });
    setIsRunning(false);
  }, []);

  // Reset timer
  const resetTimer = useCallback((resetCurrentOnly = false) => {
    if (!workerRef.current) return;

    const newMode = resetCurrentOnly ? mode : 'work';
    const newTime = newMode === 'work' ? settings.workDuration * 60 : settings.breakDuration * 60;

    if (!resetCurrentOnly) {
      // Reset to first work session
      setMode('work');
      setCurrentIteration(1);
    }

    // Update time state
    setTimeRemaining(newTime);
    setTotalTime(newTime);

    // Send reset message to worker with new time
    workerRef.current.postMessage({ 
      type: 'RESET',
      payload: { timeRemaining: newTime }
    });
    setIsRunning(false);
  }, [mode, settings]);

  // Skip timer
  const skipTimer = useCallback(() => {
    setIsRunning(false);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PAUSE' });
    }

    // Release wake lock if it exists
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          wakeLockRef.current = null;
        })
        .catch(err => console.log('Error releasing wake lock:', err));
    }
    
    const nextMode = mode === 'work' ? 'break' : 'work';
    setMode(nextMode);

    // If we're moving from break to work, increment the iteration
    if (mode === 'break') {
      const nextIteration = currentIteration + 1;
      if (nextIteration > totalIterations) {
        // If we've completed all iterations, reset to first iteration
        setCurrentIteration(1);
        toast({
          title: "Practice Complete",
          description: "All iterations completed! Starting new cycle.",
          variant: "default",
        });
      } else {
        setCurrentIteration(nextIteration);
      }
    }

    // Initialize the timer for the next session
    const nextDuration = nextMode === 'work' ? settings.workDuration : settings.breakDuration;
    setTimeRemaining(nextDuration * 60);
    setTotalTime(nextDuration * 60);

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_TIME',
        payload: { timeRemaining: nextDuration * 60 }
      });
    }
  }, [mode, settings, currentIteration, totalIterations, toast]);

  // Initialize timer when mode changes
  useEffect(() => {
    initializeTimer(mode, settings);
  }, [mode, settings, initializeTimer]);

  // Start timer
  const startTimer = useCallback(async () => {
    try {
      if (!workerRef.current) return;

      // Request wake lock
      if ('wakeLock' in navigator) {
        try {
          // Try system wake lock first, fall back to screen wake lock if not supported
          const wakeLockType = 'system' in (navigator as any).wakeLock ? 'system' : 'screen';
          wakeLockRef.current = await (navigator as any).wakeLock.request(wakeLockType);
        } catch (err) {
          console.log('Error requesting wake lock:', err);
        }
      }

      workerRef.current.postMessage({ 
        type: 'START',
        payload: { timeRemaining }
      });
      setIsRunning(true);
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: "Error",
        description: "Failed to start timer. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, timeRemaining]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => {
            wakeLockRef.current = null;
          })
          .catch(err => console.log('Error releasing wake lock:', err));
      }
    };
  }, []);

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
