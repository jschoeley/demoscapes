const API_BASE = "http://127.0.0.1:3000/api";

function fetchMeasures() {
  return d3.json(`${API_BASE}/measures`);
}

function fetchSeries(measureKey) {
  return d3.json(`${API_BASE}/series?measureKey=${measureKey}`);
}

function fetchSurface(seriesKey, strata) {
  const strataParam = encodeURIComponent(JSON.stringify(strata || {}));
  return d3.json(`${API_BASE}/surface?seriesKey=${seriesKey}&strata=${strataParam}`);
}

function fetchStrata(keys) {
  const query = keys && keys.length > 0 ? `?keys=${keys.join(",")}` : "";
  return d3.json(`${API_BASE}/strata${query}`);
}

function fetchSources(keys) {
  const query = keys && keys.length > 0 ? `?keys=${keys.join(",")}` : "";
  return d3.json(`${API_BASE}/sources${query}`);
}
