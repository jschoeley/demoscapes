const mongoose = require('mongoose');

// Here, the second "database" is the name of the service defined in docker-compose.yml file
mongoose.connect('mongodb://database:27017/mortalityDB1');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('Database connected!');
});

module.exports = mongoose;
