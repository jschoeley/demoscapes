const { MongoClient } = require('mongodb');
const {
  getMongoAnonymousUri,
  getMongoApiUri,
  getMongoAppDatabase,
  getMongoInitUri,
} = require('./mongo-uri');
const mongoose = require('./connection');
const { connectToMongoInit } = mongoose;

const bootstrapUri = getMongoInitUri();
const anonymousUri = getMongoAnonymousUri();
const apiUri = getMongoApiUri();
const appDatabase = getMongoAppDatabase();
const apiUsername = process.env.MONGO_API_USERNAME;
const apiPassword = process.env.MONGO_API_PASSWORD;
const maxAttempts = 30;
const retryDelayMs = 2000;
const bootstrapUsername = process.env.MONGO_INITDB_ROOT_USERNAME;

async function waitForMongo() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = new MongoClient(anonymousUri, {
      serverSelectionTimeoutMS: retryDelayMs,
    });

    try {
      await client.connect();
      await client.db('admin').command({ hello: 1 });
      await client.close();
      return;
    } catch (error) {
      await client.close().catch(() => {});
      if (attempt === maxAttempts) {
        throw error;
      }
      console.log(`Waiting for MongoDB (${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

async function isAlreadyInitialized() {
  const client = new MongoClient(apiUri, {
    serverSelectionTimeoutMS: retryDelayMs,
  });

  try {
    await client.connect();
    await client.db(appDatabase).command({ ping: 1 });
    console.log('Database already initialized; skipping bootstrap import.');
    return true;
  } catch (error) {
    return false;
  } finally {
    await client.close().catch(() => {});
  }
}

async function withBootstrapClient(work) {
  const client = new MongoClient(bootstrapUri);

  try {
    await client.connect();
    return await work(client);
  } finally {
    await client.close();
  }
}

async function ensureReadonlyUser() {
  await withBootstrapClient(async (client) => {
    const db = client.db(appDatabase);
    const roles = [{ role: 'read', db: appDatabase }];
    const usersInfo = await db.command({
      usersInfo: { user: apiUsername, db: appDatabase },
    });

    if (usersInfo.users.length === 0) {
      await db.command({
        createUser: apiUsername,
        pwd: apiPassword,
        roles,
      });
      console.log(`Created read-only MongoDB user '${apiUsername}'.`);
      return;
    }

    await db.command({
      updateUser: apiUsername,
      pwd: apiPassword,
      roles,
    });
    console.log(`Updated read-only MongoDB user '${apiUsername}'.`);
  });
}

async function dropBootstrapUser() {
  await withBootstrapClient(async (client) => {
    const adminDb = client.db('admin');
    const usersInfo = await adminDb.command({
      usersInfo: { user: bootstrapUsername, db: 'admin' },
    });

    if (usersInfo.users.length === 0) {
      console.log(`Bootstrap MongoDB user '${bootstrapUsername}' is already absent.`);
      return;
    }

    await adminDb.command({
      dropUser: bootstrapUsername,
    });
    console.log(`Dropped bootstrap MongoDB user '${bootstrapUsername}'.`);
  });
}

async function main() {
  await waitForMongo();

  if (await isAlreadyInitialized()) {
    return;
  }

  const { runImport } = require('./import');

  try {
    await connectToMongoInit();
    await runImport();
    await ensureReadonlyUser();
    await dropBootstrapUser();
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    console.log('Database initialization complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
