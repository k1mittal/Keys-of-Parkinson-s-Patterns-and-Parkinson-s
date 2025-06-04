// Configuration
const margin = { top: 40, right: 40, bottom: 60, left: 70 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Colors for Parkinson's status
const statusColors = {
  true: "#d62728",   // red for Parkinson's patients
  false: "#2ca02c"   // green for control group
};

// Available measures from the JSON data
const availableMeasures = {
  "updrs108": "UPDRS-III Score",
  "sTap": "Single Tap (ms)", 
  "afTap": "Alternate Finger Tap (ms)",
  "nqScore": "NeuroQWERTY Score",
  "typingSpeed": "Typing Speed (WPM)"
};

// Set up the SVG when document is ready
document.addEventListener("DOMContentLoaded", function () {
  // Set up the SVG
  const svg = d3
    .select("#chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add grid lines container
  const grid = svg.append("g").attr("class", "grid");

  // Add X axis label
  const xAxisLabel = svg
    .append("text")
    .attr("class", "axis-label x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10);

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "axis-label y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .text("Parkinson's Diagnosis");

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Define scales
  const xScale = d3.scaleLinear().range([0, width]);
  // Y scale for binary classification
  const yScale = d3.scaleLinear().domain([-.2, 1.2]).range([height, 0]);

  // Define axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickValues([0, 1])
    .tickFormat(d => d === 1 ? "Parkinson's" : "Control");

  // Add axes to SVG
  const gxAxis = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  const gyAxis = svg.append("g").attr("class", "y-axis").call(yAxis);

  // Create functions for grid lines
  function xGridLines() {
    return d3.axisBottom(xScale).tickSize(-height).tickFormat("");
  }

  function yGridLines() {
    return d3.axisLeft(yScale).tickSize(-width).tickFormat("");
  }

  // Add the X grid lines
  const xGrid = grid
    .append("g")
    .attr("class", "grid x-grid")
    .attr("transform", `translate(0,${height})`)
    .call(xGridLines());

  // Add the Y grid lines
  const yGrid = grid
    .append("g")
    .attr("class", "grid y-grid")
    .call(yGridLines());

  // Variables to store data and current selection
  let data;
  let currentMeasure = "updrs108";

  // Helper function to check if a value is valid for plotting
  function isValidValue(value) {
    return (
      value !== null &&
      value !== undefined &&
      value !== "NaN" &&
      !isNaN(value) &&
      isFinite(value)
    );
  }

  // Helper function to format measurement values
  function formatMeasureValue(value, measure) {
    if (!isValidValue(value)) return "N/A";
    
    if (measure === "nqScore") {
      return value.toFixed(4);
    } else if (measure === "typingSpeed" || measure === "updrs108") {
      return value.toFixed(1);
    } else {
      return value.toFixed(2);
    }
  }

  // Load and process the data
  d3.json("interactive-keyboard-viz/src/data/logisitic_regression.json")
    .then((jsonData) => {
      console.log("Raw data loaded:", jsonData);
      
      // Convert object to array format
      data = Object.entries(jsonData).map(([patientId, patientData]) => ({
        patientId: patientId,
        ...patientData
      }));

      console.log("Processed data:", data);

      // Create the legend
      createLegend();

      // Update measure select options
      updateMeasureSelect();

      d3.select(".loading").remove();
      updateVisualization();

      // Add event listener for measure selection
      d3.select("#measure-select").on("change", function () {
        currentMeasure = d3.select(this).property("value");
        updateVisualization();
      });

      // Add event listener for stat selection (if it exists, otherwise ignore)
      const statSelect = d3.select("#stat-select");
      if (!statSelect.empty()) {
        statSelect.on("change", function () {
          updateVisualization();
        });
      }
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      d3.select(".loading").text(
        "Error loading data. Please check console for details."
      );
    });

  // Function to update measure select dropdown
  function updateMeasureSelect() {
    const measureSelect = d3.select("#measure-select");
    if (!measureSelect.empty()) {
      measureSelect.selectAll("option").remove();
      
      Object.entries(availableMeasures).forEach(([key, label]) => {
        measureSelect.append("option")
          .attr("value", key)
          .text(label)
          .property("selected", key === currentMeasure);
      });
    }
  }

  // Function to create the legend
  function createLegend() {
    const legendContainer = d3.select("#student-legend");
    if (!legendContainer.empty()) {
      legendContainer.selectAll("*").remove();

      const legendData = [
        { status: false, label: "Control Group", color: statusColors[false] },
        { status: true, label: "Parkinson's Patients", color: statusColors[true] }
      ];

      legendData.forEach((item) => {
        const legendItem = legendContainer
          .append("div")
          .attr("class", "legend-item student-legend-item");

        legendItem
          .append("div")
          .attr("class", "legend-color")
          .style("background-color", item.color);

        legendItem.append("div").text(item.label);
      });
    }
  }

  function updateVisualization() {
    // Filter out data points without valid values for current measure
    const validData = data.filter(d => isValidValue(d[currentMeasure]));

    console.log(`Filtered data for ${currentMeasure}:`, validData.length, "valid points");

    if (validData.length === 0) {
      console.warn("No valid data points found for the current selection");
      return;
    }

    // Update x axis label
    const measureLabel = availableMeasures[currentMeasure] || currentMeasure;
    xAxisLabel.text(measureLabel);

    // Update x scale domain based on data
    const xMin = d3.min(validData, d => d[currentMeasure]);
    const xMax = d3.max(validData, d => d[currentMeasure]);

    // Add padding to domain
    const range = xMax - xMin;
    const padding = range > 0 ? range * 0.05 : Math.abs(xMin) * 0.1;
    xScale.domain([xMin - padding, xMax + padding]);

    // Update axes with transition
    svg.select(".x-axis").transition().duration(750).call(xAxis);

    // Update grid lines
    svg.select(".x-grid").transition().duration(750).call(xGridLines());
    svg.select(".y-grid").transition().duration(750).call(yGridLines());

    // Select all data points
    const points = svg
      .selectAll(".data-point")
      .data(validData, d => d.patientId);

    // Exit points that no longer exist
    points.exit().transition().duration(750).style("opacity", 0).remove();

    // Update existing points
    points
      .transition()
      .duration(750)
      .attr("transform", d => {
        const yPos = d.gt ? 1 : 0;
        return `translate(${xScale(d[currentMeasure])}, ${yScale(yPos)})`;
      })
      .attr("fill", d => statusColors[d.gt]);

    // Enter new points
    points
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("r", 5)
      .attr("transform", d => {
        const yPos = d.gt ? 1 : 0;
        return `translate(${xScale(d[currentMeasure])}, ${yScale(yPos)})`;
      })
      .attr("fill", d => statusColors[d.gt])
      .style("opacity", 0)
      .style("stroke", "#fff")
      .style("stroke-width", 1)
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`
            <strong>Patient ID:</strong> ${d.patientId}<br/>
            <strong>Diagnosis:</strong> ${d.gt ? "Parkinson's" : "Control"}<br/>
            <strong>${measureLabel}:</strong> ${formatMeasureValue(d[currentMeasure], currentMeasure)}<br/>
            <strong>UPDRS Score:</strong> ${formatMeasureValue(d.updrs108, "updrs108")}<br/>
            <strong>Typing Speed:</strong> ${formatMeasureValue(d.typingSpeed, "typingSpeed")} WPM
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .transition()
      .duration(750)
      .style("opacity", 0.7);
  }
});