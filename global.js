// Theme toggle functionality
const themeToggle = document.getElementById("theme-toggle");
const root = document.documentElement;

// Check for saved theme preference or default to dark mode
const savedTheme = localStorage.getItem("theme") || "dark";
root.setAttribute("data-theme", savedTheme);

// Update theme toggle button text based on current theme
if (themeToggle) {
  themeToggle.textContent = savedTheme === "light" ? "🌙" : "☀️";
}

themeToggle.addEventListener("click", () => {
  const currentTheme = root.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  root.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Update button text
  themeToggle.textContent = newTheme === "light" ? "🌙" : "☀️";
});

// Keyboard layout configuration
const keyboard = [
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  "zxcvbnm".split(""),
];

// Set up SVG
const margin = { top: 30, right: 30, bottom: 30, left: 30 };
const width = 1000;
const height = 400;
const keySize = 70;
const keySpacing = 8;

const svg = d3
  .select("#keyboard")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Color scale with more polarized differences
const colorScale = d3
  .scaleSequential()
  .domain([0, 0.15])
  .interpolator(
    d3.interpolateRgbBasis([
      "#fee5d9", // Very light pink
      "#fcae91", // Light orange
      "#fb6a4a", // Orange-red
      "#de2d26", // Bright red
      "#a50f15", // Dark red
    ])
  );

// Create tooltip
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load and process data
d3.json("keyboard_data.json").then(function (data) {
  let currentGroup = "control";

  function updateKeyboard(group) {
    keyboard.forEach((row, i) => {
      const rowOffset = (width - row.length * (keySize + keySpacing)) / 2;

      row.forEach((key, j) => {
        const x = rowOffset + j * (keySize + keySpacing);
        const y = i * (keySize + keySpacing);

        const keyGroup = svg.select(`#key-${key}`);
        const frequency = data[group][key.toLowerCase()] || 0;

        keyGroup
          .select("rect")
          .transition()
          .duration(500)
          .style("fill", colorScale(frequency));

        keyGroup.select(".frequency-text").text(d3.format(".3%")(frequency));
      });
    });
  }

  // Initial keyboard creation
  keyboard.forEach((row, i) => {
    const rowOffset = (width - row.length * (keySize + keySpacing)) / 2;

    row.forEach((key, j) => {
      const x = rowOffset + j * (keySize + keySpacing);
      const y = i * (keySize + keySpacing);

      const keyGroup = svg
        .append("g")
        .attr("id", `key-${key}`)
        .attr("transform", `translate(${x},${y})`);

      const rect = keyGroup
        .append("rect")
        .attr("class", "key")
        .attr("width", keySize)
        .attr("height", keySize)
        .attr("rx", 8);

      keyGroup
        .append("text")
        .attr("class", "key-text")
        .attr("x", keySize / 2)
        .attr("y", keySize / 2)
        .attr("dy", ".35em")
        .text(key.toUpperCase());

      const freqText = keyGroup
        .append("text")
        .attr("class", "frequency-text key-text")
        .attr("x", keySize / 2)
        .attr("y", keySize * 0.8)
        .attr("dy", ".35em");

      keyGroup
        .on("mouseover", function (event) {
          // Show tooltip
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(
              `Key: ${key.toUpperCase()}<br/>Frequency: ${d3.format(".3%")(
                data[currentGroup][key.toLowerCase()] || 0
              )}`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");

          // Show frequency text
          freqText.style("opacity", 1);

          // Highlight key
          rect.style("fill-opacity", 0.8).style("stroke-width", 2);
        })
        .on("mouseout", function () {
          // Hide tooltip
          tooltip.transition().duration(500).style("opacity", 0);

          // Hide frequency text
          freqText.style("opacity", 0);

          // Reset key appearance
          rect.style("fill-opacity", 1).style("stroke-width", 1);
        });
    });
  });

  // Initial update
  updateKeyboard(currentGroup);

  // Toggle buttons
  d3.selectAll(".toggle-btn").on("click", function () {
    const group = d3.select(this).attr("data-group");
    currentGroup = group;

    d3.selectAll(".toggle-btn").classed("active", false);
    d3.select(this).classed("active", true);

    updateKeyboard(group);
  });
});
