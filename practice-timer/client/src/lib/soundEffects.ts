// Sound effects for the timer application

// Sound effect types
type SoundEffect = 'start' | 'end' | 'reset' | 'skip';

// Volume control (0.0 to 1.0)
let masterVolume = 0.5;

// Create Web Audio API context
let audioContext: AudioContext | null = null;
let isInitialized = false;
let hasUserInteracted = false;

// Initialize audio context
const initializeAudioContext = async () => {
  if (!isInitialized && hasUserInteracted) {
    try {
      audioContext = new AudioContext();
      // Create and connect a silent buffer to keep the context alive
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      isInitialized = true;
      console.log('Audio context initialized');
    } catch (error) {
      console.error('Error initializing audio context:', error);
      throw error;
    }
  }
};

// Mark that user has interacted with the page
export const markUserInteraction = () => {
  if (!hasUserInteracted) {
    hasUserInteracted = true;
    console.log('User interaction detected, audio will be enabled');
    // Try to initialize audio context after user interaction
    initializeAudioContext().catch(console.error);
  }
};

// Create oscillator and gain nodes for sound generation
const createOscillator = (frequency: number, duration: number, startTime: number): OscillatorNode => {
  if (!audioContext) throw new Error('Audio context not initialized');
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  
  // Exponential decay
  gainNode.gain.setValueAtTime(masterVolume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  return oscillator;
};

// Sound effect frequencies and durations
const soundEffects: Record<SoundEffect, { frequency: number; duration: number }> = {
  start: { frequency: 440, duration: 0.8 },
  end: { frequency: 880, duration: 1.2 },
  reset: { frequency: 600, duration: 0.4 },
  skip: { frequency: 500, duration: 0.3 }
};

// Play a sound effect
export const playSound = async (effect: SoundEffect = 'end', times: number = 5): Promise<void> => {
  try {
    if (!hasUserInteracted) {
      console.log('Waiting for user interaction before playing sound...');
      return;
    }

    console.log(`Attempting to play ${effect} sound ${times} times...`);
    
    // Ensure audio context is initialized
    await initializeAudioContext();
    
    // Resume audio context if suspended
    if (audioContext!.state === 'suspended') {
      await audioContext!.resume();
    }
    
    const { frequency, duration } = soundEffects[effect];
    const startTime = audioContext!.currentTime;
    const gapBetweenBeeps = 0.1; // 100ms gap between beeps
    
    // Play the sound multiple times
    for (let i = 0; i < times; i++) {
      const beepStartTime = startTime + (i * (duration + gapBetweenBeeps));
      const oscillator = createOscillator(frequency, duration, beepStartTime);
      oscillator.start(beepStartTime);
      oscillator.stop(beepStartTime + duration);
      console.log(`Started playing ${effect} sound ${i + 1}/${times} at time ${beepStartTime}`);
    }
  } catch (error) {
    console.error(`Error playing ${effect} sound:`, error);
    throw error;
  }
};

// Set master volume (0.0 to 1.0)
export const setVolume = (volume: number): void => {
  masterVolume = Math.max(0, Math.min(1, volume));
  console.log(`Master volume set to ${masterVolume}`);
};

// Resume audio context
export const resumeAudioContext = async (): Promise<void> => {
  try {
    if (!hasUserInteracted) {
      console.log('Waiting for user interaction before initializing audio...');
      return;
    }

    await initializeAudioContext();
    
    if (audioContext!.state === 'suspended') {
      await audioContext!.resume();
    }
  } catch (error) {
    console.error('Error resuming audio context:', error);
    throw error;
  }
};