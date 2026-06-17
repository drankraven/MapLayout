import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateFeatureCollectionBounds,
  normalizeGeoJsonInput,
} from '../../.test-build/geojsonUtils.js';

test('normalizes a Geometry into a FeatureCollection', () => {
  const result = normalizeGeoJsonInput({
    type: 'Point',
    coordinates: [120, 30],
  });

  assert.equal(result.type, 'FeatureCollection');
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].geometry.type, 'Point');
});

test('normalizes a Feature into a FeatureCollection', () => {
  const result = normalizeGeoJsonInput({
    type: 'Feature',
    properties: { name: 'site' },
    geometry: { type: 'LineString', coordinates: [[120, 30], [121, 31]] },
  });

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.name, 'site');
});

test('calculates bounds across nested polygon coordinates', () => {
  const bounds = calculateFeatureCollectionBounds({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[120, 30], [122, 30], [122, 32], [120, 30]]],
      },
    }],
  });

  assert.deepEqual(bounds, {
    south: 30,
    west: 120,
    north: 32,
    east: 122,
  });
});

test('rejects unsupported GeoJSON input', () => {
  assert.throws(
    () => normalizeGeoJsonInput({ type: 'NotGeoJson', coordinates: [] }),
    /Unsupported GeoJSON type/,
  );
});
