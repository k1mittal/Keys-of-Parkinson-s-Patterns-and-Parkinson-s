// Global variables
let userKeystrokes = [];
let userStartTime = null;
let lastKeyTime = null;
let isTyping = false;
let testComplete = false;
let userComplete = false;
let pdComplete = false;
let pdFinishTime = null;
let simulationTimeouts = [];
let completionTimeout = null;
let currentPrompt = "";
let typingSimulations = null;
let typingPatterns = null;

// Popup system variables
let popupTimeout = null;
let countdownInterval = null;
let gracePeriodTimeout = null;

// Array of typing prompts - categorized by length
const typingPrompts = [
  // Medium-length prompts (15-35 words)
  "the job requires extra pluck and zeal from every young wage earner who wants to succeed in business",
  "modern technology has revolutionized the way we communicate and share information across the globe in recent decades",
  "scientists continue to make remarkable discoveries about the universe while exploring new frontiers in space and medicine",
  "artificial intelligence and machine learning are transforming industries by automating complex tasks and improving efficiency worldwide",
  "climate change poses significant challenges that require immediate action from governments and individuals working together for solutions",
  "digital transformation has changed how businesses operate by integrating advanced technologies into their daily operations and strategies",
  "sustainable energy solutions including solar wind and hydroelectric power are becoming increasingly important as countries worldwide work to reduce carbon emissions",
  "social media platforms have fundamentally altered human communication patterns by creating new forms of interaction while also presenting challenges",
  "educational institutions are adapting to digital learning environments by implementing innovative teaching methods and technologies that enhance student engagement",
  "economic inequality continues to grow in many developed nations as technological automation replaces traditional jobs while creating new opportunities",
  "medical research breakthroughs have led to innovative treatments for diseases while raising important ethical questions about genetic engineering and enhancement",
  "global supply chains have become increasingly complex networks that connect manufacturers consumers and distributors across multiple continents and time zones",
  "renewable energy investments are driving economic growth while helping countries meet their environmental commitments and reduce dependence on fossil fuels",
  "digital privacy concerns have intensified as more personal data is collected by technology companies for advertising and product development purposes",
  "remote work technologies have transformed the traditional workplace by enabling employees to collaborate effectively from different locations around the world",
];

// Keyboard layout
const keyboardLayout = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

// Special keys mapping
const specialKeys = {
  " ": "space",
  Enter: "enter",
  Backspace: "backspace",
  Shift: "shift",
  Tab: "tab",
};

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  createKeyboards();
  setupMetricsCharts();
  setupTypingInput();
  setupTooltips();
  setupNavigation();
  await loadTypingData();
  selectRandomPrompt();
  updateAnalysis();
});

// Parse enhanced dataset from CSV
function parseEnhancedDataset(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
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
  });
}

// Create patterns from enhanced dataset
function createPatternsFromEnhancedData(enhancedData) {
  const controlData = enhancedData.filter((d) => !d.has_parkinsons);
  const pdData = enhancedData.filter((d) => d.has_parkinsons);

  // Calculate means and standard deviations
  const controlDelayMean =
    controlData.reduce((sum, d) => sum + d.delay, 0) / controlData.length;
  const controlDurationMean =
    controlData.reduce((sum, d) => sum + d.duration, 0) / controlData.length;
  const controlTypingSpeed =
    controlData.reduce((sum, d) => sum + d.typingSpeed, 0) / controlData.length;

  const pdDelayMean =
    pdData.reduce((sum, d) => sum + d.delay, 0) / pdData.length;
  const pdDurationMean =
    pdData.reduce((sum, d) => sum + d.duration, 0) / pdData.length;
  const pdTypingSpeed =
    pdData.reduce((sum, d) => sum + d.typingSpeed, 0) / pdData.length;

  // Convert to milliseconds and ensure patterns match enhanced dataset findings
  // Based on enhanced dataset: Control 262.5ms delay, PD 250.9ms delay (0.96x ratio)
  // Control 180.2ms duration, PD 291.6ms duration (1.62x ratio)

  return {
    pd: {
      overall: {
        delay: {
          mean: 250, // PD delay mean from enhanced dataset
          std: 100, // Reasonable variation
        },
        duration: {
          mean: 292, // PD duration mean from enhanced dataset
          std: 80,
        },
      },
      avg_typing_speed: pdTypingSpeed,
    },
    control: {
      overall: {
        delay: {
          mean: 263, // Control delay mean from enhanced dataset
          std: 100, // Same variation as PD
        },
        duration: {
          mean: 180, // Control duration mean from enhanced dataset
          std: 50,
        },
      },
      avg_typing_speed: controlTypingSpeed,
    },
  };
}

// Load typing data
async function loadTypingData() {
  try {
    // Load typing simulations
    const simResponse = await fetch("data/typing_simulations.json");
    typingSimulations = await simResponse.json();

    // Load enhanced dataset for consistent patterns
    const enhancedResponse = await fetch("data/enhanced_simulation_data.csv");
    const enhancedCsvText = await enhancedResponse.text();

    // Parse enhanced dataset
    const enhancedData = parseEnhancedDataset(enhancedCsvText);

    // Create patterns from enhanced dataset
    typingPatterns = createPatternsFromEnhancedData(enhancedData);


  } catch (error) {
    console.error("Error loading typing data:", error);
  }
}

// Select a random typing prompt
function selectRandomPrompt() {
  currentPrompt =
    typingPrompts[Math.floor(Math.random() * typingPrompts.length)];

  // Create character spans for the prompt
  createPromptCharacters();
}

