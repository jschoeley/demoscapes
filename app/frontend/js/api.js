const API_BASE = "http://127.0.0.1:3000/api";
// On opening the webpage, the data of Austria (AUT) is loaded by default.
// So, "AUT" is given as the argument for region firld in the query
const Region = "AUS";

function fetchRegions() {
  return d3.json(`${API_BASE}/unique-regions`);
}

function parseRegionRow(d) {
  return {
    Region: d.Region,
    Year: +d.Year,
    Age: +d.Age,
    rate_ratio: d.rate_ratio === NULL ? null : +d.rate_ratio,
    count_diff: d.count_diff === NULL ? null : +d.count_diff,
  };
}

async function fetchInitialData() {
  const inputData = await fetchRegionData(Region);
  console.log(inputData);
  return inputData;
}

function fetchRegionData(region) {
  return d3.json(`${API_BASE}/data?Region=${region}`, parseRegionRow);
}

async function updateDataBasedOnDropdown(selectedOption) {
  const region = selectedOption;
  try {
    const dataUpdated = await fetchRegionData(region);
    console.log("Updated data");
    console.log(dataUpdated);
    return dataUpdated;
  } catch (error) {
    console.error("Error fetching updated data:", error);
    throw error;
  }
}
