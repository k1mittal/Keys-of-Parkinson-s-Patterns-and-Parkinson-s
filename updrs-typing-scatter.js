const scatterMargin = { top: 20, right: 30, bottom:30, left: 80 };
const scatterWidth = 800 - scatterMargin.left - scatterMargin.right;
const scatterHeight = 400 - scatterMargin.top - scatterMargin.bottom;

// Append SVG to the correct container
const svg = d3.select("#updrs-typing-scatter")
  .append("svg")
  .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
  .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
  .append("g")
  .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

// Create a tooltip div that is hidden by default
const tooltip = d3.select("body")
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

d3.json("agg_data.json").then(rawData => {
  // Convert to array and filter out NaN/missing values
  const data = Object.values(rawData)
    .map(d => ({
      ...d,
      UPDRS: +d.updrs108,
      TypingSpeed: +d.typingSpeed,
      Group: d.gt ? "PD" : "Control"
    }))
    .filter(d => !isNaN(d.UPDRS) && !isNaN(d.TypingSpeed));

  // Set the scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.UPDRS) * 1.05])
    .range([0, scatterWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.TypingSpeed) * 1.05])
    .range([scatterHeight, 0]);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(x));

  // X axis label
  svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 28)
    .attr("font-size", "16px")
    .text("UPDRS-III Motor Score");

  // Y axis
  svg.append("g")
    .call(d3.axisLeft(y));

  // Y axis label
  svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("transform", `rotate(-90)`)
    .attr("x", -scatterHeight / 2)
    .attr("y", -55)
    .attr("font-size", "16px")
    .text("Typing Speed (WPM)");

  // Scatter plot points
  svg.selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("cx", d => x(d.UPDRS))
    .attr("cy", d => y(d.TypingSpeed))
    .attr("r", 5)
    .attr("fill", d => d.Group === "PD" ? "red" : "green")
    .on("mouseover", function(event, d) {
      d3.select(this).transition()
        .duration(200)
        .attr("r", 8);

      tooltip.transition()
        .duration(200)
        .style("opacity", 0.95);

      tooltip.html(
        `<strong>Group:</strong> ${d.Group}<br/>
         <strong>UPDRS:</strong> ${d.UPDRS}<br/>
         <strong>Typing Speed:</strong> ${d.TypingSpeed.toFixed(2)}`
      )
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).transition()
        .duration(200)
        .attr("r", 5);

      tooltip.transition()
        .duration(200)
        .style("opacity", 0);
    });

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${scatterWidth - 120}, 10)`);

  // PD
  legend.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 7)
    .attr("fill", "red");
  legend.append("text")
    .attr("class", "y-label")
    .attr("x", 18)
    .attr("y", 5)
    .attr("font-size", "15px")
    .text("PD");

  // Control
  legend.append("circle")
    .attr("cx", 0)
    .attr("cy", 30)
    .attr("r", 7)
    .attr("fill", "green");
  legend.append("text")
    .attr("class", "y-label")
    .attr("x", 18)
    .attr("y", 35)
    .attr("font-size", "15px")
    .text("Control");
});