// Constants -------------------------------------------------------------

const container_dimensions = { width: 800, height: 0.92 * 800 };
const margin = { top: 10, right: 10, bottom: 120, left: 60 };
const width = container_dimensions.width - margin.left - margin.right;
const height = container_dimensions.height - margin.top - margin.bottom;

// State -----------------------------------------------------------------

let measures = [];
let seriesList = [];
let currentMeasure = null;
let currentSeries = null;
let strataDefinitions = {};
let currentStrataSelections = {};
let currentStrataCombos = [];
let sourcesByKey = {};

// UI --------------------------------------------------------------------

const measureDropdown = d3.select("#measure-dropdown");
const seriesDropdown = d3.select("#series-dropdown");
const strataControls = d3.select("#strata-controls");
const caption = d3.select(".caption");

// Scales ----------------------------------------------------------------

function DefineHeatmapScales(data, measure) {
  let x_min = d3.min(data, (d) => d.x),
    x_max = d3.max(data, (d) => d.x),
    y_min = d3.min(data, (d) => d.y),
    y_max = d3.max(data, (d) => d.y);

  let scale_x = d3.scaleLinear().domain([x_min, x_max]).range([0, width]);
  let scale_y = d3.scaleLinear().domain([y_min, y_max]).range([height, 0]);

  const display = measure && measure.display ? measure.display : {};
  const colorScale = buildColorScale(display);

  function MapColor(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "white";
    }
    return colorScale.fill(value);
  }

  return {
    x: scale_x,
    y: scale_y,
    legend: colorScale.legend,
    fill: MapColor,
  };
}

function parseDomainValue(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "-Inf" || trimmed === "-Infinity") {
      return -Infinity;
    }
    if (trimmed === "Inf" || trimmed === "+Inf" || trimmed === "Infinity") {
      return Infinity;
    }
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function buildColorScale(display) {
  const rawDomain = display.colorDomain || [];
  const colors = display.colorRange || ["#f7f7f7"];
  const edges = rawDomain.map(parseDomainValue);

  if (edges.length === colors.length + 1) {
    const fill = (value) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return "white";
      }
      for (let i = 0; i < edges.length - 1; i++) {
        const lower = edges[i];
        const upper = edges[i + 1];
        const lowerOk = value >= lower || lower === -Infinity;
        const upperOk = value < upper || upper === Infinity;
        if (lowerOk && upperOk) {
          return colors[i];
        }
      }
      return value < edges[0] ? colors[0] : colors[colors.length - 1];
    };
    return {
      fill,
      legend: { colors, edges },
    };
  }

  const scale = d3.scaleThreshold().domain(edges).range(colors);
  return {
    fill: (value) => scale(value),
    legend: { colors, edges },
  };
}

// Heatmap drawing functions ---------------------------------------------

function DrawHeatmap(data, scales) {
  let rect_width = width / (scales.x.domain()[1] - scales.x.domain()[0]),
    rect_height = height / (scales.y.domain()[1] - scales.y.domain()[0]);

  plot
    .append("g")
    .attr("class", "heatmap")
    .selectAll()
    .data(data, (d) => d.x + ":" + d.y)
    .enter()
    .append("rect")
    .attr("class", "heatmapcell")
    .attr("x", (d) => scales.x(d.x))
    .attr("y", (d) => scales.y(d.y) - rect_height)
    .attr("width", rect_width)
    .attr("height", rect_height)
    .style("fill", (d) => scales.fill(d.value))
    .style("stroke", (d) => scales.fill(d.value))
    .style("stroke-width", 1);
}

function AddAxesToHeatmap(scales) {
  plot
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + (height + 5) + ")")
    .call(d3.axisBottom(scales.x).tickFormat(d3.format("d")));

  plot
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + -5 + ",0)")
    .call(d3.axisLeft(scales.y).tickFormat(d3.format("d")));
}

