import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { TaskStore } from '../src/store.js';

async function makeServer() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hoi-test-'));
  const store = new TaskStore(path.join(dir, 'tasks.json'));
  await store.load();
  const app = createApp(store);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://localhost:${server.address().port}`;
  return { server, base };
}

test('taken aanmaken, bijwerken en verwijderen', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  let res = await fetch(`${base}/api/tasks`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);

  res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Eerste taak', notes: 'test' }),
  });
  assert.equal(res.status, 201);
  const task = await res.json();
  assert.equal(task.title, 'Eerste taak');
  assert.equal(task.done, false);

  res = await fetch(`${base}/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: true }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).done, true);

  res = await fetch(`${base}/api/tasks/${task.id}`, { method: 'DELETE' });
  assert.equal(res.status, 204);

  res = await fetch(`${base}/api/tasks`);
  assert.deepEqual(await res.json(), []);
});

test('lege titel wordt geweigerd', async (t) => {
  const { server, base } = await makeServer();
  t.after(() => server.close());

  const res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '   ' }),
  });
  assert.equal(res.status, 400);
});
