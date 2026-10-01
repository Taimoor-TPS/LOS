import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  jurisdiction: String,
  kind: String,
  body: String,
});

export const DocumentTemplate = mongoose.model('DocumentTemplate', templateSchema);
