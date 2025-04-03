import { useState, useEffect, useRef, useCallback } from 'react';
import { SettingsType } from '@/lib/timerService';
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

  // Complete current session and start next one
  const completeSession = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Ensure audio context is resumed for sound
    try {
      await resumeAudioContext();
      // Play the sound effect
      await playSound();
    } catch (error) {
      console.error('Error playing sound:', error);
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
        showNotification('Cycle Complete!', {
          body: 'Great job! Time to start a new cycle.',
          silent: false,
          tag: 'cycle-complete',
          requireInteraction: true
        });
      }
    }
    
    // Update state for next session
    setMode(nextMode);
    setCurrentIteration(nextIteration);
    initializeTimer(nextMode, settings);
    setIsRunning(false); // Reset the play/pause button state
  }, [mode, currentIteration, totalIterations, settings, onComplete, playSound, showNotification, initializeTimer]);

  // Start timer
  const startTimer = useCallback(async () => {
    if (isRunning) return;
    
    try {
      setIsRunning(true);
      startTimeRef.current = Date.now();
      lastCheckRef.current = Date.now();
      
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastCheckRef.current;
        lastCheckRef.current = now;
        
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - Math.floor(elapsed / 1000));
          if (newTime === 0) {
            completeSession();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting timer:', error);
      setIsRunning(false);
    }
  }, [isRunning, completeSession]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRunning(false);
  }, [isRunning]);

  // Reset timer
  const resetTimer = useCallback((keepCurrentIteration: boolean = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRunning(false);
    setMode('work');
    if (!keepCurrentIteration) {
      setCurrentIteration(1);
    }
    initializeTimer('work', settings);
  }, [initializeTimer, settings]);

  // Skip current session
  const skipTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
        showNotification('Cycle Complete!', {
          body: 'Great job! Time to start a new cycle.',
          silent: false,
          tag: 'cycle-complete',
          requireInteraction: true
        });
      }
    }
    
    // Update state for next session
    setMode(nextMode);
    setCurrentIteration(nextIteration);
    initializeTimer(nextMode, settings);
  }, [mode, currentIteration, totalIterations, settings, showNotification, initializeTimer]);

  // Update settings
  const updateSettings = useCallback((newSettings: SettingsType) => {
    setSettings(newSettings);
    if (mode === 'work') {
      initializeTimer('work', newSettings);
    } else {
      initializeTimer('break', newSettings);
    }
  }, [mode, initializeTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
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
  };
}
