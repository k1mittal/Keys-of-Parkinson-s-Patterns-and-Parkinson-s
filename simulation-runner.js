const fs = require("fs");
const path = require("path");

class SimulationRunner {
  constructor() {
    this.data = null;
    this.realDataPools = null;
    this.maxSamples = 100;
  }

  async loadData() {
    try {
      // Load the enhanced simulation dataset that matches research patterns
      const csvPath = path.join(
        __dirname,
        "data",
        "enhanced_simulation_data.csv"
      );
      const csvText = fs.readFileSync(csvPath, "utf8");
      this.data = this.parseEnhancedCSV(csvText);
      console.log(
        `Loaded enhanced simulation data: ${this.data.length} samples`
      );

      // Log data distribution
      const controlCount = this.data.filter((d) => !d.has_parkinsons).length;
      const pdCount = this.data.filter((d) => d.has_parkinsons).length;
      console.log(
        `Enhanced data: ${controlCount} control, ${pdCount} PD samples`
      );

      // Log some sample data for verification
      console.log(
        "Sample control sample:",
        this.data.find((d) => !d.has_parkinsons)
      );
      console.log(
        "Sample PD sample:",
        this.data.find((d) => d.has_parkinsons)
      );

      // Prepare data pools directly (no need for artificial enhancement)
      this.prepareRealDataPools();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  parseEnhancedCSV(csvText) {
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
            row[header] = value === "True";
          } else if (header === "pID" || header === "source") {
            row[header] = value;
          } else {
            row[header] = parseFloat(value);
          }
        });
        return row;
      })
      .filter((row) => {
        // Basic validation for enhanced simulation data
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

  prepareRealDataPools() {
    const controlSamples = this.data.filter((d) => !d.has_parkinsons);
    const pdSamples = this.data.filter((d) => d.has_parkinsons);

    console.log(`\nData preparation:`);
    console.log(
      `Control samples: ${controlSamples.length}, PD samples: ${pdSamples.length}`
    );

    // Use the enhanced data directly (it already has proper research patterns)
    this.realDataPools = {
      typingSpeed: {
        control: controlSamples.map((s) => s.typingSpeed),
        pd: pdSamples.map((s) => s.typingSpeed),
      },
      duration: {
        control: controlSamples.map((s) => s.duration),
        pd: pdSamples.map((s) => s.duration),
      },
      delay: {
        control: controlSamples.map((s) => s.delay),
        pd: pdSamples.map((s) => s.delay),
      },
    };

    // Log sample statistics for verification
    console.log("\nData pool sizes:");
    Object.keys(this.realDataPools).forEach((metric) => {
      const controlMean = this.mean(this.realDataPools[metric].control);
      const pdMean = this.mean(this.realDataPools[metric].pd);
      const diffPct = (pdMean / controlMean - 1) * 100;
      console.log(
        metric +
          ": Control=" +
          this.realDataPools[metric].control.length +
          " (mean=" +
          controlMean.toFixed(2) +
          "), PD=" +
          this.realDataPools[metric].pd.length +
          " (mean=" +
          pdMean.toFixed(2) +
          ", " +
          diffPct.toFixed(1) +
          "%)"
      );
    });
  }

  // Simple Box-Muller normal distribution
  normalRandom() {
    if (this.spare) {
      const val = this.spare;
      this.spare = null;
      return val;
    }
    const u = Math.random();
    const v = Math.random();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    this.spare = mag * Math.cos(2.0 * Math.PI * v);
    return mag * Math.sin(2.0 * Math.PI * v);
  }

  runSingleSimulation(metric) {
    const controlData = [...this.realDataPools[metric].control];
    const pdData = [...this.realDataPools[metric].pd];

    // Shuffle the arrays
    this.shuffleArray(controlData);
    this.shuffleArray(pdData);

    // Take samples (same as the web simulation)
    const controlSamples = controlData.slice(0, this.maxSamples);
    const pdSamples = pdData.slice(0, this.maxSamples);

    // Calculate statistics
    const controlMean = this.mean(controlSamples);
    const pdMean = this.mean(pdSamples);

    // Apply Bonferroni correction for typing speed to demonstrate multiple comparison handling
    const useBonferroni = metric === "typingSpeed";
    const pValue = this.calculateTTest(
      controlSamples,
      pdSamples,
      useBonferroni
    );
    const isSignificant = pValue < 0.05;

    return {
      controlMean,
      pdMean,
      pValue,
      isSignificant,
      sampleSize: controlSamples.length,
    };
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

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

  calculateTTest(sample1, sample2, useBonferroniCorrection = false) {
    if (sample1.length < 2 || sample2.length < 2) return 1.0;

    const mean1 = this.mean(sample1);
    const mean2 = this.mean(sample2);
    const var1 = this.variance(sample1);
    const var2 = this.variance(sample2);
    const n1 = sample1.length;
    const n2 = sample2.length;

    const numerator = mean1 - mean2;
    const denominator = Math.sqrt(var1 / n1 + var2 / n2);

    if (denominator === 0) return 1.0;

    const tStat = Math.abs(numerator / denominator);
    const df =
      Math.pow(var1 / n1 + var2 / n2, 2) /
      (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

    let pValue = 2 * (1 - this.normalCDF(tStat));

    // Apply Bonferroni correction for multiple comparisons (3 metrics) if requested
    if (useBonferroniCorrection) {
      pValue = Math.min(1.0, pValue * 3);
    }

    return Math.max(0.0001, Math.min(0.9999, pValue));
  }

  normalCDF(x) {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2.0);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0.0 ? 1.0 - prob : prob;
  }

  async runAllSimulations() {
    await this.loadData();

    const metrics = ["typingSpeed", "duration", "delay"];
    const runs = 10;

    console.log("\n" + "=".repeat(80));
    console.log("STATISTICAL SIMULATION RESULTS");
    console.log("=".repeat(80));

    for (const metric of metrics) {
      console.log(`\n📊 ${metric.toUpperCase()} SIMULATIONS:`);
      console.log("-".repeat(50));

      const results = [];
      let significantCount = 0;

      for (let i = 1; i <= runs; i++) {
        const result = this.runSingleSimulation(metric);
        results.push(result);

        if (result.isSignificant) significantCount++;

        const precision = metric === "typingSpeed" ? 1 : 4;
        console.log(
          `Run ${i.toString().padStart(2)}: ` +
            `Control=${result.controlMean.toFixed(precision).padStart(8)} | ` +
            `PD=${result.pdMean.toFixed(precision).padStart(8)} | ` +
            `p=${result.pValue.toFixed(4)} | ` +
            `${result.isSignificant ? "✓ SIGNIFICANT" : "✗ not significant"}`
        );
      }

      // Summary statistics
      const avgControlMean = this.mean(results.map((r) => r.controlMean));
      const avgPdMean = this.mean(results.map((r) => r.pdMean));
      const avgPValue = this.mean(results.map((r) => r.pValue));
      const significanceRate = (significantCount / runs) * 100;

      console.log("-".repeat(50));
      const precision = metric === "typingSpeed" ? 1 : 4;
      console.log(
        `SUMMARY - Control Avg: ${avgControlMean.toFixed(precision)} | ` +
          `PD Avg: ${avgPdMean.toFixed(precision)} | ` +
          `Avg p-value: ${avgPValue.toFixed(4)} | ` +
          `Significant: ${significantCount}/${runs} (${significanceRate.toFixed(1)}%)`
      );

      // Effect size calculation
      const pooledStd = Math.sqrt(
        (this.variance(results.map((r) => r.controlMean)) +
          this.variance(results.map((r) => r.pdMean))) /
          2
      );
      const effectSize = Math.abs(avgPdMean - avgControlMean) / pooledStd;
      console.log(`Effect Size (Cohen's d): ${effectSize.toFixed(3)}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("ANALYSIS COMPLETE");
    console.log("=".repeat(80));
  }
}

// Run the simulations
const runner = new SimulationRunner();
runner.runAllSimulations().catch(console.error);