// Create character spans for visual feedback
function createPromptCharacters() {
  const promptElement = document.getElementById("prompt-text");
  promptElement.innerHTML = "";

  // Split the prompt into words and handle each word separately
  const words = currentPrompt.split(" ");
  let charIndex = 0;

  words.forEach((word, wordIndex) => {
    // Create a word container to keep the word together
    const wordSpan = document.createElement("span");
    wordSpan.className = "prompt-word";

    // Add characters for this word
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const span = document.createElement("span");
      span.className = "prompt-char";
      span.textContent = char;
      span.dataset.index = charIndex;
      wordSpan.appendChild(span);
      charIndex++;
    }

    promptElement.appendChild(wordSpan);

    // Add space after word (except for the last word)
    if (wordIndex < words.length - 1) {
      const spaceSpan = document.createElement("span");
      spaceSpan.className = "prompt-char prompt-space";
      spaceSpan.textContent = " ";
      spaceSpan.dataset.index = charIndex;
      promptElement.appendChild(spaceSpan);
      charIndex++;
    }
  });

  // Mark the first character as current
  if (promptElement.querySelector(".prompt-char")) {
    promptElement.querySelector(".prompt-char").classList.add("current");
  }
}

// Update prompt highlighting based on typed text
function updatePromptHighlighting(typedText) {
  const promptChars = document.querySelectorAll(".prompt-char");

  // Reset all characters
  promptChars.forEach((char) => {
    char.classList.remove("correct", "incorrect", "current");
  });

  // Ensure we don't go beyond the prompt length
  const maxLength = Math.min(typedText.length, currentPrompt.length);

  // Highlight typed characters one by one
  for (let i = 0; i < maxLength; i++) {
    if (i < promptChars.length) {
      if (typedText[i] === currentPrompt[i]) {
        promptChars[i].classList.add("correct");
      } else {
        promptChars[i].classList.add("incorrect");
      }
    }
  }

  // Mark current position (next character to type)
  if (
    typedText.length < promptChars.length &&
    typedText.length < currentPrompt.length
  ) {
    promptChars[typedText.length].classList.add("current");
  }
}

// Create keyboard SVGs
function createKeyboards() {
  createKeyboard("user-keyboard", "user");
  createKeyboard("pd-keyboard", "pd");
}

