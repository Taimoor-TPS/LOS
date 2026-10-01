import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    branchId: { type: String, default: '' },
    dealerId: { type: String, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    doaLimit: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    status: { type: String, default: 'active' },
    demoPersona: { type: Boolean, default: false },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    locale: { type: String, default: 'en' },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
