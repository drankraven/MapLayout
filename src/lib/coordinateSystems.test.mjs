import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectShapefileProjection,
  transformFeatureCollectionProjection,
} from '../../.test-build/coordinateSystems.js';

test('keeps WGS84 longitude and latitude coordinates unchanged', () => {
  const input = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [117, 39] },
    }],
  };

  const result = transformFeatureCollectionProjection(input, 'wgs84');

  assert.equal(result.detectedProjection, 'wgs84');
  assert.deepEqual(result.geojsonData.features[0].geometry.coordinates, [117, 39]);
});

test('auto-detects geographic coordinates as WGS84-compatible', () => {
  const input = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[116, 39], [117, 40]] },
    }],
  };

  assert.equal(detectShapefileProjection(input), 'wgs84');
});

test('converts CGCS2000 3-degree Gauss-Kruger coordinates with zone prefix', () => {
  const input = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [39500000, 4318503.98469153] },
    }],
  };

  const result = transformFeatureCollectionProjection(input, 'cgcs2000');
  const [lng, lat] = result.geojsonData.features[0].geometry.coordinates;

  assert.equal(result.detectedProjection, 'cgcs2000-gk-3');
  assert.ok(Math.abs(lng - 117) < 0.000001);
  assert.ok(Math.abs(lat - 39) < 0.000001);
});

test('auto-detects projected CGCS2000 coordinates when values are outside degree ranges', () => {
  const input = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [39500000, 4318503.98469153] },
    }],
  };

  const result = transformFeatureCollectionProjection(input, 'auto');

  assert.equal(result.detectedProjection, 'cgcs2000-gk-3');
});
