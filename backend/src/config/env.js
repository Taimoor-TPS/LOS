import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(root, 'atlas-credentials.env') });
dotenv.config({ path: path.join(root, '.env') });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. Copy backend/.env.example and set it before starting the API.`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: required('MONGODB_URI'),
  dbName: process.env.MONGODB_DB || 'tps_los',
  jwtSecret: required('JWT_SECRET'),
  dataKey: process.env.FIELD_ENCRYPTION_KEY || process.env.DATA_KEY || required('FIELD_ENCRYPTION_KEY'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  demoMode: process.env.DEMO_MODE !== 'false',
  featuresExtended: process.env.FEATURES_EXTENDED === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
  tenantId: 'noor-horizon',
};
