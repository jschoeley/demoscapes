const express = require('express');
const router = express.Router();
const { Collection } = require('../database/models');

router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find({})
      .select('key name description order isPublic -_id')
      .sort({ order: 1, key: 1 });
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