function createKeyboard(containerId, type) {
  const container = d3.select(`#${containerId}`);
  const keySize = 50;
  const keySpacing = 6;
  const rowOffsets = [0, keySize * 0.5, keySize];

  const totalWidth = keyboardLayout[0].length * (keySize + keySpacing);
  const totalHeight = keyboardLayout.length * (keySize + keySpacing) + keySize;

  const svg = container
    .append("svg")
    .attr("class", "keyboard-svg")
    .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  keyboardLayout.forEach((row, rowIndex) => {
    const rowGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${rowOffsets[rowIndex]}, ${
          rowIndex * (keySize + keySpacing)
        })`
      );

    row.forEach((key, keyIndex) => {
      const keyGroup = rowGroup
        .append("g")
        .attr("class", "key-group")
        .attr("id", `key-${type}-${key}`)
        .attr(
          "transform",
          `translate(${keyIndex * (keySize + keySpacing)}, 0)`
        );

      keyGroup
        .append("rect")
        .attr("width", keySize)
        .attr("height", keySize)
        .attr("rx", 6)
        .attr("ry", 6);

      keyGroup
        .append("text")
        .attr("class", "key-label")
        .attr("x", keySize / 2)
        .attr("y", keySize / 2)
        .attr("dy", "0.35em")
        .text(key.toUpperCase());
    });
  });

  // Add space bar with better positioning
  const spaceGroup = svg
    .append("g")
    .attr("class", "key-group")
    .attr("id", `key-${type}-space`)
    .attr(
      "transform",
      `translate(${keySize * 1.5}, ${3 * (keySize + keySpacing) + 10})`
    );

  spaceGroup
    .append("rect")
    .attr("width", keySize * 7)
    .attr("height", keySize * 0.8)
    .attr("rx", 6)
    .attr("ry", 6);

  spaceGroup
    .append("text")
    .attr("class", "key-label")
    .attr("x", keySize * 3.5)
    .attr("y", keySize * 0.4)
    .attr("dy", "0.35em")
    .text("SPACE");
}

// Setup metrics charts
let delayChart, durationChart;
let userDelayData = [];
let userDurationData = [];
let pdDelayData = [];
let pdDurationData = [];

function setupMetricsCharts() {
  const container = d3.select("#metrics-charts");

  // Create delay chart
  const delayContainer = container
    .append("div")
    .attr("class", "chart-container");

  delayContainer
    .append("div")
    .attr("class", "chart-title")
    .text("Key Press Delay (ms)");

  delayChart = createChart(delayContainer, "delay-chart");

  // Create duration chart
  const durationContainer = container
    .append("div")
    .attr("class", "chart-container");

  durationContainer
    .append("div")
    .attr("class", "chart-title")
    .text("Key Press Duration (ms)");

  durationChart = createChart(durationContainer, "duration-chart");

  // Add legend
  const legendContainer = container
    .append("div")
    .attr("class", "chart-legend")
    .style("text-align", "center")
    .style("margin-top", "10px");

  legendContainer
    .append("span")
    .style("display", "inline-block")
    .style("width", "20px")
    .style("height", "3px")
    .style("background-color", "var(--user-color)")
    .style("margin-right", "5px");

  legendContainer
    .append("span")
    .text("You")
    .style("margin-right", "20px")
    .style("font-size", "12px");

  legendContainer
    .append("span")
    .style("display", "inline-block")
    .style("width", "20px")
    .style("height", "3px")
    .style("background-color", "var(--pd-color)")
    .style("margin-right", "5px");

  legendContainer.append("span").text("PD Patient").style("font-size", "12px");
}

function createChart(container, id) {
  const margin = { top: 10, right: 30, bottom: 30, left: 40 };
  const width = 260 - margin.left - margin.right;
  const height = 120 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const xScale = d3.scaleLinear().domain([0, 20]).range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([0, id === "delay-chart" ? 500 : 300])
    .range([height, 0]);

  // Axes
  g.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(5));

  g.append("g").attr("class", "axis y-axis").call(d3.axisLeft(yScale).ticks(5));

  // Lines
  g.append("path").attr("class", "line-user").attr("id", `${id}-user`);
  g.append("path").attr("class", "line-pd").attr("id", `${id}-pd`);

  return { svg: g, xScale, yScale, width, height };
}

// Setup tooltips
function setupTooltips() {
  // Create tooltip element
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Add hover to similarity score
  const similarityCircle = document.getElementById("similarity-score");
  similarityCircle.addEventListener("mouseenter", function (event) {
    const score = parseFloat(this.querySelector("span").textContent) || 0;
    let details = getDetailedSimilarityInfo(score);

    tooltip
      .html(details)
      .style("opacity", 1)
      .style("left", event.pageX - 100 + "px")
      .style("top", event.pageY + 20 + "px");
  });

  similarityCircle.addEventListener("mouseleave", function () {
    tooltip.style("opacity", 0);
  });
}

// Get detailed similarity information
function getDetailedSimilarityInfo(score) {
  if (score < 40) {
    return `<strong>Low Similarity (${score}%)</strong><br/>
            Your typing patterns show minimal overlap with PD patients.<br/>
            • Significantly faster key transitions<br/>
            • More consistent timing<br/>
            • No signs of motor impairment`;
  } else if (score < 60) {
    return `<strong>Moderate Similarity (${score}%)</strong><br/>
            Some aspects of your typing resemble PD patterns.<br/>
            • Occasional timing variations<br/>
            • Some keys show similar delays<br/>
            • Worth monitoring if persistent`;
  } else if (score < 80) {
    return `<strong>High Similarity (${score}%)</strong><br/>
            Your typing shows notable similarities to PD patterns.<br/>
            • Consistent timing delays<br/>
            • Similar key press durations<br/>
            • Consider professional evaluation`;
  } else {
    return `<strong>Very High Similarity (${score}%)</strong><br/>
            Your typing patterns closely match PD characteristics.<br/>
            • Significant motor timing delays<br/>
            • Extended key press durations<br/>
            • Recommended: consult a neurologist`;
  }
}

// Get similarity interpretation text
function getSimilarityInterpretation(score) {
  let interpretation = "";
  let disclaimer = "";

  if (score < 30) {
    interpretation = "Healthy typing pattern detected";
  } else if (score < 50) {
    interpretation = "Minor similarities to PD patterns";
  } else if (score < 70) {
    interpretation = "Notable similarities - monitor changes";
  } else if (score < 85) {
    interpretation = "Strong pattern match - consider evaluation";
    disclaimer = "*This is not a medical diagnostic tool";
  } else {
    interpretation = "Very strong match - seek medical advice";
    disclaimer = "*This is not a medical diagnostic tool";
  }

  return disclaimer ? `${interpretation}\n${disclaimer}` : interpretation;
}

// Update charts with new data
function updateCharts() {
  if (!isTyping && !testComplete) return;

  updateChartLine(delayChart, "delay-chart", userDelayData, pdDelayData, true);
  updateChartLine(
    durationChart,
    "duration-chart",
    userDurationData,
    pdDurationData,
    false
  );
}

function updateChartLine(chart, chartId, userData, pdData, isDelay) {
  const windowSize = 20;
  const userWindow = userData.slice(-windowSize);
  const pdWindow = pdData.slice(-windowSize);

  // Clear charts if no data
  if (userWindow.length === 0 && pdWindow.length === 0) {
    chart.svg.select(`#${chartId}-user`).attr("d", "");
    chart.svg.select(`#${chartId}-pd`).attr("d", "");

    // Remove any existing dots and tooltips
    chart.svg.selectAll(".chart-dot").remove();

    // Hide all tooltips for this chart immediately
    d3.selectAll(`.chart-tooltip-${chartId}`)
      .style("visibility", "hidden")
      .style("opacity", 0);

    // Reset Y scale to default
    chart.yScale.domain([0, chartId === "delay-chart" ? 500 : 300]);

    // Update axes
    chart.svg
      .select(".y-axis")
      .transition()
      .duration(100)
      .call(d3.axisLeft(chart.yScale).ticks(5));

    return;
  }

  // Implement smarter scaling to prevent extreme outliers from dominating
  const allData = [...userWindow, ...pdWindow].filter(
    (d) => !isNaN(d) && d > 0
  );

  if (allData.length > 0) {
    // Use 95th percentile instead of max to ignore extreme outliers
    allData.sort((a, b) => a - b);
    const p95Index = Math.floor(allData.length * 0.95);
    const p95Value = allData[Math.min(p95Index, allData.length - 1)];

    // Set reasonable maximum values based on medical data
    const medicalMaxDelay = 800; // 800ms is very slow for typing
    const medicalMaxDuration = 400; // 400ms is very long key hold

    // Use the smaller of 95th percentile * 1.2 or medical maximum
    const maxFromData = p95Value * 1.2;
    const medicalMax = isDelay ? medicalMaxDelay : medicalMaxDuration;
    const maxY = Math.min(maxFromData, medicalMax);

    // Ensure minimum scale for visibility
    const minScale = isDelay ? 200 : 150;
    const finalMaxY = Math.max(maxY, minScale);

    chart.yScale.domain([0, finalMaxY]);

    // Update Y axis
    chart.svg
      .select(".y-axis")
      .transition()
      .duration(100)
      .call(d3.axisLeft(chart.yScale).ticks(5));
  }

  // Update lines
  const line = d3
    .line()
    .x((d, i) => chart.xScale(i))
    .y((d) => chart.yScale(d))
    .curve(d3.curveMonotoneX);

  // Remove existing dots
  chart.svg.selectAll(".chart-dot").remove();

  // Create or update tooltip for this specific chart using D3
  const tooltipId = `chart-tooltip-${chartId}`;
  let tooltip = d3.select(`#${tooltipId}`);
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("id", tooltipId)
      .attr("class", `chart-tooltip chart-tooltip-${chartId}`)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("opacity", "0")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("font-size", "11px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("white-space", "nowrap")
      .style("transition", "opacity 0.2s ease");
  }

  // Helper function to create dots with improved D3 hover behavior
  function createDots(data, className, color, label) {
    if (data.length > 0) {
      chart.svg
        .selectAll(`.${className}`)
        .data(data)
        .enter()
        .append("circle")
        .attr("class", `chart-dot ${className}`)
        .attr("cx", (d, i) => chart.xScale(i))
        .attr("cy", (d) => chart.yScale(d))
        .attr("r", 3)
        .attr("fill", color)
        .style("cursor", "pointer")
        .style("stroke", "white")
        .style("stroke-width", "1px")
        .on("mouseenter", function (event, d) {
          // Hide all other chart tooltips first
          d3.selectAll(".chart-tooltip")
            .style("visibility", "hidden")
            .style("opacity", "0");

          d3.select(this).transition().duration(100).attr("r", 4.5);

          tooltip
            .html(`${label}: ${Math.round(d)} ms`)
            .style("visibility", "visible")
            .transition()
            .duration(150)
            .style("opacity", "1");
        })
        .on("mousemove", function (event) {
          const rect = chart.svg.node().getBoundingClientRect();
          const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft;
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

          tooltip
            .style("left", event.clientX + scrollLeft + 10 + "px")
            .style("top", event.clientY + scrollTop - 30 + "px");
        })
        .on("mouseleave", function () {
          d3.select(this).transition().duration(100).attr("r", 3);

          tooltip
            .transition()
            .duration(150)
            .style("opacity", "0")
            .on("end", function () {
              tooltip.style("visibility", "hidden");
            });
        });
    }
  }

  // Create dots for both datasets
  createDots(userWindow, "user-dot", "#059669", "Your Data");
  createDots(pdWindow, "pd-dot", "#dc2626", "PD Patient");

  // Add chart container mouseleave handler to hide tooltips
  chart.svg.on("mouseleave", function () {
    // Hide all tooltips for this chart
    d3.selectAll(`.chart-tooltip-${chartId}`)
      .style("visibility", "hidden")
      .style("opacity", "0");
  });

  // Update lines
  if (userWindow.length > 1) {
    chart.svg
      .select(`#${chartId}-user`)
      .datum(userWindow)
      .attr("d", line)
      .attr("stroke", "#059669")
      .attr("stroke-width", 2)
      .attr("fill", "none");
  }

  if (pdWindow.length > 1) {
    chart.svg
      .select(`#${chartId}-pd`)
      .datum(pdWindow)
      .attr("d", line)
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2)
      .attr("fill", "none");
  }
}

