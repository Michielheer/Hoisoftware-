import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(store) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/tasks', (req, res) => {
    res.json(store.list());
  });

  app.post('/api/tasks', async (req, res) => {
    const { title, notes } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Een titel is verplicht.' });
    }
    const task = await store.create({ title, notes });
    res.status(201).json(task);
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    const task = await store.update(req.params.id, req.body ?? {});
    if (!task) return res.status(404).json({ error: 'Taak niet gevonden.' });
    res.json(task);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Taak niet gevonden.' });
    res.status(204).end();
  });

  // In productie serveert de server ook de gebouwde frontend.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  return app;
}
