const FILE_PATH = "data/ds-059341__custom_20028720_linear.csv";

const state = {
  reporter: "All",
  partner: "All",
  flow: "All",
  indicators: "All",
  productQuery: "",
  start: "",
  end: "",
};

const formatNumber = d3.format(",.2f");
const formatCount = d3.format(",");
const formatMonth = d3.timeFormat("%Y-%m");

const chart = d3.select("#chart");
const rows = d3.select("#rows");
const stats = d3.select("#stats");
const controls = d3.select("#controls");

const parseRow = (d) => {
  const date = d3.timeParse("%Y-%m")(d.TIME_PERIOD);
  const value = d.OBS_VALUE === "" ? null : +d.OBS_VALUE;
  return {
    dataflow: d.DATAFLOW,
    lastUpdate: d["LAST UPDATE"],
    freq: d.freq,
    reporter: d.reporter,
    partner: d.partner,
    product: d.product,
    flow: d.flow,
    indicators: d.indicators,
    timePeriod: d.TIME_PERIOD,
    date,
    value,
  };
};

const uniqueSorted = (data, key) => {
  return Array.from(new Set(data.map((d) => d[key]).filter(Boolean))).sort(d3.ascending);
};

const buildControls = (data) => {
  const reporters = uniqueSorted(data, "reporter");
  const partners = uniqueSorted(data, "partner");
  const flows = uniqueSorted(data, "flow");
  const indicators = uniqueSorted(data, "indicators");

  const minDate = d3.min(data, (d) => d.date);
  const maxDate = d3.max(data, (d) => d.date);

  state.start = minDate ? formatMonth(minDate) : "";
  state.end = maxDate ? formatMonth(maxDate) : "";

  controls.html("");

  controls.append("label").text("Reporter").append("select")
    .call(buildOptions, reporters)
    .on("change", (event) => {
      state.reporter = event.target.value;
      render(data);
    });

  controls.append("label").text("Partner").append("select")
    .call(buildOptions, partners)
    .on("change", (event) => {
      state.partner = event.target.value;
      render(data);
    });

  controls.append("label").text("Flow").append("select")
    .call(buildOptions, flows)
    .on("change", (event) => {
      state.flow = event.target.value;
      render(data);
    });

  controls.append("label").text("Indicator").append("select")
    .call(buildOptions, indicators)
    .on("change", (event) => {
      state.indicators = event.target.value;
      render(data);
    });

  controls.append("label").text("Product search")
    .append("input")
    .attr("type", "search")
    .attr("placeholder", "Type to filter product")
    .on("input", (event) => {
      state.productQuery = event.target.value.trim().toLowerCase();
      render(data);
    });

  controls.append("label").text("Start month")
    .append("input")
    .attr("type", "month")
    .attr("value", state.start)
    .on("change", (event) => {
      state.start = event.target.value;
      render(data);
    });

  controls.append("label").text("End month")
    .append("input")
    .attr("type", "month")
    .attr("value", state.end)
    .on("change", (event) => {
      state.end = event.target.value;
      render(data);
    });
};

const buildOptions = (selection, options) => {
  selection.append("option").attr("value", "All").text("All");
  selection
    .selectAll("option.value")
    .data(options)
    .enter()
    .append("option")
    .attr("class", "value")
    .attr("value", (d) => d)
    .text((d) => d);
};

const filterData = (data) => {
  const startDate = state.start ? d3.timeParse("%Y-%m")(state.start) : null;
  const endDate = state.end ? d3.timeParse("%Y-%m")(state.end) : null;

  return data.filter((d) => {
    const product = d.product || "";
    if (state.reporter !== "All" && d.reporter !== state.reporter) return false;
    if (state.partner !== "All" && d.partner !== state.partner) return false;
    if (state.flow !== "All" && d.flow !== state.flow) return false;
    if (state.indicators !== "All" && d.indicators !== state.indicators) return false;
    if (state.productQuery && !product.toLowerCase().includes(state.productQuery)) return false;
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    return true;
  });
};