function AddAxisLabels(measure) {
  if (!measure || !measure.axes) {
    return;
  }

  const axes = measure.axes;
  const xLabel = axes.x ? axes.x.name : "x";
  const yLabel = axes.y ? axes.y.name : "y";
  const xUnit = axes.x && axes.x.unit ? ` (${axes.x.unit})` : "";
  const yUnit = axes.y && axes.y.unit ? ` (${axes.y.unit})` : "";

  plot
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .text(`${toTitleCase(xLabel)}${xUnit}`);

  plot
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text(`${toTitleCase(yLabel)}${yUnit}`);
}

function AddColorBarToHeatmap(scales, measure) {
  const display = measure && measure.display ? measure.display : {};
  const legendLabels = display.legend || {};
  const colorScale = display.colorScale || "";
  const legend = scales.legend || { colors: [], edges: [] };
  const colors = legend.colors || [];
  const edges = legend.edges || [];

  const renderLegend = (g) => {
    const length = colors.length;
    if (length === 0) {
      return;
    }

    const x = d3
      .scaleLinear()
      .domain([0, length])
      .rangeRound([0, width]);

    g.selectAll("rect")
      .data(colors)
      .join("rect")
      .attr("height", 8)
      .attr("x", (d, i) => x(i))
      .attr("width", (d, i) => x(i + 1) - x(i))
      .attr("fill", (d) => d);

    const labelMultiplier =
      measure && measure.display && typeof measure.display.labelmultiplier === "number"
        ? measure.display.labelmultiplier
        : 1;
    const labelPrecision =
      measure && measure.display && typeof measure.display.labelprecision === "number"
        ? measure.display.labelprecision
        : 0;
    const numericFormatter = d3.format(`.${labelPrecision}f`);

    const tickValues = edges.length === colors.length + 1
      ? d3.range(1, edges.length - 1)
      : d3.range(1, length);

    const tickFormatter = (i) => {
      const domainValue =
        edges.length === colors.length + 1 ? edges[i] : edges[i] || i;
      if (colorScale === "ratio_diverging") {
        const base = labelMultiplier;
        if (domainValue <= 1) {
          return `${base}:${Math.round(base / domainValue)}`;
        }
        return `${Math.round(domainValue * base)}:${base}`;
      }
      return numericFormatter(domainValue * labelMultiplier);
    };

    g.call(
      d3
        .axisTop(x)
        .tickSize(-8)
        .tickValues(tickValues)
        .tickFormat(tickFormatter),
    )
      .select(".domain")
      .remove();
  };

  plot
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0,${height + 70})`)
    .call(renderLegend);

  plot
    .select(".legend")
    .append("text")
    .attr("fill", "#000")
    .attr("font-weight", "bold")
    .attr("text-anchor", "start")
    .attr("x", 0)
    .attr("y", 20)
    .text(legendLabels.left || "");

  plot
    .select(".legend")
    .append("text")
    .attr("fill", "#000")
    .attr("font-weight", "bold")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", 20)
    .text(legendLabels.right || "");
}

function AddMouseHoverToHeatmap(measure) {
  d3.selectAll(".heatmaptooltip").remove();
  let tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "heatmaptooltip")
    .style("position", "absolute")
    .style("visibility", "hidden");

  const tooltipConfig = measure && measure.display ? measure.display.tooltip : null;
  const suffix = tooltipConfig && tooltipConfig.suffix ? tooltipConfig.suffix : "";
  const labelMultiplier =
    measure && measure.display && typeof measure.display.labelmultiplier === "number"
      ? measure.display.labelmultiplier
      : 1;
  const labelPrecision =
    measure && measure.display && typeof measure.display.labelprecision === "number"
      ? measure.display.labelprecision
      : 0;
  const formatter = d3.format(`.${labelPrecision}f`);

  plot
    .selectAll(".heatmapcell")
    .on("mouseover", function () {
      return tooltip.style("visibility", "visible");
    })
    .on("mousemove", function (d) {
      const event = d3.event;
      const value = d.value;
      let text = "No data";
      if (value !== null && value !== undefined && !Number.isNaN(value)) {
        text = formatter(value * labelMultiplier) + suffix;
      }
      return tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px")
        .text(text);
    })
    .on("mouseout", function () {
      return tooltip.style("visibility", "hidden");
    });
}

// Init plot -------------------------------------------------------------

let plot = d3
  .select("#plot-container")
  .append("svg")
  .attr("width", container_dimensions.width)
  .attr("height", container_dimensions.height)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Data and rendering -----------------------------------------------------

function toTitleCase(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function updateHeader(series, measure) {
  const title = measure ? measure.name : "Lexis surface";
  d3.select("#plot-title").text(title);
  if (measure && measure.axes) {
    const subtitle = `Heatmap by ${measure.axes.y.name} and ${measure.axes.x.name}`;
    d3.select(".subtitle").text(subtitle);
  }
}

function renderSurface(surface, measure) {
  plot.selectAll("*").remove();
  if (!surface || !surface.observations || surface.observations.length === 0) {
    return;
  }

  const scales = DefineHeatmapScales(surface.observations, measure);
  DrawHeatmap(surface.observations, scales);
  AddAxesToHeatmap(scales);
  AddAxisLabels(measure);
  AddColorBarToHeatmap(scales, measure);
  AddMouseHoverToHeatmap(measure);
  updateHeader(surface.series, measure);
  updateCaption(surface.series);
}

function populateMeasures(measuresList) {
  measureDropdown
    .selectAll("option")
    .data(measuresList)
    .enter()
    .append("option")
    .text((d) => d.name)
    .attr("value", (d) => d.key);
}

function populateSeries(seriesOptions) {
  seriesDropdown.selectAll("option").remove();
  seriesDropdown
    .selectAll("option")
    .data(seriesOptions)
    .enter()
    .append("option")
    .text((d) => d.label || d.key)
    .attr("value", (d) => d.key);
}

function formatStrataValue(strataKey, value) {
  const definition = strataDefinitions[strataKey];
  if (!definition) {
    return value;
  }
  if (definition.valuesFromData) {
    return value;
  }
  const codebookMap = definition.codebookMap || {};
  return codebookMap[value] || value;
}

function getStrataLabel(strataKey) {
  const definition = strataDefinitions[strataKey];
  return definition && definition.label ? definition.label : toTitleCase(strataKey);
}

function getAvailableValues(strataKey) {
  const combos = currentStrataCombos;
  const values = new Set();
  combos.forEach((combo) => {
    const matches = Object.keys(currentStrataSelections).every((key) => {
      if (key === strataKey) {
        return true;
      }
      const selectedValue = currentStrataSelections[key];
      return selectedValue ? combo[key] === selectedValue : true;
    });
    if (matches) {
      values.add(combo[strataKey]);
    }
  });
  if (values.size === 0 && currentSeries && currentSeries.strataValues) {
    const fallback = currentSeries.strataValues[strataKey] || [];
    fallback.forEach((value) => values.add(value));
  }
  return Array.from(values).sort();
}

function refreshStrataOptions() {
  if (!currentSeries || !currentSeries.strataKeys) {
    return;
  }

  let needsSurfaceReload = false;
  currentSeries.strataKeys.forEach((key) => {
    const select = d3.select(`#stratum-${key}`);
    const availableValues = getAvailableValues(key);
    const currentValue = currentStrataSelections[key];
    const nextValue = availableValues.includes(currentValue)
      ? currentValue
      : availableValues[0];

    select.selectAll("option").remove();
    select
      .selectAll("option")
      .data(availableValues)
      .enter()
      .append("option")
      .attr("value", (d) => d)
      .text((d) => formatStrataValue(key, d));

    if (nextValue) {
      select.property("value", nextValue);
      if (currentValue !== nextValue) {
        currentStrataSelections[key] = nextValue;
        needsSurfaceReload = true;
      }
    }
  });

  if (needsSurfaceReload) {
    loadSurfaceForSelections();
  }
}

