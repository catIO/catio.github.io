// Timer Web Worker
let timerInterval: ReturnType<typeof setInterval> | null = null;
let timeRemaining = 0;
let isRunning = false;
let workerId = Math.random().toString(36).substring(7);
let mode: 'work' | 'break' = 'work';
let currentIteration = 1;
let totalIterations = 4;

// Log when worker is created
console.log('Timer Worker created');

function updateTimer() {
  console.log('Worker: updateTimer called, timeRemaining:', timeRemaining);
  if (timeRemaining > 0) {
    timeRemaining--;
    console.log('Worker: Sending TICK with timeRemaining:', timeRemaining);
    self.postMessage({ type: 'TICK', payload: { timeRemaining } });
  } else {
    console.log('Worker: Timer complete');
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    self.postMessage({ type: 'COMPLETE' });
  }
}

self.onmessage = (e: MessageEvent) => {
  console.log('Worker: Received message:', e.data);
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      console.log('Worker: Initializing with settings:', payload);
      workerId = payload.workerId;
      timeRemaining = payload.timeRemaining || 0;
      isRunning = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      // Send initialization complete message
      self.postMessage({ 
        type: 'INIT_COMPLETE', 
        payload: { workerId } 
      });
      break;

    case 'START':
      console.log('Worker: Starting timer with timeRemaining:', payload.timeRemaining);
      timeRemaining = payload.timeRemaining;
      isRunning = true;
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      timerInterval = setInterval(updateTimer, 1000);
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
      timeRemaining = payload.timeRemaining || 0;
      isRunning = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      break;

    case 'UPDATE_TIME':
      console.log('Worker: Updating time to:', payload.timeRemaining);
      timeRemaining = payload.timeRemaining;
      break;

    case 'UPDATE_STATE':
      console.log('Worker: Updating state:', payload);
      if (payload.timeRemaining !== undefined) timeRemaining = payload.timeRemaining;
      if (payload.isRunning !== undefined) isRunning = payload.isRunning;
      if (payload.mode) mode = payload.mode;
      if (payload.currentIteration) currentIteration = payload.currentIteration;
      if (payload.totalIterations) totalIterations = payload.totalIterations;
      
      // If timer is running, restart the interval
      if (isRunning && !timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
      } else if (!isRunning && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      break;

    default:
      console.warn('Worker: Unknown message type:', type);
  }
}; 