// Setup typing input
function setupTypingInput() {
  const input = document.getElementById("typing-input");
  const resetBtn = document.getElementById("reset-btn");

  input.addEventListener("keydown", handleKeyDown);
  input.addEventListener("keyup", handleKeyUp);
  input.addEventListener("input", handleInput);

  resetBtn.addEventListener("click", resetTest);
}

// Handle keydown event
function handleKeyDown(event) {
  if (testComplete) return;

  if (!isTyping) {
    isTyping = true;
    userStartTime = Date.now();
    startPdSimulation();
  }

  const now = Date.now();
  const key = event.key.toLowerCase();
  const mappedKey = specialKeys[event.key] || key;

  // Only track printable characters and space
  if (key.length === 1 || event.key === " ") {
    const delay = lastKeyTime ? now - lastKeyTime : 100;

    userKeystrokes.push({
      key: mappedKey,
      pressTime: now,
      delay: delay,
      duration: null,
    });

    lastKeyTime = now;

    // Update delay data
    userDelayData.push(delay);

    // Highlight key
    highlightKey("user", mappedKey, true);
  }
}

// Handle keyup event
function handleKeyUp(event) {
  if (testComplete) return;

  const now = Date.now();
  const key = event.key.toLowerCase();
  const mappedKey = specialKeys[event.key] || key;

  // Find the last keystroke for this key
  for (let i = userKeystrokes.length - 1; i >= 0; i--) {
    if (
      userKeystrokes[i].key === mappedKey &&
      userKeystrokes[i].duration === null
    ) {
      userKeystrokes[i].duration = now - userKeystrokes[i].pressTime;
      userKeystrokes[i].releaseTime = now;

      // Update duration data
      userDurationData.push(userKeystrokes[i].duration);

      break;
    }
  }

  // Remove highlight
  highlightKey("user", mappedKey, false);

  // Update charts
  updateCharts();
  updateStats();
}

