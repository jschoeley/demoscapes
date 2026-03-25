const express = require('express');
const router = express.Router();
const { Series } = require('../database/models');

router.get('/', async (req, res) => {
  try {
    const { measureKey, collectionKey } = req.query;
    if (!measureKey && !collectionKey) {
      return res.status(400).json({
        message: 'At least one query parameter is required: measureKey or collectionKey',
      });
    }

    const query = {};
    if (measureKey) {
      query.measureKey = measureKey;
    }
    if (collectionKey) {
      query.collectionKeys = collectionKey;
    }

    const series = await Series.find(query)
      .select('-__v -_id')
      .sort({ key: 1 });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
