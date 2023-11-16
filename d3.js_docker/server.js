

const express = require('express');
const app = express();
const cors = require('cors');
const dataRoutes = require('./routes');
const dataRoutes_region = require('./routes_region');

// Middleware for JSON request body parsing
app.use(express.json());
app.use(cors());

app.use(express.static('public'));

// Routes
app.use('/api/data', dataRoutes); // Use the correct route path
app.use('/api/unique-regions', dataRoutes_region); // Use the correct route path

// Server listening port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