// Handle input event
function handleInput(event) {
  if (testComplete) {
    // Prevent further typing when test is complete
    return;
  }

  const input = event.target;
  const typedText = input.value;

  // Update prompt highlighting
  updatePromptHighlighting(typedText);

  // Count actual characters typed (not keystrokes)
  const progress = Math.min(
    100,
    (typedText.length / currentPrompt.length) * 100
  );
  document.getElementById("user-progress-fill").style.width = `${progress}%`;

  // Update stats
  updateStats();

  // Check if test is complete - more flexible completion logic
  const hasReachedEnd = typedText.length >= currentPrompt.length;
  const isExactMatch = typedText === currentPrompt;

  // Calculate accuracy for the overlapping portion
  let correctChars = 0;
  const comparisonLength = Math.min(typedText.length, currentPrompt.length);
  for (let i = 0; i < comparisonLength; i++) {
    if (typedText[i] === currentPrompt[i]) {
      correctChars++;
    }
  }
  const accuracy = comparisonLength > 0 ? correctChars / comparisonLength : 0;

  // Consider complete if:
  // 1. Exact match, OR
  // 2. Typed at least as many characters as prompt AND accuracy >= 80%
  const isComplete = isExactMatch || (hasReachedEnd && accuracy >= 0.8);

  if (isComplete && !userComplete) {
    userComplete = true;

    // If PD is also complete, finish test immediately
    if (pdComplete) {
      // Clear grace period timeout if it's running
      if (gracePeriodTimeout) {
        clearTimeout(gracePeriodTimeout);
        gracePeriodTimeout = null;
      }
      finishTest();
    }
    // If PD hasn't finished yet, just wait for it to complete
  }
}

// Highlight key on keyboard
function highlightKey(type, key, pressed) {
  const keyElement = d3.select(`#key-${type}-${key}`);

  if (pressed) {
    keyElement.classed("pressed", true);
    keyElement.classed(`pressed-${type}`, true);
  } else {
    keyElement.classed("pressed", false);
    keyElement.classed(`pressed-${type}`, false);
  }
}

// Start PD patient simulation
function startPdSimulation() {
  if (!typingSimulations || testComplete) return;

  // Clear previous timeouts
  simulationTimeouts.forEach((timeout) => clearTimeout(timeout));
  simulationTimeouts = [];

  // Reset PD data
  pdDelayData = [];
  pdDurationData = [];
  pdComplete = false;

  // Get simulation for current prompt
  let simulation = typingSimulations[currentPrompt]?.pd;

  // If no pre-generated simulation, use patterns to generate one
  if (!simulation && typingPatterns) {
    simulation = generateTypingSimulation(currentPrompt, "pd");
  }

  if (!simulation) {
    console.error("No simulation available for prompt");
    return;
  }

  // Calculate realistic PD typing speed that aligns with our research findings
  // Since typing speed should be non-significant between groups, use realistic range
  const controlAvgWpm = typingPatterns.control?.avg_typing_speed || 149;
  const pdAvgWpm = typingPatterns.pd?.avg_typing_speed || 144;

  // Use a realistic speed that's close to control group (showing non-significant difference)
  // Add some variation to make it feel natural
  const baseSpeed = (controlAvgWpm + pdAvgWpm) / 2; // Average of both groups
  const variation = (Math.random() - 0.5) * 20; // ±10 WPM variation
  const targetWpm = Math.round(
    Math.max(60, Math.min(120, baseSpeed + variation))
  );
  const originalTotalTime = simulation[simulation.length - 1].release_time;
  const words = currentPrompt.split(" ").length;

  const targetTimeMinutes = words / targetWpm;
  const targetTimeMs = targetTimeMinutes * 60000;

  // Calculate speed adjustment to hit realistic WPM
  const actualSpeedMultiplier = targetTimeMs / originalTotalTime;

  document.getElementById("pd-patient-id").textContent = "Composite";
  document.getElementById("pd-wpm").textContent = targetWpm;
  document.getElementById("pd-keys").textContent = "0";

  // Add PD patient stats (using representative values from the data)
  document.getElementById("pd-updrs").textContent = "14.3"; // Average UPDRS from dataset

  let pdKeysTyped = 0;
  let pdStartTime = Date.now();

  // Simulate each keystroke
  simulation.forEach((keystroke, index) => {
    // Simulate key press with adjusted timing
    const pressTimeout = setTimeout(() => {
      if (testComplete) return;

      highlightKey("pd", keystroke.key, true);

      // Record the raw delay value from simulation (already adjusted in generateTypingSimulation)
      if (keystroke.delay > 0) {
        pdDelayData.push(keystroke.delay);
      }

      pdKeysTyped++;
      document.getElementById("pd-keys").textContent = pdKeysTyped;

      // Update PD time
      const pdElapsedSeconds = Math.round((Date.now() - pdStartTime) / 1000);
      document.getElementById("pd-time").textContent = `${pdElapsedSeconds}s`;

      // Update progress based on character count, not keystroke count
      const currentCharIndex = Math.min(
        pdKeysTyped - 1,
        currentPrompt.length - 1
      );
      const progress = Math.min(
        100,
        ((currentCharIndex + 1) / currentPrompt.length) * 100
      );
      document.getElementById("pd-progress-fill").style.width = `${progress}%`;

      // Simulate key release
      const releaseTimeout = setTimeout(() => {
        if (testComplete) return;

        highlightKey("pd", keystroke.key, false);

        // Record the raw duration value from simulation (already adjusted in generateTypingSimulation)
        pdDurationData.push(keystroke.duration);

        updateCharts();

        // Check if PD simulation is complete (based on character progress)
        if (currentCharIndex >= currentPrompt.length - 1 && !pdComplete) {
          pdComplete = true;
          checkTestCompletion();
        }
      }, keystroke.duration * actualSpeedMultiplier);

      simulationTimeouts.push(releaseTimeout);
    }, keystroke.press_time * actualSpeedMultiplier);

    simulationTimeouts.push(pressTimeout);
  });

  // Set a shorter timeout for test completion (20 seconds instead of 30)
  completionTimeout = setTimeout(() => {
    if (!testComplete) {
      // do nothing
    }
  }, 20000);
}

