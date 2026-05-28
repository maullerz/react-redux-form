/**
 * React 18 + react-redux 7: legacy TestUtils no longer finds host nodes under
 * hook-based connect(). ReactDOM.render returns null instead of a component instance.
 * Patch DOM query helpers to use the mounted container instead.
 */
import ReactDOM from 'react-dom';
import TestUtils from 'react-dom/test-utils';

const roots = new WeakMap();

const legacy = {
  renderIntoDocument: TestUtils.renderIntoDocument,
  scryRenderedDOMComponentsWithTag: TestUtils.scryRenderedDOMComponentsWithTag,
  findRenderedDOMComponentWithTag: TestUtils.findRenderedDOMComponentWithTag,
  scryRenderedDOMComponentsWithClass: TestUtils.scryRenderedDOMComponentsWithClass,
  findRenderedDOMComponentWithClass: TestUtils.findRenderedDOMComponentWithClass,
};

function createRenderStub(container) {
  const stub = { __rrfContainer: container };
  roots.set(stub, container);
  return stub;
}

const legacyRender = ReactDOM.render;
ReactDOM.render = function render(element, container, callback) {
  legacyRender(element, container, callback);
  return createRenderStub(container);
};

const legacyUnmount = ReactDOM.unmountComponentAtNode;
ReactDOM.unmountComponentAtNode = function unmountComponentAtNode(container) {
  return legacyUnmount(container);
};

// Portals in tests often use a detached div; attach so DOM helpers can find nodes.
const legacyCreatePortal = ReactDOM.createPortal;
ReactDOM.createPortal = function createPortal(children, container, key) {
  if (container && container.nodeType === 1 && !container.parentNode) {
    document.body.appendChild(container);
  }
  return legacyCreatePortal(children, container, key);
};

function getContainer(component) {
  if (!component) return null;
  if (component.nodeType === 1) return component;
  if (component.__rrfContainer) return component.__rrfContainer;
  return roots.get(component) || null;
}

function queryByTag(searchRoot, tagName, includeRoot) {
  const tag = tagName.toLowerCase();
  const results = [];
  if (includeRoot && searchRoot.tagName && searchRoot.tagName.toLowerCase() === tag) {
    results.push(searchRoot);
  }
  results.push(...Array.from(searchRoot.querySelectorAll(tag)));
  return results;
}

function queryByClass(searchRoot, className, includeRoot) {
  const selector = `.${className}`;
  const results = [];
  if (includeRoot && searchRoot.classList && searchRoot.classList.contains(className)) {
    results.push(searchRoot);
  }
  results.push(...Array.from(searchRoot.querySelectorAll(selector)));
  return results;
}

TestUtils.renderIntoDocument = function renderIntoDocument(element) {
  const container = document.createElement('div');
  return ReactDOM.render(element, container);
};

function scryInRoot(container, root, tagName) {
  const includeRoot = container === root && root.nodeType === 1;
  return queryByTag(container, tagName, includeRoot);
}

TestUtils.scryRenderedDOMComponentsWithTag = function scryRenderedDOMComponentsWithTag(
  root,
  tagName
) {
  const container = getContainer(root);
  if (container) {
    return scryInRoot(container, root, tagName);
  }
  return legacy.scryRenderedDOMComponentsWithTag(root, tagName);
};

TestUtils.findRenderedDOMComponentWithTag = function findRenderedDOMComponentWithTag(
  root,
  tagName
) {
  const found = TestUtils.scryRenderedDOMComponentsWithTag(root, tagName);
  if (found.length !== 1) {
    throw new Error(
      `Did not find exactly one match (found: ${found.length}) for tag:${tagName}`
    );
  }
  return found[0];
};

function scryClassInRoot(container, root, className) {
  const includeRoot = container === root && root.nodeType === 1;
  return queryByClass(container, className, includeRoot);
}

TestUtils.scryRenderedDOMComponentsWithClass = function scryRenderedDOMComponentsWithClass(
  root,
  className
) {
  const container = getContainer(root);
  if (container) {
    return scryClassInRoot(container, root, className);
  }
  return legacy.scryRenderedDOMComponentsWithClass(root, className);
};

TestUtils.findRenderedDOMComponentWithClass = function findRenderedDOMComponentWithClass(
  root,
  className
) {
  const found = TestUtils.scryRenderedDOMComponentsWithClass(root, className);
  if (found.length !== 1) {
    throw new Error(
      `Did not find exactly one match (found: ${found.length}) for class:${className}`
    );
  }
  return found[0];
};

export default TestUtils;
