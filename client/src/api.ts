export interface Task {
  id: string;
  title: string;
  notes: string;
  done: boolean;
  createdAt: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Serverfout (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  list: () => fetch('/api/tasks').then((r) => handle<Task[]>(r)),

  create: (title: string, notes: string) =>
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes }),
    }).then((r) => handle<Task>(r)),

  update: (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'done'>>) =>
    fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => handle<Task>(r)),

  remove: (id: string) =>
    fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then((r) => handle<void>(r)),
};