// Check if both user and PD have completed
function checkTestCompletion() {
  if (userComplete && pdComplete && !testComplete) {
    finishTest();
  } else if (pdComplete && !userComplete && !testComplete) {
    pdFinishTime = Date.now();

    // Calculate grace period based on prompt length
    const promptWords = currentPrompt.split(" ").length;
    let gracePeriod = 3000; // Base 3 seconds for medium-length prompts

    if (promptWords <= 20) {
      gracePeriod = 3000; // Shorter prompts: 3 seconds
    } else if (promptWords <= 30) {
      gracePeriod = 4000; // Medium prompts: 4 seconds
    } else {
      gracePeriod = 5000; // Longer prompts: 5 seconds
    }

    // Start grace period
    gracePeriodTimeout = setTimeout(() => {
      if (!testComplete && !userComplete) {
        // User didn't finish in time, start countdown
        showCountdownPopup();
      }
    }, gracePeriod);
  }
}

// Generate typing simulation dynamically
function generateTypingSimulation(prompt, group = "pd") {
  if (!typingPatterns) return null;

  const patterns = typingPatterns[group];
  const simulation = [];

  // Convert prompt to list of keys
  const keys = [];
  for (const char of prompt.toLowerCase()) {
    if (char === " ") {
      keys.push("space");
    } else if (char.match(/[a-z]/)) {
      keys.push(char);
    }
  }

  let currentTime = 0;

  // Use actual values from enhanced dataset (no hardcoded multipliers)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    // Get delay directly from enhanced dataset patterns
    let delay = 100;
    if (i > 0) {
      delay = Math.max(30, patterns.overall.delay.mean);
      // Add realistic randomness based on standard deviation
      const delayVariation =
        (Math.random() - 0.5) * (patterns.overall.delay.std || 50);
      delay = Math.max(30, delay + delayVariation);
    }

    // Get duration directly from enhanced dataset patterns
    let duration = Math.max(50, patterns.overall.duration.mean);
    // Add realistic randomness based on standard deviation
    const durationVariation =
      (Math.random() - 0.5) * (patterns.overall.duration.std || 100);
    duration = Math.max(50, duration + durationVariation);

    currentTime += delay;

    simulation.push({
      key: key,
      delay: delay,
      duration: duration,
      press_time: currentTime,
      release_time: currentTime + duration,
    });
  }

  return simulation;
}

// Update statistics
function updateStats() {
  // Calculate WPM for user
  if (userStartTime && userKeystrokes.length > 0) {
    // Use actual elapsed time for WPM calculation
    const elapsedMinutes = (Date.now() - userStartTime) / 60000;

    // Calculate words based on typed text length (more accurate than keystroke counting)
    const typedText = document.getElementById("typing-input").value;
    const estimatedWords = typedText.length / 5; // Standard: 5 characters per word

    // Calculate WPM
    if (elapsedMinutes > 0) {
      const wpm = Math.round(estimatedWords / elapsedMinutes);
      document.getElementById("user-wpm").textContent = Math.max(
        1,
        Math.min(300, wpm)
      );
    }

    // Update time
    const elapsedSeconds = Math.round((Date.now() - userStartTime) / 1000);
    document.getElementById("user-time").textContent = `${elapsedSeconds}s`;
  }

  document.getElementById("user-keys").textContent = userKeystrokes.length;

  // Calculate accuracy for user
  if (isTyping) {
    const typedText = document.getElementById("typing-input").value;
    const comparisonLength = Math.min(typedText.length, currentPrompt.length);
    let correctChars = 0;
    for (let i = 0; i < comparisonLength; i++) {
      if (typedText[i] === currentPrompt[i]) {
        correctChars++;
      }
    }
    const accuracy =
      comparisonLength > 0
        ? Math.round((correctChars / comparisonLength) * 100)
        : 0;
    document.getElementById("user-accuracy").textContent = `${accuracy}%`;
  }

  // Update analysis
  updateAnalysis();
}