function renderStrataControls(series) {
  strataControls.selectAll("*").remove();
  currentStrataSelections = {};
  currentStrataCombos = series && series.strataCombos ? series.strataCombos : [];

  if (!series || !series.strataKeys || series.strataKeys.length === 0) {
    return;
  }

  series.strataKeys.forEach((key) => {
    const control = strataControls.append("div").attr("class", "stratum-control");
    control
      .append("label")
      .attr("class", "control-label")
      .attr("for", `stratum-${key}`)
      .text(getStrataLabel(key));
    control
      .append("select")
      .attr("class", "stratum-select")
      .attr("id", `stratum-${key}`)
      .on("change", function () {
        currentStrataSelections[key] = d3.select(this).property("value");
        refreshStrataOptions();
        loadSurfaceForSelections();
      });
  });

  const initialCombo = currentStrataCombos.length > 0 ? currentStrataCombos[0] : null;
  if (initialCombo) {
    currentStrataSelections = { ...initialCombo };
  }

  refreshStrataOptions();
}

async function loadSurfaceForSelections() {
  if (!currentSeries) {
    return;
  }
  const strataKeys = currentSeries.strataKeys || [];
  const hasAllSelections =
    strataKeys.length === 0 ||
    strataKeys.every((key) => currentStrataSelections[key]);
  if (!hasAllSelections) {
    return;
  }
  const surface = await fetchSurface(currentSeries.key, currentStrataSelections);
  renderSurface(surface, currentMeasure);
}

