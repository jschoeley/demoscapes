const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { Source, Measure, Series, Strata, Surface } = require('./models');

const lexisDataDir = path.join(__dirname, 'import', 'lexisdata');
const metadataDir = path.join(__dirname, 'import', 'metadata');
const sourcesPath = path.join(metadataDir, 'sources.yml');
const measuresPath = path.join(metadataDir, 'measures.yml');
const seriesPath = path.join(metadataDir, 'series.yml');
const strataDir = path.join(metadataDir, 'strata');

function parseValue(value) {
  if (value === '.' || value === undefined || value === null) {
    return null;
  }
  if (value === 'Inf') {
    return Infinity;
  }
  return Number(value);
}

function requireField(value, label) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required field: ${label}`);
  }
}

function loadStrataSeed() {
  if (!fs.existsSync(strataDir)) {
    return [];
  }

  const files = fs.readdirSync(strataDir).filter((file) => file.endsWith('.yml'));
  const entries = [];

  files.forEach((file) => {
    const doc = yaml.load(fs.readFileSync(path.join(strataDir, file), 'utf8'));
    if (Array.isArray(doc)) {
      entries.push(...doc);
      return;
    }
    if (doc) {
      entries.push(doc);
    }
  });

  return entries
    .filter((entry) => entry && entry.key)
    .map((entry) => ({
      key: entry.key,
      label: entry.label || entry.key,
      description: entry.description || '',
      valuesFromData: Boolean(entry.valuesFromData),
      codebook: Array.isArray(entry.codebook) ? entry.codebook : [],
    }));
}

async function runImport() {
  const sourcesDoc = yaml.load(fs.readFileSync(sourcesPath, 'utf8'));
  const measuresDoc = yaml.load(fs.readFileSync(measuresPath, 'utf8'));
  const seriesDoc = yaml.load(fs.readFileSync(seriesPath, 'utf8'));

  const sourcesSeed = sourcesDoc && sourcesDoc.sources ? sourcesDoc.sources : [];
  const measuresSeed = measuresDoc && measuresDoc.measures ? measuresDoc.measures : [];
  const seriesSeed = seriesDoc && seriesDoc.series ? seriesDoc.series : [];
  const strataSeed = loadStrataSeed();

  await Promise.all([
    Source.deleteMany({}),
    Measure.deleteMany({}),
    Series.deleteMany({}),
    Strata.deleteMany({}),
    Surface.deleteMany({}),
  ]);

  if (sourcesSeed.length > 0) {
    await Source.insertMany(sourcesSeed);
  }

  if (measuresSeed.length > 0) {
    await Measure.insertMany(measuresSeed);
  }

  if (strataSeed.length > 0) {
    await Strata.insertMany(strataSeed);
  }

  const seriesDocs = seriesSeed.map((definition) => {
    requireField(definition.key, 'series.key');
    requireField(definition.measureKey, `series.measureKey for ${definition.key}`);

    const strataKeys = Array.isArray(definition.strataKeys) ? definition.strataKeys : [];

    return {
      key: definition.key,
      label: definition.label || definition.key,
      measureKey: definition.measureKey,
      sourceKeys: Array.isArray(definition.sourceKeys) ? definition.sourceKeys : [],
      strataKeys,
      strataValues: {},
      strataCombos: [],
    };
  });

  if (seriesDocs.length > 0) {
    await Series.insertMany(seriesDocs);
  }

  for (const definition of seriesSeed) {
    const csvPath = path.join(lexisDataDir, definition.measureKey, `${definition.key}.csv`);
    if (!fs.existsSync(csvPath)) {
      console.error(`Missing CSV for series ${definition.key}: ${csvPath}`);
      continue;
    }

    const strataKeys = Array.isArray(definition.strataKeys) ? definition.strataKeys : [];
    const valuesByKey = {};
    strataKeys.forEach((key) => {
      valuesByKey[key] = new Set();
    });
    const combosSet = new Set();
    const surfacesByCombo = new Map();

    await csv()
      .fromFile(csvPath)
      .subscribe((row) => {
        const strata = {};
        strataKeys.forEach((key) => {
          const value = row[key];
          if (value === undefined || value === null || value === '') {
            throw new Error(
              `Missing ${key} value in ${definition.key} row: ${JSON.stringify(row)}`,
            );
          }
          strata[key] = value;
        });

        const x = Number(row.x);
        const y = Number(row.y);
        if (Number.isNaN(x) || Number.isNaN(y)) {
          throw new Error(`Invalid x/y value in ${definition.key} row: ${JSON.stringify(row)}`);
        }

        const comboKey = JSON.stringify(strataKeys.map((key) => strata[key]));
        if (!surfacesByCombo.has(comboKey)) {
          surfacesByCombo.set(comboKey, {
            strata: { ...strata },
            xSet: new Set(),
            ySet: new Set(),
            zMap: new Map(),
          });
        }

        const surface = surfacesByCombo.get(comboKey);
        surface.xSet.add(x);
        surface.ySet.add(y);
        surface.zMap.set(`${x}|${y}`, parseValue(row.z));

        strataKeys.forEach((key) => {
          valuesByKey[key].add(strata[key]);
        });

        if (strataKeys.length > 0) {
          const combo = {};
          strataKeys.forEach((key) => {
            combo[key] = strata[key];
          });
          combosSet.add(JSON.stringify(combo));
        }
      });

    const surfaceDocs = [];
    for (const surface of surfacesByCombo.values()) {
      const xValues = Array.from(surface.xSet).sort((a, b) => a - b);
      const yValues = Array.from(surface.ySet).sort((a, b) => a - b);
      const zValues = [];

      yValues.forEach((y) => {
        xValues.forEach((x) => {
          const value = surface.zMap.get(`${x}|${y}`);
          zValues.push(value === undefined ? null : value);
        });
      });

      surfaceDocs.push({
        seriesKey: definition.key,
        strata: surface.strata,
        xValues,
        yValues,
        zValues,
        zEncoding: 'row-major-y',
      });
    }

    if (surfaceDocs.length > 0) {
      await Surface.insertMany(surfaceDocs);
    }

    const strataValues = {};
    Object.keys(valuesByKey).forEach((key) => {
      strataValues[key] = Array.from(valuesByKey[key]).sort();
    });

    const strataCombos = Array.from(combosSet)
      .sort()
      .map((value) => JSON.parse(value));

    await Series.updateOne(
      { key: definition.key },
      { $set: { strataValues, strataCombos } },
    );
  }

  console.log('Import complete.');
  process.exit(0);
}

runImport().catch((error) => {
  console.error('Error importing data:', error);
  process.exit(1);
});
