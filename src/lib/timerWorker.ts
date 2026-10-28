// High-performance background Web Worker for Rest Timer
// Runs on a separate thread to prevent Android/iOS background tab execution throttling

const workerScript = `
let timerId = null;
let targetEndTime = 0;

function checkTick() {
  if (!targetEndTime) return;
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
  if (remaining <= 0) {
    if (timerId) clearInterval(timerId);
    timerId = null;
    targetEndTime = 0;
    self.postMessage({ type: 'COMPLETE' });
  } else {
    self.postMessage({ type: 'TICK', remaining: remaining });
  }
}

self.onmessage = function(e) {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'START') {
    targetEndTime = msg.endTime;
    if (timerId) clearInterval(timerId);
    checkTick();
    timerId = setInterval(checkTick, 500);
  } else if (msg.type === 'ADJUST') {
    targetEndTime = msg.endTime;
    checkTick();
  } else if (msg.type === 'STOP') {
    if (timerId) clearInterval(timerId);
    timerId = null;
    targetEndTime = 0;
  }
};
`;

export function createTimerWorker(): Worker | null {
  if (typeof window === 'undefined' || !window.Worker || !window.Blob) return null;
  try {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    return worker;
  } catch (err) {
    console.warn('Web Worker creation failed, using main-thread fallback', err);
    return null;
  }
}
