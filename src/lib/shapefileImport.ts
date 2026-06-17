import { iter } from 'but-unzip';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { parseDbf, parseShp } from 'shpjs';
import {
  calculateFeatureCollectionBounds,
  normalizeGeoJsonInput,
  type GeoJsonBounds,
} from './geojsonUtils.js';
import {
  transformFeatureCollectionProjection,
  type DetectedProjection,
  type ShapefileProjectionMode,
} from './coordinateSystems.js';

export type DbfEncodingMode = 'auto' | 'utf-8' | 'gbk' | 'gb18030';

export interface ShapefileImportOptions {
  dbfEncoding?: DbfEncodingMode;
  projection?: ShapefileProjectionMode;
}

interface ShapefileGroup {
  name: string;
  shp?: DataView;
  dbf?: DataView;
  cpg?: string;
  prj?: string;
}

export interface ImportedShapefileLayer {
  name: string;
  geojsonData: FeatureCollection;
  bounds: GeoJsonBounds | null;
  detectedProjection: DetectedProjection;
  dbfEncoding: string;
}

function stripZipExtension(fileName: string): string {
  return fileName.replace(/\.zip$/i, '');
}

function toDataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes).trim();
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

function getBaseName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(0, lastDot) : fileName;
}

export function resolveDbfEncoding(mode: DbfEncodingMode = 'auto', cpg?: string): string {
  if (mode !== 'auto') return mode;
  const normalizedCpg = cpg?.trim();
  return normalizedCpg || 'gb18030';
}

async function readShapefileGroups(file: File): Promise<ShapefileGroup[]> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const groups = new Map<string, ShapefileGroup>();

  for (const entry of iter(buffer)) {
    const ext = getExtension(entry.filename);
    if (!['shp', 'dbf', 'cpg', 'prj'].includes(ext)) continue;

    const bytes = await entry.read();
    const baseName = getBaseName(entry.filename);
    const key = baseName.toLowerCase();
    const group = groups.get(key) || { name: baseName };

    if (ext === 'shp') group.shp = toDataView(bytes);
    if (ext === 'dbf') group.dbf = toDataView(bytes);
    if (ext === 'cpg') group.cpg = decodeText(bytes);
    if (ext === 'prj') group.prj = decodeText(bytes);

    groups.set(key, group);
  }

  const shapefileGroups = Array.from(groups.values()).filter(group => group.shp);
  if (shapefileGroups.length === 0) {
    throw new Error('zip 中没有找到 .shp 文件');
  }

  return shapefileGroups;
}

function combineFeatures(geometries: Array<Geometry | null>, propertiesRows: Array<Record<string, unknown>>): FeatureCollection {
  const features: Feature[] = geometries
    .filter((geometry): geometry is Geometry => Boolean(geometry))
    .map((geometry, index) => ({
      type: 'Feature',
      geometry,
      properties: propertiesRows[index] || {},
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

function fallbackLayerName(file: File, index: number, total: number): string {
  const baseName = stripZipExtension(file.name);
  return total > 1 ? `${baseName}-${index + 1}` : baseName;
}

export async function importShapefileZip(
  file: File,
  options: ShapefileImportOptions = {},
): Promise<ImportedShapefileLayer[]> {
  const groups = await readShapefileGroups(file);
  const projectionMode = options.projection || 'auto';

  return groups.map((group, index) => {
    if (!group.shp) {
      throw new Error(`${group.name} 缺少 .shp 文件`);
    }

    const geometries = parseShp(group.shp, group.prj) as Array<Geometry | null>;
    const dbfEncoding = resolveDbfEncoding(options.dbfEncoding || 'auto', group.cpg);
    const propertiesRows = group.dbf
      ? (parseDbf(group.dbf, dbfEncoding) as Array<Record<string, unknown>>)
      : [];

    const rawGeojson = normalizeGeoJsonInput(combineFeatures(geometries, propertiesRows));
    const transformed = transformFeatureCollectionProjection(rawGeojson, projectionMode);
    const name = group.name || fallbackLayerName(file, index, groups.length);

    return {
      name,
      geojsonData: transformed.geojsonData,
      bounds: calculateFeatureCollectionBounds(transformed.geojsonData),
      detectedProjection: transformed.detectedProjection,
      dbfEncoding,
    };
  });
}
