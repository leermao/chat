import dotenv from 'dotenv';

import { createApp } from './app.js';

dotenv.config();

const app = await createApp();
const port = Number(process.env.PORT || 3001);

app.listen(port, '127.0.0.1', () => {
  console.log(`API server listening on http://127.0.0.1:${port}`);
});