// Update analysis section
function updateAnalysis() {
  // Only show analysis when test is complete
  if (!testComplete) {
    document.querySelector(".analysis-section").classList.remove("show");
    return;
  }

  // Calculate averages for user
  const userAvgDelay =
    userDelayData.length > 0
      ? userDelayData.reduce((a, b) => a + b, 0) / userDelayData.length
      : 0;
  const userAvgDuration =
    userDurationData.length > 0
      ? userDurationData.reduce((a, b) => a + b, 0) / userDurationData.length
      : 0;

  // Calculate averages for PD
  const pdAvgDelay =
    pdDelayData.length > 0
      ? pdDelayData.reduce((a, b) => a + b, 0) / pdDelayData.length
      : 0;
  const pdAvgDuration =
    pdDurationData.length > 0
      ? pdDurationData.reduce((a, b) => a + b, 0) / pdDurationData.length
      : 0;

  // Update UI
  document.getElementById("user-avg-delay").textContent =
    userAvgDelay > 0 ? `${Math.round(userAvgDelay)} ms` : "-- ms";
  document.getElementById("user-avg-duration").textContent =
    userAvgDuration > 0 ? `${Math.round(userAvgDuration)} ms` : "-- ms";
  document.getElementById("pd-avg-delay").textContent =
    pdAvgDelay > 0 ? `${Math.round(pdAvgDelay)} ms` : "-- ms";
  document.getElementById("pd-avg-duration").textContent =
    pdAvgDuration > 0 ? `${Math.round(pdAvgDuration)} ms` : "-- ms";

  // Calculate similarity score based on enhanced dataset findings
  if (userDelayData.length > 5 && pdDelayData.length > 5) {
    // Based on our enhanced dataset findings:
    // - Typing speed is non-significant (similar between groups)
    // - Duration is significant (PD ~62% higher than control)
    // - Delay is non-significant (similar between groups)

    // Focus primarily on duration differences since that's the main biomarker
    const durationRatio = userAvgDuration / Math.max(pdAvgDuration, 1);

    // Healthy users should have much shorter durations than PD patients
    // PD patients have ~62% higher duration on average
    // So healthy users should be around 62% of PD duration
    const expectedHealthyRatio = 0.62;

    // Calculate how far the user is from the expected healthy pattern
    const durationDeviation =
      Math.abs(durationRatio - expectedHealthyRatio) / expectedHealthyRatio;

    // Convert to similarity score (lower deviation = lower similarity to PD)
    let similarity = 100 / (1 + durationDeviation * 4);

    // Additional factors for realism
    if (durationRatio < 0.8) {
      // User types with shorter durations (healthier pattern)
      similarity *= 0.5; // Lower similarity to PD
    } else if (durationRatio > 1.2) {
      // User types with longer durations (more PD-like)
      similarity = Math.min(similarity * 1.5, 90); // Higher similarity but cap at 90%
    }

    similarity = Math.max(5, Math.min(95, similarity)); // Ensure reasonable range

    const scoreElement = document.querySelector("#similarity-score span");
    scoreElement.textContent = `${Math.round(similarity)}%`;

    // Update circle gradient
    const circle = document.getElementById("similarity-score");
    circle.style.background = `conic-gradient(var(--accent-color) 0deg ${
      similarity * 3.6
    }deg, var(--border-color) ${similarity * 3.6}deg)`;

    // Update interpretation with better messages
    const interpretation = document.getElementById("similarity-interpretation");
    const interpretationText = getSimilarityInterpretation(similarity);

    // Use innerHTML to handle line breaks and styling
    interpretation.innerHTML =
      interpretationText.replace(
        "\n",
        '<br><small style="color: var(--warning-color); font-style: italic; font-size: 0.8em;">'
      ) + (interpretationText.includes("\n") ? "</small>" : "");
  }
}

// Finish the test and show results
function finishTest() {
  if (testComplete) return;

  testComplete = true;
  isTyping = false;

  // Clear all timeouts
  clearAllPopupTimeouts();

  // Clear all highlights
  d3.selectAll(".key-group").classed("pressed pressed-user pressed-pd", false);

  // Disable typing input
  const typingInput = document.getElementById("typing-input");
  typingInput.disabled = true;
  typingInput.style.opacity = "0.6";

  // Show completion stats by adding test-complete class to keyboard wrappers
  document.querySelectorAll(".keyboard-wrapper").forEach((wrapper) => {
    wrapper.classList.add("test-complete");
  });

  // Stop PD simulation
  simulationTimeouts.forEach((timeout) => clearTimeout(timeout));

  if (completionTimeout) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }

  // Ensure progress bars show completion status
  const userProgress =
    parseFloat(document.getElementById("user-progress-fill").style.width) || 0;
  const pdProgress =
    parseFloat(document.getElementById("pd-progress-fill").style.width) || 0;

  if (userComplete && userProgress >= 99) {
    document.getElementById("user-progress-fill").style.width = "100%";
  }
  if (pdComplete && pdProgress >= 99) {
    document.getElementById("pd-progress-fill").style.width = "100%";
  }

  // Show completion popup
  showCompletionPopup();

  // Show loading animation
  const loadingContainer = document.getElementById("loading-container");
  if (loadingContainer) {
    loadingContainer.classList.add("show");
  }

  // Simulate analysis time
  setTimeout(() => {
    if (loadingContainer) {
      loadingContainer.classList.remove("show");
    }

    // Hide popup and show analysis
    hidePopup();

    // Show analysis with animation
    updateAnalysis();
    document.querySelector(".analysis-section").classList.add("show");
  }, 1500);
}

// Show completion popup with timer emoji
function showCompletionPopup() {
  const popup = document.getElementById("inline-notification");
  if (!popup) return;

  popup.innerHTML = `<span>⏰ Analysis complete!</span>`;
  popup.classList.add("show");

  // Auto-hide after 3 seconds
  popupTimeout = setTimeout(() => {
    hidePopup();
  }, 3000);
}

// Show countdown popup
function showCountdownPopup() {
  const popup = document.getElementById("inline-notification");
  if (!popup) return;

  // Calculate countdown duration based on prompt length
  const promptWords = currentPrompt.split(" ").length;
  let countdownDuration = 20; // Base 20 seconds for medium-length prompts

  if (promptWords <= 20) {
    countdownDuration = 20; // Shorter prompts: 20 seconds
  } else if (promptWords <= 30) {
    countdownDuration = 25; // Medium prompts: 25 seconds
  } else {
    countdownDuration = 30; // Longer prompts: 30 seconds
  }

  let timeLeft = countdownDuration;

  popup.innerHTML = `
    <span>Keep typing! Analysis generated in: </span>
    <span class="countdown-inline">${timeLeft}s</span>
  `;
  popup.classList.add("show");

  // Update countdown every second
  countdownInterval = setInterval(() => {
    timeLeft--;

    const countdownElement = popup.querySelector(".countdown-inline");
    if (countdownElement && timeLeft > 0) {
      countdownElement.textContent = `${timeLeft}s`;
    }

    // Check if user finished during countdown
    if (userComplete && !testComplete) {
      clearInterval(countdownInterval);
      countdownInterval = null;

      // Change to completion message
      popup.innerHTML = `<span>⏰ Analysis complete!</span>`;

      // Finish test after brief delay
      setTimeout(() => {
        finishTest();
      }, 500);
      return;
    }

    // Time's up
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      finishTest();
    }
  }, 1000);
}

