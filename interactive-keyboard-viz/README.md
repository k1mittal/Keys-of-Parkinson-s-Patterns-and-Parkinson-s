# Interactive Keyboard Visualization

This project is an interactive visualization that displays hold times for keys on a keyboard, allowing users to select and deselect keys to update the joint hold times distribution dynamically. The visualization utilizes D3.js for rendering charts and is built with HTML, CSS, and JavaScript.

## Project Structure

```
interactive-keyboard-viz
├── src
│   ├── data
│   │   └── hold_data.json
│   ├── js
│   │   ├── keyboard.js
│   │   └── chart.js
│   ├── css
│   │   └── styles.css
│   └── index.html
├── package.json
└── README.md
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd interactive-keyboard-viz
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

## Usage

1. Open `src/index.html` in a web browser to view the interactive keyboard visualization.
2. Click on the keys to select or deselect them. The joint hold times distribution will update accordingly.

## Dependencies

- D3.js: A JavaScript library for producing dynamic, interactive data visualizations in web browsers.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.