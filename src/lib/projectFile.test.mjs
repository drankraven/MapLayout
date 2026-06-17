import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProjectFile,
  parseProjectFile,
} from '../../.test-build/projectFile.js';

const sampleLayer = {
  id: 'geojson-1',
  name: 'demo.geojson',
  visible: true,
  type: 'kml',
  sourceType: 'geojson',
  geojsonData: {
    type: 'FeatureCollection',
    features: [],
  },
};

test('creates a versioned project file', () => {
  const project = createProjectFile({
    layers: [sampleLayer],
    layoutSize: { id: 'Custom', label: 'Custom', w: 1200, h: 800 },
  });

  assert.equal(project.version, 1);
  assert.equal(project.layers.length, 1);
  assert.equal(project.layoutSize.w, 1200);
});

test('parses a valid project file', () => {
  const project = parseProjectFile(JSON.stringify({
    version: 1,
    savedAt: '2026-06-16T00:00:00.000Z',
    layers: [sampleLayer],
    layoutSize: { id: 'Custom', label: 'Custom', w: 900, h: 600 },
  }));

  assert.equal(project.layers[0].name, 'demo.geojson');
  assert.equal(project.layoutSize.h, 600);
});

test('rejects invalid project JSON', () => {
  assert.throws(
    () => parseProjectFile('{not-json'),
    /工程文件不是有效 JSON/,
  );
});

test('rejects project files without layers', () => {
  assert.throws(
    () => parseProjectFile(JSON.stringify({
      version: 1,
      savedAt: '2026-06-16T00:00:00.000Z',
      layoutSize: { id: 'Custom', label: 'Custom', w: 900, h: 600 },
    })),
    /缺少图层数组/,
  );
});
