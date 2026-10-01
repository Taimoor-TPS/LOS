import { connectDb } from '../config/db.js';
import mongoose from 'mongoose';

await connectDb();
const { User } = await import('../modules/identity/model/User.js');
const users = await User.countDocuments({ deletedAt: null });
if (users !== 1) {
  console.error('Run npm run seed before npm run seed:sample. Sample data is created through the same registration services as the mobile app.');
  process.exit(1);
}
console.log('Sample book is not loaded by default. Use the demo script to register a customer through /api/channel, which calls the live services.');
await mongoose.disconnect();
