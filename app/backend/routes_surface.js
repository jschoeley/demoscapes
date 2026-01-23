const express = require('express');
const router = express.Router();
const { Series, Observation } = require('./models');

router.get('/', async (req, res) => {
  try {
    const { seriesKey, strata } = req.query;
    if (!seriesKey) {
      return res.status(400).json({ message: 'seriesKey is required' });
    }

    const series = await Series.findOne({ key: seriesKey }).select('-__v');
    if (!series) {
      return res.status(404).json({ message: 'Series not found' });
    }

    const query = { seriesKey };
    if (series.strataKeys && series.strataKeys.length > 0) {
      if (!strata) {
        return res.status(400).json({ message: 'strata is required' });
      }
      let parsedStrata = {};
      try {
        parsedStrata = JSON.parse(strata);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid strata JSON' });
      }

      for (const key of series.strataKeys) {
        const value = parsedStrata[key];
        if (value === undefined || value === null || value === '') {
          return res
            .status(400)
            .json({ message: `Missing strata value for ${key}` });
        }
        query[`strata.${key}`] = value;
      }
    }

    const observations = await Observation.find(query)
      .select('-__v')
      .sort({ x: 1, y: 1 });
    res.json({ series, observations });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
