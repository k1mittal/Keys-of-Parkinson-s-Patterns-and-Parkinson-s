import { updateDistributionChart, toggleVisualizationMode } from "./chart.js";

const keyboardLayout = [
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  " ", // Space bar
];

let selectedKeys = new Set();
let holdData = null;

// Load the hold times data
d3.json("./interactive-keyboard-viz/src/data/hold_data.json")
  .then((data) => {
    holdData = data;
    init();
  })
  .catch((error) => console.error("Error loading data:", error));

function init() {
  const margin = { top: 15, right: 15, bottom: 15, left: 15 };

  // Check if mobile device and adjust dimensions accordingly
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;

  let baseWidth, baseHeight;
  if (isSmallMobile) {
    baseWidth = 320;
    baseHeight = 160;
  } else if (isMobile) {
    baseWidth = 400;
    baseHeight = 200;
  } else {
    baseWidth = 480;
    baseHeight = 240;
  }

  const width = baseWidth - margin.left - margin.right;
  const height = baseHeight - margin.top - margin.bottom;

  const keyWidth = width / 12; // Adjusted for proper fit
  const keyHeight = height / 4.5; // Adjusted for space bar
  const keyPadding = isMobile ? 3 : 5;

  // Clear existing keyboard to prevent duplicates
  d3.select("#keyboard-viz").html("");

  const svg = d3
    .select("#keyboard-viz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  keyboardLayout.forEach((row, i) => {
    // Calculate row offset, with special handling for spacebar
    const rowOffset =
      i == 0
        ? keyPadding
        : i === 1
          ? keyWidth / 2 + keyPadding
          : i === 2
            ? keyWidth + keyPadding
            : i === 3
              ? width / 2 - keyWidth * 2.5 + keyPadding
              : keyPadding;

    row.split("").forEach((key, j) => {
      const keyGroup = svg
        .append("g")
        .attr(
          "transform",
          `translate(${j * (keyWidth + keyPadding) + rowOffset}, ${
            i * (keyHeight + keyPadding)
          })`
        );

      keyGroup
        .append("rect")
        .attr("class", "key")
        .attr("width", key === " " ? keyWidth * 5 : keyWidth) // Make spacebar 5x wider
        .attr("height", keyHeight)
        .attr("rx", 6)
        .on("click", () => toggleKey(key));

      keyGroup
        .append("text")
        .attr("class", "key-text")
        .attr("x", key === " " ? (keyWidth * 5) / 2 : keyWidth / 2) // Center text for spacebar
        .attr("y", keyHeight / 2)
        .attr("dy", ".35em")
        .attr("font-size", isSmallMobile ? "10px" : isMobile ? "12px" : "14px")
        .attr("fill", "#333")
        .attr("text-anchor", "middle")
        .text(key === " " ? "Space" : key.toUpperCase());
    });
  });
}

function toggleKey(key) {
  if (selectedKeys.has(key)) {
    selectedKeys.delete(key);
    d3.selectAll(".key")
      .filter(function () {
        const label = d3.select(this.parentNode).select(".key-text").text();
        return key === " " ? label === "Space" : label === key.toUpperCase();
      })
      .classed("selected", selectedKeys.has(key));
  } else {
    selectedKeys.add(key);
    d3.selectAll(".key")
      .filter(function () {
        const label = d3.select(this.parentNode).select(".key-text").text();
        return key === " " ? label === "Space" : label === key.toUpperCase();
      })
      .classed("selected", true);
  }

  // Update the chart with the selected keys
  updateDistributionChart(selectedKeys, holdData);
}

document
  .getElementById("viz-toggle-visualization")
  .addEventListener("click", (e) => {
    const button = e.target;
    button.classList.toggle("active");
    button.textContent = button.classList.contains("active")
      ? "Toggle Density"
      : "Toggle Histogram";
    toggleVisualizationMode();
    updateDistributionChart(selectedKeys, holdData);
  });
document.getElementById("viz-clear-selection").addEventListener("click", () => {
  selectedKeys.clear();
  d3.selectAll(".key").classed("selected", false);
  updateDistributionChart(selectedKeys, holdData);
});

// Handle window resize for responsive behavior
window.addEventListener("resize", () => {
  if (holdData) {
    init();
    // Restore selected keys after resize
    selectedKeys.forEach((key) => {
      d3.selectAll(".key")
        .filter(function () {
          const label = d3.select(this.parentNode).select(".key-text").text();
          return key === " " ? label === "Space" : label === key.toUpperCase();
        })
        .classed("selected", true);
    });
    updateDistributionChart(selectedKeys, holdData);
  }
});

export { init, selectedKeys, holdData };
