import dotenv from 'dotenv';

import { createApp } from './app.js';

dotenv.config();

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY is not set. AI replies will fail.');
}

const app = await createApp();
const port = Number(process.env.PORT || 3001);

app.listen(port, '127.0.0.1', () => {
  console.log(`API server listening on http://127.0.0.1:${port}`);
});
