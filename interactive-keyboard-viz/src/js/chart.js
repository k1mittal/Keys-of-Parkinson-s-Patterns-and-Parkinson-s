function updateDistributionChart(selectedKeys, holdData) {
    console.log('updateDistributionChart called with:', {
        selectedKeysSize: selectedKeys ? selectedKeys.size : 0,
        holdDataAvailable: !!holdData
    });

    const margin = { top: 30, right: 50, bottom: 40, left: 50 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select('#distribution').html('');

    if (!selectedKeys || selectedKeys.size === 0) {
        console.log('No keys selected, showing message');
        d3.select('#distribution')
            .append('div')
            .attr('class', 'distribution-message')
            .text('Select keys to view distribution');
        return;
    }

    if (!holdData) {
        console.error('Hold data is not available');
        return;
    }

    // Combine hold times for selected keys
    let pdHoldTimes = [];
    let controlHoldTimes = [];

    selectedKeys.forEach(key => {
        if (holdData.pd && holdData.pd[key]) {
            pdHoldTimes = pdHoldTimes.concat(holdData.pd[key]);
            console.log(`Added ${holdData.pd[key].length} PD samples for key ${key}`);
        }
        if (holdData.control && holdData.control[key]) {
            controlHoldTimes = controlHoldTimes.concat(holdData.control[key]);
            console.log(`Added ${holdData.control[key].length} Control samples for key ${key}`);
        }
    });

    console.log('Total samples:', {
        pdSamples: pdHoldTimes.length,
        controlSamples: controlHoldTimes.length
    });

    // Create scales
    const maxTime = Math.max(
        pdHoldTimes.length > 0 ? d3.max(pdHoldTimes) : 0,
        controlHoldTimes.length > 0 ? d3.max(controlHoldTimes) : 0
    );

    console.log('Scale domains:', {
        maxTime: maxTime,
        pdMax: pdHoldTimes.length > 0 ? d3.max(pdHoldTimes) : 0,
        controlMax: controlHoldTimes.length > 0 ? d3.max(controlHoldTimes) : 0
    });

    const x = d3.scaleLinear()
        .domain([0, maxTime || 1000])  // Use 1000ms as default if no data
        .range([0, width]);

    // Create kernel density estimators
    const bandwidth = 0.02;
    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), x.ticks(100));
    
    const pdDensity = pdHoldTimes.length > 0 ? kde(pdHoldTimes) : [];
    const controlDensity = controlHoldTimes.length > 0 ? kde(controlHoldTimes) : [];
    
    console.log('Density estimates:', {
        pdDensityPoints: pdDensity.length,
        controlDensityPoints: controlDensity.length,
        pdDensitySample: pdDensity.slice(0, 3),
        controlDensitySample: controlDensity.slice(0, 3)
    });

    const maxDensity = Math.max(
        pdDensity.length > 0 ? d3.max(pdDensity, d => d[1]) : 0,
        controlDensity.length > 0 ? d3.max(controlDensity, d => d[1]) : 0
    );

    const y = d3.scaleLinear()
        .domain([0, maxDensity || 1])  // Use 1 as default if maxDensity is 0
        .range([height, 0]);

    // Create SVG
    const svg = d3.select('#distribution')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add the area paths
    svg.append('path')
        .datum(pdDensity)
        .attr('fill', '#ff7f7f')
        .attr('opacity', .5)
        .attr('stroke', '#ff0000')
        .attr('stroke-width', 1.5)
        .attr('stroke-linejoin', 'round')
        .attr('d', d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]))
        );

    svg.append('path')
        .datum(controlDensity)
        .attr('fill', '#7f7fff')
        .attr('opacity', .5)
        .attr('stroke', '#0000ff')
        .attr('stroke-width', 1.5)
        .attr('stroke-linejoin', 'round')
        .attr('d', d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]))
        );

    // Add axes
    const xAxis = svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    const yAxis = svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y));

    // Add labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .text('Hold Time (ms)');

    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 120}, 0)`);

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
        .attr('opacity', 0.5);

    legend.selectAll('text')
        .data(legendData)
        .enter()
        .append('text')
        .attr('x', 20)
        .attr('y', (d, i) => i * 20 + 12)
        .text(d => d.label)
        .attr('fill', 'currentColor');
}

// Kernel density estimation functions
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}

export { updateDistributionChart };