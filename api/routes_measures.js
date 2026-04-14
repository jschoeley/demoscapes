const express = require('express');
const router = express.Router();
const { Measure, Series } = require('../database/models');

router.get('/', async (req, res) => {
  try {
    const { collectionKey } = req.query;
    const query = {};

    if (collectionKey) {
      const measureKeys = await Series.distinct('measureKey', { collectionKeys: collectionKey });
      query.key = { $in: measureKeys };
    }

    const measures = await Measure.find(query)
      .select('-__v -_id')
      .sort({ key: 1 });
    res.json(measures);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
