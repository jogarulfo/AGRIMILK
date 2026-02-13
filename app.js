const DATA_PATH = "data/ds-059341__custom_20028720_linear.csv";
const MAP_PATH = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const state = {
  reporter: "",
  flow: "",
  year: "",
  month: "",
  product: "",
  selectedCountry: "",
  regionFocus: "",
};

const MAP_ZOOM = 1.4;
const MAP_CENTER_OFFSET = [-100, 460];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EU_COUNTRIES = new Set([
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
]);

const EUROPE_EXTRA = new Set([
  "Albania",
  "Andorra",
  "Armenia",
  "Azerbaijan",
  "Belarus",
  "Bosnia and Herzegovina",
  "Iceland",
  "Kosovo",
  "Moldova",
  "Montenegro",
  "North Macedonia",
  "Norway",
  "Serbia",
  "Switzerland",
  "Ukraine",
  "United Kingdom",
]);

const AMERICAS = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Canada",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Dominican Republic",
  "Ecuador",
  "El Salvador",
  "Guatemala",
  "Honduras",
  "Jamaica",
  "Mexico",
  "Nicaragua",
  "Panama",
  "Paraguay",
  "Peru",
  "United States of America",
  "Uruguay",
  "Venezuela",
]);

const ASIA = new Set([
  "Afghanistan",
  "Armenia",
  "Azerbaijan",
  "Bahrain",
  "Bangladesh",
  "Bhutan",
  "Brunei",
  "Cambodia",
  "China",
  "Georgia",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Israel",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Lebanon",
  "Malaysia",
  "Mongolia",
  "Myanmar",
  "Nepal",
  "North Korea",
  "Oman",
  "Pakistan",
  "Palestine",
  "Philippines",
  "Qatar",
  "Saudi Arabia",
  "Singapore",
  "South Korea",
  "Sri Lanka",
  "Syria",
  "Taiwan",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "Uzbekistan",
  "Vietnam",
]);

const COUNTRY_ALIASES = new Map([
  ["United States", "United States of America"],
  ["Russian Federation", "Russia"],
  ["Czech Republic", "Czechia"],
  ["United Kingdom", "United Kingdom"],
]);

const formatNumber = d3.format(",.0f");
const formatValue = d3.format(",.2f");
const parseMonth = d3.timeParse("%Y-%m");
const formatMonth = d3.timeFormat("%Y-%m");

const filtersEl = d3.select("#filters");
const productLabelEl = d3.select("#productLabel");
const mapLabelEl = d3.select("#mapLabel");
const countryLabelEl = d3.select("#countryLabel");
const tooltipEl = d3.select("#tooltip");

const charts = {
  regionPie: d3.select("#regionPie"),
  euPie: d3.select("#euPie"),
  productLine: d3.select("#productLine"),
  map: d3.select("#map"),
  countryPie: d3.select("#countryPie"),
  countryLine: d3.select("#countryLine"),
  mapLegend: d3.select("#mapLegend"),
};

const normalizeCountry = (name) => {
  if (!name) return "";
  return COUNTRY_ALIASES.get(name) || name;
};

const regionForCountry = (name) => {
  const country = normalizeCountry(name);
  if (EU_COUNTRIES.has(country)) return "EU";
  if (AMERICAS.has(country)) return "America";
  if (ASIA.has(country)) return "Asia";
  return "Other";
};

const isEurope = (name) => {
  const country = normalizeCountry(name);
  return EU_COUNTRIES.has(country) || EUROPE_EXTRA.has(country);
};

