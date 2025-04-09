import { create } from 'zustand';
import { SettingsType } from '@/lib/timerService';

interface TimerState {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  mode: 'work' | 'break';
  currentIteration: number;
  totalIterations: number;
  settings: SettingsType;
  setTimeRemaining: (time: number) => void;
  setTotalTime: (time: number) => void;
  setIsRunning: (isRunning: boolean) => void;
  setMode: (mode: 'work' | 'break') => void;
  setCurrentIteration: (iteration: number) => void;
  setTotalIterations: (iterations: number) => void;
  setSettings: (settings: SettingsType) => void;
}

const DEFAULT_WORK_TIME = 25 * 60; // 25 minutes in seconds

export const useTimerStore = create<TimerState>((set) => ({
  timeRemaining: DEFAULT_WORK_TIME,
  totalTime: DEFAULT_WORK_TIME,
  isRunning: false,
  mode: 'work',
  currentIteration: 1,
  totalIterations: 4,
  settings: {
    workTime: DEFAULT_WORK_TIME,
    breakTime: 5 * 60, // 5 minutes in seconds
    iterations: 4,
    volume: 0.5,
    numberOfBeeps: 3,
    soundType: 'beep'
  } as SettingsType,
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setTotalTime: (time) => set({ totalTime: time }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setMode: (mode) => set({ mode }),
  setCurrentIteration: (iteration) => set({ currentIteration: iteration }),
  setTotalIterations: (iterations) => set({ totalIterations: iterations }),
  setSettings: (settings) => set({ settings }),
})); 