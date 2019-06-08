import { assign } from './util';
import { diff, commitRoot } from './diff/index';
import options from './options';
import { Fragment } from './create-element';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export function Component(props, context) {
	this.props = props;
	this.context = context;
	// this.constructor // When component is functional component, this is reset to functional component
	// if (this.state==null) this.state = {};
	// this.state = {};
	// this._dirty = true;
	// this._renderCallbacks = []; // Only class components

	// Other properties that Component will have set later,
	// shown here as commented out for quick reference
	// this.base = null;
	// this._context = null;
	// this._vnode = null;
	// this._nextState = null; // Only class components
	// this._processingException = null; // Always read, set only when handling error
	// this._pendingError = null; // Always read, set only when handling error. This is used to indicate at diffTime to set _processingException
}

/**
 * Update component state and schedule a re-render.
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
Component.prototype.setState = function(update, callback) {
	// only clone state when copying to nextState the first time.
	let s = (this._nextState!==this.state && this._nextState) || (this._nextState = assign({}, this.state));

	// if update() mutates state in-place, skip the copy:
	if (typeof update!=='function' || (update = update(s, this.props))) {
		assign(s, update);
	}

	// Skip update if updater function returned null
	if (update==null) return;

	if (this._vnode) {
		if (callback) this._renderCallbacks.push(callback);
		enqueueRender(this);
	}
};

/**
 * Immediately perform a synchronous re-render of the component
 * @param {() => void} [callback] A function to be called after component is
 * re-renderd
 */
Component.prototype.forceUpdate = function(callback) {
	let vnode = this._vnode, dom = this._vnode._dom, parentDom = this._parentDom;
	if (parentDom) {
		// Set render mode so that we can differantiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
		const force = callback!==false;

		let mounts = [];
		let newDom = diff(parentDom, vnode, assign({}, vnode), this._context, parentDom.ownerSVGElement!==undefined, null, mounts, force, dom == null ? getDomSibling(vnode) : dom);
		commitRoot(mounts, vnode);

		if (newDom != dom) {
			// Update parent component's _dom and c.base pointers
			// TODO: What to do about _lastDomChild?
			while ((vnode = vnode._parent) && vnode._component && vnode._dom == dom) {
				vnode._dom = vnode._component.base = newDom;
			}
		}
	}
	if (callback) callback();
};

/**
 * Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 * Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
 * @param {object} props Props (eg: JSX attributes) received from parent
 * element/component
 * @param {object} state The component's current state
 * @param {object} context Context object, as returned by the nearest
 * ancestor's `getChildContext()`
 * @returns {import('./index').ComponentChildren | void}
 */
Component.prototype.render = Fragment;

/**
 * @param {import('./internal').VNode} vnode
 * @param {number | null} [childIndex]
 */
export function getDomSibling(vnode, childIndex) {
	if (childIndex == null) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		return vnode._parent
			? getDomSibling(vnode._parent, vnode._parent._children.indexOf(vnode) + 1)
			: null;
	}

	let sibling;
	for (; childIndex < vnode._children.length; childIndex++) {
		sibling = vnode._children[childIndex];

		if (sibling != null) {
			return typeof sibling.type !== 'function'
				? sibling._dom
				: getDomSibling(sibling, 0);
		}
	}

	// If we get here, we have not found a DOM node in this vnode's children.
	// We must resume from this vnode's sibling (in it's parent _children array)
	// Only climb up and search the parent if we aren't searching through a DOM
	// VNode (meaning we reached the DOM parent of the original vnode that began
	// the search)
	return typeof vnode.type === 'function' ? getDomSibling(vnode) : null;
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let q = [];

/**
 * Asynchronously schedule a callback
 * @type {(cb) => void}
 */
const defer = typeof Promise=='function' ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistenly reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	if (!c._dirty && (c._dirty = true) && q.push(c) === 1) {
		(options.debounceRendering || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
function process() {
	let p;
	q.sort((a, b) => b._vnode._depth - a._vnode._depth);
	while ((p=q.pop())) {
		// forceUpdate's callback argument is reused here to indicate a non-forced update.
		if (p._dirty) p.forceUpdate(false);
	}
}
