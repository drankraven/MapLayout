export interface TileSourceConfig {
  id: string;
  name: string;
  group: string;
  description?: string;
  urlTemplate: string;
  requiredParams: string[];
  defaultOptions: {
    zoomOffset: number;
    tileSize: number;
    maxZoom: number;
    maxNativeZoom: number;
    minZoom: number;
    tms?: boolean;
  };
  subdomains?: string[];
  attribution?: string;
  thumbnailColor?: string;
}

export const TILE_SOURCE_CATALOG: TileSourceConfig[] = [
  // ===== 天地图 =====
  {
    id: 'tianditu-vec',
    name: '天地图 矢量底图',
    group: '天地图',
    urlTemplate:
      'https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk={tk}',
    requiredParams: ['tk'],
    defaultOptions: { zoomOffset: 1, tileSize: 256, maxZoom: 18, maxNativeZoom: 18, minZoom: 1 },
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: '© 天地图',
    thumbnailColor: '#e8f0fe',
  },
  {
    id: 'tianditu-cva',
    name: '天地图 矢量注记',
    group: '天地图',
    urlTemplate:
      'https://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk={tk}',
    requiredParams: ['tk'],
    defaultOptions: { zoomOffset: 1, tileSize: 256, maxZoom: 18, maxNativeZoom: 18, minZoom: 1 },
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: '© 天地图',
    thumbnailColor: '#f0f4e8',
  },
  {
    id: 'tianditu-img',
    name: '天地图 卫星影像',
    group: '天地图',
    urlTemplate:
      'https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk={tk}',
    requiredParams: ['tk'],
    defaultOptions: { zoomOffset: 1, tileSize: 256, maxZoom: 18, maxNativeZoom: 18, minZoom: 1 },
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: '© 天地图',
    thumbnailColor: '#d4e6c3',
  },
  {
    id: 'tianditu-cia',
    name: '天地图 影像注记',
    group: '天地图',
    urlTemplate:
      'https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk={tk}',
    requiredParams: ['tk'],
    defaultOptions: { zoomOffset: 1, tileSize: 256, maxZoom: 18, maxNativeZoom: 18, minZoom: 1 },
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: '© 天地图',
    thumbnailColor: '#e8f0e8',
  },

  // ===== 星图云 =====
  {
    id: 'geovis-vec',
    name: '星图云 矢量底图',
    group: '星图云',
    urlTemplate:
      'https://api.open.geovisearth.com/pj/base/v1/vec/{z}/{x}/{y}?format=png&tmsIds=w&token={token}',
    requiredParams: ['token'],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 20, maxNativeZoom: 18, minZoom: 1 },
    attribution: '© 星图地球数据云',
    thumbnailColor: '#e0e8f8',
  },
  {
    id: 'geovis-img',
    name: '星图云 卫星影像',
    group: '星图云',
    urlTemplate:
      'https://api.open.geovisearth.com/pj/base/v1/img/{z}/{x}/{y}?format=webp&tmsIds=w&token={token}',
    requiredParams: ['token'],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 20, maxNativeZoom: 18, minZoom: 1 },
    attribution: '© 星图地球数据云',
    thumbnailColor: '#c8d8c0',
  },
  {
    id: 'geovis-cia',
    name: '星图云 影像注记',
    group: '星图云',
    urlTemplate:
      'https://api.open.geovisearth.com/pj/base/v1/cia/{z}/{x}/{y}?format=png&tmsIds=w&token={token}',
    requiredParams: ['token'],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 20, maxNativeZoom: 18, minZoom: 1 },
    attribution: '© 星图地球数据云',
    thumbnailColor: '#e8f0e8',
  },
  {
    id: 'geovis-ter',
    name: '星图云 地形晕渲',
    group: '星图云',
    urlTemplate:
      'https://api.open.geovisearth.com/pj/base/v1/ter/{z}/{x}/{y}?format=png&tmsIds=w&token={token}',
    requiredParams: ['token'],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 15, maxNativeZoom: 15, minZoom: 1 },
    attribution: '© 星图地球数据云',
    thumbnailColor: '#d0c8b0',
  },

  // ===== ArcGIS =====
  {
    id: 'arcgis-satellite',
    name: 'ArcGIS 卫星影像',
    group: 'ArcGIS',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    requiredParams: [],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 21, maxNativeZoom: 18, minZoom: 1 },
    attribution: '© Esri',
    thumbnailColor: '#c0d0c0',
  },
  {
    id: 'arcgis-boundaries',
    name: 'ArcGIS 地名注记',
    group: 'ArcGIS',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    requiredParams: [],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 21, maxNativeZoom: 18, minZoom: 1 },
    attribution: '© Esri',
    thumbnailColor: '#f0efe8',
  },
  {
    id: 'arcgis-topo',
    name: 'ArcGIS 地形图',
    group: 'ArcGIS',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    requiredParams: [],
    defaultOptions: { zoomOffset: 0, tileSize: 256, maxZoom: 21, maxNativeZoom: 18, minZoom: 1 },
    attribution: '© Esri',
    thumbnailColor: '#e8e0d0',
  },
];

/** Normalize WMTS placeholders into Leaflet XYZ placeholders */
export function normalizeTileUrl(url: string): string {
  return url
    .replace(/\{TileMatrix\}/gi, '{z}')
    .replace(/\{TileRow\}/gi, '{y}')
    .replace(/\{TileCol\}/gi, '{x}');
}

/** Look up a source in the catalog */
export function getTileSourceFromCatalog(sourceId: string): TileSourceConfig | undefined {
  return TILE_SOURCE_CATALOG.find(s => s.id === sourceId);
}

/** Resolve a source config + params into a Leaflet-ready URL and subdomains.
 *  Replaces {tk}, {token} etc from sourceParams, {s} from subdomains,
 *  and normalizes WMTS placeholders to {z}/{x}/{y}. */
export function resolveTileSource(
  sourceId: string,
  sourceParams?: Record<string, string>,
): { url: string; subdomains?: string[] } | null {
  const source = getTileSourceFromCatalog(sourceId);
  if (!source) return null;

  let url = source.urlTemplate;

  // Replace provider token/key params (no encodeURIComponent — tokens are raw alphanumeric strings)
  if (sourceParams) {
    for (const [key, value] of Object.entries(sourceParams)) {
      url = url.replace(`{${key}}`, value);
    }
  }

  // Normalize WMTS → XYZ
  url = normalizeTileUrl(url);

  return { url, subdomains: source.subdomains };
}

/** Group catalog entries by provider group for UI rendering */
export function getTileSourceGroups(): { name: string; key: string; sources: TileSourceConfig[] }[] {
  const groups = new Map<string, TileSourceConfig[]>();
  for (const source of TILE_SOURCE_CATALOG) {
    const list = groups.get(source.group) || [];
    list.push(source);
    groups.set(source.group, list);
  }
  return Array.from(groups.entries()).map(([name, sources]) => ({
    name,
    key: name,
    sources,
  }));
}
