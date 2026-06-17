import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createClosedLineFillFeatureCollection,
  createImportedFeatureStyle,
  createImportedPointStyle,
  hasFillableGeometry,
} from '../../.test-build/vectorLayerStyle.js';

const polygon = {
  type: 'Polygon',
  coordinates: [[[120, 30], [121, 30], [121, 31], [120, 30]]],
};

test('enables fill style for imported polygon features', () => {
  const style = createImportedFeatureStyle(polygon, {
    color: '#123456',
    fillColor: '#abcdef',
    weight: 5,
    fillOpacity: 0.35,
    fillEnabled: true,
  });

  assert.equal(style.color, '#123456');
  assert.equal(style.fillColor, '#abcdef');
  assert.equal(style.weight, 5);
  assert.equal(style.fill, true);
  assert.equal(style.fillOpacity, 0.35);
});

test('detects fillable polygons inside geometry collections', () => {
  assert.equal(hasFillableGeometry({
    type: 'GeometryCollection',
    geometries: [
      { type: 'LineString', coordinates: [[120, 30], [121, 31]] },
      polygon,
    ],
  }), true);
});

test('does not enable fill for imported line features', () => {
  const style = createImportedFeatureStyle({
    type: 'LineString',
    coordinates: [[120, 30], [121, 31]],
  }, {
    color: '#123456',
    fillColor: '#abcdef',
    weight: 5,
    fillOpacity: 0.35,
    fillEnabled: true,
  });

  assert.equal(style.fill, false);
  assert.equal(style.fillOpacity, 0);
});

test('creates fill polygons for imported line strings when users mark them closed', () => {
  const result = createClosedLineFillFeatureCollection({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: 'line boundary' },
      geometry: {
        type: 'LineString',
        coordinates: [[120, 30], [121, 30], [121, 31]],
      },
    }],
  });

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].geometry.type, 'Polygon');
  assert.deepEqual(result.features[0].geometry.coordinates[0], [
    [120, 30],
    [121, 30],
    [121, 31],
    [120, 30],
  ]);
});

test('creates fill polygons for each eligible imported multi-line ring', () => {
  const result = createClosedLineFillFeatureCollection({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: 'multi boundary' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[120, 30], [121, 30], [121, 31], [120, 30]],
          [[122, 30], [123, 30]],
        ],
      },
    }],
  });

  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].geometry.type, 'Polygon');
  assert.deepEqual(result.features[0].properties, { name: 'multi boundary' });
});

test('fills imported point circle markers with the configured fill style', () => {
  const style = createImportedPointStyle({
    color: '#123456',
    fillColor: '#abcdef',
    weight: 4,
    fillOpacity: 0.65,
    fillEnabled: true,
  });

  assert.equal(style.fill, true);
  assert.equal(style.fillColor, '#abcdef');
  assert.equal(style.fillOpacity, 0.65);
  assert.equal(style.radius, 6);
});
