import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(root, 'atlas-credentials.env') });
dotenv.config({ path: path.join(root, '.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: required('MONGODB_URI'),
  dbName: process.env.MONGODB_DB || 'tps_los',
  jwtSecret: required('JWT_SECRET'),
  dataKey: required('DATA_KEY'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  demoMode: process.env.DEMO_MODE !== 'false',
  nodeEnv: process.env.NODE_ENV || 'development',
};
