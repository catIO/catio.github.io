// Timer Web Worker
let timerInterval: number | null = null;
let timeRemaining: number = 0;
let isRunning: boolean = false;

// Log when worker is created
console.log('Timer Worker created');

function updateTimer() {
  if (!isRunning) return;

  if (timeRemaining <= 0) {
    console.log('Worker: Timer complete');
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    self.postMessage({ type: 'COMPLETE' });
  } else {
    timeRemaining--;
    self.postMessage({ type: 'TICK', payload: { timeRemaining } });
  }
}

self.onmessage = (event) => {
  const { type, payload } = event.data;
  console.log('Worker received message:', type, payload);

  switch (type) {
    case 'START':
      console.log('Worker: Starting timer with current time:', timeRemaining);
      isRunning = true;
      
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Send initial tick
      self.postMessage({ type: 'TICK', payload: { timeRemaining } });
      
      // Start the timer with a 1-second interval
      timerInterval = self.setInterval(updateTimer, 1000);
      
      console.log('Worker: Timer started');
      break;

    case 'PAUSE':
      console.log('Worker: Pausing timer');
      isRunning = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      break;

    case 'RESET':
      console.log('Worker: Resetting timer');
      isRunning = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      timeRemaining = payload?.timeRemaining ?? timeRemaining;
      break;

    case 'UPDATE_TIME':
      console.log('Worker: Updating time to:', payload?.timeRemaining);
      timeRemaining = payload?.timeRemaining ?? timeRemaining;
      if (isRunning) {
        // If timer is running, restart it with new time
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        timerInterval = self.setInterval(updateTimer, 1000);
      }
      break;

    default:
      console.warn('Worker: Unknown message type:', type);
  }
}; 