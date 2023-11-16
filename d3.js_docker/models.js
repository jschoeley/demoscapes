const mongoose = require('./connection').default; // Import the mongoose connection

const dataSchema = new mongoose.Schema({
  Region: String,
  Year: Number,
  Age: Number,
  count_diff: Number,
  rate_ratio: Number,
  
});

const Data = mongoose.model('Data', dataSchema);

module.exports = Data; // Export the Data model
