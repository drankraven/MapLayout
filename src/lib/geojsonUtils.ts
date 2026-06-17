import type {
  Feature,
  FeatureCollection,
  GeoJsonObject,
  Geometry,
  GeometryCollection,
  Position,
} from 'geojson';

export interface GeoJsonBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

const GEOMETRY_TYPES = new Set([
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  'GeometryCollection',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGeoJsonObject(value: unknown): value is GeoJsonObject {
  return isObject(value) && typeof value.type === 'string';
}

export function isFeatureCollection(value: unknown): value is FeatureCollection {
  return isGeoJsonObject(value)
    && value.type === 'FeatureCollection'
    && Array.isArray((value as FeatureCollection).features);
}

function isFeature(value: unknown): value is Feature {
  return isGeoJsonObject(value)
    && value.type === 'Feature'
    && isObject((value as Feature).geometry);
}

function isGeometry(value: unknown): value is Geometry {
  return isGeoJsonObject(value) && GEOMETRY_TYPES.has(value.type);
}

export function normalizeGeoJsonInput(input: unknown): FeatureCollection {
  if (isFeatureCollection(input)) {
    return {
      ...input,
      features: input.features.filter((feature): feature is Feature => isFeature(feature)),
    };
  }

  if (isFeature(input)) {
    return {
      type: 'FeatureCollection',
      features: [input],
    };
  }

  if (isGeometry(input)) {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: input,
      }],
    };
  }

  const type = isObject(input) && typeof input.type === 'string' ? input.type : String(input);
  throw new Error(`Unsupported GeoJSON type: ${type}`);
}

function scanPosition(position: Position, bounds: GeoJsonBounds | null): GeoJsonBounds | null {
  const [lng, lat] = position;
  if (typeof lng !== 'number' || typeof lat !== 'number' || Number.isNaN(lng) || Number.isNaN(lat)) {
    return bounds;
  }

  if (!bounds) {
    return { south: lat, west: lng, north: lat, east: lng };
  }

  return {
    south: Math.min(bounds.south, lat),
    west: Math.min(bounds.west, lng),
    north: Math.max(bounds.north, lat),
    east: Math.max(bounds.east, lng),
  };
}

function scanCoordinates(value: unknown, bounds: GeoJsonBounds | null): GeoJsonBounds | null {
  if (!Array.isArray(value)) return bounds;

  if (
    value.length >= 2
    && typeof value[0] === 'number'
    && typeof value[1] === 'number'
  ) {
    return scanPosition(value as Position, bounds);
  }

  return value.reduce<GeoJsonBounds | null>((nextBounds, child) => (
    scanCoordinates(child, nextBounds)
  ), bounds);
}

function scanGeometry(geometry: Geometry | null, bounds: GeoJsonBounds | null): GeoJsonBounds | null {
  if (!geometry) return bounds;

  if (geometry.type === 'GeometryCollection') {
    return (geometry as GeometryCollection).geometries.reduce<GeoJsonBounds | null>(
      (nextBounds, childGeometry) => scanGeometry(childGeometry, nextBounds),
      bounds,
    );
  }

  return scanCoordinates((geometry as Exclude<Geometry, GeometryCollection>).coordinates, bounds);
}

export function calculateFeatureCollectionBounds(collection: FeatureCollection): GeoJsonBounds | null {
  return collection.features.reduce<GeoJsonBounds | null>((bounds, feature) => (
    scanGeometry(feature.geometry, bounds)
  ), null);
}