const renderStats = (data) => {
  const totalRows = data.length;
  const totalValue = d3.sum(data, (d) => d.value || 0);
  const reporters = new Set(data.map((d) => d.reporter)).size;
  const partners = new Set(data.map((d) => d.partner)).size;

  const items = [
    { label: "Rows", value: formatCount(totalRows) },
    { label: "Total value", value: formatNumber(totalValue) },
    { label: "Reporters", value: formatCount(reporters) },
    { label: "Partners", value: formatCount(partners) },
  ];

  const cards = stats.selectAll(".stat").data(items, (d) => d.label);
  const enter = cards.enter().append("div").attr("class", "stat");
  enter.append("div").attr("class", "label");
  enter.append("div").attr("class", "value");

  const merged = enter.merge(cards);
  merged.select(".label").text((d) => d.label);
  merged.select(".value").text((d) => d.value);

  cards.exit().remove();
};

const renderTable = (data) => {
  const sample = data.slice(0, 50);
  const rowsSel = rows.selectAll("tr").data(sample, (d, i) => `${d.reporter}-${d.partner}-${d.timePeriod}-${i}`);
  rowsSel.exit().remove();

  const enter = rowsSel.enter().append("tr");
  enter.append("td");
  enter.append("td");
  enter.append("td");
  enter.append("td");
  enter.append("td");
  enter.append("td");
  enter.append("td");

  const merged = enter.merge(rowsSel);
  merged.select("td:nth-child(1)").text((d) => d.reporter);
  merged.select("td:nth-child(2)").text((d) => d.partner);
  merged.select("td:nth-child(3)").text((d) => d.product);
  merged.select("td:nth-child(4)").text((d) => d.flow);
  merged.select("td:nth-child(5)").text((d) => d.indicators);
  merged.select("td:nth-child(6)").text((d) => d.timePeriod);
  merged.select("td:nth-child(7)").text((d) => (d.value == null ? "" : formatNumber(d.value)));
};

const renderChart = (data) => {
  const margin = { top: 20, right: 18, bottom: 36, left: 56 };
  const width = chart.node().clientWidth - margin.left - margin.right;
  const height = chart.node().clientHeight - margin.top - margin.bottom;

  chart.selectAll("*").remove();
  const svg = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const series = Array.from(
    d3.rollup(
      data.filter((d) => d.date && d.value != null),
      (v) => d3.sum(v, (d) => d.value),
      (d) => d.date
    )
  )
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => d3.ascending(a.date, b.date));

  if (series.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#6b5f57")
      .text("No data for current filters");
    return;
  }

  const x = d3.scaleTime()
    .domain(d3.extent(series, (d) => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(series, (d) => d.value) || 0])
    .nice()
    .range([height, 0]);

  const xAxis = d3.axisBottom(x).ticks(Math.min(series.length, 8));
  const yAxis = d3.axisLeft(y).ticks(6);

  svg.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
  svg.append("g").call(yAxis);

  svg
    .append("path")
    .datum(series)
    .attr("fill", "none")
    .attr("stroke", "#0f4c5c")
    .attr("stroke-width", 2.5)
    .attr("d", d3.line().x((d) => x(d.date)).y((d) => y(d.value)))
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round");

  svg
    .selectAll("circle")
    .data(series)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.value))
    .attr("r", 3)
    .attr("fill", "#e36414");
};

const render = (data) => {
  const filtered = filterData(data);
  renderStats(filtered);
  renderChart(filtered);
  renderTable(filtered);
};

const onResize = (data) => {
  window.addEventListener("resize", () => render(data));
};

d3.csv(FILE_PATH, parseRow).then((data) => {
  console.log("CSV loaded", {
    rows: data.length,
    columns: Object.keys(data[0] || {}),
    sample: data.slice(0, 5),
  });
  buildControls(data);
  render(data);
  onResize(data);
});
