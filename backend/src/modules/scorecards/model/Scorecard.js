import mongoose from 'mongoose';

const factorSchema = new mongoose.Schema(
  {
    key: String,
    label: String,
    weight: Number,
    bands: [{ min: Number, max: Number, points: Number }],
  },
  { _id: false },
);

const scorecardSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    name: String,
    version: { type: Number, default: 1 },
    products: [String],
    segments: [String],
    factors: [factorSchema],
    approveCutoff: Number,
    referCutoff: Number,
    pd: { midpoint: Number, slope: Number },
    status: { type: String, default: 'active', index: true },
    champion: { type: Boolean, default: true },
    makerId: String,
    makerName: String,
    checkerId: String,
    checkerName: String,
    comment: String,
  },
  { timestamps: true },
);

export const Scorecard = mongoose.model('Scorecard', scorecardSchema);
