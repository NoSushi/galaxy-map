<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Star Wars Galaxy Map (Minimal)</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body {
      margin: 0;
      display: flex;
      height: 100vh;
      font-family: sans-serif;
      background: #0b1020;
      color: #e5e7eb;
    }

    #map {
      flex: 3;
    }

    #info {
      flex: 1;
      padding: 16px;
      background: #111827;
      border-left: 1px solid #1f2933;
    }

    .oversector {
      opacity: 0.25;
    }

    .planet {
      fill: white;
      cursor: pointer;
    }

    .planet:hover {
      fill: #60a5fa;
    }

    .selected {
      fill: #f59e0b;
    }
  </style>
</head>
<body>

<svg id="map" viewBox="-100 -100 200 200"></svg>

<div id="info">
  <h2>Planet Info</h2>
  <p>Click a planet.</p>
</div>

<script>
/* ---------------- DATA ---------------- */

const planets = [
  { id: "coruscant", name: "Coruscant", x: 0, y: 0, owner: "Republic", oversector: "Core" },
  { id: "kashyyyk", name: "Kashyyyk", x: 30, y: -20, owner: "Republic", oversector: "Mid Rim" },
  { id: "tatooine", name: "Tatooine", x: -50, y: 40, owner: "Hutt Cartel", oversector: "Outer Rim" }
];

const oversectors = [
  {
    name: "Core",
    color: "#3b82f6",
    points: [[-20,-20],[20,-20],[20,20],[-20,20]]
  },
  {
    name: "Mid Rim",
    color: "#22c55e",
    points: [[20,-40],[80,-40],[80,20],[20,20]]
  },
  {
    name: "Outer Rim",
    color: "#eab308",
    points: [[-100,20],[100,20],[100,100],[-100,100]]
  }
];

const referencePlanet = planets[0]; // Coruscant

/* ---------------- SVG SETUP ---------------- */

const svg = d3.select("#map");

/* ---------------- OVERSECTORS ---------------- */

svg.selectAll(".oversector")
  .data(oversectors)
  .enter()
  .append("polygon")
  .attr("class", "oversector")
  .attr("points", d => d.points.map(p => p.join(",")).join(" "))
  .attr("fill", d => d.color);

/* ---------------- PLANETS ---------------- */

const planetNodes = svg.selectAll(".planet")
  .data(planets)
  .enter()
  .append("circle")
  .attr("class", "planet")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", 2);

/* ---------------- INTERACTION ---------------- */

planetNodes.on("click", function (event, d) {
  planetNodes.classed("selected", false);
  d3.select(this).classed("selected", true);

  const dist = distance(d, referencePlanet).toFixed(2);

  d3.select("#info").html(`
    <h2>${d.name}</h2>
    <p><strong>Owner:</strong> ${d.owner}</p>
    <p><strong>Oversector:</strong> ${d.oversector}</p>
    <p><strong>Distance from ${referencePlanet.name}:</strong> ${dist}</p>
  `);
});

/* ---------------- UTIL ---------------- */

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
</script>

</body>
</html>
