// Sound effects for the timer application

// Sound effect types
type SoundEffect = 'start' | 'end' | 'reset' | 'skip';

// Volume control (0.0 to 1.0)
let masterVolume = 0.5;

// Audio context
let audioContext: AudioContext | null = null;
let audioContextInitialized = false;

// Initialize audio context
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

// Initialize audio context after user interaction
export const initializeAudioContext = async () => {
  if (!audioContextInitialized) {
    try {
      console.log('Initializing audio context...');
      const context = getAudioContext();
      console.log('Audio context state:', context.state);
      
      if (context.state === 'suspended') {
        console.log('Resuming suspended audio context...');
        await context.resume();
        console.log('Audio context resumed successfully');
      }
      
      audioContextInitialized = true;
      console.log('Audio context initialized successfully');
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  } else {
    console.log('Audio context already initialized');
  }
};

// Generate sine wave
const generateSineWave = (frequency: number, duration: number): Float32Array => {
  const sampleRate = getAudioContext().sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = Math.exp(-2 * t); // Exponential decay
    buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
  }
  
  return buffer;
};

// Play a sound effect
export const playSound = async (effect: SoundEffect, numberOfBeeps: number = 3): Promise<void> => {
  try {
    console.log(`Attempting to play ${effect} sound with ${numberOfBeeps} beeps...`);
    
    // Ensure audio context is initialized
    await initializeAudioContext();
    
    // Get audio context
    const context = getAudioContext();
    console.log('Audio context state before playing:', context.state);
    
    // For end sound, play multiple beeps
    if (effect === 'end') {
      console.log(`Playing ${numberOfBeeps} beeps...`);
      // Play all beeps in the loop
      for (let i = 0; i < numberOfBeeps; i++) {
        console.log(`Playing beep ${i + 1} of ${numberOfBeeps}`);
        
        // Create oscillator and gain nodes
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        // Set up oscillator
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        
        // Set up gain node
        gainNode.gain.setValueAtTime(masterVolume, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.2);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Start and stop oscillator
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 1.2);
        
        // Wait for the full duration of the beep (1.2 seconds) before playing the next one
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      console.log(`Finished playing all ${numberOfBeeps} beeps`);
    } else {
      // For other sounds, just play once
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      // Set up oscillator
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime);
      
      // Set up gain node
      gainNode.gain.setValueAtTime(masterVolume, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Start and stop oscillator
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    }
  } catch (error) {
    console.error('Error playing sound:', error);
    throw error;
  }
};

// Set master volume (0.0 to 1.0)
export const setVolume = (volume: number): void => {
  masterVolume = Math.max(0, Math.min(1, volume));
  console.log(`Master volume set to ${masterVolume}`);
};

// Resume audio context (compatibility function)
export const resumeAudioContext = async (): Promise<void> => {
  await initializeAudioContext();
};