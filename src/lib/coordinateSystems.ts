import proj4 from 'proj4';
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  GeometryCollection,
  Position,
} from 'geojson';
import { calculateFeatureCollectionBounds } from './geojsonUtils.js';

export type ShapefileProjectionMode = 'auto' | 'wgs84' | 'cgcs2000';
export type DetectedProjection = 'wgs84' | 'cgcs2000' | 'cgcs2000-gk-3' | 'cgcs2000-gk-6' | 'unknown';

interface ProjectionCandidate {
  detectedProjection: DetectedProjection;
  transform(point: Position): Position;
}

const WGS84 = 'EPSG:4326';
const CHINA_BOUNDS = {
  west: 70,
  east: 140,
  south: 15,
  north: 60,
};

function isInChina(lng: number, lat: number): boolean {
  return lng >= CHINA_BOUNDS.west
    && lng <= CHINA_BOUNDS.east
    && lat >= CHINA_BOUNDS.south
    && lat <= CHINA_BOUNDS.north;
}

function isGeographic(collection: FeatureCollection): boolean {
  const bounds = calculateFeatureCollectionBounds(collection);
  if (!bounds) return true;

  return bounds.west >= -180
    && bounds.east <= 180
    && bounds.south >= -90
    && bounds.north <= 90;
}

function getFirstPosition(value: unknown): Position | null {
  if (!Array.isArray(value)) return null;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return value as Position;
  }

  for (const child of value) {
    const position = getFirstPosition(child);
    if (position) return position;
  }

  return null;
}

function firstGeometryPosition(geometry: Geometry | null): Position | null {
  if (!geometry) return null;
  if (geometry.type === 'GeometryCollection') {
    for (const child of (geometry as GeometryCollection).geometries) {
      const position = firstGeometryPosition(child);
      if (position) return position;
    }
    return null;
  }

  return getFirstPosition((geometry as Exclude<Geometry, GeometryCollection>).coordinates);
}

function firstCollectionPosition(collection: FeatureCollection): Position | null {
  for (const feature of collection.features) {
    const position = firstGeometryPosition(feature.geometry);
    if (position) return position;
  }
  return null;
}

function buildGaussKrugerCandidate(
  rawEasting: number,
  rawNorthing: number,
  degreeWidth: 3 | 6,
): ProjectionCandidate | null {
  if (!Number.isFinite(rawEasting) || !Number.isFinite(rawNorthing)) return null;
  if (Math.abs(rawEasting) < 10_000_000) return null;

  const zone = Math.floor(Math.abs(rawEasting) / 1_000_000);
  const easting = Math.abs(rawEasting) - zone * 1_000_000;
  const northing = rawNorthing;

  if (easting < 100_000 || easting > 900_000 || northing < 0 || northing > 7_000_000) {
    return null;
  }

  const centralMeridian = degreeWidth === 3 ? zone * 3 : zone * 6 - 3;
  if (centralMeridian < 70 || centralMeridian > 140) return null;

  const source = `+proj=tmerc +lat_0=0 +lon_0=${centralMeridian} +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs`;
  const [lng, lat] = proj4(source, WGS84, [easting, northing]);
  if (!isInChina(lng, lat)) return null;

  return {
    detectedProjection: degreeWidth === 3 ? 'cgcs2000-gk-3' : 'cgcs2000-gk-6',
    transform(point: Position): Position {
      const [x, y, ...rest] = point;
      const localEasting = Math.abs(x) - zone * 1_000_000;
      const [nextLng, nextLat] = proj4(source, WGS84, [localEasting, y]);
      return [nextLng, nextLat, ...rest];
    },
  };
}

function findCgcs2000ProjectedCandidate(position: Position | null): ProjectionCandidate | null {
  if (!position) return null;

  const [x, y] = position;
  const candidates = [
    buildGaussKrugerCandidate(x, y, 3),
    buildGaussKrugerCandidate(y, x, 3),
    buildGaussKrugerCandidate(x, y, 6),
    buildGaussKrugerCandidate(y, x, 6),
  ].filter((candidate): candidate is ProjectionCandidate => Boolean(candidate));

  if (candidates.length === 0) return null;

  const candidate = candidates[0];
  if (candidate.transform(position)[0] === position[0]) {
    return candidate;
  }

  const swappedCandidate = candidates.find((item) => item !== candidate);
  return swappedCandidate || candidate;
}

function mapCoordinates(value: unknown, transform: (position: Position) => Position): unknown {
  if (!Array.isArray(value)) return value;

  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return transform(value as Position);
  }

  return value.map((child) => mapCoordinates(child, transform));
}

function transformGeometry(geometry: Geometry | null, transform: (position: Position) => Position): Geometry | null {
  if (!geometry) return null;

  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: geometry.geometries.map((child) => transformGeometry(child, transform) as Geometry),
    };
  }

  return {
    ...geometry,
    coordinates: mapCoordinates((geometry as Exclude<Geometry, GeometryCollection>).coordinates, transform),
  } as Geometry;
}

function transformFeature(feature: Feature, transform: (position: Position) => Position): Feature {
  return {
    ...feature,
    properties: (feature.properties || {}) as GeoJsonProperties,
    geometry: transformGeometry(feature.geometry, transform),
  };
}

export function detectShapefileProjection(collection: FeatureCollection): DetectedProjection {
  if (isGeographic(collection)) return 'wgs84';
  return findCgcs2000ProjectedCandidate(firstCollectionPosition(collection))?.detectedProjection || 'unknown';
}

export function transformFeatureCollectionProjection(
  collection: FeatureCollection,
  mode: ShapefileProjectionMode,
): { geojsonData: FeatureCollection; detectedProjection: DetectedProjection } {
  if (mode === 'wgs84') {
    return { geojsonData: collection, detectedProjection: 'wgs84' };
  }

  if (isGeographic(collection)) {
    return { geojsonData: collection, detectedProjection: mode === 'cgcs2000' ? 'cgcs2000' : 'wgs84' };
  }

  const candidate = findCgcs2000ProjectedCandidate(firstCollectionPosition(collection));
  if (!candidate || (mode === 'auto' && candidate.detectedProjection === 'unknown')) {
    return { geojsonData: collection, detectedProjection: 'unknown' };
  }

  return {
    detectedProjection: candidate.detectedProjection,
    geojsonData: {
      ...collection,
      features: collection.features.map((feature) => transformFeature(feature, candidate.transform)),
    },
  };
}
