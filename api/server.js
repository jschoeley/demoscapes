const express = require('express');
const app = express();
const cors = require('cors');
const measureRoutes = require('./routes_measures');
const seriesRoutes = require('./routes_series');
const surfaceRoutes = require('./routes_surface');
const strataRoutes = require('./routes_strata');
const sourcesRoutes = require('./routes_sources');

// Middleware for JSON request body parsing
app.use(express.json());
app.use(cors());

app.use(express.static('public'));

// Routes
app.use('/api/measures', measureRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/surface', surfaceRoutes);
app.use('/api/strata', strataRoutes);
app.use('/api/sources', sourcesRoutes);

// Server listening port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
