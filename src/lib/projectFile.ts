export interface ProjectLayoutSize {
  id: string;
  label: string;
  w: number;
  h: number;
}

export interface MapLayoutProjectFile {
  version: 1;
  savedAt: string;
  layers: unknown[];
  layoutSize: ProjectLayoutSize;
}

export interface CreateProjectFileInput {
  layers: unknown[];
  layoutSize: ProjectLayoutSize;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertLayoutSize(value: unknown): ProjectLayoutSize {
  if (!isObject(value)) {
    throw new Error('工程文件缺少画布尺寸');
  }

  const { id, label, w, h } = value;
  if (typeof id !== 'string' || typeof label !== 'string' || typeof w !== 'number' || typeof h !== 'number') {
    throw new Error('工程文件画布尺寸无效');
  }

  return { id, label, w, h };
}

export function createProjectFile(input: CreateProjectFileInput): MapLayoutProjectFile {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    layers: input.layers,
    layoutSize: input.layoutSize,
  };
}

export function parseProjectFile(input: string): MapLayoutProjectFile {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    throw new Error('工程文件不是有效 JSON');
  }

  if (!isObject(raw)) {
    throw new Error('工程文件格式无效');
  }

  if (raw.version !== 1) {
    throw new Error('不支持的工程文件版本');
  }

  if (!Array.isArray(raw.layers)) {
    throw new Error('工程文件缺少图层数组');
  }

  return {
    version: 1,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    layers: raw.layers,
    layoutSize: assertLayoutSize(raw.layoutSize),
  };
}
