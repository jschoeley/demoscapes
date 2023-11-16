const csv = require('csvtojson');
const fs = require('fs');
const Data = require('./models'); // Import the Data model

// Input CSV file path
const csvFilePath = 'mortality.csv';

// To store unique regions
const uniqueRegions = new Set(); 

csv()
  .fromFile(csvFilePath)
  .then((jsonArrayObj) => {
    // Data transformation here
    jsonArrayObj.forEach((item) => {
        // Convert 'count_diff' from string to number
        if (item.count_diff == ".")
        {
            item.count_diff = null;
        }
        if (item.rate_ratio == ".")
        {
            item.rate_ratio = null;
        }
        if (item.rate_ratio == "Inf")
        {
            item.rate_ratio = Infinity;
        }
        
      // Add more data transformation logic as needed

      uniqueRegions.add(item.Region); // Add the region to the uniqueRegions Set
    });
    // Insert JSON data into MongoDB
    return Data.insertMany(jsonArrayObj);
  })
  .then((docs) => {
    console.log('Data inserted successfully:', docs);

    // Convert the Set of unique regions to an array
    const uniqueRegionsArray = Array.from(uniqueRegions);
    console.log('Unique Regions:', uniqueRegionsArray);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error inserting data:', error);
  });
