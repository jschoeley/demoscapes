const mongoose = require('mongoose');
const { getMongoApiUri, getMongoInitUri } = require('./mongo-uri');

function attachLogging() {
  if (mongoose.connection.listeners('error').length === 0) {
    mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
  }

  if (mongoose.connection.listeners('open').length === 0) {
    mongoose.connection.once('open', function () {
      console.log('Database connected!');
    });
  }
}

async function connectToMongoApi() {
  attachLogging();
  return mongoose.connect(getMongoApiUri());
}

async function connectToMongoInit() {
  attachLogging();
  return mongoose.connect(getMongoInitUri());
}

module.exports = mongoose;
module.exports.connectToMongoApi = connectToMongoApi;
module.exports.connectToMongoInit = connectToMongoInit;
