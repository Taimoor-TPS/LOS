import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { syncCatalogue } from './security/rbac.js';

const app = createApp();
connectDb()
  .then(async () => {
    await syncCatalogue();
    app.listen(env.port, () => {
      console.log(`Lending platform API listening on ${env.port}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed');
    console.error(err.message);
    process.exit(1);
  });
