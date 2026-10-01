import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  scopeType: { type: String, default: 'ALL' },
  scopeId: { type: String, default: '' },
  validFrom: Date,
  validTo: Date,
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  mobile: { type: String, default: '' },
  employeeId: { type: String, default: '' },
  tenantId: { type: String, default: 'noor-horizon', index: true },
  entityId: { type: String, default: 'PK-01' },
  branchId: { type: String, default: '' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roles: { type: [assignmentSchema], default: [] },
  status: { type: String, default: 'ACTIVE', index: true },
  mustChangePassword: { type: Boolean, default: false },
  passwordHash: { type: String, required: true },
  passwordHistory: { type: [String], default: [] },
  mfa: { enabled: { type: Boolean, default: false }, secret: { type: String, default: '' } },
  delegate: { userId: { type: mongoose.Schema.Types.ObjectId }, from: Date, to: Date },
  lastLoginAt: Date,
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  version: { type: Number, default: 1 },
  deletedAt: Date,
  deletedBy: String,
  locale: { type: String, default: 'en' },
  dealerId: { type: String, default: '' },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true, sparse: true });

export const User = mongoose.model('User', userSchema);

const permissionSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  resource: String,
  action: String,
  description: String,
  module: String,
  isSensitive: { type: Boolean, default: false },
}, { timestamps: true });

export const Permission = mongoose.model('Permission', permissionSchema);

const roleSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  description: String,
  entityId: { type: String, default: 'PK-01' },
  type: { type: String, default: 'BUSINESS' },
  permissions: { type: [String], default: [] },
  maxScope: { type: String, default: 'BRANCH' },
  doa: { type: [mongoose.Schema.Types.Mixed], default: [] },
  isSystem: { type: Boolean, default: false },
  status: { type: String, default: 'ACTIVE' },
  version: { type: Number, default: 1 },
  createdBy: String,
  updatedBy: String,
  deletedAt: Date,
  deletedBy: String,
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);

const sodSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  permissionA: String,
  permissionB: String,
  level: { type: String, default: 'CASE' },
  action: { type: String, default: 'BLOCK' },
  description: String,
  status: { type: String, default: 'ACTIVE' },
  version: { type: Number, default: 1 },
  deletedAt: Date,
  deletedBy: String,
}, { timestamps: true });

export const SodRule = mongoose.model('SodRule', sodSchema);
