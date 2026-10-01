import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();
connectDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`HBL LOS API listening on ${env.port}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed');
    console.error(err.message);
    process.exit(1);
  });
