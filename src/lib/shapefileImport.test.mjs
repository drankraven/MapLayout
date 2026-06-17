import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveDbfEncoding,
} from '../../.test-build/shapefileImport.js';

test('uses manual DBF encoding when provided', () => {
  assert.equal(resolveDbfEncoding('utf-8', 'gb18030'), 'utf-8');
});

test('defaults Shapefile DBF decoding to GB18030 when no cpg is present', () => {
  assert.equal(resolveDbfEncoding('auto', undefined), 'gb18030');
});

test('uses cpg text when DBF encoding is auto', () => {
  assert.equal(resolveDbfEncoding('auto', 'ANSI 936'), 'ANSI 936');
});