const pruneFranceOverseas = (feature) => {
  if (normalizeCountry(feature.properties.name) !== "France") return feature;

  const keepPolygon = (polygon) => {
    const centroid = d3.geoCentroid({
      type: "Feature",
      properties: feature.properties,
      geometry: { type: "Polygon", coordinates: polygon },
    });
    const [lon, lat] = centroid;
    return lat > 35 && lon > -10 && lon < 30;
  };

  if (feature.geometry.type === "Polygon") {
    return keepPolygon(feature.geometry.coordinates) ? feature : null;
  }

  if (feature.geometry.type === "MultiPolygon") {
    const kept = feature.geometry.coordinates.filter(keepPolygon);
    if (!kept.length) return feature;
    return {
      ...feature,
      geometry: { ...feature.geometry, coordinates: kept },
    };
  }

  return feature;
};

const productCategory = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("cheese")) return "Fromage";
  if (lower.includes("yogurt") || lower.includes("yoghurt") || lower.includes("curdled")) {
    return "Yaourt";
  }
  if (lower.includes("milk") || lower.includes("cream")) return "Lait";
  return "Other";
};

const parseRow = (d) => {
  const date = parseMonth(d.TIME_PERIOD);
  return {
    reporter: d.reporter,
    partner: normalizeCountry(d.partner),
    product: d.product,
    flow: d.flow,
    indicator: d.indicators,
    date,
    year: date ? String(date.getFullYear()) : "",
    month: date ? String(date.getMonth() + 1).padStart(2, "0") : "",
    value: d.OBS_VALUE === "" ? 0 : +d.OBS_VALUE,
  };
};

const createSelect = (label, options, onChange) => {
  const wrapper = filtersEl.append("label").text(label);
  const select = wrapper.append("select");
  select
    .selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .attr("value", (d) => d.value)
    .text((d) => d.label);
  select.on("change", (event) => onChange(event.target.value));
  return select;
};

const updateSelectValue = (select, value) => {
  select.property("value", value);
};

const buildFilters = (data, products) => {
  const reporters = Array.from(new Set(data.map((d) => d.reporter))).sort(d3.ascending);
  const flows = Array.from(new Set(data.map((d) => d.flow))).sort(d3.ascending);
  const years = Array.from(new Set(data.map((d) => d.year))).sort(d3.ascending);
  const months = Array.from(new Set(data.map((d) => d.month))).sort(d3.ascending);

  state.reporter = state.reporter || reporters[0] || "";
  state.flow = state.flow || flows[0] || "";
  state.year = state.year || years[years.length - 1] || "";
  state.month = state.month || "";
  state.product = state.product || products[0] || "";

  filtersEl.html("");
  const reporterSelect = createSelect(
    "Reporter",
    reporters.map((d) => ({ label: d, value: d })),
    (value) => {
      state.reporter = value;
      render(data);
    }
  );

  const flowSelect = createSelect(
    "Flow",
    flows.map((d) => ({ label: d, value: d })),
    (value) => {
      state.flow = value;
      render(data);
    }
  );

  const yearSelect = createSelect(
    "Year",
    years.map((d) => ({ label: d, value: d })),
    (value) => {
      state.year = value;
      render(data);
    }
  );

  const monthOptions = [{ label: "All", value: "" }].concat(
    months.map((d) => ({ label: MONTHS[Number(d) - 1], value: d }))
  );
  const monthSelect = createSelect("Month", monthOptions, (value) => {
    state.month = value;
    render(data);
  });

  const productSelect = createSelect(
    "Product",
    products.map((d) => ({ label: d, value: d })),
    (value) => {
      state.product = value;
      render(data);
    }
  );

  updateSelectValue(reporterSelect, state.reporter);
  updateSelectValue(flowSelect, state.flow);
  updateSelectValue(yearSelect, state.year);
  updateSelectValue(monthSelect, state.month);
  updateSelectValue(productSelect, state.product);
};



const baseFilter = (data) => {
  return data.filter((d) => {
    if (state.reporter && d.reporter !== state.reporter) return false;
    if (state.flow && d.flow !== state.flow) return false;
    return true;
  });
};

const filterByDate = (data) => {
  return data.filter((d) => {
    if (state.year && d.year !== state.year) return false;
    if (state.month && d.month !== state.month) return false;
    return true;
  });
};

