declare module 'shpjs' {
  import type { FeatureCollection } from 'geojson';

  interface ShpJsFeatureCollection extends FeatureCollection {
    fileName?: string;
    name?: string;
  }

  type ShpJsResult = ShpJsFeatureCollection | ShpJsFeatureCollection[];

  const shp: (input: string | ArrayBuffer | ArrayBufferView) => Promise<ShpJsResult>;

  export function parseShp(input: ArrayBuffer | ArrayBufferView, prj?: string | false): unknown[];
  export function parseDbf(input: ArrayBuffer | ArrayBufferView, encoding?: string): Array<Record<string, unknown>>;

  export default shp;
}
