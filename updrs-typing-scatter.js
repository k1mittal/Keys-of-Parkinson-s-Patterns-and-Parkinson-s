// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - Starting scatter plot initialization");

  const scatterMargin = { top: 20, right: 30, bottom: 60, left: 80 };
  const scatterWidth = 700 - scatterMargin.left - scatterMargin.right;
  const scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

  // Global variables for scales and data
  let xScale, yScale, data;

  // Append SVG to the correct container
  const svg = d3
    .select("#updrs-typing-scatter")
    .append("svg")
    .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // Create a tooltip div that is hidden by default
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip")
    .style("position", "absolute")
    .style("background", "#222")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-size", "14px")
    .style("opacity", 0);

  // Brush event handler
  function brushed(event) {
    const selection = event.selection;

    console.log("Brush event:", event.type, "Selection:", selection); // Debug log
    console.log("Data available:", data ? data.length : "No data"); // Debug log

    // Only proceed if we have data
    if (!data || data.length === 0) {
      console.warn("No data available for brush interaction");
      return;
    }

    // Update circle styling based on selection - be more specific about which circles
    svg
      .selectAll("circle.data-point")
      .classed("selected", (d) => isPointSelected(selection, d))
      .classed(
        "unselected",
        (d) => selection && !isPointSelected(selection, d)
      );

    // Update the selection information panel
    renderSelectionCount(selection);
    renderSelectionStats(selection);
  }

  // Check if a point is within the brush selection
  function isPointSelected(selection, point) {
    if (!selection || !point) {
      return false;
    }

    // Add safety check for point properties
    if (
      typeof point.UPDRS === "undefined" ||
      typeof point.TypingSpeed === "undefined"
    ) {
      console.warn("Point missing required properties:", point);
      return false;
    }

    const x = xScale(point.UPDRS);
    const y = yScale(point.TypingSpeed);

    const isSelected =
      x >= selection[0][0] &&
      x <= selection[1][0] &&
      y >= selection[0][1] &&
      y <= selection[1][1];

    return isSelected;
  }

  // Render the count of selected points
  function renderSelectionCount(selection) {
    const selectedPoints = selection
      ? data.filter((d) => isPointSelected(selection, d))
      : [];

    console.log("Selected points count:", selectedPoints.length); // Debug log

    const countElement = document.querySelector("#selection-count");
    if (countElement) {
      countElement.textContent = `${
        selectedPoints.length || "No"
      } patients selected`;
    }

    return selectedPoints;
  }

  // Render detailed statistics about selected points
  function renderSelectionStats(selection) {
    const selectedPoints = selection
      ? data.filter((d) => isPointSelected(selection, d))
      : [];

    console.log("Rendering stats for", selectedPoints.length, "points"); // Debug log

    const container = document.getElementById("selection-stats");

    if (selectedPoints.length === 0) {
      if (container) {
        container.innerHTML = "";
      }
      return;
    }

    // Calculate statistics
    const pdPoints = selectedPoints.filter((d) => d.Group === "PD");
    const controlPoints = selectedPoints.filter((d) => d.Group === "Control");

    const avgUPDRS = d3.mean(selectedPoints, (d) => d.UPDRS);
    const avgTypingSpeed = d3.mean(selectedPoints, (d) => d.TypingSpeed);
    const avgDuration = d3.mean(selectedPoints, (d) => d.Duration);
    const avgDelay = d3.mean(selectedPoints, (d) => d.Delay);

    const pdAvgUPDRS =
      pdPoints.length > 0 ? d3.mean(pdPoints, (d) => d.UPDRS) : 0;
    const controlAvgUPDRS =
      controlPoints.length > 0 ? d3.mean(controlPoints, (d) => d.UPDRS) : 0;
    const pdAvgSpeed =
      pdPoints.length > 0 ? d3.mean(pdPoints, (d) => d.TypingSpeed) : 0;
    const controlAvgSpeed =
      controlPoints.length > 0
        ? d3.mean(controlPoints, (d) => d.TypingSpeed)
        : 0;

    // Update DOM with statistics
    if (container) {
      const htmlContent = `
      <div class="stat-group">
        <h5>Group Breakdown</h5>
        <div class="group-breakdown">
          <div class="group-item pd">
            <div><strong>${pdPoints.length}</strong></div>
            <div>PD Patients</div>
          </div>
          <div class="group-item control">
            <div><strong>${controlPoints.length}</strong></div>
            <div>Control</div>
          </div>
        </div>
      </div>
      

      ${
        pdPoints.length > 0 && controlPoints.length > 0
          ? `
      <div class="stat-group">
        <h5>Group Averages Comparison</h5>
        <div class="group-averages-grid">
          <div class="group-avg-column pd-column">
            <h6>PD Patients (${pdPoints.length})</h6>
            <div class="avg-item">
              <span class="avg-label">UPDRS Score:</span>
              <span class="avg-value">${pdAvgUPDRS.toFixed(1)}</span>
            </div>
            <div class="avg-item">
              <span class="avg-label">Typing Speed:</span>
              <span class="avg-value">${pdAvgSpeed.toFixed(1)} WPM</span>
            </div>
            <div class="avg-item">
              <span class="avg-label">Key Duration:</span>
              <span class="avg-value">${(pdPoints.length > 0 ? d3.mean(pdPoints, (d) => d.Duration) * 1000 : 0).toFixed(0)} ms</span>
            </div>
            <div class="avg-item">
              <span class="avg-label">Inter-key Delay:</span>
              <span class="avg-value">${(pdPoints.length > 0 ? d3.mean(pdPoints, (d) => d.Delay) * 1000 : 0).toFixed(0)} ms</span>
            </div>
          </div>
          <div class="group-avg-column control-column">
            <h6>Control Group (${controlPoints.length})</h6>
            <div class="avg-item">
              <span class="avg-label">UPDRS Score:</span>
              <span class="avg-value">${controlAvgUPDRS.toFixed(1)}</span>
            </div>
            <div class="avg-item">
              <span class="avg-label">Typing Speed:</span>
              <span class="avg-value">${controlAvgSpeed.toFixed(1)} WPM</span>
            </div>
            <div class="avg-item">
              <span class="avg-label">Key Duration:</span>
              <span class="avg-value">${(controlPoints.length > 0 ? d3.mean(controlPoints, (d) => d.Duration) * 1000 : 0).toFixed(0)} ms</span>
            </div>
            <div class="avg-item">
              <span class="avg-label">Inter-key Delay:</span>
              <span class="avg-value">${(controlPoints.length > 0 ? d3.mean(controlPoints, (d) => d.Delay) * 1000 : 0).toFixed(0)} ms</span>
            </div>
          </div>
        </div>
      </div>
      `
          : ""
      }
    `;

      container.innerHTML = htmlContent;
      console.log("Stats updated successfully"); // Debug log
    } else {
      console.error("Stats container not found!"); // Debug log
    }
  }

  // Load and process the data
  d3.csv("data/clean_subject_data.csv").then((rawData) => {
    // Debug: Check if DOM elements exist
    console.log("DOM Elements Check:");
    console.log(
      "- selection-count:",
      document.querySelector("#selection-count")
    );
    console.log(
      "- selection-stats:",
      document.querySelector("#selection-stats")
    );
    console.log(
      "- selection-panel:",
      document.querySelector("#selection-panel")
    );
    // Convert and filter out NaN/missing values
    data = rawData
      .map((d) => ({
        pID: d.pID,
        UPDRS: +d.updrs108,
        TypingSpeed: +d.typingSpeed,
        Duration: +d.duration,
        Delay: +d.delay,
        KeystrokeCount: +d.keystroke_count,
        Group: d.has_parkinsons === "True" ? "PD" : "Control",
      }))
      .filter((d) => !isNaN(d.UPDRS) && !isNaN(d.TypingSpeed));

    // Set the scales
    xScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.UPDRS) * 1.05])
      .range([0, scatterWidth]);

    yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.TypingSpeed) * 1.05])
      .range([scatterHeight, 0]);

    // Add grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${scatterHeight})`)
      .call(d3.axisBottom(xScale).tickSize(-scatterHeight).tickFormat(""));

    svg
      .append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).tickSize(-scatterWidth).tickFormat(""));

    // X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${scatterHeight})`)
      .call(d3.axisBottom(xScale))
      .style("font-size", "12px");

    // X axis label
    svg
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", scatterWidth / 2)
      .attr("y", scatterHeight + 45)
      .attr("font-size", "14px")
      .attr("font-weight", "600")
      .style("fill", "var(--text-primary)")
      .text("UPDRS-III Motor Score");

    // Y axis
    svg.append("g").call(d3.axisLeft(yScale)).style("font-size", "12px");

    // Y axis label
    svg
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90)`)
      .attr("x", -scatterHeight / 2)
      .attr("y", -55)
      .attr("font-size", "14px")
      .attr("font-weight", "600")
      .style("fill", "var(--text-primary)")
      .text("Typing Speed (WPM)");

    // Add scatter plot points FIRST
    const circles = svg
      .selectAll("circle.data-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "data-point") // Add class for specific selection
      .attr("cx", (d) => xScale(d.UPDRS))
      .attr("cy", (d) => yScale(d.TypingSpeed))
      .attr("r", 6)
      .attr("fill", (d) => (d.Group === "PD" ? "#dc2626" : "#059669"))
      .attr("fill-opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(200).attr("r", 8);

        tooltip.transition().duration(200).style("opacity", 0.95);

        tooltip
          .html(
            `<strong>Patient ID:</strong> ${d.pID}<br/>
           <strong>Group:</strong> ${d.Group}<br/>
           <strong>UPDRS:</strong> ${d.UPDRS}<br/>
           <strong>Typing Speed:</strong> ${d.TypingSpeed.toFixed(1)} WPM<br/>
           <strong>Key Duration:</strong> ${(d.Duration * 1000).toFixed(0)} ms<br/>
           <strong>Inter-key Delay:</strong> ${(d.Delay * 1000).toFixed(0)} ms`
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).transition().duration(200).attr("r", 6);
        tooltip.transition().duration(200).style("opacity", 0);
      });

    console.log("Circles created, data bound. Sample data:", data[0]); // Debug log

    // Create brush AFTER adding circles
    svg.call(d3.brush().on("start brush end", brushed));

    // Raise dots above brush overlay to maintain hover functionality
    svg.selectAll("circle.data-point, .overlay ~ *").raise();

    // Legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${scatterWidth - 120}, 10)`);

    // PD legend item
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 7)
      .attr("fill", "#dc2626")
      .attr("stroke", "white")
      .attr("stroke-width", 1);
    legend
      .append("text")
      .attr("class", "legend-text")
      .attr("x", 18)
      .attr("y", 5)
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .style("fill", "var(--text-primary)")
      .text("Parkinson's Disease");

    // Control legend item
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 25)
      .attr("r", 7)
      .attr("fill", "#059669")
      .attr("stroke", "white")
      .attr("stroke-width", 1);
    legend
      .append("text")
      .attr("class", "legend-text")
      .attr("x", 18)
      .attr("y", 30)
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .style("fill", "var(--text-primary)")
      .text("Control Group");

    // Add instruction text
    svg
      .append("text")
      .attr("x", 10)
      .attr("y", scatterHeight - 10)
      .attr("font-size", "12px")
      .attr("font-style", "italic")
      .style("fill", "var(--text-secondary)")
      .text("💡 Click and drag to select multiple patients");
  });
}); // End DOMContentLoaded