const drawPie = (container, data, colors, onSliceClick) => {
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const radius = Math.min(width, height) / 2 - 10;

  container.selectAll("*").remove();
  const svg = container.append("svg").attr("width", width).attr("height", height);
  const group = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

  if (!data.length) {
    group.append("text").attr("text-anchor", "middle").attr("fill", "#6b5f57").text("No data");
    return;
  }

  const color = d3.scaleOrdinal().domain(data.map((d) => d.label)).range(colors);
  const pie = d3.pie().value((d) => d.value);
  const arc = d3.arc().innerRadius(radius * 0.3).outerRadius(radius);

  const arcs = group
    .selectAll("path")
    .data(pie(data))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => color(d.data.label))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.2)
    .style("cursor", onSliceClick ? "pointer" : "default");

  if (onSliceClick) {
    arcs.on("click", (event, d) => onSliceClick(d.data.label));
  }

  group
    .selectAll("text")
    .data(pie(data))
    .enter()
    .append("text")
    .attr("transform", (d) => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", 11)
    .attr("fill", "#1f1a16")
    .text((d) => (d.data.value ? d.data.label : ""));
};

const drawLine = (container, series, colors) => {
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const margin = { top: 12, right: 18, bottom: 28, left: 48 };

  container.selectAll("*").remove();
  const svg = container.append("svg").attr("width", width).attr("height", height);
  const plot = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const allPoints = series.flatMap((s) => s.values);
  if (!allPoints.length) {
    plot.append("text").attr("x", innerWidth / 2).attr("y", innerHeight / 2).attr("text-anchor", "middle").attr("fill", "#6b5f57").text("No data");
    return;
  }

  const x = d3.scaleTime().domain(d3.extent(allPoints, (d) => d.date)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(allPoints, (d) => d.value) || 0]).nice().range([innerHeight, 0]);

  plot.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(6));
  plot.append("g").call(d3.axisLeft(y).ticks(5));

  const color = d3.scaleOrdinal().domain(series.map((d) => d.name)).range(colors);
  const line = d3.line().x((d) => x(d.date)).y((d) => y(d.value));

  plot
    .selectAll("path.line")
    .data(series)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", (d) => color(d.name))
    .attr("stroke-width", 2)
    .attr("d", (d) => line(d.values));
};

