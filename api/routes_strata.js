const express = require('express');
const { Strata } = require('../database/models');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const keysParam = req.query.keys;
    const keys = keysParam ? keysParam.split(',').map((key) => key.trim()) : [];
    const query = keys.length > 0 ? { key: { $in: keys } } : {};

    const entries = await Strata.find(query)
      .select('-__v -_id')
      .sort({ key: 1 });

    const filtered = entries.reduce((acc, entry) => {
      acc[entry.key] = entry;
      return acc;
    }, {});

    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
