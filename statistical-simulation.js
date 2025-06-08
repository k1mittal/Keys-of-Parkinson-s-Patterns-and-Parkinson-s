class StatisticalSimulation {
  constructor() {
    this.data = null;
    this.isRunning = false;
    this.hasRun = false; // Track if simulation has been run
    this.animationId = null;
    this.currentSamples = { control: [], pd: [] };
    this.maxSamples = 100; // Increased for more consistent statistical results
    this.svg = null;
    this.xScale = null;
    this.yScale = null;
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.setupChart();
  }

  async loadData() {
    try {
      // Load the enhanced dataset that matches research patterns
      const response = await fetch("data/enhanced_simulation_data.csv");
      const csvText = await response.text();
      const rawData = this.parseCSV(csvText);

      this.data = rawData;

      // Log data distribution for verification
      const controlCount = this.data.filter((d) => !d.has_parkinsons).length;
      const pdCount = this.data.filter((d) => d.has_parkinsons).length;

      // Prepare data pools using the enhanced dataset
      this.prepareEnhancedDataPools();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");

    return lines
      .slice(1)
      .map((line) => {
        const values = line.split(",");
        const row = {};
        headers.forEach((header, index) => {
          const value = values[index];
          if (header === "has_parkinsons") {
            row[header] = value === "True" || value === "true";
          } else if (header === "pID" || header === "source") {
            row[header] = value;
          } else {
            row[header] = parseFloat(value);
          }
        });
        return row;
      })
      .filter((row) => {
        // Only include rows with valid data
        return (
          !isNaN(row.duration) &&
          !isNaN(row.delay) &&
          !isNaN(row.typingSpeed) &&
          row.duration > 0 &&
          row.delay >= 0 &&
          row.typingSpeed > 0
        );
      });
  }

  prepareEnhancedDataPools() {
    // Split by group
    const controlData = this.data.filter((d) => !d.has_parkinsons);
    const pdData = this.data.filter((d) => d.has_parkinsons);

    // Create data pools from enhanced dataset with unit conversions
    this.realDataPools = {
      typingSpeed: {
        control: controlData.map((d) => d.typingSpeed),
        pd: pdData.map((d) => d.typingSpeed),
      },
      duration: {
        control: controlData.map((d) => d.duration * 1000), // Convert to milliseconds
        pd: pdData.map((d) => d.duration * 1000),
      },
      delay: {
        control: controlData.map((d) => d.delay * 1000), // Convert to milliseconds
        pd: pdData.map((d) => d.delay * 1000),
      },
    };

    // Log final statistics to verify the patterns
    for (const metric of ["typingSpeed", "duration", "delay"]) {
      const controlStats = this.getStats(this.realDataPools[metric].control);
      const pdStats = this.getStats(this.realDataPools[metric].pd);
      const percentDiff =
        ((pdStats.mean - controlStats.mean) / controlStats.mean) * 100;
    }
  }

  getStats(array) {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    const variance =
      array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      array.length;
    const std = Math.sqrt(variance);
    return { mean, std };
  }

  setupEventListeners() {
    document
      .getElementById("start-simulation")
      .addEventListener("click", () => {
        if (!this.isRunning) {
          this.startSimulation();
        }
      });

    document
      .getElementById("reset-simulation")
      .addEventListener("click", () => {
        this.resetSimulation();
      });

    document.getElementById("metric-select").addEventListener("change", () => {
      if (!this.isRunning) {
        this.resetSimulation();
        // When metric changes, always reset to "Start Simulation" text
        document.getElementById("start-simulation").textContent =
          "Start Simulation";
      }
    });
  }

  setupChart() {
    const container = document.getElementById("simulation-chart");
    container.innerHTML = "";

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = container.offsetWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    this.svg = d3
      .select("#simulation-chart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = this.svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales (will be updated when simulation starts)
    this.xScale = d3.scaleLinear().range([0, width]);
    this.yScale = d3.scaleLinear().range([height, 0]);

    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`);

    g.append("g").attr("class", "y-axis");

    // Add axis labels
    g.append("text")
      .attr("class", "x-label")
      .attr(
        "transform",
        `translate(${width / 2}, ${height + margin.bottom - 10})`
      )
      .style("text-anchor", "middle")
      .style("fill", "var(--text-secondary)")
      .text("Sample Number");

    g.append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "var(--text-secondary)")
      .text("Value");

    // Add title
    g.append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "var(--text-primary)")
      .text("Sampling from Enhanced Research Dataset");
  }

  async startSimulation() {
    if (!this.realDataPools) {
      document.getElementById("simulation-status").textContent =
        "Loading data...";
      return;
    }

    this.isRunning = true;
    document.getElementById("start-simulation").disabled = true;
    document.getElementById("start-simulation").textContent = "Running...";
    document.getElementById("metric-select").disabled = true;

    const metric = document.getElementById("metric-select").value;
    this.resetChart();

    // Get real data for selected metric
    const controlData = this.realDataPools[metric].control;
    const pdData = this.realDataPools[metric].pd;

    // Set up chart scales to accommodate all possible values
    const allValues = [...controlData, ...pdData];
    const minValue = d3.min(allValues);
    const maxValue = d3.max(allValues);

    const yRange = maxValue - minValue;
    const yPadding = yRange * 0.1;

    // Use min/max with padding to ensure all points fit
    this.yScale.domain([Math.max(0, minValue - yPadding), maxValue + yPadding]);
    this.xScale.domain([0, this.maxSamples]);

    // Update axes
    const g = this.svg.select("g");
    g.select(".x-axis").call(d3.axisBottom(this.xScale));
    g.select(".y-axis").call(
      d3.axisLeft(this.yScale).tickFormat((d) => {
        // Better tick formatting based on metric
        if (metric === "typingSpeed") {
          return d.toFixed(0);
        } else {
          // For duration and delay in milliseconds, show whole numbers
          return d.toFixed(0);
        }
      })
    );

    // Update y-axis label
    const metricLabels = {
      typingSpeed: "Typing Speed (WPM)",
      duration: "Key Hold Duration (ms)",
      delay: "Inter-keystroke Delay (ms)",
    };
    g.select(".y-label").text(metricLabels[metric]);

    // Start animated sampling
    this.currentSamples = { control: [], pd: [] };
    this.animateSampling(controlData, pdData, 0);
  }

  animateSampling(controlData, pdData, sampleIndex) {
    if (sampleIndex >= this.maxSamples || !this.isRunning) {
      this.finishSimulation();
      return;
    }

    // Update progress
    const progress = ((sampleIndex + 1) / this.maxSamples) * 100;
    document.getElementById("simulation-progress").style.width = `${progress}%`;
    document.getElementById("simulation-status").textContent = `Sampling... (${
      sampleIndex + 1
    }/${this.maxSamples})`;

    // Sample random values from real datasets
    const controlSample =
      controlData[Math.floor(Math.random() * controlData.length)];
    const pdSample = pdData[Math.floor(Math.random() * pdData.length)];

    this.currentSamples.control.push(controlSample);
    this.currentSamples.pd.push(pdSample);

    // Add points to chart
    this.addSamplePoint(sampleIndex, controlSample, "control");
    this.addSamplePoint(sampleIndex, pdSample, "pd");

    // Update statistics
    this.updateStatistics();

    // Continue sampling after delay (faster for 100 samples)
    setTimeout(() => {
      this.animateSampling(controlData, pdData, sampleIndex + 1);
    }, 80);
  }

  addSamplePoint(x, y, group) {
    const g = this.svg.select("g");
    const color = group === "control" ? "#2563eb" : "#dc2626";

    g.append("circle")
      .attr("class", `sampling-point ${group}-point`)
      .attr("cx", this.xScale(x))
      .attr("cy", this.yScale(y))
      .attr("r", 0)
      .attr("fill", color)
      .attr("opacity", 0)
      .transition()
      .duration(300)
      .attr("r", 4)
      .attr("opacity", 0.7);
  }

  updateStatistics() {
    const controlMean = this.mean(this.currentSamples.control);
    const pdMean = this.mean(this.currentSamples.pd);
    const pValue = this.calculateTTest(
      this.currentSamples.control,
      this.currentSamples.pd
    );

    // Update display with appropriate precision and units
    const metric = document.getElementById("metric-select").value;
    const precision = metric === "typingSpeed" ? 1 : 0; // Use whole numbers for milliseconds

    // Determine units based on metric
    let units = "";
    if (metric === "typingSpeed") {
      units = " WPM";
    } else if (metric === "duration") {
      units = " ms";
    } else if (metric === "delay") {
      units = " ms";
    }

    document.getElementById("control-mean").textContent =
      controlMean.toFixed(precision) + units;
    document.getElementById("pd-mean").textContent =
      pdMean.toFixed(precision) + units;
    document.getElementById("p-value").textContent = pValue.toFixed(4);

    // Update significance
    const significanceElement = document.getElementById("significance");
    if (pValue < 0.05) {
      significanceElement.textContent = "Significant";
      significanceElement.className = "stat-value significant";
    } else {
      significanceElement.textContent = "Not Significant";
      significanceElement.className = "stat-value not-significant";
    }

    // Add mean lines to chart
    this.updateMeanLines(controlMean, pdMean);
  }

  updateMeanLines(controlMean, pdMean) {
    const g = this.svg.select("g");
    const width = this.xScale.range()[1];

    // Remove existing mean lines
    g.selectAll(".mean-line").remove();

    // Add control mean line
    g.append("line")
      .attr("class", "mean-line control-mean")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", this.yScale(controlMean))
      .attr("y2", this.yScale(controlMean))
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.8);

    // Add PD mean line
    g.append("line")
      .attr("class", "mean-line pd-mean")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", this.yScale(pdMean))
      .attr("y2", this.yScale(pdMean))
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.8);
  }

  finishSimulation() {
    this.isRunning = false;
    this.hasRun = true; // Mark that simulation has been run
    document.getElementById("start-simulation").disabled = false;
    document.getElementById("metric-select").disabled = false;

    // Update button text to indicate re-run capability
    document.getElementById("start-simulation").textContent =
      "Rerun Simulation";

    document.getElementById("simulation-status").textContent =
      "Simulation complete!";

    const pValue = parseFloat(document.getElementById("p-value").textContent);
    const metric = document.getElementById("metric-select").value;

    let interpretation = "";
    if (metric === "typingSpeed") {
      interpretation =
        pValue < 0.05
          ? "Surprising! This sample shows typing speed significance, but research indicates this isn't reliable."
          : "Perfect! Research confirms typing speed alone isn't a reliable diagnostic biomarker.";
    } else if (metric === "duration") {
      interpretation =
        pValue < 0.05
          ? "Excellent! Key hold duration shows significant differences - a strong biomarker for Parkinson's."
          : "Interesting - this sample didn't show significance. Duration usually shows clear differences!";
    } else {
      // delay
      interpretation =
        pValue < 0.05
          ? "Interesting! This sample shows delay significance, but research shows delay patterns vary widely."
          : "Expected! Inter-keystroke delay patterns are complex and don't consistently differentiate groups.";
    }

    document.getElementById("simulation-status").textContent = interpretation;
  }

  resetSimulation() {
    this.isRunning = false;
    this.hasRun = false; // Reset run state
    document.getElementById("start-simulation").disabled = false;
    document.getElementById("metric-select").disabled = false;
    document.getElementById("simulation-progress").style.width = "0%";

    // Reset button text to initial state
    document.getElementById("start-simulation").textContent =
      "Start Simulation";

    document.getElementById("simulation-status").textContent =
      'Select a metric and click "Start Simulation"';

    // Reset statistics display
    document.getElementById("control-mean").textContent = "--";
    document.getElementById("pd-mean").textContent = "--";
    document.getElementById("p-value").textContent = "--";
    document.getElementById("significance").textContent = "--";
    document.getElementById("significance").className = "stat-value";

    this.resetChart();
  }

  resetChart() {
    if (this.svg) {
      this.svg.selectAll(".sampling-point").remove();
      this.svg.selectAll(".mean-line").remove();
    }
  }

  // Statistical functions
  mean(array) {
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  variance(array) {
    const avg = this.mean(array);
    return (
      array.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      (array.length - 1)
    );
  }

  calculateTTest(sample1, sample2) {
    if (sample1.length < 2 || sample2.length < 2) return 1.0;

    const mean1 = this.mean(sample1);
    const mean2 = this.mean(sample2);
    const var1 = this.variance(sample1);
    const var2 = this.variance(sample2);
    const n1 = sample1.length;
    const n2 = sample2.length;

    // Welch's t-test (unequal variances)
    const numerator = mean1 - mean2;
    const denominator = Math.sqrt(var1 / n1 + var2 / n2);

    if (denominator === 0) return 1.0; // No difference

    const tStat = Math.abs(numerator / denominator);

    // Degrees of freedom for Welch's t-test
    const df =
      Math.pow(var1 / n1 + var2 / n2, 2) /
      (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

    // Improved p-value approximation using more accurate normal approximation
    const pValue = 2 * (1 - this.normalCDF(tStat));

    return Math.max(0.0001, Math.min(0.9999, pValue));
  }

  // More accurate normal CDF approximation
  normalCDF(x) {
    // Abramowitz and Stegun approximation
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2.0);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0.0 ? 1.0 - prob : prob;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new StatisticalSimulation();
});
