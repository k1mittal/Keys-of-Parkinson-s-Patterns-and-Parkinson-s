let showHistogram = false; // State to track visualization mode

export function toggleVisualizationMode() {
    showHistogram = !showHistogram;
    console.log(`Visualization mode: ${showHistogram ? 'Histogram' : 'KDE'}`);
}

export function updateDistributionChart(selectedKeys, holdData) {
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select('#distribution-viz').html('');

    if (!selectedKeys || selectedKeys.size === 0) {
        d3.select('#distribution-viz')
            .append('div')
            .attr('class', 'distribution-message')
            .text('Select keys to view distribution');
        return;
    }

    const svg = d3.select('#distribution-viz')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Key Hold Time Distribution');

    // Combine hold times for selected keys
    let pdHoldTimes = [];
    let controlHoldTimes = [];
    selectedKeys.forEach(key => {
        pdHoldTimes = pdHoldTimes.concat(holdData.pd[key] || []);
        controlHoldTimes = controlHoldTimes.concat(holdData.control[key] || []);
    });

    // Create scales with transitions
    const x = d3.scaleLinear()
        .domain([0, d3.max([...pdHoldTimes, ...controlHoldTimes]) || 1000])
        .range([0, width]);

    const xAxis = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`);

    const yAxis = svg.append('g')
        .attr('class', 'y-axis');

    // Add X axis label
    svg.append('text')
        .attr('class', 'x-label')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Hold Time (milliseconds)');

    // Add Y axis label
    svg.append('text')
        .attr('class', 'y-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(showHistogram ? 'Frequency' : 'Density');

    if (showHistogram) {
        // Render histogram
        const x = d3.scaleLinear()
            .domain([0, d3.max([...pdHoldTimes, ...controlHoldTimes]) || 1000])
            .range([0, width]);

        const bins = d3.bin()
            .domain(x.domain())
            .thresholds(x.ticks(20));

        const pdBins = bins(pdHoldTimes);
        const controlBins = bins(controlHoldTimes);

        const y = d3.scaleLinear()
            .domain([0, d3.max([...pdBins, ...controlBins], d => d.length)])
            .range([height, 0]);

        svg.selectAll('.bar-pd')
            .data(pdBins)
            .enter()
            .append('rect')
            .attr('class', 'bar-pd')
            .attr('x', d => x(d.x0))
            .attr('y', d => y(d.length))
            .attr('width', d => x(d.x1) - x(d.x0) - 1)
            .attr('height', d => height - y(d.length))
            .attr('fill', '#ff7f7f')
            .attr('opacity', 0.7);

        svg.selectAll('.bar-control')
            .data(controlBins)
            .enter()
            .append('rect')
            .attr('class', 'bar-control')
            .attr('x', d => x(d.x0))
            .attr('y', d => y(d.length))
            .attr('width', d => x(d.x1) - x(d.x0) - 1)
            .attr('height', d => height - y(d.length))
            .attr('fill', '#7f7fff')
            .attr('opacity', 0.7);

        // Update axes with transitions
        xAxis.transition().duration(500).call(
            d3.axisBottom(x)
                .ticks(10)
        );

        yAxis.transition().duration(500).call(
            d3.axisLeft(y)
                .ticks(5)
        );

    } else {
        // Render KDE
        const x = d3.scaleLinear()
            .domain([0, d3.max([...pdHoldTimes, ...controlHoldTimes]) || 1000])
            .range([0, width]);

        const kde = kernelDensityEstimator(kernelEpanechnikov(0.02), x.ticks(100));
        const pdDensity = kde(pdHoldTimes);
        const controlDensity = kde(controlHoldTimes);

        const y = d3.scaleLinear()
            .domain([0, d3.max([...pdDensity, ...controlDensity], d => d[1])])
            .range([height, 0]);

        svg.append('path')
            .datum(pdDensity)
            .attr('fill', '#ff7f7f')
            .attr('opacity', 0.5)
            .attr('stroke', '#ff0000')
            .attr('stroke-width', 1.5)
            .attr('d', d3.line()
                .curve(d3.curveBasis)
                .x(d => x(d[0]))
                .y(d => y(d[1]))
            );

        svg.append('path')
            .datum(controlDensity)
            .attr('fill', '#7f7fff')
            .attr('opacity', 0.5)
            .attr('stroke', '#0000ff')
            .attr('stroke-width', 1.5)
            .attr('d', d3.line()
                .curve(d3.curveBasis)
                .x(d => x(d[0]))
                .y(d => y(d[1]))
            );

        // Update axes with transitions
        xAxis.transition().duration(500).call(
            d3.axisBottom(x)
                .ticks(10)
        );

        yAxis.transition().duration(500).call(
            d3.axisLeft(y)
                .ticks(5)
                .tickFormat(d3.format('.2d'))
        );
    }

    // Add legend with transitions
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 120}, 20)`);

    const legendData = [
        { label: 'PD Group', color: '#ff7f7f' },
        { label: 'Control', color: '#7f7fff' }
    ];

    legend.selectAll('rect')
        .data(legendData)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * 20)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => d.color)
        .attr('opacity', 0.7);

    legend.selectAll('text')
        .data(legendData)
        .enter()
        .append('text')
        .attr('x', 20)
        .attr('y', (d, i) => i * 20 + 12)
        .text(d => d.label)
        .style('font-size', '12px')
        .attr('fill', 'currentColor');
}

function updateStatsSummary(pdHoldTimes, controlHoldTimes) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'stats-summary';
    
    const pdMean = d3.mean(pdHoldTimes) || 0;
    const controlMean = d3.mean(controlHoldTimes) || 0;
    const pdMedian = d3.median(pdHoldTimes) || 0;
    const controlMedian = d3.median(controlHoldTimes) || 0;
    
    summaryDiv.innerHTML = `
        <h4>Selected Keys Statistics</h4>
        <p>PD Group: ${pdHoldTimes.length} samples
           (Mean: ${pdMean.toFixed(2)}ms, Median: ${pdMedian.toFixed(2)}ms)</p>
        <p>Control Group: ${controlHoldTimes.length} samples
           (Mean: ${controlMean.toFixed(2)}ms, Median: ${controlMedian.toFixed(2)}ms)</p>
        <p>Difference: ${((pdMean - controlMean) / controlMean * 100).toFixed(1)}% longer hold times in PD group</p>
    `;
    
    // Insert the summary before the distribution chart
    const chartDiv = document.getElementById('distribution-viz');
    chartDiv.insertBefore(summaryDiv, chartDiv.firstChild);
}

// Kernel Density Estimation Helper Functions
function kernelDensityEstimator(kernel, X) {
    return function (V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function (v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}