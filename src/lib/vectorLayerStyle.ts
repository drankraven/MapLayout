import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  Polygon,
  Position,
} from 'geojson';

export interface ImportedLayerStyleOptions {
  color?: string;
  fillColor?: string;
  weight?: number;
  fillOpacity?: number;
  fillEnabled?: boolean;
}

export interface ImportedFeatureStyle {
  color: string;
  fillColor: string;
  weight: number;
  fill: boolean;
  fillOpacity: number;
}

export interface ImportedPointStyle extends ImportedFeatureStyle {
  radius: number;
}

const DEFAULT_COLOR = 'red';
const DEFAULT_WEIGHT = 3;
const DEFAULT_FILL_OPACITY = 0.4;

function positionsMatch(a: Position, b: Position): boolean {
  return a.length >= 2
    && b.length >= 2
    && a[0] === b[0]
    && a[1] === b[1];
}

function createClosedRing(line: Position[]): Position[] | null {
  if (line.length < 3) return null;

  const first = line[0];
  const last = line[line.length - 1];
  const ring = line.map(position => [...position]);

  if (!positionsMatch(first, last)) {
    ring.push([...first]);
  }

  return ring;
}

function lineStringToPolygon(line: LineString): Polygon | null {
  const ring = createClosedRing(line.coordinates);
  if (!ring) return null;

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

function addLinearFillFeatures(
  geometry: Geometry | null,
  properties: GeoJsonProperties,
  features: Feature<Polygon>[],
) {
  if (!geometry) return;

  if (geometry.type === 'LineString') {
    const polygon = lineStringToPolygon(geometry as LineString);
    if (polygon) {
      features.push({ type: 'Feature', properties, geometry: polygon });
    }
    return;
  }

  if (geometry.type === 'MultiLineString') {
    for (const coordinates of (geometry as MultiLineString).coordinates) {
      const polygon = lineStringToPolygon({ type: 'LineString', coordinates });
      if (polygon) {
        features.push({ type: 'Feature', properties, geometry: polygon });
      }
    }
    return;
  }

  if (geometry.type === 'GeometryCollection') {
    for (const child of (geometry as GeometryCollection).geometries) {
      addLinearFillFeatures(child, properties, features);
    }
  }
}

export function createClosedLineFillFeatureCollection(collection: FeatureCollection): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];

  for (const feature of collection.features) {
    addLinearFillFeatures(feature.geometry, feature.properties || {}, features);
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function hasFillableGeometry(geometry: Geometry | null | undefined): boolean {
  if (!geometry) return false;

  if (
    geometry.type === 'Polygon'
    || geometry.type === 'MultiPolygon'
    || geometry.type === 'Point'
    || geometry.type === 'MultiPoint'
  ) {
    return true;
  }

  if (geometry.type === 'GeometryCollection') {
    return (geometry as GeometryCollection).geometries.some(hasFillableGeometry);
  }

  return false;
}

export function createImportedFeatureStyle(
  geometry: Geometry | null | undefined,
  options: ImportedLayerStyleOptions,
): ImportedFeatureStyle {
  const color = options.color || DEFAULT_COLOR;
  const fillColor = options.fillColor || color;
  const weight = options.weight ?? DEFAULT_WEIGHT;
  const fill = Boolean(options.fillEnabled && hasFillableGeometry(geometry));

  return {
    color,
    fillColor,
    weight,
    fill,
    fillOpacity: fill ? (options.fillOpacity ?? DEFAULT_FILL_OPACITY) : 0,
  };
}

export function createImportedPointStyle(options: ImportedLayerStyleOptions): ImportedPointStyle {
  const color = options.color || DEFAULT_COLOR;
  const fillColor = options.fillColor || color;
  const weight = options.weight ?? DEFAULT_WEIGHT;
  const fill = options.fillEnabled !== false;

  return {
    color,
    fillColor,
    weight,
    fill,
    fillOpacity: fill ? (options.fillOpacity ?? 0.7) : 0,
    radius: Math.max(4, weight + 2),
  };
}
