const express = require('express');
const router = express.Router();
const { Measure } = require('./models');

router.get('/', async (req, res) => {
  try {
    const measures = await Measure.find({})
      .select('-__v -_id')
      .sort({ key: 1 });
    res.json(measures);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
