(function (global) {
  const API_BASE = global.DEMOSCAPES_API_BASE || "http://127.0.0.1:3000/api";

  function fetchMeasures(collectionKey) {
    const query = collectionKey
      ? `?collectionKey=${encodeURIComponent(collectionKey)}`
      : "";
    return d3.json(`${API_BASE}/measures${query}`);
  }

  function fetchSeries(params) {
    const options = typeof params === "string" ? { measureKey: params } : (params || {});
    const query = [];

    if (options.measureKey) {
      query.push(`measureKey=${encodeURIComponent(options.measureKey)}`);
    }
    if (options.collectionKey) {
      query.push(`collectionKey=${encodeURIComponent(options.collectionKey)}`);
    }

    return d3.json(`${API_BASE}/series?${query.join("&")}`);
  }

  function fetchCollections() {
    return d3.json(`${API_BASE}/collections`);
  }

  function fetchSurface(seriesKey, strata) {
    const strataParam = encodeURIComponent(JSON.stringify(strata || {}));
    return d3.json(`${API_BASE}/surface?seriesKey=${encodeURIComponent(seriesKey)}&strata=${strataParam}`);
  }

  function fetchStrata(keys) {
    const query = keys && keys.length > 0 ? `?keys=${encodeURIComponent(keys.join(","))}` : "";
    return d3.json(`${API_BASE}/strata${query}`);
  }

  function fetchSources(keys) {
    const query = keys && keys.length > 0 ? `?keys=${encodeURIComponent(keys.join(","))}` : "";
    return d3.json(`${API_BASE}/sources${query}`);
  }

  global.DemoscapesApi = {
    fetchMeasures,
    fetchSeries,
    fetchCollections,
    fetchSurface,
    fetchStrata,
    fetchSources,
  };
})(window);
