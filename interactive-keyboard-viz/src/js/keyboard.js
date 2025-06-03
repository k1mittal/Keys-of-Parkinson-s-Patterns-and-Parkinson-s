import { updateDistributionChart } from './chart.js';

const keyboardLayout = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
];

let selectedKeys = new Set();
let holdData = null;

// Load the hold times data
d3.json('data/hold_data.json').then(data => {
    holdData = data;
    console.log('Loaded hold data:', holdData);
    initializeKeyboard();
}).catch(error => console.error('Error loading data:', error));

function initializeKeyboard() {
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 600 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const keyWidth = width / 10;
    const keyHeight = height / 3;
    const keyPadding = 4;

    const svg = d3.select('#keyboard')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    keyboardLayout.forEach((row, i) => {
        const rowOffset = i === 1 ? keyWidth / 4 : (i === 2 ? keyWidth / 2 : 0);

        row.split('').forEach((key, j) => {
            const keyGroup = svg.append('g')
                .attr('transform', `translate(${j * (keyWidth + keyPadding) + rowOffset}, ${i * (keyHeight + keyPadding)})`);

            keyGroup.append('rect')
                .attr('class', 'key')
                .attr('width', keyWidth)
                .attr('height', keyHeight)
                .attr('rx', 5)
                .on('click', () => toggleKey(key));

            keyGroup.append('text')
                .attr('class', 'key-text')
                .attr('x', keyWidth / 2)
                .attr('y', keyHeight / 2)
                .text(key.toUpperCase());
        });
    });
}

function toggleKey(key) {
    if (selectedKeys.has(key)) {
        selectedKeys.delete(key);
        d3.selectAll('.key')
            .filter(function() {
                return d3.select(this.parentNode)
                    .select('.key-text')
                    .text() === key.toUpperCase();
            })
            .classed('selected', false);
        console.log(`Deselected key: ${key}`);
    } else {
        selectedKeys.add(key);
        d3.selectAll('.key')
            .filter(function() {
                return d3.select(this.parentNode)
                    .select('.key-text')
                    .text() === key.toUpperCase();
            })
            .classed('selected', true);
        console.log(`Selected key: ${key}`);
    }
    
    console.log('Current selected keys:', Array.from(selectedKeys));
    console.log('Updating chart with data:', {
        selectedKeys: Array.from(selectedKeys),
        holdData: holdData
    });
    
    // Trigger distribution chart update
    updateDistributionChart(selectedKeys, holdData);
}

// Theme toggle functionality
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// Clear selection functionality
document.getElementById('clear-selection').addEventListener('click', () => {
    selectedKeys.clear();
    d3.selectAll('.key').classed('selected', false);
    updateDistributionChart(selectedKeys, holdData);
});

export { selectedKeys, holdData };