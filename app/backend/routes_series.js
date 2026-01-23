const express = require('express');
const router = express.Router();
const { Series } = require('./models');

router.get('/', async (req, res) => {
  try {
    const { measureKey } = req.query;
    if (!measureKey) {
      return res.status(400).json({ message: 'measureKey is required' });
    }

    const series = await Series.find({ measureKey })
      .select('-__v')
      .sort({ key: 1 });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