const drawMap = (container, features, values, flows, reporter) => {
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  container.selectAll("*").remove();

  const svg = container.append("svg").attr("width", width).attr("height", height);
  const europe = { type: "FeatureCollection", features };
  const projection = d3.geoMercator().fitSize([width, height], europe);
  projection
    .scale(projection.scale() * MAP_ZOOM)
    .translate([width / 2 + MAP_CENTER_OFFSET[0], height / 2 + MAP_CENTER_OFFSET[1]]);
  const path = d3.geoPath(projection);

  const maxValue = d3.max(Object.values(values)) || 0;
  const minValue = d3.min(Object.values(values).filter((v) => v > 0)) || 0;
  
  const color = d3
    .scaleSequentialLog()
    .domain([minValue || 0.1, maxValue || 1])
    .interpolator(
      d3.interpolateRgbBasis([
        "#f7f3ee",
        "#fcebd9",
        "#fdd6a8",
        "#fcb97d",
        "#fb8c52",
        "#f36728",
        "#e36414",
        "#c54f0f",
        "#a63c0a",
        "#872906",
        "#5c1a04",
      ])
    );

  const centroids = new Map(
    features.map((feature) => {
      const name = normalizeCountry(feature.properties.name);
      return [name, path.centroid(feature)];
    })
  );

  const clipId = "map-clip";
  const arrowId = "flow-arrow";
  const defs = svg.append("defs");
  defs
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", width)
    .attr("height", height);
  defs
    .append("marker")
    .attr("id", arrowId)
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 9)
    .attr("refY", 5)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z")
    .attr("fill", "#1f1a16");

  const mapLayer = svg.append("g").attr("clip-path", `url(#${clipId})`);

  mapLayer
    .selectAll("path")
    .data(features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", (d) => color(values[normalizeCountry(d.properties.name)] || 0))
    .style("cursor", "pointer")
    .on("mousemove", (event, d) => {
      const name = normalizeCountry(d.properties.name);
      const value = values[name] || 0;
      tooltipEl
        .style("opacity", 1)
        .style("left", `${event.clientX + 12}px`)
        .style("top", `${event.clientY + 12}px`)
        .text(`${name}: ${formatValue(value)}`);
    })
    .on("mouseleave", () => tooltipEl.style("opacity", 0))
    .on("click", (event, d) => {
      state.selectedCountry = normalizeCountry(d.properties.name);
      render();
    });

  const reporterPoint = reporter ? centroids.get(normalizeCountry(reporter)) : null;
  const flowMax = d3.max(flows, (d) => d.value) || 0;
  const strokeScale = d3.scaleSqrt().domain([0, flowMax || 1]).range([0.8, 4.6]);

  const flowLines = flows
    .map((flow) => {
      const source = centroids.get(flow.source);
      const target = centroids.get(flow.target);
      if (!source || !target || !reporterPoint) return null;
      return { ...flow, sourcePoint: source, targetPoint: target };
    })
    .filter(Boolean);

  mapLayer
    .append("g")
    .attr("class", "flow-lines")
    .selectAll("path")
    .data(flowLines)
    .enter()
    .append("path")
    .attr("d", (d) => {
      const [x1, y1] = d.sourcePoint;
      const [x2, y2] = d.targetPoint;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy) || 1;
      const offset = d.flow === "IMPORT" ? -12 : 12;
      const nx = (-dy / length) * offset;
      const ny = (dx / length) * offset;
      const mx = (x1 + x2) / 2 + nx;
      const my = (y1 + y2) / 2 + ny;
      return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
    })
    .attr("fill", "none")
    .attr("stroke", "#1f1a16")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", (d) => strokeScale(d.value))
    .attr("marker-end", `url(#${arrowId})`)
    .style("pointer-events", "stroke")
    .on("mousemove", (event, d) => {
      const direction = d.flow === "IMPORT" ? `Import from ${d.partner}` : `Export to ${d.partner}`;
      tooltipEl
        .style("opacity", 1)
        .style("left", `${event.clientX + 12}px`)
        .style("top", `${event.clientY + 12}px`)
        .text(`${direction}: ${formatValue(d.value)}`);
    })
    .on("mouseleave", () => tooltipEl.style("opacity", 0));

  // Gradient legend
  charts.mapLegend.html("");
  
  const legendWidth = 280;
  const legendHeight = 12;
  const legendSvg = charts.mapLegend
    .append("svg")
    .attr("width", legendWidth + 60)
    .attr("height", legendHeight + 30)
    .style("display", "block");

  const gradientId = "map-gradient";
  const legendDefs = legendSvg.append("defs");
  const gradient = legendDefs
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "100%");

  const colorStops = [
    { offset: "0%", color: "#f7f3ee" },
    { offset: "10%", color: "#fcebd9" },
    { offset: "20%", color: "#fdd6a8" },
    { offset: "30%", color: "#fcb97d" },
    { offset: "40%", color: "#fb8c52" },
    { offset: "50%", color: "#f36728" },
    { offset: "60%", color: "#e36414" },
    { offset: "70%", color: "#c54f0f" },
    { offset: "80%", color: "#a63c0a" },
    { offset: "90%", color: "#872906" },
    { offset: "100%", color: "#5c1a04" },
  ];

  colorStops.forEach((stop) => {
    gradient.append("stop").attr("offset", stop.offset).attr("stop-color", stop.color);
  });

  legendSvg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", `url(#${gradientId})`)
    .style("stroke", "#e7dfd7")
    .style("stroke-width", 1);

  legendSvg
    .append("text")
    .attr("x", 0)
    .attr("y", legendHeight + 18)
    .attr("font-size", 11)
    .attr("fill", "#6b5f57")
    .text(minValue > 0 ? formatValue(minValue) : "0");

  legendSvg
    .append("text")
    .attr("x", legendWidth)
    .attr("y", legendHeight + 18)
    .attr("text-anchor", "end")
    .attr("font-size", 11)
    .attr("fill", "#6b5f57")
    .text(formatValue(maxValue));

  charts.mapLegend
    .append("span")
    .style("margin-top", "8px")
    .style("display", "block")
    .style("font-size", "11px")
    .style("color", "#6b5f57")
    .text("Logarithmic scale • Arrows show import/export direction");
};

