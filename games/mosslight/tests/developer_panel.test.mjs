import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const shell = readFileSync(new URL('../web/shell.html', import.meta.url), 'utf8');
const code = shell.slice(shell.indexOf('    const developer ='), shell.indexOf("    document.getElementById('pause-options').onclick"));

function setup() {
  const elements = new Map();
  const listeners = new Map();
  const actions = [];
  let time = 1000;
  const element = () => ({ open: false, focus() {}, setAttribute() {}, showModal() { this.open = true; }, close() { this.open = false; }, addEventListener(name, fn) { this[name] = fn; } });
  const document = {
    body: { appendChild(node) { elements.set(node.id, node); } },
    createElement: element,
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    addEventListener(name, fn) { listeners.set(name, fn); },
  };
  const context = { document, started: true, godotMessageHandler() {}, guide: element(), pause: element(), canvas: element(), backToPause() {}, pauseAction: action => actions.push(action), performance: { now: () => time }, innerWidth: 1000, innerHeight: 800 };
  runInNewContext(code, context);
  const click = (gap = 100, x = 950, y = 700) => {
    time += gap;
    listeners.get('pointerdown')({ clientX: x, clientY: y, button: 0, preventDefault() {}, stopImmediatePropagation() {} });
  };
  return { context, elements, actions, click };
}

test('only five consecutive corner clicks unlock the panel', () => {
  const { elements, actions, click } = setup();
  for (let i = 0; i < 4; i++) click();
  assert.equal(elements.get('developer-menu').open, false);
  click();
  assert.equal(elements.get('developer-menu').open, true);
  assert.deepEqual(actions, ['developer']);
});

test('timeout and clicking elsewhere reset the sequence', () => {
  const { elements, click } = setup();
  for (let i = 0; i < 4; i++) click();
  click(900);
  assert.equal(elements.get('developer-menu').open, false);
  click(100, 100, 100);
  for (let i = 0; i < 4; i++) click();
  assert.equal(elements.get('developer-menu').open, false);
  click();
  assert.equal(elements.get('developer-menu').open, true);
});

test('loading and pointer lock cannot unlock the panel', () => {
  const { context, actions, click } = setup();
  context.started = false;
  for (let i = 0; i < 5; i++) click();
  context.started = true;
  context.document.pointerLockElement = {};
  for (let i = 0; i < 5; i++) click();
  assert.deepEqual(actions, []);
});

test('preview hands off to Godot; Escape returns to pause', () => {
  const { context, elements, actions, click } = setup();
  for (let i = 0; i < 5; i++) click();
  elements.get('developer-menu').cancel({ preventDefault() {} });
  assert.equal(context.pause.open, true);
  assert.equal(elements.get('developer-menu').open, false);
  for (let i = 0; i < 5; i++) click();
  elements.get('developer-talk').onclick();
  assert.equal(elements.get('developer-menu').open, false);
  assert.equal(actions.at(-1), 'preview-review');
});
