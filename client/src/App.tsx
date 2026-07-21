import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, Task } from './api';

type Filter = 'alle' | 'open' | 'klaar';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .list()
      .then(setTasks)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (filter === 'open') return tasks.filter((t) => !t.done);
    if (filter === 'klaar') return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const openCount = tasks.filter((t) => !t.done).length;

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      const task = await api.create(title, notes);
      setTasks((prev) => [task, ...prev]);
      setTitle('');
      setNotes('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggle(task: Task) {
    setError(null);
    try {
      const updated = await api.update(task.id, { done: !task.done });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(task: Task) {
    setError(null);
    try {
      await api.remove(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>
          Hoi <span className="accent">Software</span>
        </h1>
        <p className="subtitle">
          {openCount === 0
            ? 'Alles is af. Lekker bezig! 🎉'
            : `Nog ${openCount} ${openCount === 1 ? 'taak' : 'taken'} open`}
        </p>
      </header>

      <form className="new-task" onSubmit={addTask}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wat moet er gebeuren?"
          aria-label="Titel van de taak"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notitie (optioneel)"
          aria-label="Notitie"
        />
        <button type="submit" disabled={!title.trim()}>
          Toevoegen
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="filters" role="tablist">
        {(['alle', 'open', 'klaar'] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Laden…</p>
      ) : visible.length === 0 ? (
        <p className="empty">Geen taken in deze weergave.</p>
      ) : (
        <ul className="tasks">
          {visible.map((task) => (
            <li key={task.id} className={task.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={task.done} onChange={() => toggle(task)} />
                <div>
                  <span className="title">{task.title}</span>
                  {task.notes && <span className="notes">{task.notes}</span>}
                </div>
              </label>
              <button className="delete" onClick={() => remove(task)} aria-label="Verwijderen">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
