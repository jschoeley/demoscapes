const express = require('express');
const router = express.Router();
const Data = require('./models'); // Import the Data model

// GET route to retrieve data (adjust route and query as needed)
router.get('/', async (req, res) => {
  try {
    // Access query parameters from the URL
    const Region = req.query.Region; // Retrieve the 'region' parameter

    // Use these parameters to filter your database query
    const data = await Data.find({ Region: Region});

    //const data = await Data.find(req.query); // You can filter data based on query parameters
    console.log(data)
    console.log(req.query)
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
