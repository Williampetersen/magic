import styles from "@/app/admin/admin.module.scss";
import type { Row } from "@/lib/tracking/db";
import { geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import Link from "next/link";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { type MapPoint, MapView } from "./MapView";

const WIDTH = 960;
const HEIGHT = 480;

// biome-ignore lint/suspicious/noExplicitAny: topojson typings are loose
const atlas = world as any;
// biome-ignore lint/suspicious/noExplicitAny: GeoJSON features
const countries = (feature(atlas, atlas.objects.countries) as any).features.filter(
  // Antarctica only wastes space on a visitor map.
  (f: { id?: string }) => f.id !== "010",
);
const land = { type: "FeatureCollection" as const, features: countries };

type Point = { label: string; country: string | null; lat: number; lon: number; count: number };

/** The middle of the visits, so one far-away visitor does not move the map. */
function weightedMedian(points: Point[], key: "lat" | "lon") {
  const sorted = [...points].sort((a, b) => a[key] - b[key]);
  const half = sorted.reduce((sum, p) => sum + p.count, 0) / 2;
  let seen = 0;
  for (const p of sorted) {
    seen += p.count;
    if (seen >= half) return p[key];
  }
  return sorted[0][key];
}

/** The area that holds at least 90% of the visits, or null when they span the globe. */
function mainRegion(points: Point[]) {
  if (!points.length) return null;
  const total = points.reduce((sum, p) => sum + p.count, 0);
  const midLat = weightedMedian(points, "lat");
  const midLon = weightedMedian(points, "lon");
  const byDistance = [...points].sort(
    (a, b) =>
      Math.hypot((a.lon - midLon) * Math.cos((midLat * Math.PI) / 180), a.lat - midLat) -
      Math.hypot((b.lon - midLon) * Math.cos((midLat * Math.PI) / 180), b.lat - midLat),
  );
  const core: Point[] = [];
  let covered = 0;
  for (const p of byDistance) {
    core.push(p);
    covered += p.count;
    if (covered >= total * 0.9) break;
  }

  let west = Math.min(...core.map((p) => p.lon));
  let east = Math.max(...core.map((p) => p.lon));
  let south = Math.min(...core.map((p) => p.lat));
  let north = Math.max(...core.map((p) => p.lat));
  if (east - west > 150) return null;

  const padLon = (east - west) * 0.2;
  const padLat = (north - south) * 0.2;
  west -= padLon;
  east += padLon;
  south -= padLat;
  north += padLat;
  // Never zoom closer than this: the map data is too coarse for city level.
  const minLon = 56;
  const minLat = 26;
  if (east - west < minLon) {
    const mid = (east + west) / 2;
    west = mid - minLon / 2;
    east = mid + minLon / 2;
  }
  if (north - south < minLat) {
    const mid = (north + south) / 2;
    south = mid - minLat / 2;
    north = mid + minLat / 2;
  }
  return {
    west: Math.max(west, -179),
    east: Math.min(east, 179),
    south: Math.max(south, -58),
    north: Math.min(north, 82),
  };
}

/**
 * Dot map of visitor locations. By default it zooms to the region where most
 * visitors are; "world" shows everything.
 */
export function WorldMap({
  points: rows,
  view,
  worldHref,
}: {
  points: Row[];
  view: "region" | "world";
  worldHref: string;
}) {
  const points = rows as Point[];
  const region = view === "region" ? mainRegion(points) : null;

  const projection = region
    ? geoMercator().fitSize([WIDTH, HEIGHT], {
        type: "MultiPoint",
        coordinates: [
          [region.west, region.south],
          [region.east, region.north],
          [region.west, region.north],
          [region.east, region.south],
        ],
      })
    : geoNaturalEarth1().fitExtent(
        [
          [6, 6],
          [WIDTH - 6, HEIGHT - 6],
        ],
        land,
      );

  const landPath = geoPath(projection).digits(1)(land) || "";
  const max = Math.max(...points.map((p) => p.count), 1);

  const dots: MapPoint[] = [];
  let outside = 0;
  for (const p of points) {
    const xy = projection([p.lon, p.lat]);
    if (!xy || xy[0] < 0 || xy[0] > WIDTH || xy[1] < 0 || xy[1] > HEIGHT) {
      outside += p.count;
      continue;
    }
    dots.push({
      x: (xy[0] / WIDTH) * 100,
      y: (xy[1] / HEIGHT) * 100,
      size: Math.round(10 + 16 * Math.sqrt(p.count / max)),
      label: p.label,
      country: p.country,
      count: p.count,
    });
  }
  // Largest first, so small dots stay on top and can be hovered.
  dots.sort((a, b) => b.count - a.count);

  return (
    <>
      <MapView width={WIDTH} height={HEIGHT} land={landPath} points={dots} />
      {!points.length && <p className={styles.mapNote}>No visitor locations in this period yet.</p>}
      {outside > 0 && (
        <p className={styles.mapNote}>
          {outside} {outside === 1 ? "visit is" : "visits are"} outside this area.{" "}
          <Link href={worldHref} scroll={false}>
            Show the world map
          </Link>
        </p>
      )}
    </>
  );
}
