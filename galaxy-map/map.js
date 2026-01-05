import { planets, oversectors } from "./data.js";

/* ---------------- SVG SETUP ---------------- */
const svg = d3.select("#map");
svg.on("dblclick.zoom", null); // Disable default double-click zoom

/* ---------------- MAP GROUP ---------------- */
const mapGroup = svg.append("g");

/* ---------------- OVERSECTORS ---------------- */
mapGroup.selectAll(".oversector")
  .data(oversectors)
  .enter()
  .append("polygon")
  .attr("class", "oversector")
  .attr("points", d => d.points.map(p => p.join(",")).join(" "))
  .attr("fill", d => d.color)
  .attr("opacity", 0.25);

/* ---------------- PLANETS ---------------- */
const planetNodes = mapGroup.selectAll(".planet")
  .data(planets)
  .enter()
  .append("circle")
  .attr("class", "planet")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", 5) 
  .attr("fill", "#e5e7eb"); 


/* ---------------- ZOOM & PAN ---------------- */
const zoom = d3.zoom()
  .scaleExtent([0.5, 8])
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);
  });

svg.call(zoom);

/* ---------------- INTERACTION ---------------- */
const referencePlanet = planets.find(p => p.id === "coruscant") || planets[0];

function showPlanetInfo(d) {
  planetNodes.classed("selected", false);
  planetNodes.filter(p => p.id === d.id).classed("selected", true);

  const distance = Math.hypot(d.x - referencePlanet.x, d.y - referencePlanet.y).toFixed(2);

  d3.select("#info").html(`
<h2>${d.name}</h2>
<input type="text" id="search" placeholder="Search planet..." />
<p><strong>Owner:</strong> ${d.owner}</p>
<p><strong>Oversector:</strong> ${d.oversector}</p>
<p><strong>Distance from ${referencePlanet.name}:</strong> ${distance}</p>
  `);

  setupSearch(); // Rebind search after recreating input
}

planetNodes.on("click", (event, d) => showPlanetInfo(d));

/* ---------------- SEARCH FUNCTION ---------------- */
function setupSearch() {
  const searchInput = document.getElementById("search");
  if (!searchInput) return;

  searchInput.addEventListener("input", function() {
    const query = this.value.toLowerCase();
    const match = planets.find(p => p.name.toLowerCase().startsWith(query));
    if (match) {
      centerOnPlanet(match);
      showPlanetInfo(match);
    }
  });
}

/* Call it once initially */
setupSearch();

/* ---------------- UTILITY: CENTER ON PLANET ---------------- */
function centerOnPlanet(planet) {
  const svgWidth = svg.node().clientWidth;
  const svgHeight = svg.node().clientHeight;

  const currentTransform = d3.zoomTransform(svg.node());

  const x = svgWidth / 2 - planet.x * currentTransform.k;
  const y = svgHeight / 2 - planet.y * currentTransform.k;

  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity.translate(x, y).scale(currentTransform.k)
  );
}
