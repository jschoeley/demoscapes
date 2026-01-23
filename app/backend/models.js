const mongoose = require('./connection');

const sourceSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  url: String,
  citation: String,
  license: String,
});

const measureSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  statType: { type: String, required: true },
  description: String,
  axes: { type: mongoose.Schema.Types.Mixed, required: true },
  display: {
    labelmultiplier: Number,
    labelprecision: Number,
    colorScale: String,
    colorDomain: [Number],
    colorRange: [String],
    legend: {
      left: String,
      right: String,
    },
    tooltip: {
      suffix: String,
      multiplier: Number,
      precision: Number,
    },
  },
});

const seriesSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: String,
  measureKey: { type: String, required: true },
  sourceKeys: [String],
  strataKeys: [String],
  strataValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  strataCombos: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

seriesSchema.index({ measureKey: 1 });
seriesSchema.index({ key: 1 }, { unique: true });

const observationSchema = new mongoose.Schema({
  seriesKey: { type: String, required: true },
  strata: { type: mongoose.Schema.Types.Mixed, default: {} },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  value: Number,
});

observationSchema.index({ seriesKey: 1, x: 1, y: 1 });

const Source = mongoose.model('Source', sourceSchema);
const Measure = mongoose.model('Measure', measureSchema);
const Series = mongoose.model('Series', seriesSchema);
const Observation = mongoose.model('Observation', observationSchema);

module.exports = {
  Source,
  Measure,
  Series,
  Observation,
};
