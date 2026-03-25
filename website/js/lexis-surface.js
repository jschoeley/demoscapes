(function (global) {
  const defaultContainerWidth = 800;
  const minContainerWidth = 360;
  const margin = { top: 10, right: 10, bottom: 120, left: 60 };

  function toTitleCase(value) {
    if (!value) {
      return "";
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
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
        for (let i = 0; i < edges.length - 1; i += 1) {
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

      return { fill, legend: { colors, edges } };
    }

    const scale = d3.scaleThreshold().domain(edges).range(colors);
    return {
      fill: (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) {
          return "white";
        }
        return scale(value);
      },
      legend: { colors, edges },
    };
  }

  function expandSurface(surface) {
    if (!surface || !surface.xValues || !surface.yValues || !surface.zValues) {
      return [];
    }

    const data = [];
    let index = 0;
    surface.yValues.forEach((y) => {
      surface.xValues.forEach((x) => {
        data.push({ x, y, value: surface.zValues[index] });
        index += 1;
      });
    });
    return data;
  }

  function defineHeatmapScales(data, measure, plotWidth, plotHeight) {
    const xMin = d3.min(data, (d) => d.x);
    const xMax = d3.max(data, (d) => d.x);
    const yMin = d3.min(data, (d) => d.y);
    const yMax = d3.max(data, (d) => d.y);

    const scaleX = d3.scaleLinear().domain([xMin, xMax]).range([0, plotWidth]);
    const scaleY = d3.scaleLinear().domain([yMin, yMax]).range([plotHeight, 0]);

    const display = measure && measure.display ? measure.display : {};
    const colorScale = buildColorScale(display);

    return {
      x: scaleX,
      y: scaleY,
      legend: colorScale.legend,
      fill: colorScale.fill,
    };
  }

  function createWidgetSkeleton(container, options) {
    container.innerHTML = "";
    container.classList.add("lexis-widget-host");

    const widget = document.createElement("section");
    widget.className = "lexis-widget";
    widget.innerHTML = `
      <section class="lexis-controls-section">
        <div class="lexis-controls-primary">
          <div class="lexis-control-group">
            <label class="lexis-control-label">Measure</label>
            <select class="lexis-measure-dropdown"></select>
          </div>
          <div class="lexis-control-group">
            <label class="lexis-control-label">Series</label>
            <select class="lexis-series-dropdown"></select>
          </div>
          <div class="lexis-controls-actions">
            <button type="button" class="lexis-action-button lexis-reset-button">Reset</button>
            <button type="button" class="lexis-action-button lexis-copylink-button">Copy link</button>
          </div>
        </div>
        <section class="lexis-strata-panel">
          <div class="lexis-strata-header">
            <span class="lexis-control-label">Strata</span>
            <span class="lexis-strata-summary">No strata selected</span>
          </div>
          <div class="lexis-strata-body">
            <div class="lexis-strata-controls"></div>
          </div>
        </section>
      </section>
      <section class="lexis-viz-section">
        <div class="card lexis-heatmap-section">
          <div class="lexis-heatmap-title">${options.title || "Lexis surface"}</div>
          <div class="lexis-widget-notice" hidden></div>
          <div class="lexis-plot-container"></div>
          <p class="lexis-heatmap-caption"></p>
        </div>
      </section>
    `;

    container.appendChild(widget);

    if (options.showControls === false) {
      widget.querySelector(".lexis-controls-section").style.display = "none";
    }

    return widget;
  }

  function createLexisSurface(container, options) {
    const api = global.DemoscapesApi;
    if (!api) {
      throw new Error("DemoscapesApi is not available.");
    }

    const config = options || {};
    const widget = createWidgetSkeleton(container, config);

    const measureDropdown = d3.select(widget).select(".lexis-measure-dropdown");
    const seriesDropdown = d3.select(widget).select(".lexis-series-dropdown");
    const resetButton = d3.select(widget).select(".lexis-reset-button");
    const copyLinkButton = d3.select(widget).select(".lexis-copylink-button");
    const strataPanel = d3.select(widget).select(".lexis-strata-panel");
    const strataSummaryNode = d3.select(widget).select(".lexis-strata-summary");
    const strataControls = d3.select(widget).select(".lexis-strata-controls");
    const caption = d3.select(widget).select(".lexis-heatmap-caption");
    const titleNode = d3.select(widget).select(".lexis-heatmap-title");
    const notice = d3.select(widget).select(".lexis-widget-notice");
    const plotContainer = d3.select(widget).select(".lexis-plot-container");

    const state = {
      measures: [],
      seriesList: [],
      currentMeasure: null,
      currentSeries: null,
      strataDefinitions: {},
      currentStrataSelections: { ...(config.strata || {}) },
      currentStrataCombos: [],
      sourcesByKey: {},
      lastSurface: null,
    };
    const initialDefaults = {
      measureKey: config.measureKey || null,
      seriesKey: config.seriesKey || null,
      strata: { ...(config.strata || {}) },
    };
    const tooltipClass = `heatmaptooltip-${Math.random().toString(36).slice(2)}`;

    const svg = plotContainer
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .style("width", "100%")
      .style("height", "auto")
      .style("display", "block");

    const plot = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    function getDimensions() {
      const node = plotContainer.node();
      const measuredWidth = node ? Math.floor(node.clientWidth) : 0;
      const outerWidth = Math.max(minContainerWidth, measuredWidth || defaultContainerWidth);
      const outerHeight = Math.round(outerWidth * 0.92);
      const plotWidth = Math.max(1, outerWidth - margin.left - margin.right);
      const plotHeight = Math.max(1, outerHeight - margin.top - margin.bottom);
      return {
        outerWidth,
        outerHeight,
        plotWidth,
        plotHeight,
      };
    }

    function applySvgDimensions(dimensions) {
      svg
        .attr("width", dimensions.outerWidth)
        .attr("height", dimensions.outerHeight)
        .attr("viewBox", `0 0 ${dimensions.outerWidth} ${dimensions.outerHeight}`);
    }

    function clearNotice() {
      notice.attr("hidden", true).text("");
    }

    function showNotice(message) {
      notice.attr("hidden", null).text(message);
    }

    function updateHeader(measure) {
      const baseTitle = measure ? measure.name : "Lexis surface";
      if (config.title) {
        titleNode.text(config.title);
        return;
      }

      const strataParts = [];
      if (state.currentSeries && Array.isArray(state.currentSeries.strataKeys)) {
        state.currentSeries.strataKeys.forEach((key) => {
          const value = state.currentStrataSelections[key];
          if (!value) {
            return;
          }
          const label = getStrataLabel(key);
          const formattedValue = formatStrataValue(key, value);
          strataParts.push(`${label}: ${formattedValue}`);
        });
      }

      titleNode.text(
        strataParts.length > 0
          ? `${baseTitle}, ${strataParts.join(", ")}`
          : baseTitle,
      );
    }

    function updateCaption(series) {
      if (config.captionMode === "hidden") {
        caption.text("");
        return;
      }
      if (!series || !series.sourceKeys || series.sourceKeys.length === 0) {
        caption.text("");
        return;
      }
      const parts = series.sourceKeys.map((key) => {
        const source = state.sourcesByKey[key];
        if (!source) {
          return key;
        }
        return source.citation || source.name || key;
      });
      caption.text(`Data source: ${parts.join("; ")}`);
    }

    function drawHeatmap(data, scales, dimensions) {
      const rectWidth = dimensions.plotWidth / (scales.x.domain()[1] - scales.x.domain()[0]);
      const rectHeight = dimensions.plotHeight / (scales.y.domain()[1] - scales.y.domain()[0]);

      plot
        .append("g")
        .attr("class", "heatmap")
        .selectAll("rect")
        .data(data, (d) => `${d.x}:${d.y}`)
        .enter()
        .append("rect")
        .attr("class", "heatmapcell")
        .attr("x", (d) => scales.x(d.x))
        .attr("y", (d) => scales.y(d.y) - rectHeight)
        .attr("width", rectWidth)
        .attr("height", rectHeight)
        .style("fill", (d) => scales.fill(d.value))
        .style("stroke", (d) => scales.fill(d.value))
        .style("stroke-width", 1);
    }

    function addAxesToHeatmap(scales, dimensions) {
      plot
        .append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${dimensions.plotHeight + 5})`)
        .call(d3.axisBottom(scales.x).tickFormat(d3.format("d")));

      plot
        .append("g")
        .attr("class", "axis")
        .attr("transform", "translate(-5,0)")
        .call(d3.axisLeft(scales.y).tickFormat(d3.format("d")));
    }

    function addAxisLabels(measure, dimensions) {
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
        .attr("x", dimensions.plotWidth / 2)
        .attr("y", dimensions.plotHeight + 50)
        .attr("text-anchor", "middle")
        .text(`${toTitleCase(xLabel)}${xUnit}`);

      plot
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -dimensions.plotHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text(`${toTitleCase(yLabel)}${yUnit}`);
    }

    function addColorBarToHeatmap(scales, measure, dimensions) {
      const display = measure && measure.display ? measure.display : {};
      const legendLabels = display.legend || {};
      const colorScaleName = display.colorScale || "";
      const legend = scales.legend || { colors: [], edges: [] };
      const colors = legend.colors || [];
      const edges = legend.edges || [];

      const legendGroup = plot
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${dimensions.plotHeight + 70})`);

      const length = colors.length;
      if (length === 0) {
        return;
      }

      const x = d3.scaleLinear().domain([0, length]).rangeRound([0, dimensions.plotWidth]);

      legendGroup
        .selectAll("rect")
        .data(colors)
        .join("rect")
        .attr("height", 8)
        .attr("x", (_d, i) => x(i))
        .attr("width", (_d, i) => x(i + 1) - x(i))
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

      const tickValues =
        edges.length === colors.length + 1
          ? d3.range(1, edges.length - 1)
          : d3.range(1, length);

      const tickFormatter = (i) => {
        const domainValue = edges.length === colors.length + 1 ? edges[i] : edges[i] || i;
        if (colorScaleName === "ratio_diverging") {
          const base = labelMultiplier;
          if (domainValue <= 1) {
            return `${base}:${Math.round(base / domainValue)}`;
          }
          return `${Math.round(domainValue * base)}:${base}`;
        }
        return numericFormatter(domainValue * labelMultiplier);
      };

      legendGroup
        .call(d3.axisTop(x).tickSize(-8).tickValues(tickValues).tickFormat(tickFormatter))
        .select(".domain")
        .remove();

      legendGroup
        .append("text")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .attr("x", 0)
        .attr("y", 20)
        .text(legendLabels.left || "");

      legendGroup
        .append("text")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .attr("x", dimensions.plotWidth)
        .attr("y", 20)
        .text(legendLabels.right || "");
    }

    function addMouseHoverToHeatmap(measure) {
      d3.select("body").selectAll(`.${tooltipClass}`).remove();

      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", `heatmaptooltip ${tooltipClass}`)
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
          tooltip.style("visibility", "visible");
        })
        .on("mousemove", function (d) {
          const event = d3.event;
          const value = d.value;
          let text = "No data";
          if (value !== null && value !== undefined && !Number.isNaN(value)) {
            text = formatter(value * labelMultiplier) + suffix;
          }
          tooltip
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY + 12}px`)
            .text(text);
        })
        .on("mouseout", function () {
          tooltip.style("visibility", "hidden");
        });
    }

    function renderSurface(surface, series, measure) {
      state.lastSurface = surface;
      const dimensions = getDimensions();
      applySvgDimensions(dimensions);
      plot.selectAll("*").remove();

      const observations = expandSurface(surface);
      if (observations.length === 0) {
        updateHeader(measure);
        updateCaption(series);
        return;
      }

      const scales = defineHeatmapScales(observations, measure, dimensions.plotWidth, dimensions.plotHeight);
      drawHeatmap(observations, scales, dimensions);
      addAxesToHeatmap(scales, dimensions);
      addAxisLabels(measure, dimensions);
      addColorBarToHeatmap(scales, measure, dimensions);
      addMouseHoverToHeatmap(measure);
      updateHeader(measure);
      updateCaption(series);
    }

    function rerenderCurrentSurface() {
      if (!state.currentSeries || !state.currentMeasure) {
        return;
      }
      renderSurface(state.lastSurface, state.currentSeries, state.currentMeasure);
    }

    function populateMeasures(measures) {
      measureDropdown.selectAll("option").remove();
      measureDropdown
        .selectAll("option")
        .data(measures)
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
      const definition = state.strataDefinitions[strataKey];
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
      const definition = state.strataDefinitions[strataKey];
      return definition && definition.label ? definition.label : toTitleCase(strataKey);
    }

    function updateStrataSummary() {
      if (!state.currentSeries || !Array.isArray(state.currentSeries.strataKeys) || state.currentSeries.strataKeys.length === 0) {
        strataSummaryNode.text("No strata");
        return;
      }

      const parts = [];
      state.currentSeries.strataKeys.forEach((key) => {
        const selectedValue = state.currentStrataSelections[key];
        if (!selectedValue) {
          return;
        }
        parts.push(`${getStrataLabel(key)}: ${formatStrataValue(key, selectedValue)}`);
      });

      strataSummaryNode.text(parts.length > 0 ? parts.join(", ") : "No strata selected");
    }

    function buildShareUrl() {
      const url = new URL(global.location.href);
      if (state.currentMeasure && state.currentMeasure.key) {
        url.searchParams.set("measureKey", state.currentMeasure.key);
      } else {
        url.searchParams.delete("measureKey");
      }

      if (state.currentSeries && state.currentSeries.key) {
        url.searchParams.set("seriesKey", state.currentSeries.key);
      } else {
        url.searchParams.delete("seriesKey");
      }

      const seriesStrataKeys = state.currentSeries && Array.isArray(state.currentSeries.strataKeys)
        ? state.currentSeries.strataKeys
        : [];
      const activeStrata = {};
      seriesStrataKeys.forEach((key) => {
        if (state.currentStrataSelections[key]) {
          activeStrata[key] = state.currentStrataSelections[key];
        }
      });
      if (Object.keys(activeStrata).length > 0) {
        url.searchParams.set("strata", JSON.stringify(activeStrata));
      } else {
        url.searchParams.delete("strata");
      }

      if (config.collectionKey) {
        url.searchParams.set("collectionKey", config.collectionKey);
      } else {
        url.searchParams.delete("collectionKey");
      }

      return url.toString();
    }

    async function handleCopyLink() {
      const button = copyLinkButton.node();
      const originalText = button ? button.textContent : "Copy link";
      const shareUrl = buildShareUrl();

      try {
        if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
          await global.navigator.clipboard.writeText(shareUrl);
        } else {
          throw new Error("Clipboard API unavailable");
        }
        copyLinkButton.text("Copied");
      } catch (error) {
        copyLinkButton.text("Copy failed");
      } finally {
        global.setTimeout(() => {
          copyLinkButton.text(originalText);
        }, 1200);
      }
    }

    function getAvailableValues(strataKey) {
      const values = new Set();
      state.currentStrataCombos.forEach((combo) => {
        const matches = Object.keys(state.currentStrataSelections).every((key) => {
          if (key === strataKey) {
            return true;
          }
          const selectedValue = state.currentStrataSelections[key];
          return selectedValue ? combo[key] === selectedValue : true;
        });
        if (matches) {
          values.add(combo[strataKey]);
        }
      });

      if (values.size === 0 && state.currentSeries && state.currentSeries.strataValues) {
        const fallback = state.currentSeries.strataValues[strataKey] || [];
        fallback.forEach((value) => values.add(value));
      }

      return Array.from(values).sort();
    }

    async function loadSurfaceForSelections() {
      if (!state.currentSeries) {
        return;
      }

      const strataKeys = state.currentSeries.strataKeys || [];
      const hasAllSelections =
        strataKeys.length === 0 || strataKeys.every((key) => state.currentStrataSelections[key]);
      if (!hasAllSelections) {
        return;
      }

      try {
        const surface = await api.fetchSurface(state.currentSeries.key, state.currentStrataSelections);
        clearNotice();
        renderSurface(surface, state.currentSeries, state.currentMeasure);
      } catch (error) {
        const isQuotaError = error && error.status === 429;
        const message = isQuotaError
          ? (error.warning || "Lexis surface request limit reached. Please wait and try again.")
          : "Unable to load this Lexis surface right now.";

        showNotice(message);
        plot.selectAll("*").remove();
        console.error("Lexis surface request failed", error);
      }
    }

    function refreshStrataOptions() {
      if (!state.currentSeries || !state.currentSeries.strataKeys) {
        return;
      }

      let needsSurfaceReload = false;
      state.currentSeries.strataKeys.forEach((key) => {
        const select = d3.select(widget).select(`.stratum-select[data-key='${key}']`);
        const availableValues = getAvailableValues(key);
        const currentValue = state.currentStrataSelections[key];
        const nextValue = availableValues.includes(currentValue) ? currentValue : availableValues[0];

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
            state.currentStrataSelections[key] = nextValue;
            needsSurfaceReload = true;
          }
        }
      });

      if (needsSurfaceReload) {
        loadSurfaceForSelections();
      }
      updateStrataSummary();
    }

    function renderStrataControls(series) {
      strataControls.selectAll("*").remove();

      if (!(initialDefaults.strata && Object.keys(initialDefaults.strata).length > 0)) {
        state.currentStrataSelections = {};
      }
      state.currentStrataCombos = series && series.strataCombos ? series.strataCombos : [];

      if (!series || !series.strataKeys || series.strataKeys.length === 0) {
        strataPanel.style("display", "none");
        updateStrataSummary();
        return;
      }

      strataPanel.style("display", "block");

      series.strataKeys.forEach((key) => {
        const control = strataControls.append("div").attr("class", "stratum-control");
        control.append("label").attr("class", "lexis-control-label").text(getStrataLabel(key));

        control
          .append("select")
          .attr("class", "stratum-select")
          .attr("data-key", key)
          .on("change", function () {
            state.currentStrataSelections[key] = d3.select(this).property("value");
            refreshStrataOptions();
            loadSurfaceForSelections();
          });
      });

      const initialCombo = state.currentStrataCombos.length > 0 ? state.currentStrataCombos[0] : null;
      if (initialCombo) {
        state.currentStrataSelections = { ...initialCombo, ...state.currentStrataSelections };
      }

      refreshStrataOptions();
      updateStrataSummary();
    }

    async function ensureStrataDefinitions(keys) {
      const missing = keys.filter((key) => !state.strataDefinitions[key]);
      if (missing.length === 0) {
        return;
      }

      const fetched = await api.fetchStrata(missing);
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
        state.strataDefinitions[key] = entry;
      });
    }

    async function ensureSources(keys) {
      const missing = keys.filter((key) => !state.sourcesByKey[key]);
      if (missing.length === 0) {
        return;
      }

      const fetched = await api.fetchSources(missing);
      (fetched || []).forEach((source) => {
        if (source && source.key) {
          state.sourcesByKey[source.key] = source;
        }
      });
    }

    async function loadSeriesForMeasure(measureKey, preferredSeriesKey) {
      state.seriesList = await api.fetchSeries({
        measureKey,
        collectionKey: config.collectionKey,
      });
      populateSeries(state.seriesList);

      const preferredSeries =
        preferredSeriesKey && state.seriesList.find((item) => item.key === preferredSeriesKey);
      state.currentSeries = preferredSeries || (state.seriesList.length > 0 ? state.seriesList[0] : null);

      if (!state.currentSeries) {
        strataControls.selectAll("*").remove();
        strataPanel.style("display", "none");
        updateStrataSummary();
        updateHeader(state.currentMeasure);
        updateCaption(null);
        clearNotice();
        plot.selectAll("*").remove();
        return;
      }

      seriesDropdown.property("value", state.currentSeries.key);
      await ensureStrataDefinitions(state.currentSeries.strataKeys || []);
      await ensureSources(state.currentSeries.sourceKeys || []);
      renderStrataControls(state.currentSeries);
      await loadSurfaceForSelections();
    }

    function applyQueryDefaults() {
      try {
        const params = new URLSearchParams(global.location.search || "");
        if (!config.measureKey && params.get("measureKey")) {
          initialDefaults.measureKey = params.get("measureKey");
        }
        if (!config.seriesKey && params.get("seriesKey")) {
          initialDefaults.seriesKey = params.get("seriesKey");
        }
        if (!config.collectionKey && params.get("collectionKey")) {
          config.collectionKey = params.get("collectionKey");
        }
        if ((!config.strata || Object.keys(config.strata).length === 0) && params.get("strata")) {
          const parsed = JSON.parse(params.get("strata"));
          if (parsed && typeof parsed === "object") {
            initialDefaults.strata = { ...parsed };
            state.currentStrataSelections = { ...parsed };
          }
        }
      } catch (error) {
        // Ignore malformed URL params and fallback to provided options.
      }
    }

    async function resetToDefaults() {
      if (!state.measures || state.measures.length === 0) {
        return;
      }

      state.currentStrataSelections = { ...initialDefaults.strata };
      const preferredMeasure =
        initialDefaults.measureKey && state.measures.find((item) => item.key === initialDefaults.measureKey);
      state.currentMeasure = preferredMeasure || state.measures[0];
      measureDropdown.property("value", state.currentMeasure.key);
      await loadSeriesForMeasure(state.currentMeasure.key, initialDefaults.seriesKey);
    }

    async function initialize() {
      applyQueryDefaults();
      state.measures = await api.fetchMeasures(config.collectionKey);
      populateMeasures(state.measures);
      if (state.measures.length === 0) {
        updateHeader(null);
        caption.text("");
        clearNotice();
        return;
      }

      const preferredMeasure =
        initialDefaults.measureKey && state.measures.find((item) => item.key === initialDefaults.measureKey);
      state.currentMeasure = preferredMeasure || state.measures[0];

      measureDropdown.property("value", state.currentMeasure.key);
      await loadSeriesForMeasure(state.currentMeasure.key, initialDefaults.seriesKey);

      resetButton.on("click", async function () {
        await resetToDefaults();
      });
      copyLinkButton.on("click", async function () {
        await handleCopyLink();
      });

      measureDropdown.on("change", async function () {
        const selectedKey = measureDropdown.property("value");
        state.currentMeasure = state.measures.find((item) => item.key === selectedKey) || null;
        await loadSeriesForMeasure(selectedKey, null);
      });

      seriesDropdown.on("change", async function () {
        const selectedKey = seriesDropdown.property("value");
        state.currentSeries = state.seriesList.find((item) => item.key === selectedKey) || null;
        if (!state.currentSeries) {
          return;
        }

        await ensureStrataDefinitions(state.currentSeries.strataKeys || []);
        await ensureSources(state.currentSeries.sourceKeys || []);
        renderStrataControls(state.currentSeries);
        await loadSurfaceForSelections();
      });
    }

    initialize().catch((error) => {
      console.error("Lexis surface initialization error", error);
    });

    global.addEventListener("resize", rerenderCurrentSurface);

    return {
      reload: loadSurfaceForSelections,
      getState: function () {
        return { ...state };
      },
    };
  }

  global.createLexisSurface = createLexisSurface;
})(window);
