(function (global) {
  const defaultContainerWidth = 800;
  const minContainerWidth = 360;
  const mobileBreakpoint = 860;
  const margin = { top: 10, right: 10, bottom: 96, left: 60 };
  const qualitativeLegendRowHeight = 28;
  const qualitativeLegendLabelGap = 8;
  const qualitativeLegendItemGap = 16;
  const qualitativeLegendSwatchSize = 12;
  const qualitativeLegendTopOffset = 56;
  const qualitativeLegendBottomPadding = 14;
  const fallbackCategoricalColor = "#d9d9d9";
  const mobileXAxisTickTargetPx = 58;
  const mobileYAxisTickTargetPx = 34;
  const mobileXAxisOverlapPaddingPx = 3;
  const mobileLegendOverlapPaddingPx = 4;
  const mobileYAxisOverlapPaddingPx = 2;

  function toTitleCase(value) {
    if (!value) {
      return "";
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDisplayUrl(value) {
    return String(value || "").replace(/^https?:\/\//i, "");
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
    const colorScaleName = display.colorScale || "";

    if (colorScaleName === "qualitative") {
      const categories = rawDomain.map((value) => String(value));
      const colorByCategory = new Map();
      const warnedCategories = new Set();

      categories.forEach((category, index) => {
        colorByCategory.set(category, colors[index] || fallbackCategoricalColor);
      });

      return {
        kind: "qualitative",
        fill: (value) => {
          if (value === null || value === undefined || value === "") {
            return "white";
          }

          const category = String(value);
          if (!colorByCategory.has(category)) {
            if (!warnedCategories.has(category)) {
              warnedCategories.add(category);
              console.warn(`Unknown qualitative category: ${category}`);
            }
            return fallbackCategoricalColor;
          }

          return colorByCategory.get(category);
        },
        legend: {
          categories,
          colors: categories.map((category) => colorByCategory.get(category)),
        },
      };
    }

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

      return { kind: "numeric", fill, legend: { colors, edges } };
    }

    const scale = d3.scaleThreshold().domain(edges).range(colors);
    return {
      kind: "numeric",
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
    if (
      !surface
      || !surface.xValues
      || !surface.yValues
      || !surface.zValues
      || !surface.wxValues
      || !surface.wyValues
    ) {
      return [];
    }

    const data = [];
    let index = 0;
    surface.yValues.forEach((y) => {
      surface.xValues.forEach((x) => {
        data.push({
          x,
          y,
          wx: surface.wxValues[index],
          wy: surface.wyValues[index],
          value: surface.zValues[index],
        });
        index += 1;
      });
    });
    return data;
  }

  function hasValidGeometry(cell) {
    return Number.isFinite(cell.wx) && Number.isFinite(cell.wy) && cell.wx > 0 && cell.wy > 0;
  }

  function defineHeatmapScales(data, measure, plotWidth, plotHeight) {
    const geometry = data.filter(hasValidGeometry);
    const xMin = d3.min(geometry, (d) => d.x);
    const xMax = d3.max(geometry, (d) => d.x + d.wx);
    const yMin = d3.min(geometry, (d) => d.y);
    const yMax = d3.max(geometry, (d) => d.y + d.wy);

    const scaleX = d3.scaleLinear().domain([xMin, xMax]).range([0, plotWidth]);
    const scaleY = d3.scaleLinear().domain([yMin, yMax]).range([plotHeight, 0]);

    const display = measure && measure.display ? measure.display : {};
    const colorScale = buildColorScale(display);

    return {
      x: scaleX,
      y: scaleY,
      kind: colorScale.kind,
      legend: colorScale.legend,
      fill: colorScale.fill,
    };
  }

  function measureTextWidth(text, className) {
    const probe = d3
      .select(document.body)
      .append("svg")
      .attr("width", 0)
      .attr("height", 0)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("pointer-events", "none");

    const textNode = probe
      .append("text")
      .attr("class", className)
      .text(text || "");

    const width = textNode.node().getComputedTextLength();
    probe.remove();
    return width;
  }

  function buildQualitativeLegendRows(categories, plotWidth) {
    const rows = [];
    let currentRow = [];
    let currentWidth = 0;

    categories.forEach((category) => {
      const labelWidth = measureTextWidth(category, "lexis-legend-label");
      const itemWidth = qualitativeLegendSwatchSize + qualitativeLegendLabelGap + labelWidth;
      const nextWidth = currentRow.length === 0
        ? itemWidth
        : currentWidth + qualitativeLegendItemGap + itemWidth;

      if (currentRow.length > 0 && nextWidth > plotWidth) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }

      currentRow.push({
        label: category,
        width: itemWidth,
      });
      currentWidth = currentRow.length === 1
        ? itemWidth
        : currentWidth + qualitativeLegendItemGap + itemWidth;
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  function getLegendBottomMargin(scales, plotWidth) {
    if (!scales || scales.kind !== "qualitative") {
      return margin.bottom;
    }

    const categories = scales.legend && Array.isArray(scales.legend.categories)
      ? scales.legend.categories
      : [];
    if (categories.length === 0) {
      return margin.bottom;
    }

    const rows = buildQualitativeLegendRows(categories, plotWidth);
    const legendHeight = rows.length * qualitativeLegendRowHeight;
    return Math.max(
      margin.bottom,
      qualitativeLegendTopOffset + legendHeight + qualitativeLegendBottomPadding,
    );
  }

  function isMobileLayout() {
    return global.innerWidth <= mobileBreakpoint;
  }

  function dedupeTickValues(values) {
    return Array.from(new Set((values || []).filter((value) => value !== undefined && value !== null)));
  }

  function sampleTickValues(values, step) {
    if (!values || values.length <= 2 || step <= 1) {
      return values || [];
    }

    return values.filter((_value, index) => (
      index === 0
      || index === values.length - 1
      || index % step === 0
    ));
  }

  function hasHorizontalTickOverlap(axisGroup, padding) {
    const boxes = axisGroup
      .selectAll(".tick text")
      .nodes()
      .map((node) => node.getBoundingClientRect())
      .sort((a, b) => a.left - b.left);

    for (let i = 1; i < boxes.length; i += 1) {
      if (boxes[i - 1].right + padding > boxes[i].left) {
        return true;
      }
    }
    return false;
  }

  function hasVerticalTickOverlap(axisGroup, padding) {
    const boxes = axisGroup
      .selectAll(".tick text")
      .nodes()
      .map((node) => node.getBoundingClientRect())
      .sort((a, b) => a.top - b.top);

    for (let i = 1; i < boxes.length; i += 1) {
      if (boxes[i - 1].bottom + padding > boxes[i].top) {
        return true;
      }
    }
    return false;
  }

  function renderAdaptiveAxis(axisGroup, createAxis, tickValues, overlapChecker) {
    const uniqueValues = dedupeTickValues(tickValues);
    if (uniqueValues.length === 0) {
      axisGroup.call(createAxis(null));
      return;
    }

    for (let step = 1; step <= uniqueValues.length; step += 1) {
      const sampledValues = sampleTickValues(uniqueValues, step);
      axisGroup.call(createAxis(sampledValues));
      if (!overlapChecker(axisGroup) || sampledValues.length <= 2) {
        return;
      }
    }
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
            <button type="button" class="lexis-action-button lexis-randomize-button">Randomize</button>
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
        <div class="lexis-panel lexis-heatmap-section">
          <div class="lexis-heatmap-title">
            <div class="lexis-heatmap-title-measure">${options.title || "Lexis surface"}</div>
            <div class="lexis-heatmap-title-strata" hidden></div>
          </div>
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
    const randomizeButton = d3.select(widget).select(".lexis-randomize-button");
    const strataPanel = d3.select(widget).select(".lexis-strata-panel");
    const strataSummaryNode = d3.select(widget).select(".lexis-strata-summary");
    const strataControls = d3.select(widget).select(".lexis-strata-controls");
    const caption = d3.select(widget).select(".lexis-heatmap-caption");
    const titleMeasureNode = d3.select(widget).select(".lexis-heatmap-title-measure");
    const titleStrataNode = d3.select(widget).select(".lexis-heatmap-title-strata");
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

    function getDimensions(scales) {
      const node = plotContainer.node();
      const measuredWidth = node ? Math.floor(node.clientWidth) : 0;
      const outerWidth = Math.max(minContainerWidth, measuredWidth || defaultContainerWidth);
      const plotWidth = Math.max(1, outerWidth - margin.left - margin.right);
      const bottomMargin = getLegendBottomMargin(scales, plotWidth);
      const outerHeight = Math.round(outerWidth * 0.76) + Math.max(0, bottomMargin - margin.bottom);
      const plotHeight = Math.max(1, outerHeight - margin.top - bottomMargin);
      return {
        outerWidth,
        outerHeight,
        plotWidth,
        plotHeight,
        bottomMargin,
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
      if (config.title) {
        titleMeasureNode.text(config.title);
        titleStrataNode.attr("hidden", true).text("");
        return;
      }

      const seriesTitle = state.currentSeries && state.currentSeries.title
        ? state.currentSeries.title
        : null;
      const baseTitle = seriesTitle || (measure ? measure.name : "Lexis surface");

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

      titleMeasureNode.text(baseTitle);

      if (strataParts.length > 0) {
        titleStrataNode.attr("hidden", null).text(strataParts.join(", "));
        return;
      }

      titleStrataNode.attr("hidden", true).text("");
    }

    function updateCaption(series) {
      if (config.captionMode === "hidden") {
        caption.html("");
        return;
      }
      if (!series || !series.sourceKeys || series.sourceKeys.length === 0) {
        caption.html("");
        return;
      }
      const parts = series.sourceKeys.map((key) => {
        const source = state.sourcesByKey[key];
        if (!source) {
          return escapeHtml(key);
        }
        const label = escapeHtml(source.citation || source.name || key);
        if (!source.url) {
          return label;
        }
        const href = escapeHtml(source.url);
        const displayUrl = escapeHtml(formatDisplayUrl(source.url));
        return `${label} <a href="${href}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`;
      });
      caption.html(`Data source: ${parts.join("; ")}`);
    }

    function drawHeatmap(data, scales, dimensions) {
      plot
        .append("g")
        .attr("class", "heatmap")
        .selectAll("rect")
        .data(data.filter(hasValidGeometry), (d) => `${d.x}:${d.y}`)
        .enter()
        .append("rect")
        .attr("class", "heatmapcell")
        .attr("x", (d) => scales.x(d.x))
        .attr("y", (d) => scales.y(d.y + d.wy))
        .attr("width", (d) => scales.x(d.x + d.wx) - scales.x(d.x))
        .attr("height", (d) => scales.y(d.y) - scales.y(d.y + d.wy))
        .style("fill", (d) => scales.fill(d.value))
        .style("stroke", (d) => scales.fill(d.value))
        .style("stroke-width", 1);
    }

    function addAxesToHeatmap(scales, dimensions) {
      const xAxisGroup = plot
        .append("g")
        .attr("class", "lexis-axis")
        .attr("transform", `translate(0,${dimensions.plotHeight + 5})`);

      const xTickValues = scales.x.ticks(
        Math.max(2, Math.floor(dimensions.plotWidth / mobileXAxisTickTargetPx)),
      );
      if (isMobileLayout()) {
        renderAdaptiveAxis(
          xAxisGroup,
          (tickValues) => d3.axisBottom(scales.x)
            .tickValues(tickValues)
            .tickFormat(d3.format("d")),
          xTickValues,
          (group) => hasHorizontalTickOverlap(group, mobileXAxisOverlapPaddingPx),
        );
      } else {
        xAxisGroup.call(d3.axisBottom(scales.x).tickFormat(d3.format("d")));
      }

      const yAxisGroup = plot
        .append("g")
        .attr("class", "lexis-axis")
        .attr("transform", "translate(-5,0)");

      yAxisGroup.call(d3.axisLeft(scales.y).tickFormat(d3.format("d")));

      if (isMobileLayout() && hasVerticalTickOverlap(yAxisGroup, mobileYAxisOverlapPaddingPx)) {
        const yTickValues = scales.y.ticks(
          Math.max(2, Math.floor(dimensions.plotHeight / mobileYAxisTickTargetPx)),
        );
        renderAdaptiveAxis(
          yAxisGroup,
          (tickValues) => d3.axisLeft(scales.y)
            .tickValues(tickValues)
            .tickFormat(d3.format("d")),
          yTickValues,
          (group) => hasVerticalTickOverlap(group, mobileYAxisOverlapPaddingPx),
        );
      }
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
        .attr("class", "lexis-axis-label")
        .attr("x", dimensions.plotWidth / 2)
        .attr("y", dimensions.plotHeight + 40)
        .attr("text-anchor", "middle")
        .text(`${toTitleCase(xLabel)}${xUnit}`);

      plot
        .append("text")
        .attr("class", "lexis-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -dimensions.plotHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text(`${toTitleCase(yLabel)}${yUnit}`);
    }

    function addNumericColorBarToHeatmap(scales, measure, dimensions, legendGroup) {
      const display = measure && measure.display ? measure.display : {};
      const legendLabels = display.legend || {};
      const colorScaleName = display.colorScale || "";
      const legend = scales.legend || { colors: [], edges: [] };
      const colors = legend.colors || [];
      const edges = legend.edges || [];

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

      const renderLegendAxis = (values) => {
        legendGroup
          .call(d3.axisTop(x).tickSize(-8).tickValues(values).tickFormat(tickFormatter))
          .select(".domain")
          .remove();
      };

      if (isMobileLayout()) {
        renderAdaptiveAxis(
          legendGroup,
          (values) => d3.axisTop(x).tickSize(-8).tickValues(values).tickFormat(tickFormatter),
          tickValues,
          (group) => hasHorizontalTickOverlap(group, mobileLegendOverlapPaddingPx),
        );
        legendGroup.select(".domain").remove();
      } else {
        renderLegendAxis(tickValues);
      }

      legendGroup
        .append("text")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .attr("x", 0)
        .attr("y", 18)
        .text(legendLabels.left || "");

      legendGroup
        .append("text")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .attr("x", dimensions.plotWidth)
        .attr("y", 18)
        .text(legendLabels.right || "");
    }

    function addQualitativeColorBarToHeatmap(scales, measure, dimensions, legendGroup) {
      const display = measure && measure.display ? measure.display : {};
      const legendLabels = display.legend || {};
      const legend = scales.legend || { categories: [], colors: [] };
      const categories = Array.isArray(legend.categories) ? legend.categories : [];
      const colors = Array.isArray(legend.colors) ? legend.colors : [];
      const rows = buildQualitativeLegendRows(categories, dimensions.plotWidth);

      if (rows.length === 0) {
        return;
      }

      let categoryIndex = 0;
      rows.forEach((row, rowIndex) => {
        const rowGroup = legendGroup
          .append("g")
          .attr("class", "lexis-legend-row")
          .attr("transform", `translate(0,${rowIndex * qualitativeLegendRowHeight})`);

        let offsetX = 0;
        row.forEach((item) => {
          const color = colors[categoryIndex] || fallbackCategoricalColor;
          const itemGroup = rowGroup
            .append("g")
            .attr("class", "lexis-legend-item")
            .attr("transform", `translate(${offsetX},0)`);

          itemGroup
            .append("rect")
            .attr("width", qualitativeLegendSwatchSize)
            .attr("height", qualitativeLegendSwatchSize)
            .attr("y", -qualitativeLegendSwatchSize + 2)
            .attr("fill", color);

          itemGroup
            .append("text")
            .attr("class", "lexis-legend-label")
            .attr("x", qualitativeLegendSwatchSize + qualitativeLegendLabelGap)
            .attr("y", 2)
            .text(item.label);

          offsetX += item.width + qualitativeLegendItemGap;
          categoryIndex += 1;
        });
      });

      const labelY = rows.length * qualitativeLegendRowHeight + 2;
      legendGroup
        .append("text")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .attr("x", 0)
        .attr("y", labelY)
        .text(legendLabels.left || "");

      legendGroup
        .append("text")
        .attr("fill", "#000")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .attr("x", dimensions.plotWidth)
        .attr("y", labelY)
        .text(legendLabels.right || "");
    }

    function addColorBarToHeatmap(scales, measure, dimensions) {
      const legendGroup = plot
        .append("g")
        .attr("class", "lexis-legend")
        .attr("transform", `translate(0,${dimensions.plotHeight + qualitativeLegendTopOffset})`);

      if (scales.kind === "qualitative") {
        addQualitativeColorBarToHeatmap(scales, measure, dimensions, legendGroup);
        return;
      }

      addNumericColorBarToHeatmap(scales, measure, dimensions, legendGroup);
    }

    function addMouseHoverToHeatmap(measure) {
      d3.select("body").selectAll(`.${tooltipClass}`).remove();

      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", `lexis-tooltip ${tooltipClass}`)
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
      const isCategoricalMeasure = measure && measure.statType === "categorical";

      plot
        .selectAll(".heatmapcell")
        .on("mouseover", function () {
          tooltip.style("visibility", "visible");
        })
        .on("mousemove", function (d) {
          const event = d3.event;
          const value = d.value;
          let text = "No data";
          if (isCategoricalMeasure) {
            if (value !== null && value !== undefined && value !== "") {
              text = String(value);
            }
          } else if (value !== null && value !== undefined && !Number.isNaN(value)) {
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
      const observations = expandSurface(surface);
      const drawableObservations = observations.filter(hasValidGeometry);
      if (drawableObservations.length === 0) {
        const emptyDimensions = getDimensions();
        applySvgDimensions(emptyDimensions);
        plot.selectAll("*").remove();
        updateHeader(measure);
        updateCaption(series);
        return;
      }

      const initialDimensions = getDimensions();
      const initialScales = defineHeatmapScales(
        observations,
        measure,
        initialDimensions.plotWidth,
        initialDimensions.plotHeight,
      );
      const dimensions = getDimensions(initialScales);
      const scales = defineHeatmapScales(observations, measure, dimensions.plotWidth, dimensions.plotHeight);

      applySvgDimensions(dimensions);
      plot.selectAll("*").remove();

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

      const definition = state.strataDefinitions[strataKey];
      const codebookKeys = definition && Array.isArray(definition.codebookKeys)
        ? definition.codebookKeys
        : [];

      if (codebookKeys.length > 0) {
        return codebookKeys.filter((value) => values.has(value));
      }

      return Array.from(values).sort();
    }

    function normalizeStrataSelections(series, strata) {
      const keys = series && Array.isArray(series.strataKeys) ? series.strataKeys : [];
      const normalized = {};
      keys.forEach((key) => {
        if (strata && strata[key] !== undefined && strata[key] !== null && strata[key] !== "") {
          normalized[key] = strata[key];
        }
      });
      return normalized;
    }

    function isSeriesStrataValue(series, strataKey, value) {
      if (value === undefined || value === null || value === "") {
        return false;
      }
      const values = series && series.strataValues ? series.strataValues[strataKey] : null;
      return Array.isArray(values) && values.includes(value);
    }

    function mergeSeriesStrataSelections(series, strata) {
      const keys = series && Array.isArray(series.strataKeys) ? series.strataKeys : [];
      const merged = normalizeStrataSelections(series, strata);
      const defaultStrata = normalizeStrataSelections(series, series && series.defaultStrata);

      keys.forEach((key) => {
        if (isSeriesStrataValue(series, key, merged[key])) {
          return;
        }

        delete merged[key];
        if (isSeriesStrataValue(series, key, defaultStrata[key])) {
          merged[key] = defaultStrata[key];
        }
      });

      return merged;
    }

    function buildSurfaceIdentity(target) {
      const series = target && target.series ? target.series : null;
      const measure = target && target.measure ? target.measure : null;
      return JSON.stringify({
        measureKey: measure && measure.key ? measure.key : null,
        seriesKey: series && series.key ? series.key : null,
        strata: normalizeStrataSelections(series, target && target.strata),
      });
    }

    function getCurrentSurfaceIdentity() {
      return buildSurfaceIdentity({
        measure: state.currentMeasure,
        series: state.currentSeries,
        strata: state.currentStrataSelections,
      });
    }

    function getRandomItem(items) {
      if (!items || items.length === 0) {
        return null;
      }
      return items[Math.floor(Math.random() * items.length)];
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

    function renderStrataControls(series, preferredStrata) {
      strataControls.selectAll("*").remove();

      state.currentStrataCombos = series && series.strataCombos ? series.strataCombos : [];
      state.currentStrataSelections = mergeSeriesStrataSelections(
        series,
        preferredStrata || state.currentStrataSelections,
      );

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
          entry.codebookKeys = entry.codebook
            .filter((item) => item && item.key !== undefined)
            .map((item) => item.key);
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

    async function loadSeriesForMeasure(measureKey, preferredSeriesKey, preferredStrata) {
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
      renderStrataControls(state.currentSeries, preferredStrata);
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

    async function fetchSeriesListsByMeasure() {
      const entries = await Promise.all(
        state.measures.map(async (measure) => ({
          measure,
          seriesList: await api.fetchSeries({
            measureKey: measure.key,
            collectionKey: config.collectionKey,
          }),
        })),
      );

      return entries.filter((entry) => Array.isArray(entry.seriesList) && entry.seriesList.length > 0);
    }

    function getSeriesRandomTargets(series) {
      const combos = Array.isArray(series && series.strataCombos) ? series.strataCombos : [];
      if (combos.length === 0) {
        return [{}];
      }
      return combos.map((combo) => normalizeStrataSelections(series, combo));
    }

    function countRandomTargets(entries) {
      return entries.reduce((total, entry) => (
        total + entry.seriesList.reduce((seriesTotal, series) => (
          seriesTotal + getSeriesRandomTargets(series).length
        ), 0)
      ), 0);
    }

    function drawHierarchicalRandomTarget(entries) {
      const measureEntry = getRandomItem(entries);
      if (!measureEntry) {
        return null;
      }

      const series = getRandomItem(measureEntry.seriesList);
      if (!series) {
        return null;
      }

      const strata = getRandomItem(getSeriesRandomTargets(series)) || {};
      return {
        measure: measureEntry.measure,
        series,
        strata,
      };
    }

    async function randomizeSurface() {
      if (!state.measures || state.measures.length === 0) {
        return;
      }

      const entries = await fetchSeriesListsByMeasure();
      if (entries.length === 0) {
        return;
      }

      const totalTargets = countRandomTargets(entries);
      const currentIdentity = getCurrentSurfaceIdentity();
      let nextTarget = null;

      if (totalTargets <= 1) {
        nextTarget = drawHierarchicalRandomTarget(entries);
      } else {
        for (let attempt = 0; attempt < 24; attempt += 1) {
          const candidate = drawHierarchicalRandomTarget(entries);
          if (!candidate) {
            continue;
          }
          if (buildSurfaceIdentity(candidate) !== currentIdentity) {
            nextTarget = candidate;
            break;
          }
        }
      }

      if (!nextTarget) {
        nextTarget = drawHierarchicalRandomTarget(entries);
      }
      if (!nextTarget) {
        return;
      }

      state.currentMeasure = nextTarget.measure;
      state.currentStrataSelections = { ...nextTarget.strata };
      measureDropdown.property("value", state.currentMeasure.key);
      await loadSeriesForMeasure(
        state.currentMeasure.key,
        nextTarget.series.key,
        nextTarget.strata,
      );
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
      randomizeButton.on("click", async function () {
        await randomizeSurface();
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
