const express = require('express');
const router = express.Router();
const { Source } = require('./models');

router.get('/', async (req, res) => {
  try {
    const keysParam = req.query.keys;
    const query = keysParam
      ? { key: { $in: keysParam.split(',').map((key) => key.trim()) } }
      : {};
    const sources = await Source.find(query).select('-__v -_id').sort({ key: 1 });
    res.json(sources);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
