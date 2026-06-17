import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVectorTextStyle,
} from '../../.test-build/vectorTextStyle.js';

function createTextElement() {
  return {
    dataset: {},
    offsetWidth: 74,
    offsetHeight: 22,
    style: {},
    value: 'old text',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

test('applies vector text rotation and fixed box dimensions', () => {
  const element = createTextElement();
  const icon = { style: {} };
  const iconOptions = {};
  const textCalls = [];

  applyVectorTextStyle({
    element,
    icon,
    iconOptions,
    setText: (text) => textCalls.push(text),
    textStyle: {
      color: '#111111',
      fontSize: 18,
      backgroundColor: 'transparent',
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontWeight: 'bold',
      multiline: true,
      text: 'new text',
      boxWidth: 160,
      boxHeight: 48,
      rotation: 35,
      textAlign: 'center',
      padding: 6,
    },
  });

  assert.deepEqual(textCalls, ['new text']);
  assert.equal(element.style.transform, 'rotate(35deg)');
  assert.equal(element.style.transformOrigin, 'center center');
  assert.equal(element.style.width, '160px');
  assert.equal(element.style.height, '48px');
  assert.equal(element.dataset.boxWidth, '160');
  assert.equal(element.attributes.wrap, 'soft');
  assert.equal(icon.style.width, '160px');
  assert.equal(icon.style.height, '48px');
  assert.deepEqual(iconOptions.iconSize, [160, 48]);
  assert.deepEqual(iconOptions.iconAnchor, [80, 24]);
});

test('uses measured text size when no fixed box is configured', () => {
  const element = createTextElement();
  const icon = { style: {} };
  const iconOptions = {};

  applyVectorTextStyle({
    element,
    icon,
    iconOptions,
    textStyle: {
      color: '#111111',
      fontSize: 18,
      backgroundColor: '#ffffff',
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontWeight: 'normal',
      multiline: false,
      rotation: 0,
      textAlign: 'left',
      padding: 0,
    },
  });

  assert.equal(element.style.width, '');
  assert.equal(element.style.minWidth, '');
  assert.equal(element.attributes.wrap, 'off');
  assert.equal(icon.style.width, '74px');
  assert.equal(icon.style.height, '22px');
  assert.deepEqual(iconOptions.iconAnchor, [37, 11]);
});