const renderProductView = (data) => {
  const productData = data.filter((d) => d.product === state.product);
  const yearData = productData.filter((d) => d.year === state.year);

  const regionTotals = d3.rollups(
    yearData,
    (v) => d3.sum(v, (d) => d.value),
    (d) => regionForCountry(d.partner)
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => d3.descending(a.value, b.value));

  drawPie(
    charts.regionPie,
    regionTotals,
    ["#0f4c5c", "#e36414", "#3f6b3f", "#b9a89a"],
    (label) => {
      state.regionFocus = label === "EU" ? "EU" : "";
      render();
    }
  );

  const euTotals = state.regionFocus
    ? d3.rollups(
        yearData.filter((d) => regionForCountry(d.partner) === "EU"),
        (v) => d3.sum(v, (d) => d.value),
        (d) => d.partner
      )
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => d3.descending(a.value, b.value))
        .slice(0, 8)
    : [];

  drawPie(charts.euPie, euTotals, ["#3f6b3f", "#8bbd8b", "#d0e4d0", "#f1e7db"]);

  const monthly = d3.rollups(
    productData,
    (v) => {
      const total = d3.sum(v, (d) => d.value);
      const america = d3.sum(v.filter((d) => regionForCountry(d.partner) === "America"), (d) => d.value);
      const asia = d3.sum(v.filter((d) => regionForCountry(d.partner) === "Asia"), (d) => d.value);
      const eu = d3.sum(v.filter((d) => regionForCountry(d.partner) === "EU"), (d) => d.value);
      return { total, america, asia, eu };
    },
    (d) => d.date
  )
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => d3.ascending(a.date, b.date));

  const series = [
    { name: "Total", values: monthly.map((d) => ({ date: d.date, value: d.total })) },
    { name: "America", values: monthly.map((d) => ({ date: d.date, value: d.america })) },
    { name: "EU", values: monthly.map((d) => ({ date: d.date, value: d.eu })) },
    { name: "Asia", values: monthly.map((d) => ({ date: d.date, value: d.asia })) },
  ];

  drawLine(charts.productLine, series, ["#1f1a16", "#e36414", "#3f6b3f", "#0f4c5c"]);
};

const renderMapView = (filteredData, fullData, europeFeatures) => {
  const filtered = filterByDate(filteredData).filter((d) => d.product === state.product);
  const totals = d3.rollups(
    filtered,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.partner
  );
  const values = Object.fromEntries(totals);

  const flowBase = fullData.filter((d) => (state.reporter ? d.reporter === state.reporter : true));
  const flowFiltered = filterByDate(flowBase).filter((d) => d.product === state.product);
  const flowTotals = d3.rollups(
    flowFiltered,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.flow,
    (d) => d.partner
  );

  const flows = [];
  flowTotals.forEach(([flow, partners]) => {
    partners.forEach(([partner, value]) => {
      const normalizedPartner = normalizeCountry(partner);
      if (!isEurope(normalizedPartner)) return;
      const source = flow === "EXPORT" ? state.reporter : normalizedPartner;
      const target = flow === "EXPORT" ? normalizedPartner : state.reporter;
      if (!source || !target) return;
      flows.push({
        flow,
        partner: normalizedPartner,
        source: normalizeCountry(source),
        target: normalizeCountry(target),
        value,
      });
    });
  });

  drawMap(charts.map, europeFeatures, values, flows, state.reporter);
};

