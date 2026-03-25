const express = require('express');
const app = express();
const cors = require('cors');
const measureRoutes = require('./routes_measures');
const collectionsRoutes = require('./routes_collections');
const seriesRoutes = require('./routes_series');
const surfaceRoutes = require('./routes_surface');
const strataRoutes = require('./routes_strata');
const sourcesRoutes = require('./routes_sources');
const { connectToMongoApi } = require('../database/connection');

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

// Middleware for JSON request body parsing
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/measures', measureRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/surface', surfaceRoutes);
app.use('/api/strata', strataRoutes);
app.use('/api/sources', sourcesRoutes);

const PORT = process.env.PORT;
if (!PORT) {
  throw new Error('Missing required environment variable: PORT');
}

connectToMongoApi()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
