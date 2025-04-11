// Timer Worker Singleton
// This module ensures only one worker instance exists throughout the application

// Private variables
let workerInstance: Worker | null = null;
let workerId: string | null = null;
let initializationPromise: Promise<Worker> | null = null;
let isInitialized = false;
let messageHandlers: ((event: MessageEvent) => void)[] = [];
let workerState = {
  timeRemaining: 0,
  isRunning: false,
  mode: 'work' as 'work' | 'break',
  currentIteration: 1,
  totalIterations: 4
};

// Create a new worker instance
function createWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    try {
      // If we already have a worker, return it
      if (workerInstance && isInitialized) {
        console.log('Timer Worker Singleton: Reusing existing worker');
        resolve(workerInstance);
        return;
      }

      // Use the bundled worker file to prevent duplicate loading
      const worker = new Worker(new URL('../workers/timerWorker.ts', import.meta.url), {
        type: 'module'
      });
      
      const id = Math.random().toString(36).substring(2, 9);
      
      console.log(`Timer Worker Singleton: Creating new worker with ID ${id}`);
      
      // Set up initialization handler
      const initHandler = (event: MessageEvent) => {
        const { type, payload } = event.data;
        if (type === 'INIT_COMPLETE' && payload.workerId === id) {
          worker.removeEventListener('message', initHandler);
          console.log(`Timer Worker Singleton: Worker ${id} initialized successfully`);
          isInitialized = true;
          workerInstance = worker;
          workerId = id;
          resolve(worker);
        }
      };
      
      worker.addEventListener('message', initHandler);
      
      // Send initialization message
      worker.postMessage({ 
        type: 'INIT',
        payload: { workerId: id }
      });

      // Set a timeout to reject the promise if initialization takes too long
      setTimeout(() => {
        if (!isInitialized) {
          worker.removeEventListener('message', initHandler);
          worker.terminate();
          reject(new Error('Worker initialization timed out'));
        }
      }, 5000);
    } catch (error) {
      reject(error);
    }
  });
}

// Get the worker instance
export async function getTimerWorker(): Promise<Worker> {
  // If we already have a worker, return it
  if (workerInstance && isInitialized) {
    console.log('Timer Worker Singleton: Returning existing worker');
    return workerInstance;
  }
  
  // If we're already initializing, return the promise
  if (initializationPromise) {
    console.log('Timer Worker Singleton: Returning existing initialization promise');
    return initializationPromise;
  }
  
  // Create a new worker
  console.log('Timer Worker Singleton: No worker exists, creating new one');
  initializationPromise = createWorker();
  
  try {
    // Set up the worker instance when it's ready
    const worker = await initializationPromise;
    
    // Set up the global message handler
    worker.addEventListener('message', handleGlobalMessage);
    
    console.log('Timer Worker Singleton: Worker initialized successfully');
    return worker;
  } catch (error) {
    console.error('Timer Worker Singleton: Failed to initialize worker:', error);
    // Reset state on error
    workerInstance = null;
    workerId = null;
    initializationPromise = null;
    isInitialized = false;
    throw error;
  }
}

// Handle messages from the worker
function handleGlobalMessage(event: MessageEvent) {
  const { type, payload } = event.data;
  console.log('Singleton received message:', type, payload);
  
  // Update our internal state
  if (type === 'TICK') {
    workerState.timeRemaining = payload.timeRemaining;
    console.log('Singleton updated time remaining:', workerState.timeRemaining);
  } else if (type === 'COMPLETE') {
    workerState.isRunning = false;
    console.log('Singleton updated isRunning:', workerState.isRunning);
  }
  
  // Forward the message to all registered handlers
  messageHandlers.forEach(handler => {
    try {
      handler(event);
    } catch (error) {
      console.error('Error in message handler:', error);
    }
  });
}

// Register a message handler
export function addMessageHandler(handler: (event: MessageEvent) => void): void {
  if (!messageHandlers.includes(handler)) {
    messageHandlers.push(handler);
  }
}

// Remove a message handler
export function removeMessageHandler(handler: (event: MessageEvent) => void): void {
  const index = messageHandlers.indexOf(handler);
  if (index !== -1) {
    messageHandlers.splice(index, 1);
  }
}

// Get the current worker state
export function getWorkerState() {
  return { ...workerState };
}

// Update the worker state
export function updateWorkerState(timeRemaining: number, isRunning: boolean, mode?: 'work' | 'break', currentIteration?: number, totalIterations?: number) {
  workerState.timeRemaining = timeRemaining;
  workerState.isRunning = isRunning;
  if (mode) workerState.mode = mode;
  if (currentIteration) workerState.currentIteration = currentIteration;
  if (totalIterations) workerState.totalIterations = totalIterations;
  
  console.log('Singleton updated worker state:', workerState);
  
  // Update worker if it exists
  if (workerInstance && isInitialized) {
    workerInstance.postMessage({
      type: 'UPDATE_STATE',
      payload: workerState
    });
  }
}

// Terminate the worker
export function terminateTimerWorker(): void {
  if (workerInstance) {
    console.log(`Timer Worker Singleton: Terminating worker ${workerId}`);
    workerInstance.removeEventListener('message', handleGlobalMessage);
    workerInstance.terminate();
    workerInstance = null;
    workerId = null;
    initializationPromise = null;
    isInitialized = false;
    messageHandlers = [];
    workerState = {
      timeRemaining: 0,
      isRunning: false,
      mode: 'work',
      currentIteration: 1,
      totalIterations: 4
    };
  }
}

// Export the worker ID for debugging
export function getWorkerId(): string | null {
  return workerId;
} 