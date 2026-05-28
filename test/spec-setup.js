import jsdom from 'jsdom';
import chai from 'chai';
import chaiSubset from 'chai-subset';

chai.use(chaiSubset);

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
global.window = document.defaultView;

// Node 21+ / babel-register: `global.navigator = …` throws (read-only getter).
Object.defineProperty(global, 'navigator', {
  value: global.window.navigator,
  writable: true,
  configurable: true,
});

global.requestAnimationFrame = global.window.requestAnimationFrame
  || ((callback) => setTimeout(() => callback(Date.now()), 0));