const renderCountryDetail = (data) => {
  if (!state.selectedCountry) {
    charts.countryPie.selectAll("*").remove();
    charts.countryLine.selectAll("*").remove();
    return;
  }

  const countryData = data.filter((d) => d.partner === state.selectedCountry);
  const yearData = countryData.filter((d) => d.year === state.year);

  const productTotals = d3.rollups(
    yearData,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.product
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => d3.descending(a.value, b.value));

  const topProducts = productTotals.slice(0, 6);
  const otherValue = d3.sum(productTotals.slice(6), (d) => d.value);
  if (otherValue) topProducts.push({ label: "Other", value: otherValue });

  drawPie(charts.countryPie, topProducts, ["#0f4c5c", "#e36414", "#3f6b3f", "#b9a89a", "#7e6f65", "#c7b7a3"]);

  const totalByDate = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.date
  );
  const totalMap = new Map(totalByDate);

  const countryByDate = d3.rollups(
    countryData,
    (v) => {
      const total = d3.sum(v, (d) => d.value);
      const lait = d3.sum(v.filter((d) => productCategory(d.product) === "Lait"), (d) => d.value);
      const fromage = d3.sum(v.filter((d) => productCategory(d.product) === "Fromage"), (d) => d.value);
      const yaourt = d3.sum(v.filter((d) => productCategory(d.product) === "Yaourt"), (d) => d.value);
      return { total, lait, fromage, yaourt };
    },
    (d) => d.date
  )
    .map(([date, values]) => {
      const all = totalMap.get(date) || 0;
      return {
        date,
        total: all ? (values.total / all) * 100 : 0,
        lait: all ? (values.lait / all) * 100 : 0,
        fromage: all ? (values.fromage / all) * 100 : 0,
        yaourt: all ? (values.yaourt / all) * 100 : 0,
      };
    })
    .sort((a, b) => d3.ascending(a.date, b.date));

  const series = [
    { name: "Total", values: countryByDate.map((d) => ({ date: d.date, value: d.total })) },
    { name: "Lait", values: countryByDate.map((d) => ({ date: d.date, value: d.lait })) },
    { name: "Fromage", values: countryByDate.map((d) => ({ date: d.date, value: d.fromage })) },
    { name: "Yaourt", values: countryByDate.map((d) => ({ date: d.date, value: d.yaourt })) },
  ];

  drawLine(charts.countryLine, series, ["#1f1a16", "#0f4c5c", "#e36414", "#3f6b3f"]);
};

let cachedData = [];
let cachedEurope = [];

const render = (data = cachedData) => {
  const base = baseFilter(data);
  productLabelEl.text(state.product || "No product");
  mapLabelEl.text(`${state.year || ""} ${state.month ? MONTHS[Number(state.month) - 1] : "All"}`);
  countryLabelEl.text(state.selectedCountry || "Select a country");

  renderProductView(base);
  renderMapView(base, data, cachedEurope);
  renderCountryDetail(base);
};

const onResize = () => {
  window.addEventListener("resize", () => render());
};

const init = (data, europeFeatures) => {
  cachedData = data;
  cachedEurope = europeFeatures;

  const products = Array.from(new Set(data.map((d) => d.product))).sort(d3.ascending);

  buildFilters(data, products);

  render();
  onResize();
};

Promise.all([d3.csv(DATA_PATH, parseRow), d3.json(MAP_PATH)]).then(([data, world]) => {
  const allCountries = topojson.feature(world, world.objects.countries).features;
  const europe = allCountries
    .filter((d) => isEurope(d.properties.name))
    .map((feature) => pruneFranceOverseas(feature))
    .filter(Boolean);
  init(data, europe);
});
