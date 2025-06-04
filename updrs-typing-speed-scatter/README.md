# UPDRS Typing Speed Scatter Plot Visualization

This project visualizes the relationship between UPDRS scores and typing speed using a scatter plot created with D3.js. The visualization aims to provide insights into how typing speed may correlate with the severity of Parkinson's disease as measured by the UPDRS scale.

## Project Structure

```
updrs-typing-speed-scatter
├── src
│   ├── index.html          # Main HTML document
│   ├── main.js             # JavaScript code for D3.js visualization
│   ├── styles.css          # CSS styles for the visualization
│   └── data
│       └── GT_DataPD_MIT-CS1PD.csv  # Dataset containing UPDRS scores and typing speed
├── package.json            # npm configuration file
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine.

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd updrs-typing-speed-scatter
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

### Running the Visualization

1. Open `src/index.html` in your web browser to view the scatter plot visualization.

### Dataset Description

The dataset `GT_DataPD_MIT-CS1PD.csv` contains the following columns:

- **UPDRS Score**: A numerical score representing the severity of motor impairment in Parkinson's disease.
- **Typing Speed**: The speed of typing measured in words per minute (WPM).

### Acknowledgments

This project utilizes D3.js for data visualization. For more information on D3.js, visit [D3.js Documentation](https://d3js.org/).