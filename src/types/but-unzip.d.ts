declare module 'but-unzip' {
  export interface ZipEntry {
    filename: string;
    read(): Promise<Uint8Array>;
  }

  export function iter(buffer: Uint8Array): Iterable<ZipEntry>;
}
