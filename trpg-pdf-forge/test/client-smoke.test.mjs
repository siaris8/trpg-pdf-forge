import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

test('client module registers dictionaries and both slots', async () => {
  const source = await fs.readFile(path.resolve(import.meta.dirname, '..', 'client.js'), 'utf8');
  let factory;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(definition) {
          factory = definition.factory;
        },
      },
    },
    console,
  };
  vm.runInNewContext(source, sandbox, { filename: 'client.js' });
  assert.equal(typeof factory, 'function');

  let hookIndex = 0;
  const hookStates = [];
  const React = {
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children } };
    },
    useState(initial) {
      const index = hookIndex;
      hookIndex += 1;
      if (!(index in hookStates)) hookStates[index] = typeof initial === 'function' ? initial() : initial;
      return [hookStates[index], (value) => { hookStates[index] = value; }];
    },
    useEffect() {},
    useRef(initial) { return { current: initial }; },
    useCallback(fn) { return fn; },
  };
  const module = factory((name) => {
    assert.equal(name, 'react');
    return React;
  });
  assert.ok(module && typeof module.apply === 'function');

  const registrations = [];
  const dictionaries = {};
  const disposers = [];
  const ctx = {
    effect(callback) {
      const disposer = callback();
      if (typeof disposer === 'function') disposers.push(disposer);
      return disposer;
    },
    locale: {
      register(ns, dictionary) {
        dictionaries[ns] = dictionary;
        return () => {};
      },
      bind(ns) {
        assert.equal(ns, 'trpg-studio');
        return (key) => key;
      },
    },
    slots: {
      inject(name, callback) {
        const value = callback();
        if (value && typeof value.next === 'function') {
          let step = value.next();
          while (!step.done) {
            if (typeof step.value === 'function') disposers.push(step.value);
            step = value.next();
          }
        } else if (typeof value === 'function') {
          disposers.push(value);
        }
      },
      register(options, component) {
        registrations.push({ options, component });
        return () => {};
      },
    },
    layout: { selectPanel() {} },
  };
  module.apply(ctx);
  assert.deepEqual(registrations.map((entry) => entry.options.name), ['main', 'main', 'sidebar.panellist', 'sidebar.panellist']);
  assert.equal(registrations[0].options.key, 'trpg-studio');
  assert.equal(registrations[1].options.key, 'trpg-sheets');
  assert.equal(registrations[2].options.id, 'trpg-studio');
  assert.equal(registrations[3].options.id, 'trpg-sheets');
  assert.ok(typeof registrations[0].component === 'function');
  assert.ok(typeof registrations[1].component === 'function');
  hookIndex = 0;
  hookStates.length = 0;
  const rendered = registrations[0].component({
    t: (key) => key,
    close: () => {},
  });
  assert.equal(rendered.type, 'div');
  assert.equal(rendered.props.className, 'trpg-root');

  hookIndex = 0;
  hookStates.length = 0;
  const renderedSheets = registrations[1].component({
    t: (key) => key,
    close: () => {},
  });
  assert.equal(renderedSheets.type, 'div');
  assert.equal(renderedSheets.props.className, 'trpg-root');

  const zh = dictionaries['trpg-studio'].zh;
  const en = dictionaries['trpg-studio'].en;
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();
  assert.deepEqual(enKeys, zhKeys, `locale keys differ: zh-only=${zhKeys.filter((key) => !en[key])}, en-only=${enKeys.filter((key) => !zh[key])}`);
  for (const key of zhKeys) {
    assert.ok(String(zh[key]).length > 0, `empty zh.${key}`);
    assert.ok(String(en[key]).length > 0, `empty en.${key}`);
  }
  const used = new Set([...source.matchAll(/\bt\('([^']+)'\)/g)].map((match) => match[1]));
  for (const key of used) {
    assert.ok(zh[key] !== undefined, `missing zh.${key}`);
    assert.ok(en[key] !== undefined, `missing en.${key}`);
  }
  for (const disposer of disposers) disposer();
});
