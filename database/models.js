const { Schema, model, models } = require('./connection');

const sourceSchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  url: String,
  citation: String,
  license: String,
});

const measureSchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  statType: { type: String, required: true },
  description: String,
  axes: { type: Schema.Types.Mixed, required: true },
  display: {
    labelmultiplier: Number,
    labelprecision: Number,
    colorScale: String,
    colorDomain: [Schema.Types.Mixed],
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

const collectionSchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  summary: String,
  order: Number,
  isPublic: { type: Boolean, default: true },
});

collectionSchema.index({ key: 1 }, { unique: true });
collectionSchema.index({ order: 1, key: 1 });

const seriesSchema = new Schema({
  key: { type: String, required: true },
  label: String,
  measureKey: { type: String, required: true },
  sourceKeys: [String],
  collectionKeys: { type: [String], default: [] },
  strataKeys: [String],
  strataValues: { type: Schema.Types.Mixed, default: {} },
  strataCombos: { type: [Schema.Types.Mixed], default: [] },
});

seriesSchema.index({ measureKey: 1 });
seriesSchema.index({ collectionKeys: 1 });
seriesSchema.index({ key: 1 }, { unique: true });

const strataSchema = new Schema({
  key: { type: String, required: true, unique: true },
  label: String,
  description: String,
  valuesFromData: { type: Boolean, default: false },
  codebook: { type: [Schema.Types.Mixed], default: [] },
});

strataSchema.index({ key: 1 }, { unique: true });

const surfaceSchema = new Schema({
  seriesKey: { type: String, required: true },
  strata: { type: Schema.Types.Mixed, default: {} },
  xValues: [Number],
  yValues: [Number],
  wxValues: [Number],
  wyValues: [Number],
  zValues: [Schema.Types.Mixed],
  zEncoding: { type: String, default: 'row-major-y' },
});

surfaceSchema.index({ seriesKey: 1 });

const Source = models.Source || model('Source', sourceSchema);
const Measure = models.Measure || model('Measure', measureSchema);
const Collection = models.Collection || model('Collection', collectionSchema);
const Series = models.Series || model('Series', seriesSchema);
const Strata = models.Strata || model('Strata', strataSchema);
const Surface = models.Surface || model('Surface', surfaceSchema);

module.exports = {
  Source,
  Measure,
  Collection,
  Series,
  Strata,
  Surface,
};