async function ensureStrataDefinitions(keys) {
  const missing = keys.filter((key) => !strataDefinitions[key]);
  if (missing.length === 0) {
    return;
  }
  const fetched = await fetchStrata(missing);
  Object.keys(fetched || {}).forEach((key) => {
    const entry = fetched[key];
    if (entry && entry.codebook && Array.isArray(entry.codebook)) {
      entry.codebookMap = entry.codebook.reduce((acc, item) => {
        if (item && item.key !== undefined) {
          acc[item.key] = item.name || item.key;
        }
        return acc;
      }, {});
    }
    strataDefinitions[key] = entry;
  });
}

async function ensureSources(keys) {
  const missing = keys.filter((key) => !sourcesByKey[key]);
  if (missing.length === 0) {
    return;
  }
  const fetched = await fetchSources(missing);
  (fetched || []).forEach((source) => {
    if (source && source.key) {
      sourcesByKey[source.key] = source;
    }
  });
}

function updateCaption(series) {
  if (!series || !series.sourceKeys || series.sourceKeys.length === 0) {
    caption.text("");
    return;
  }
  const parts = series.sourceKeys.map((key) => {
    const source = sourcesByKey[key];
    if (!source) {
      return key;
    }
    return source.citation || source.name || key;
  });
  caption.text(`Data source: ${parts.join("; ")}`);
}

async function loadSeriesForMeasure(measureKey) {
  seriesList = await fetchSeries(measureKey);
  populateSeries(seriesList);
  currentSeries = seriesList.length > 0 ? seriesList[0] : null;
  if (!currentSeries) {
    return;
  }
  seriesDropdown.property("value", currentSeries.key);
  await ensureStrataDefinitions(currentSeries.strataKeys || []);
  await ensureSources(currentSeries.sourceKeys || []);
  renderStrataControls(currentSeries);
  await loadSurfaceForSelections();
}

async function initialize() {
  measures = await fetchMeasures();
  populateMeasures(measures);
  if (measures.length === 0) {
    return;
  }
  currentMeasure = measures[0];
  measureDropdown.property("value", currentMeasure.key);
  await loadSeriesForMeasure(currentMeasure.key);

  measureDropdown.on("change", async function () {
    const selectedKey = measureDropdown.property("value");
    currentMeasure = measures.find((item) => item.key === selectedKey);
    await loadSeriesForMeasure(selectedKey);
  });

  seriesDropdown.on("change", async function () {
    const selectedKey = seriesDropdown.property("value");
    const selectedSeries = seriesList.find((item) => item.key === selectedKey);
    currentSeries = selectedSeries || null;
    if (!currentSeries) {
      return;
    }
    await ensureStrataDefinitions(currentSeries.strataKeys || []);
    await ensureSources(currentSeries.sourceKeys || []);
    renderStrataControls(currentSeries);
    await loadSurfaceForSelections();
  });
}

initialize().catch((error) => {
  console.error("Initialization error:", error);
});
