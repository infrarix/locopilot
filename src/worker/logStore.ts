'use strict';

import { EventEmitter } from 'events';

const store = new Map<string, EventEmitter>();

export function createLogEmitter(jobId: string): EventEmitter {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  store.set(jobId, emitter);
  return emitter;
}

export function getLogEmitter(jobId: string): EventEmitter | undefined {
  return store.get(jobId);
}

export function removeLogEmitter(jobId: string): void {
  const emitter = store.get(jobId);
  if (emitter) {
    emitter.removeAllListeners();
    store.delete(jobId);
  }
}
