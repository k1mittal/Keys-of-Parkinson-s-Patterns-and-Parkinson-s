/* visualize.js
 *
 * Requirements:
 *  - Include D3 v7 and Plotly (latest) **before** this script in your HTML.
 *  - Ensure "typing_data.csv" (your CSV) is in the same directory (or adjust the path below).
 *  - This script will create a <div class="typing-density-viz"> in the document body,
 *    load the CSV, and render a 3D scatter (nQscore vs typingSpeed vs hasPD).
 */
document.addEventListener('DOMContentLoaded', function() {
  // 1) Create and style the container for the 3D scatter
  const container = document.getElementById('typing-density-viz');
  container.style.width = '100%';
  container.style.height = '600px';

  // 2) Load and parse the CSV
  d3.csv("js/typing_density/typing_density_viz.csv")
    .then(function(rawData) {
      // 2.1) Coerce types
      const parsed = rawData.map(d => ({
        pID: d.pID,
        hasPD: (d.gt === "True" || d.gt === "true") ? 1 : 0,
        nQ: +d.nqScore,
        typingSpeed: +d.typingSpeed
      }));

      // 2.2) Extract x, y, z arrays
      const xVals = parsed.map(d => d.nQ);
      const yVals = parsed.map(d => d.typingSpeed);
      const zVals = parsed.map(d => d.hasPD);

      // 2.3) Choose colors: red for PD, blue for Control
      const markerColors = parsed.map(d =>
        d.hasPD === 1 ? "rgba(220, 20, 60, 0.8)" : "rgba(30, 144, 255, 0.8)"
      );

      // 2.4) Build the trace with a styled hover tooltip
      const trace = {
        x: xVals,
        y: yVals,
        z: zVals,
        mode: 'markers',
        type: 'scatter3d',
        marker: {
          size: 6,
          color: markerColors,
          line: {
            color: 'rgba(0,0,0,0.2)',
            width: 0.5
          }
        },
        hovertemplate:
          'pID: %{customdata}<br>' +
          'nQscore: %{x:.4f}<br>' +
          'typingSpeed: %{y:.1f}<br>' +
          'Group: %{z}<extra></extra>',
        customdata: parsed.map(d => d.pID),
        hoverlabel: {
          bgcolor: 'rgba(50, 50, 50, 0.9)',    // dark semi‐transparent background
          font: {
            color: '#FFFFFF',                  // white text
            size: 12
          },
          bordercolor: 'rgba(200, 200, 200, 0.7)' // light gray border
        }
      };

      // 2.5) Layout: transparent background + brighter axes + custom tick labels
      const layout = {
        paper_bgcolor: 'rgba(0, 0, 0, 0)',  // entire canvas transparent
        plot_bgcolor: 'rgba(0, 0, 0, 0)',   // subplot area transparent
        scene: {
          bgcolor: 'rgba(0, 0, 0, 0)',      // 3D “cube” transparent

          xaxis: {
            title: {
              text: 'nQscore',
              font: { color: '#FFFFFF' }    // axis title in white
            },
            color: '#FFFFFF',               // tick labels in white
            gridcolor: 'rgba(255, 255, 255, 0.2)',   // faint white grid
            zerolinecolor: 'rgba(255, 255, 255, 0.2)',
            showbackground: false
          },

          yaxis: {
            title: {
              text: 'Typing Speed (wpm)',
              font: { color: '#FFFFFF' }
            },
            color: '#FFFFFF',
            gridcolor: 'rgba(255, 255, 255, 0.2)',
            zerolinecolor: 'rgba(255, 255, 255, 0.2)',
            showbackground: false
          },

          zaxis: {
            title: {
              text: 'Group',
              font: { color: '#FFFFFF' }
            },
            color: '#FFFFFF',
            gridcolor: 'rgba(255, 255, 255, 0.2)',
            zerolinecolor: 'rgba(255, 255, 255, 0.2)',
            showbackground: false,
            tickvals: [0, 1],
            ticktext: ['Control', 'PD']  // replace “0” & “1”
          }
        },
        margin: { l: 0, r: 0, b: 0, t: 0 }
      };

      // 2.6) Render the 3D scatter
      Plotly.newPlot(container, [trace], layout, { responsive: true });
    })
    .catch(function(error) {
      console.error("Error loading/parsing CSV:", error);
    });
  });