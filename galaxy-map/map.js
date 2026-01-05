import { planets, oversectors } from "./data.js";

/* ---------------- SVG SETUP ---------------- */

const svg = d3.select("#map");

/* Disable default double-click zoom (optional, but cleaner) */
svg.on("dblclick.zoom", null);

/* ---------------- MAP GROUP ---------------- */
/* EVERYTHING goes inside this group */

const mapGroup = svg.append("g");

/* ---------------- OVERSECTORS ---------------- */

mapGroup.selectAll(".oversector")
  .data(oversectors)
  .enter()
  .append("polygon")
  .attr("class", "oversector")
  .attr("points", d => d.points.map(p => p.join(",")).join(" "))
  .attr("fill", d => d.color);

/* ---------------- PLANETS ---------------- */

const planetNodes = mapGroup.selectAll(".planet")
  .data(planets)
  .enter()
  .append("circle")
  .attr("class", "planet")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r", 2);

/* ---------------- ZOOM & PAN ---------------- */

const zoom = d3.zoom()
  .scaleExtent([0.5, 8])
  .on("zoom", (event) => {
    ma
