(function (global) {
  const API_BASE = global.DEMOSCAPES_API_BASE || "http://127.0.0.1:3000/api";

  async function fetchJson(url) {
    const response = await fetch(url);
    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const error = new Error((payload && payload.message) || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      error.warning = payload && payload.warning ? payload.warning : response.headers.get("X-RateLimit-Warning");
      error.retryAfterSeconds = Number(response.headers.get("Retry-After")) || null;
      throw error;
    }

    return payload;
  }

  function fetchMeasures(collectionKey) {
    const query = collectionKey
      ? `?collectionKey=${encodeURIComponent(collectionKey)}`
      : "";
    return fetchJson(`${API_BASE}/measures${query}`);
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

    return fetchJson(`${API_BASE}/series?${query.join("&")}`);
  }

  function fetchCollections() {
    return fetchJson(`${API_BASE}/collections`);
  }

  function fetchSurface(seriesKey, strata) {
    const strataParam = encodeURIComponent(JSON.stringify(strata || {}));
    return fetchJson(`${API_BASE}/surface?seriesKey=${encodeURIComponent(seriesKey)}&strata=${strataParam}`);
  }

  function fetchStrata(keys) {
    const query = keys && keys.length > 0 ? `?keys=${encodeURIComponent(keys.join(","))}` : "";
    return fetchJson(`${API_BASE}/strata${query}`);
  }

  function fetchSources(keys) {
    const query = keys && keys.length > 0 ? `?keys=${encodeURIComponent(keys.join(","))}` : "";
    return fetchJson(`${API_BASE}/sources${query}`);
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
