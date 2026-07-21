import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { TaskStore } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;
const DATA_FILE = process.env.DATA_FILE ?? path.resolve(__dirname, '../data/tasks.json');

const store = new TaskStore(DATA_FILE);
await store.load();

const app = createApp(store);
app.listen(PORT, () => {
  console.log(`Hoi Software server draait op http://localhost:${PORT}`);
});
