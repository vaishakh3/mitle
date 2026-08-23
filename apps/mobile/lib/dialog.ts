// Branded, cross-platform dialogs without browser or native system alerts.
// The imperative API lets existing event handlers request a dialog while the
// host in the root layout owns accessible presentation and focus containment.

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive: boolean;
  canCancel: boolean;
}

interface QueuedDialog extends DialogRequest {
  resolve: (accepted: boolean) => void;
}

const queue: QueuedDialog[] = [];
const listeners = new Set<(request: DialogRequest | null) => void>();
let active: QueuedDialog | null = null;
let nextId = 1;

function publish() {
  const request = active ? {
    id: active.id,
    title: active.title,
    message: active.message,
    confirmLabel: active.confirmLabel,
    destructive: active.destructive,
    canCancel: active.canCancel,
  } : null;
  for (const listener of listeners) listener(request);
}

function pump() {
  if (!active) active = queue.shift() ?? null;
  publish();
}

function enqueue(request: Omit<QueuedDialog, 'id'>) {
  queue.push({ ...request, id: nextId++ });
  pump();
}

export function subscribe(listener: (request: DialogRequest | null) => void) {
  listeners.add(listener);
  listener(active);
  return () => {
    listeners.delete(listener);
  };
}

export function resolve(id: number, accepted: boolean) {
  if (!active || active.id !== id) return;
  const completed = active;
  active = null;
  completed.resolve(accepted);
  pump();
}

export function alert(title: string, message?: string): void {
  enqueue({
    title,
    message,
    confirmLabel: 'Got it',
    destructive: false,
    canCancel: false,
    resolve: () => undefined,
  });
}

export function confirm(
  title: string,
  message: string,
  confirmLabel = 'Continue',
  destructive = false,
): Promise<boolean> {
  return new Promise((resolvePromise) => {
    enqueue({
      title,
      message,
      confirmLabel,
      destructive,
      canCancel: true,
      resolve: resolvePromise,
    });
  });
}
