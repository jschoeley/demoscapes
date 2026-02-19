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

const collectionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  summary: String,
  order: Number,
  isPublic: { type: Boolean, default: true },
});

collectionSchema.index({ key: 1 }, { unique: true });
collectionSchema.index({ order: 1, key: 1 });

const seriesSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: String,
  measureKey: { type: String, required: true },
  sourceKeys: [String],
  collectionKeys: { type: [String], default: [] },
  strataKeys: [String],
  strataValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  strataCombos: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

seriesSchema.index({ measureKey: 1 });
seriesSchema.index({ collectionKeys: 1 });
seriesSchema.index({ key: 1 }, { unique: true });

const strataSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: String,
  description: String,
  valuesFromData: { type: Boolean, default: false },
  codebook: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

strataSchema.index({ key: 1 }, { unique: true });

const surfaceSchema = new mongoose.Schema({
  seriesKey: { type: String, required: true },
  strata: { type: mongoose.Schema.Types.Mixed, default: {} },
  xValues: [Number],
  yValues: [Number],
  zValues: [Number],
  zEncoding: { type: String, default: 'row-major-y' },
});

surfaceSchema.index({ seriesKey: 1 });

const Source = mongoose.model('Source', sourceSchema);
const Measure = mongoose.model('Measure', measureSchema);
const Collection = mongoose.model('Collection', collectionSchema);
const Series = mongoose.model('Series', seriesSchema);
const Strata = mongoose.model('Strata', strataSchema);
const Surface = mongoose.model('Surface', surfaceSchema);

module.exports = {
  Source,
  Measure,
  Collection,
  Series,
  Strata,
  Surface,
};
