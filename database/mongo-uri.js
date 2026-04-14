function buildAuthenticatedMongoUri({
  host,
  port,
  database,
  username,
  password,
  authSource,
} = {}) {
  return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=${encodeURIComponent(authSource)}`;
}

function buildAnonymousMongoUri({
  host,
  port,
  database,
} = {}) {
  return `mongodb://${host}:${port}/${database}`;
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getMongoHost() {
  return requireEnv('MONGO_HOST');
}

function getMongoPort() {
  return requireEnv('MONGO_PORT');
}

function getMongoAppDatabase() {
  return requireEnv('MONGO_APP_DATABASE');
}

function getMongoAnonymousUri() {
  return buildAnonymousMongoUri({
    host: getMongoHost(),
    port: getMongoPort(),
    database: 'admin',
  });
}

function getMongoInitUri() {
  return buildAuthenticatedMongoUri({
    host: getMongoHost(),
    port: getMongoPort(),
    database: getMongoAppDatabase(),
    username: requireEnv('MONGO_INITDB_ROOT_USERNAME'),
    password: requireEnv('MONGO_INITDB_ROOT_PASSWORD'),
    authSource: 'admin',
  });
}

function getMongoApiUri() {
  const appDatabase = getMongoAppDatabase();

  return buildAuthenticatedMongoUri({
    host: getMongoHost(),
    port: getMongoPort(),
    database: appDatabase,
    username: requireEnv('MONGO_API_USERNAME'),
    password: requireEnv('MONGO_API_PASSWORD'),
    authSource: appDatabase,
  });
}

module.exports = {
  buildAnonymousMongoUri,
  buildAuthenticatedMongoUri,
  getMongoAnonymousUri,
  getMongoApiUri,
  getMongoAppDatabase,
  getMongoInitUri,
};
