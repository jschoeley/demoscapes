const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  Source,
  Measure,
  Collection,
  Series,
  Strata,
  Surface,
} = require('./models');

const lexisDataDir = path.join(__dirname, 'import', 'lexisdata');
const metadataDir = path.join(__dirname, 'import', 'metadata');
const sourcesPath = path.join(metadataDir, 'sources.yml');
const measuresPath = path.join(metadataDir, 'measures.yml');
const collectionsPath = path.join(metadataDir, 'collections.yml');
const seriesPath = path.join(metadataDir, 'series.yml');
const strataDir = path.join(metadataDir, 'strata');
const GLOBAL_COLLECTION_KEY = 'global';

function parseValue(value) {
  if (value === '.' || value === undefined || value === null) {
    return null;
  }
  if (value === 'Inf') {
    return Infinity;
  }
  return Number(value);
}

function parseCategoricalValue(value) {
  if (value === '.' || value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseRequiredNumber(value, label, row) {
  requireField(value, label);
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${label} value in row: ${JSON.stringify(row)}`);
  }
  return parsed;
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

function normalizeCollectionKeys(keys) {
  const set = new Set();
  if (Array.isArray(keys)) {
    keys.forEach((key) => {
      if (typeof key !== 'string') {
        return;
      }
      const trimmed = key.trim();
      if (trimmed) {
        set.add(trimmed);
      }
    });
  }
  set.add(GLOBAL_COLLECTION_KEY);
  return Array.from(set).sort();
}

function normalizeDefaultStrata(definition, strataKeys) {
  const defaultStrata = definition.defaultStrata || {};
  if (defaultStrata === null || Array.isArray(defaultStrata) || typeof defaultStrata !== 'object') {
    throw new Error(`defaultStrata for series '${definition.key}' must be an object`);
  }

  const validStrataKeys = new Set(strataKeys);
  const normalized = {};
  Object.keys(defaultStrata).forEach((key) => {
    if (!validStrataKeys.has(key)) {
      throw new Error(`Unknown defaultStrata key '${key}' in series '${definition.key}'`);
    }

    const value = defaultStrata[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing defaultStrata value for '${key}' in series '${definition.key}'`);
    }
    normalized[key] = String(value);
  });

  return normalized;
}

function validateDefaultStrataValues(definition, defaultStrata, valuesByKey, strataCombos) {
  const entries = Object.entries(defaultStrata || {});
  if (entries.length === 0) {
    return;
  }

  entries.forEach(([key, value]) => {
    if (!valuesByKey[key] || !valuesByKey[key].has(value)) {
      throw new Error(
        `Invalid defaultStrata value '${value}' for '${key}' in series '${definition.key}'`,
      );
    }
  });

  const hasMatchingCombo = strataCombos.some((combo) => (
    entries.every(([key, value]) => combo[key] === value)
  ));
  if (!hasMatchingCombo) {
    throw new Error(`defaultStrata for series '${definition.key}' does not match any strata combination`);
  }
}

