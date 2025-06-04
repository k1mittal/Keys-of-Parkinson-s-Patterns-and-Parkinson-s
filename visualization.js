// Configuration
const margin = { top: 40, right: 40, bottom: 60, left: 70 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Colors for different ground truth labels
const gtColors = {
  false: "#2ca02c", // green for no PD
  true: "#d62728", // red for PD
};

// Shapes for different categories (we'll use circles for all since we don't have exam types)
const patientShapes = {
  default: d3.symbolCircle,
};

// Units for each measure
const measureUnits = {
  updrs108: "",
  afTap: "ms",
  sTap: "ms", 
  nqScore: "",
  typingSpeed: "WPM",
};

// Labels for each measure
const measureLabels = {
  updrs108: "UPDRS-III Score",
  afTap: "Alternating Finger Tapping",
  sTap: "Single Key Tapping",
  nqScore: "neuroQWERTY Index",
  typingSpeed: "Typing Speed",
};

// Sample data - replace this with your actual data loading
const sampleData = `{
    "pID": 11,
    "gt": true,
    "updrs108": 14.25,
    "afTap": null,
    "sTap": 162.25,
    "nqScore": 0.117542767,
    "typingSpeed": 189.37254902,
    "file_1": "1402930351.011_001_014.csv",
    "file_2": "1403706430.011_003_014.csv"
}
{
    "pID": 60,
    "gt": false,
    "updrs108": 2.0,
    "afTap": null,
    "sTap": 162.25,
    "nqScore": 0.0703498557,
    "typingSpeed": 60.5333333333,
    "file_1": "1402932300.060_001_014.csv",
    "file_2": "1403708258.060_003_014.csv"
}
{
    "pID": 67,
    "gt": true,
    "updrs108": 25.25,
    "afTap": null,
    "sTap": 133.75,
    "nqScore": 0.2234105984,
    "typingSpeed": 54.3333333333,
    "file_1": "1401117235.067_001_014.csv",
    "file_2": "1401978395.067_003_014.csv"
}
{
    "pID": 68,
    "gt": false,
    "updrs108": 6.0,
    "afTap": null,
    "sTap": 159.0,
    "nqScore": 0.0749731789,
    "typingSpeed": 71.8,
    "file_1": "1401114972.068_001_014.csv",
    "file_2": "1401980765.068_003_014.csv"
}
{
    "pID": 70,
    "gt": true,
    "updrs108": 26.25,
    "afTap": null,
    "sTap": 113.5,
    "nqScore": 0.1757506173,
    "typingSpeed": 39.6140350877,
    "file_1": "1404311419.070_001_014.csv",
    "file_2": "1404743687.070_003_014.csv"
}`;

// Set up the SVG when document is ready
document.addEventListener("DOMContentLoaded", function () {
  // Set up the SVG
  const svg = d3
    .select("#chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add grid lines container (added before other elements so it's in the background)
  const grid = svg.append("g").attr("class", "grid");

  // Add X axis label
  svg
    .append("text")
    .attr("class", "axis-label x-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("UPDRS-III Score");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "axis-label y-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .text("Ground Truth (PD Status)");

  // Create tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Define scales
  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

  // Define axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickValues([0, 1]).tickFormat(d => d === 0 ? "No PD" : "PD");

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

  // Create symbol generator
  const symbolGenerator = d3.symbol().size(150);

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

  // Helper function to format measurement values with appropriate precision
  function formatMeasureValue(value, measure) {
    if (!isValidValue(value)) return "N/A";

    // Use appropriate decimal places based on the measure
    if (measure === "typingSpeed") {
      return value.toFixed(1);
    } else if (Math.abs(value) < 1) {
      return value.toFixed(3);
    } else {
      return value.toFixed(2);
    }
  }

  // Fixed JSONL parsing function
  function parseJSONL(textData) {
    try {
      // Split by lines and filter out empty lines
      const lines = textData.trim().split('\n').filter(line => line.trim());
      const jsonData = [];
      
      for (let i = 0; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (line) {
            const parsed = JSON.parse(line);
            jsonData.push(parsed);
          }
        } catch (lineError) {
          console.warn(`Error parsing line ${i + 1}: ${lineError.message}`);
          console.warn(`Problematic line: ${lines[i]}`);
        }
      }
      
      return jsonData;
    } catch (error) {
      console.error("Error in parseJSONL:", error);
      return [];
    }
  }

  // Load and process the data
  function loadData() {
    try {
      // For now, use the sample data. Replace this section with your file loading logic
      console.log("Loading sample data...");
      const jsonData = parseJSONL(sampleData);
      
      console.log("Raw data loaded:", jsonData);
      data = jsonData;

      // Clean data - ensure proper data types
      data.forEach((d) => {
        // Convert boolean gt to numeric for y-axis positioning
        d.gtNumeric = d.gt ? 1 : 0;
        
        // Ensure numeric fields are properly converted, handle null values
        ['updrs108', 'afTap', 'sTap', 'nqScore', 'typingSpeed'].forEach(field => {
          if (d[field] === null || d[field] === undefined || d[field] === "NaN" || d[field] === "") {
            d[field] = NaN;
          } else {
            d[field] = +d[field];
          }
        });
      });

      // Create the legend
      createLegend();

      // Remove loading indicator if it exists
      d3.select(".loading").remove();
      updateVisualization();

      // Add event listener for measure selection
      d3.select("#measure-select").on("change", function () {
        currentMeasure = d3.select(this).property("value");
        updateVisualization();
      });

    } catch (error) {
      console.error("Error loading data:", error);
      d3.select(".loading").text(
        "Error loading data. Please check console for details."
      );
    }
  }

  // Alternative: Load from file (uncomment and modify path as needed)
  /*
  d3.text("your-data-file.json")
    .then((textData) => {
      const jsonData = parseJSONL(textData);
      // ... rest of the data processing logic
    })
    .catch((error) => {
      console.error("Error loading data:", error);
    });
  */

  // Function to create the legend
  function createLegend() {
    const legendContainer = d3.select("#student-legend");
    
    // Clear existing legend
    legendContainer.selectAll("*").remove();

    // Create legend for PD status
    const legendData = [
      { label: "No PD", color: gtColors[false], value: false },
      { label: "PD", color: gtColors[true], value: true }
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

  function updateVisualization() {
    // Filter out data points without valid values for the current measure
    const validData = data.filter((d) => 
      isValidValue(d[currentMeasure]) && (d.gt === true || d.gt === false)
    );

    console.log(
      `Filtered data for ${currentMeasure}:`,
      validData.length,
      "valid points"
    );

    if (validData.length === 0) {
      console.warn("No valid data points found for the current selection");
      return;
    }

    // Update x axis label
    const unit = measureUnits[currentMeasure] || "";
    const measureLabel = measureLabels[currentMeasure] || currentMeasure;
    d3.select(".x-label").text(`${measureLabel}${unit ? ` (${unit})` : ""}`);

    // Update x scale domain based on data
    const xMin = d3.min(validData, (d) => d[currentMeasure]);
    const xMax = d3.max(validData, (d) => d[currentMeasure]);

    // Add padding to domain and handle case where min/max are the same
    if (xMin === xMax) {
      xScale.domain([xMin * 0.9, xMin * 1.1].filter(isValidValue));
    } else {
      const range = xMax - xMin;
      const xPadding = range * 0.05;
      xScale.domain([xMin - xPadding, xMax + xPadding]);
    }

    // Update axes with transition
    svg.select(".x-axis").transition().duration(750).call(xAxis);

    // Update grid lines
    svg.select(".x-grid").transition().duration(750).call(xGridLines());
    svg.select(".y-grid").transition().duration(750).call(yGridLines());

    // Add some jitter to y-axis to separate overlapping points
    const jitterAmount = 0.1;
    
    // Select all data points
    const points = svg
      .selectAll(".data-point")
      .data(validData, (d) => d.pID);

    // Exit points that no longer exist
    points.exit().transition().duration(750).style("opacity", 0).remove();

    // Update existing points
    points
      .transition()
      .duration(750)
      .attr("transform", (d) => {
        const jitter = (Math.random() - 0.5) * jitterAmount;
        return `translate(${xScale(d[currentMeasure])}, ${yScale(d.gtNumeric + jitter)})`;
      })
      .attr("fill", (d) => gtColors[d.gt]);

    // Enter new points
    points
      .enter()
      .append("path")
      .attr("class", "data-point")
      .attr("d", symbolGenerator.type(d3.symbolCircle)())
      .attr("transform", (d) => {
        const jitter = (Math.random() - 0.5) * jitterAmount;
        return `translate(${xScale(d[currentMeasure])}, ${yScale(d.gtNumeric + jitter)})`;
      })
      .attr("fill", (d) => gtColors[d.gt])
      .style("opacity", 0)
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `
            <strong>Patient ID:</strong> ${d.pID}<br/>
            <strong>PD Status:</strong> ${d.gt ? "PD" : "No PD"}<br/>
            <strong>${measureLabel}:</strong> ${formatMeasureValue(d[currentMeasure], currentMeasure)}${unit ? ` ${unit}` : ""}<br/>
            <strong>UPDRS-III:</strong> ${formatMeasureValue(d.updrs108, "updrs108")}<br/>
            <strong>Files:</strong> ${d.file_1 || "N/A"}, ${d.file_2 || "N/A"}
            `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .transition()
      .duration(750)
      .style("opacity", 0.7);
  }

  // Initialize the visualization
  loadData();
});