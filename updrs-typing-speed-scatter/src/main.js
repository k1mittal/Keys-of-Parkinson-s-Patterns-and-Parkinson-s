// File: /updrs-typing-speed-scatter/updrs-typing-speed-scatter/src/main.js

// Set up the dimensions and margins for the scatter plot
const margin = { top: 20, right: 30, bottom: 40, left: 60 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create the SVG canvas
const svg = d3.select("body")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Load the JSON data
d3.json("../agg_data.json").then(rawData => {
  // Convert the object to an array
  const data = Object.values(rawData);

  // Parse the data
  data.forEach(d => {
    d.UPDRS = +d.updrs108; // Use updrs108 from JSON
    d.TypingSpeed = +d.typingSpeed; // Use typingSpeed from JSON
    d.Group = d.gt ? "PD" : "Control"; // Optional: for color coding
  });

  // Set the scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.UPDRS)])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.TypingSpeed)])
    .range([height, 0]);

  // Add the X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Add the Y axis
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add the scatter plot points
  svg.selectAll("dot")
    .data(data)
    .enter().append("circle")
    .attr("cx", d => x(d.UPDRS))
    .attr("cy", d => y(d.TypingSpeed))
    .attr("r", 5)
    .attr("fill", d => d.Group === "PD" ? "#a259f7" : "#ffb347") // Example: purple for PD, orange for Control
    .on("mouseover", function(event, d) {
      d3.select(this).transition()
        .duration(200)
        .attr("r", 8)
        .attr("fill", "orange");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).transition()
        .duration(200)
        .attr("r", 5)
        .attr("fill", d => d.Group === "PD" ? "#a259f7" : "#ffb347");
    });
});