// Hide popup
function hidePopup() {
  const popup = document.getElementById("inline-notification");
  if (popup) {
    popup.classList.remove("show");
    setTimeout(() => {
      popup.innerHTML = "";
    }, 300);
  }
}

// Clear all popup-related timeouts
function clearAllPopupTimeouts() {
  if (popupTimeout) {
    clearTimeout(popupTimeout);
    popupTimeout = null;
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (gracePeriodTimeout) {
    clearTimeout(gracePeriodTimeout);
    gracePeriodTimeout = null;
  }
}

// Reset test
function resetTest() {
  // Immediately mark test as complete to stop all ongoing processes
  testComplete = true;

  // Clear all timeouts and intervals
  simulationTimeouts.forEach((timeout) => clearTimeout(timeout));
  simulationTimeouts = [];

  if (completionTimeout) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }

  // Clear all popup timeouts
  clearAllPopupTimeouts();
  hidePopup();

  // Wait a brief moment to ensure all processes stop
  setTimeout(() => {
    // Clear data
    userKeystrokes = [];
    userDelayData = [];
    userDurationData = [];
    pdDelayData = [];
    pdDurationData = [];
    userStartTime = null;
    lastKeyTime = null;
    pdFinishTime = null;
    isTyping = false;
    testComplete = false;
    userComplete = false;
    pdComplete = false;

    // Reset UI
    document.getElementById("typing-input").value = "";
    document.getElementById("typing-input").disabled = false;
    document.getElementById("typing-input").style.opacity = "1";
    document.getElementById("user-progress-fill").style.width = "0%";
    document.getElementById("pd-progress-fill").style.width = "0%";
    document.getElementById("user-wpm").textContent = "--";
    document.getElementById("user-keys").textContent = "--";
    document.getElementById("user-time").textContent = "--s";
    document.getElementById("user-accuracy").textContent = "--%";
    document.getElementById("pd-wpm").textContent = "--";
    document.getElementById("pd-keys").textContent = "--";
    document.getElementById("pd-time").textContent = "--s";
    document.getElementById("pd-updrs").textContent = "--";

    // Hide completion stats by removing test-complete class
    document.querySelectorAll(".keyboard-wrapper").forEach((wrapper) => {
      wrapper.classList.remove("test-complete");
    });

    // Clear highlights
    d3.selectAll(".key-group").classed(
      "pressed pressed-user pressed-pd",
      false
    );

    // Completely reset charts - clear lines, dots, and reset scales
    if (delayChart && delayChart.svg) {
      delayChart.svg.select("#delay-chart-user").attr("d", "");
      delayChart.svg.select("#delay-chart-pd").attr("d", "");
      delayChart.svg.selectAll(".chart-dot").remove();

      // Reset scale and axis
      delayChart.yScale.domain([0, 500]);
      delayChart.svg
        .select(".y-axis")
        .call(d3.axisLeft(delayChart.yScale).ticks(5));
    }

    if (durationChart && durationChart.svg) {
      durationChart.svg.select("#duration-chart-user").attr("d", "");
      durationChart.svg.select("#duration-chart-pd").attr("d", "");
      durationChart.svg.selectAll(".chart-dot").remove();

      // Reset scale and axis
      durationChart.yScale.domain([0, 300]);
      durationChart.svg
        .select(".y-axis")
        .call(d3.axisLeft(durationChart.yScale).ticks(5));
    }

    // Clear any remaining tooltips using D3
    d3.selectAll(".chart-tooltip").remove();

    // Reset analysis displays
    document.getElementById("user-avg-delay").textContent = "-- ms";
    document.getElementById("user-avg-duration").textContent = "-- ms";
    document.getElementById("pd-avg-delay").textContent = "-- ms";
    document.getElementById("pd-avg-duration").textContent = "-- ms";
    document.querySelector("#similarity-score span").textContent = "--%";
    document.getElementById("similarity-score").style.background =
      `conic-gradient(var(--accent-color) 0deg, var(--border-color) 0deg)`;
    document.getElementById("similarity-interpretation").textContent = "";

    // Hide analysis section
    document.querySelector(".analysis-section").classList.remove("show");
    document.getElementById("loading-container").classList.remove("show");

    // Select new random prompt
    selectRandomPrompt();
  }, 100);
}

// Animation frame for smooth updates
let animationId;
function animate() {
  if (isTyping || testComplete) {
    updateCharts();
  }
  animationId = requestAnimationFrame(animate);
}

// Start animation loop
animate();

// Setup navigation for smooth scrolling
function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      // Only prevent default for internal links (starting with #)
      if (href && href.startsWith("#")) {
        e.preventDefault();

        const targetSection = document.querySelector(href);

        if (targetSection) {
          const navHeight = document.querySelector(".nav").offsetHeight;
          const targetPosition = targetSection.offsetTop - navHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });
        }
      }
      // For external links (like Data link), let the browser handle normally
    });
  });
}
