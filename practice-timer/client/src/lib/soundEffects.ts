// Sound effects for the timer application

// Sound effect types
type SoundEffect = 'start' | 'end' | 'reset' | 'skip';

// Volume control (0.0 to 1.0)
let masterVolume = 0.5;

// Create audio elements for each sound
const createAudioElement = (frequency: number, duration: number): HTMLAudioElement => {
  const audio = new Audio();
  audio.src = `data:audio/wav;base64,${generateWavBase64(frequency, duration)}`;
  audio.volume = masterVolume;
  return audio;
};

// Generate WAV file as base64
const generateWavBase64 = (frequency: number, duration: number): string => {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);
  
  // Generate sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = Math.exp(-2 * t); // Exponential decay
    const value = amplitude * Math.sin(2 * Math.PI * frequency * t);
    view.setInt16(44 + i * 2, value * 32767, true);
  }
  
  // Convert buffer to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Sound effect cache
const audioElements: Record<SoundEffect, HTMLAudioElement> = {
  start: createAudioElement(440, 0.8),
  end: createAudioElement(880, 1.2),
  reset: createAudioElement(600, 0.4),
  skip: createAudioElement(500, 0.3)
};

// Play a sound effect
export const playSound = async (effect: SoundEffect, numberOfBeeps: number = 3): Promise<void> => {
  try {
    console.log(`Attempting to play ${effect} sound with ${numberOfBeeps} beeps...`);
    const audio = audioElements[effect];
    
    // Reset the audio element
    audio.currentTime = 0;
    audio.volume = masterVolume;
    
    // For end sound, play multiple beeps
    if (effect === 'end') {
      console.log(`Playing ${numberOfBeeps} beeps...`);
      // Play all beeps in the loop
      for (let i = 0; i < numberOfBeeps; i++) {
        console.log(`Playing beep ${i + 1} of ${numberOfBeeps}`);
        // Play the sound
        await audio.play();
        // Wait for the full duration of the beep (1.2 seconds) before playing the next one
        await new Promise(resolve => setTimeout(resolve, 1200));
        // Reset the audio element before playing next beep
        audio.currentTime = 0;
      }
      console.log(`Finished playing all ${numberOfBeeps} beeps`);
    } else {
      // For other sounds, just play once
      await audio.play();
      console.log(`Started playing ${effect} sound at volume ${masterVolume}`);
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
  
  // Update volume for all audio elements
  Object.values(audioElements).forEach(audio => {
    audio.volume = masterVolume;
  });
};

// Resume audio context (compatibility function)
export const resumeAudioContext = async (): Promise<void> => {
  // No-op for HTML5 Audio
  return Promise.resolve();
};