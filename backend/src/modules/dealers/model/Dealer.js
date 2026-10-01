import mongoose from 'mongoose';

const dealerSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    name: String,
    city: String,
    category: String,
    settlementAccount: String,
    status: { type: String, default: 'active' },
  },
  { timestamps: true },
);

export const Dealer = mongoose.model('Dealer', dealerSchema);