async function runImport() {
  const sourcesDoc = yaml.load(fs.readFileSync(sourcesPath, 'utf8'));
  const measuresDoc = yaml.load(fs.readFileSync(measuresPath, 'utf8'));
  const collectionsDoc = yaml.load(fs.readFileSync(collectionsPath, 'utf8'));
  const seriesDoc = yaml.load(fs.readFileSync(seriesPath, 'utf8'));

  const sourcesSeed = sourcesDoc && sourcesDoc.sources ? sourcesDoc.sources : [];
  const measuresSeed = measuresDoc && measuresDoc.measures ? measuresDoc.measures : [];
  const collectionsSeed = collectionsDoc && collectionsDoc.collections
    ? collectionsDoc.collections
    : [];
  const seriesSeed = seriesDoc && seriesDoc.series ? seriesDoc.series : [];
  const strataSeed = loadStrataSeed();
  const measuresByKey = new Map(
    measuresSeed
      .filter((entry) => entry && entry.key)
      .map((entry) => [entry.key, entry]),
  );

  const normalizedCollections = collectionsSeed.map((entry) => {
    requireField(entry && entry.key, 'collections.key');
    requireField(entry && entry.name, `collections.name for ${entry.key}`);
    return {
      key: entry.key,
      name: entry.name,
      description: entry.description || '',
      order: entry.order,
      isPublic: entry.isPublic === undefined ? true : Boolean(entry.isPublic),
    };
  });

  const uniqueCollectionKeys = new Set(normalizedCollections.map((entry) => entry.key));
  if (uniqueCollectionKeys.size !== normalizedCollections.length) {
    throw new Error('Duplicate collection key found in collections.yml');
  }
  if (!uniqueCollectionKeys.has(GLOBAL_COLLECTION_KEY)) {
    throw new Error(`collections.yml must define '${GLOBAL_COLLECTION_KEY}' collection`);
  }

  await Promise.all([
    Source.deleteMany({}),
    Measure.deleteMany({}),
    Collection.deleteMany({}),
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

  if (normalizedCollections.length > 0) {
    await Collection.insertMany(normalizedCollections);
  }

  if (strataSeed.length > 0) {
    await Strata.insertMany(strataSeed);
  }

  const validCollectionKeys = new Set(normalizedCollections.map((entry) => entry.key));
  const seriesDocs = seriesSeed.map((definition) => {
    requireField(definition.key, 'series.key');
    requireField(definition.measureKey, `series.measureKey for ${definition.key}`);

    const strataKeys = Array.isArray(definition.strataKeys) ? definition.strataKeys : [];

    const collectionKeys = normalizeCollectionKeys(definition.collectionKeys);
    collectionKeys.forEach((collectionKey) => {
      if (!validCollectionKeys.has(collectionKey)) {
        throw new Error(
          `Unknown collectionKey '${collectionKey}' in series '${definition.key}'`,
        );
      }
    });

    return {
      key: definition.key,
      label: definition.label || definition.key,
      measureKey: definition.measureKey,
      sourceKeys: Array.isArray(definition.sourceKeys) ? definition.sourceKeys : [],
      collectionKeys,
      strataKeys,
      defaultStrata: normalizeDefaultStrata(definition, strataKeys),
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

    const measureDefinition = measuresByKey.get(definition.measureKey);
    const isCategoricalMeasure = measureDefinition && measureDefinition.statType === 'categorical';

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
        const wx = parseRequiredNumber(row.wx, 'wx', row);
        const wy = parseRequiredNumber(row.wy, 'wy', row);
        if (Number.isNaN(x) || Number.isNaN(y)) {
          throw new Error(`Invalid x/y value in ${definition.key} row: ${JSON.stringify(row)}`);
        }

        const comboKey = JSON.stringify(strataKeys.map((key) => strata[key]));
        if (!surfacesByCombo.has(comboKey)) {
          surfacesByCombo.set(comboKey, {
            strata: { ...strata },
            xSet: new Set(),
            ySet: new Set(),
            cellsByPosition: new Map(),
          });
        }

        const surface = surfacesByCombo.get(comboKey);
        surface.xSet.add(x);
        surface.ySet.add(y);
        surface.cellsByPosition.set(`${x}|${y}`, {
          z: isCategoricalMeasure ? parseCategoricalValue(row.z) : parseValue(row.z),
          wx,
          wy,
        });

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
      const wxValues = [];
      const wyValues = [];
      const zValues = [];

      yValues.forEach((y) => {
        xValues.forEach((x) => {
          const cell = surface.cellsByPosition.get(`${x}|${y}`);
          zValues.push(cell ? cell.z : null);
          wxValues.push(cell ? cell.wx : null);
          wyValues.push(cell ? cell.wy : null);
        });
      });

      surfaceDocs.push({
        seriesKey: definition.key,
        strata: surface.strata,
        xValues,
        yValues,
        wxValues,
        wyValues,
        zValues,
        zEncoding: 'row-major-y',
      });
    }

    const strataValues = {};
    Object.keys(valuesByKey).forEach((key) => {
      strataValues[key] = Array.from(valuesByKey[key]).sort();
    });

    const strataCombos = Array.from(combosSet)
      .sort()
      .map((value) => JSON.parse(value));

    const defaultStrata = normalizeDefaultStrata(definition, strataKeys);
    validateDefaultStrataValues(definition, defaultStrata, valuesByKey, strataCombos);

    if (surfaceDocs.length > 0) {
      await Surface.insertMany(surfaceDocs);
    }

    await Series.updateOne(
      { key: definition.key },
      { $set: { defaultStrata, strataValues, strataCombos } },
    );
  }

  console.log('Import complete.');
}

module.exports = {
  runImport,
};

if (require.main === module) {
  require('./connection')
    .connectToMongoInit()
    .then(() => runImport())
    .then(() => {
      return require('./connection').disconnect();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error importing data:', error);
      process.exit(1);
    });
}
