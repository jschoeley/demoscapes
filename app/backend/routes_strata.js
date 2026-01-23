const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const router = express.Router();

const strataDir = path.join(__dirname, 'data', 'metadata', 'strata');
let cachedStrata = null;

function loadStrataDefinitions() {
  if (cachedStrata) {
    return cachedStrata;
  }

  const files = fs.readdirSync(strataDir).filter((file) => file.endsWith('.yml'));
  const entries = [];

  files.forEach((file) => {
    const doc = yaml.load(fs.readFileSync(path.join(strataDir, file), 'utf8'));
    if (Array.isArray(doc)) {
      entries.push(...doc);
    } else if (doc) {
      entries.push(doc);
    }
  });

  cachedStrata = entries.reduce((acc, entry) => {
    if (entry && entry.key) {
      acc[entry.key] = entry;
    }
    return acc;
  }, {});

  return cachedStrata;
}

router.get('/', (req, res) => {
  try {
    const keysParam = req.query.keys;
    const strata = loadStrataDefinitions();

    if (!keysParam) {
      return res.json(strata);
    }

    const keys = keysParam.split(',').map((key) => key.trim());
    const filtered = keys.reduce((acc, key) => {
      if (strata[key]) {
        acc[key] = strata[key];
      }
      return acc;
    }, {});

    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
