let showHistogram = false; // State to track visualization mode

export function toggleVisualizationMode() {
  showHistogram = !showHistogram;
}

export function updateDistributionChart(selectedKeys, holdData) {
  const margin = { top: 20, right: 20, bottom: 40, left: 70 };

  // Check if mobile device and adjust dimensions accordingly - matching keyboard.js
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;

  let baseWidth, baseHeight;
  if (isSmallMobile) {
    baseWidth = 320;
    baseHeight = 240;
  } else if (isMobile) {
    baseWidth = 400;
    baseHeight = 280;
  } else {
    baseWidth = 480;
    baseHeight = 320;
  }

  const width = baseWidth - margin.left - margin.right;
  const height = baseHeight - margin.top - margin.bottom;

  // Clear previous chart
  d3.select("#distribution-viz").html("");

  if (!selectedKeys || selectedKeys.size === 0) {
    // Create SVG with same dimensions as when data is shown
    const svg = d3
      .select("#distribution-viz")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add centered message
    svg
      .append("text")
      .attr("class", "distribution-message")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "16px")
      .style("fill", "var(--text-secondary)")
      .text("Select keys to view distribution");

    d3.select("#typing-stats").style("display", "none");
    return;
  }

  const svg = d3
    .select("#distribution-viz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Key Hold Time Distribution");

  // Combine hold times for selected keys
  let pdHoldTimes = [];
  let controlHoldTimes = [];
  selectedKeys.forEach((key) => {
    pdHoldTimes = pdHoldTimes.concat(holdData.pd[key] || []);
    controlHoldTimes = controlHoldTimes.concat(holdData.control[key] || []);
  });

  // Update stats summary
  updateStatsSummary(pdHoldTimes, controlHoldTimes);

  // Create scales with transitions
  const x = d3
    .scaleLinear()
    .domain([0, d3.max([...pdHoldTimes, ...controlHoldTimes]) || 1000])
    .range([0, width]);

  const xAxis = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  const yAxis = svg.append("g").attr("class", "y-axis");

  // Add X axis label
  svg
    .append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Hold Time (milliseconds)");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text(showHistogram ? "Frequency" : "Density");

  if (showHistogram) {
    // Render histogram
    const x = d3
      .scaleLinear()
      .domain([0, d3.max([...pdHoldTimes, ...controlHoldTimes]) || 1000])
      .range([0, width]);

    const bins = d3.bin().domain(x.domain()).thresholds(x.ticks(20));

    const pdBins = bins(pdHoldTimes);
    const controlBins = bins(controlHoldTimes);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max([...pdBins, ...controlBins], (d) => d.length)])
      .range([height, 0]);

    svg
      .selectAll(".bar-pd")
      .data(pdBins)
      .enter()
      .append("rect")
      .attr("class", "bar-pd")
      .attr("x", (d) => x(d.x0))
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
      .attr("height", (d) => height - y(d.length))
      .attr("fill", "#ff7f7f")
      .attr("opacity", 0.5);

    svg
      .selectAll(".bar-control")
      .data(controlBins)
      .enter()
      .append("rect")
      .attr("class", "bar-control")
      .attr("x", (d) => x(d.x0))
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
      .attr("height", (d) => height - y(d.length))
      .attr("fill", "#7f7fff")
      .attr("opacity", 0.5);

    // Update axes with transitions
    xAxis.transition().duration(500).call(d3.axisBottom(x).ticks(10));

    yAxis.transition().duration(500).call(d3.axisLeft(y).ticks(5));
  } else {
    // Render KDE
    const x = d3
      .scaleLinear()
      .domain([0, d3.max([...pdHoldTimes, ...controlHoldTimes]) || 1000])
      .range([0, width]);

    const kde = kernelDensityEstimator(kernelEpanechnikov(0.02), x.ticks(100));
    const pdDensity = kde(pdHoldTimes);
    const controlDensity = kde(controlHoldTimes);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max([...pdDensity, ...controlDensity], (d) => d[1])])
      .range([height, 0]);

    svg
      .append("path")
      .datum(pdDensity)
      .attr("fill", "#ff7f7f")
      .attr("opacity", 0.5)
      .attr("stroke", "#ff0000")
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .curve(d3.curveBasis)
          .x((d) => x(d[0]))
          .y((d) => y(d[1]))
      );

    svg
      .append("path")
      .datum(controlDensity)
      .attr("fill", "#7f7fff")
      .attr("opacity", 0.5)
      .attr("stroke", "#0000ff")
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .curve(d3.curveBasis)
          .x((d) => x(d[0]))
          .y((d) => y(d[1]))
      );

    // Update axes with transitions
    xAxis.transition().duration(500).call(d3.axisBottom(x).ticks(10));

    yAxis
      .transition()
      .duration(500)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2d")));
  }

  // Add legend with transitions
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 120}, 20)`);

  const legendData = [
    { label: "PD Group", color: "#ff7f7f" },
    { label: "Control", color: "#7f7fff" },
  ];

  legend
    .selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", (d) => d.color)
    .attr("opacity", 0.7);

  legend
    .selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 20 + 12)
    .text((d) => d.label)
    .style("font-size", "12px")
    .attr("fill", "#6c757d");
}

function updateStatsSummary(pdHoldTimes, controlHoldTimes) {
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "stats-summary";

  const pdMean = d3.mean(pdHoldTimes) || 0;
  const controlMean = d3.mean(controlHoldTimes) || 0;
  const pdMedian = d3.median(pdHoldTimes) || 0;
  const controlMedian = d3.median(controlHoldTimes) || 0;

  summaryDiv.innerHTML = `
        <div class='stat-container'><h3><span class="stat-highlight">PD Group:</span class="stat-highlight"> ${pdHoldTimes.length} samples </h3>
           <p>Mean: ${pdMean.toFixed(2)}ms, Median: ${pdMedian.toFixed(2)}ms</p></div>
        <div class='stat-container'><h3><span class="stat-highlight">Control:</span class="stat-highlight"> ${controlHoldTimes.length} samples </h3>
           <p>Mean: ${controlMean.toFixed(2)}ms, Median: ${controlMedian.toFixed(2)}ms</p></div>
        <div class='stat-container'><h3><span class="stat-highlight">Difference: </span>${(((pdMean - controlMean) / controlMean) * 100).toFixed(1)}% </h3> <p>longer hold times in PD group</p></div>
    `;

  // Insert the summary before the distribution chart
  const chartDiv = document.getElementById("typing-stats");
  chartDiv.innerHTML = ""; // Clear previous content
  const titleDiv = document.createElement("div");
  titleDiv.className = "chart-title";
  titleDiv.innerHTML = "<h3>Key Hold Time Summary</h3>";
  chartDiv.appendChild(titleDiv);
  // Append the summary div to the chart container
  chartDiv.appendChild(summaryDiv);
  // Ensure the chart container is visible
  chartDiv.style.display = "block";
}

// Kernel Density Estimation Helper Functions
function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))]);
  };
}

function kernelEpanechnikov(k) {
  return function (v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}
