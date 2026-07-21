import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export class TaskStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.tasks = [];
    this.loaded = false;
  }

  async load() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.tasks = JSON.parse(raw);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.tasks = [];
    }
    this.loaded = true;
  }

  async save() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.tasks, null, 2));
  }

  list() {
    return this.tasks;
  }

  async create({ title, notes = '' }) {
    const task = {
      id: randomUUID(),
      title: title.trim(),
      notes: notes.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.tasks.unshift(task);
    await this.save();
    return task;
  }

  async update(id, patch) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    if (typeof patch.title === 'string' && patch.title.trim()) task.title = patch.title.trim();
    if (typeof patch.notes === 'string') task.notes = patch.notes.trim();
    if (typeof patch.done === 'boolean') task.done = patch.done;
    await this.save();
    return task;
  }

  async remove(id) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    await this.save();
    return true;
  }
}
