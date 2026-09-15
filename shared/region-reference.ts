/** Boundaries traced from the supplied reference in a 1024 × 868 image space.
 * These are geographic regions, not political sectors. Near-border points are
 * deliberately left for review rather than presented as precise assignments.
 */
export type Point = [number, number];
export const regionReferenceOverlay = {
  id: "galactic-regions-reference",
  name: "Galactic Regions — aligned reference",
  x: 37, y: 705, width: 4701, height: 3978, opacity: 45,
};
export const regionBoundaries: { name: string; points: Point[] }[] = [
  { name: "Deep Core", points: Array.from({ length: 48 }, (_, index) => {
    const angle = index * Math.PI / 24;
    return [537 + 52 * Math.cos(angle), 411 + 56 * Math.sin(angle)] as Point;
  }) },
  { name: "Core", points: [
    [539,321],[562,322],[586,336],[605,357],[618,385],[624,414],
    [622,444],[609,469],[588,488],[562,499],[537,501],[508,496],
    [481,478],[461,452],[449,425],[445,396],[451,368],[466,348],[493,331],[518,324],
  ] },
  { name: "The Colonies", points: [
    [519,290],[553,293],[587,304],[613,324],[633,348],[646,378],
    [656,409],[652,439],[640,469],[623,492],[595,513],[565,527],
    [530,531],[493,526],[459,515],[432,492],[420,466],[416,432],
    [417,395],[422,365],[432,337],[452,316],[480,301],[498,293],
  ] },
  { name: "Inner Rim", points: [
    [405,325],[419,299],[449,281],[476,273],[510,276],[543,277],
    [574,270],[608,256],[642,247],[662,254],[682,276],[700,308],
    [712,342],[719,370],[714,397],[696,421],[683,455],[677,493],
    [677,524],[667,547],[647,564],[617,577],[581,584],[544,581],
    [515,573],[486,568],[467,556],[449,541],[432,534],[415,516],
    [406,495],[402,467],[401,432],[400,397],[401,359],
  ] },
  { name: "The Expansion Region", points: [
    [408,260],[433,251],[458,255],[485,263],[519,269],[552,267],
    [584,259],[614,246],[646,239],[669,246],[690,266],[708,294],
    [720,323],[730,353],[738,389],[749,423],[755,452],[753,485],
    [744,516],[733,546],[716,572],[694,593],[668,612],[640,628],
    [610,637],[575,645],[542,645],[514,638],[486,625],[465,608],
    [449,589],[426,575],[406,566],[393,550],[386,526],[383,495],
    [382,458],[382,420],[383,381],[387,343],[393,308],[400,280],
  ] },
  { name: "Mid Rim", points: [
    [373,301],[388,268],[413,230],[440,209],[471,197],[507,194],
    [546,201],[581,215],[611,233],[639,237],[676,237],[711,233],
    [746,229],[782,224],[810,226],[832,245],[846,274],[849,309],
    [844,340],[833,365],[822,385],[818,417],[826,443],[828,475],
    [824,507],[812,540],[791,570],[767,598],[741,622],[713,644],
    [686,661],[658,674],[625,681],[599,686],[574,698],[549,705],
    [516,705],[487,700],[461,688],[438,673],[413,664],[391,655],
    [373,636],[363,612],[358,581],[356,547],[359,511],[362,475],
    [365,438],[366,400],[367,362],[369,329],
  ] },
  { name: "Outer Rim", points: [
    [366,612],[359,580],[355,548],[340,572],[334,597],[326,624],
    [326,648],[341,672],[368,689],[391,709],[403,733],[393,759],
    [392,794],[423,809],[456,819],[472,842],[499,854],[527,839],
    [549,827],[576,823],[602,836],[617,815],[648,815],[663,797],
    [689,789],[704,773],[729,777],[752,786],[774,776],[792,755],
    [802,726],[826,708],[850,699],[876,691],[909,693],[921,666],
    [917,639],[916,612],[924,585],[932,553],[943,523],[949,492],
    [951,464],[958,438],[954,406],[951,373],[951,343],[947,310],
    [939,282],[928,257],[921,231],[902,211],[887,182],[870,159],
    [847,139],[852,115],[834,91],[812,83],[789,91],[763,81],
    [740,82],[711,70],[690,65],[683,83],[653,77],[628,77],[607,80],
    [595,65],[608,41],[592,13],[569,0],[540,0],[522,24],[518,50],
    [494,56],[475,73],[461,90],[452,114],[449,141],[438,153],
    [438,176],[420,185],[405,201],[384,219],[375,246],[369,276],
    [366,307],[365,341],[362,377],[363,413],[361,449],[360,484],
  ] },
];

export function insidePolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > point[1]) !== (yj > point[1]) &&
        point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToBoundary(point: Point, polygon: Point[]): number {
  return Math.min(...polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
  }));
}

export function classifyRegion(x: number, y: number): { region?: string; reason?: string } {
  const point: Point = [
    (x - regionReferenceOverlay.x) * 1024 / regionReferenceOverlay.width,
    (y - regionReferenceOverlay.y) * 868 / regionReferenceOverlay.height,
  ];
  if (point[0] < 0 || point[0] > 1024 || point[1] < 0 || point[1] > 868) {
    return { reason: "Outside the supplied reference image" };
  }
  // 12 reference pixels (~55 map units) covers tracing/alignment uncertainty.
  const near = regionBoundaries.find(boundary => distanceToBoundary(point, boundary.points) < 12);
  if (near) return { reason: `Near the ${near.name} boundary` };
  const match = regionBoundaries.find(boundary => insidePolygon(point, boundary.points));
  if (match) return { region: match.name };
  // Do not equate all unlabeled black space with Unknown Regions.
  return { reason: "Outside the traced rings; geographic region needs review" };
}

export function previewRegionImport(planets: { id: string; name: string; x: number; y: number; oversector?: string | null }[]) {
  const candidates: { id: string; name: string; previous: string | null; region: string }[] = [];
  const review: { id: string; name: string; current: string | null; reason: string }[] = [];
  let preserved = 0;
  for (const planet of planets) {
    const current = planet.oversector?.trim() || null;
    if (current) {
      preserved++;
      if (/^https?:\/\//i.test(current)) {
        review.push({ id: planet.id, name: planet.name, current, reason: "Existing Region is an image URL; preserved for manual correction" });
      } else {
        const inferred = classifyRegion(planet.x, planet.y).region;
        if (inferred && inferred !== current) {
          review.push({ id: planet.id, name: planet.name, current, reason: `Reference suggests ${inferred}; existing assignment preserved` });
        }
      }
      continue;
    }
    const result = classifyRegion(planet.x, planet.y);
    if (result.region) candidates.push({ id: planet.id, name: planet.name, previous: planet.oversector ?? null, region: result.region });
    else review.push({ id: planet.id, name: planet.name, current, reason: result.reason! });
  }
  const counts: Record<string, number> = {};
  for (const candidate of candidates) counts[candidate.region] = (counts[candidate.region] ?? 0) + 1;
  return { candidates, review, preserved, counts, alignment: regionReferenceOverlay };
}