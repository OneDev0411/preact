import {
	Component,
	createElement,
	_unmount as unmount,
	options,
	cloneElement
} from 'preact';
import { removeNode } from '../../src/util';

const oldCatchError = options._catchError;
options._catchError = function(error, newVNode, oldVNode) {
	if (error.then && oldVNode) {
		/** @type {import('./internal').Component} */
		let component;
		let vnode = newVNode;

		for (; (vnode = vnode._parent); ) {
			if ((component = vnode._component) && component._childDidSuspend) {
				if (oldVNode) {
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
				}

				component._childDidSuspend(error);
				return; // Don't call oldCatchError if we found a Suspense
			}
		}
	}

	oldCatchError(error, newVNode, oldVNode);
};

function detachDom(children) {
	for (let i = 0; i < children.length; i++) {
		let child = children[i];
		if (child != null) {
			if (typeof child.type !== 'function' && child._dom) {
				removeNode(child._dom);
			} else if (child._children) {
				detachDom(child._children);
			}
		}
	}
}

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense(props) {
	// we do not call super here to golf some bytes...
	this._suspensions = [];
	this._fallback = props.fallback;
	this._isSuspenseResolved = true;
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
Suspense.prototype = new Component();

/**
 * @param {Promise} promise The thrown promise
 */
Suspense.prototype._childDidSuspend = function(promise) {
	/** @type {import('./internal').SuspenseComponent} */
	const c = this;
	c._suspensions.push(promise);
	this._isSuspenseResolved = false;
	const onSuspensionComplete = () => {
		// From https://twitter.com/Rich_Harris/status/1125850391155965952
		c._suspensions[c._suspensions.indexOf(promise)] =
			c._suspensions[c._suspensions.length - 1];
		c._suspensions.pop();

		if (c._suspensions.length == 0) {
			// If fallback is null, don't try to unmount it
			// `unmount` expects a real VNode, not null values
			if (c._fallback) {
				// Unmount current children (should be fallback)
				unmount(c._fallback);
			}
			c._vnode._dom = null;

			c._vnode._children = c.state._parkedChildren;
			c.setState({ _parkedChildren: null });
		}
		this._isSuspenseResolved = true;
		if (options.__suspenseDidResolve) {
			options.__suspenseDidResolve(c._vnode);
		}
	};

	if (c.state._parkedChildren == null) {
		c._fallback = c._fallback && cloneElement(c._fallback);
		c.setState({ _parkedChildren: c._vnode._children });
		detachDom(c._vnode._children);
		c._vnode._children = [];
	}

	// This option enables any extra wait required before resolving the suspended promise.
	if (options.__suspenseWillResolve) {
		promise.then(() => {
			options.__suspenseWillResolve(c._vnode, onSuspensionComplete);
		}, onSuspensionComplete);
	} else {
		promise.then(onSuspensionComplete, onSuspensionComplete);
	}
};

Suspense.prototype.render = function(props, state) {
	return state._parkedChildren ? this._fallback : props.children;
};

export function lazy(loader) {
	let prom;
	let component;
	let error;

	function Lazy(props) {
		if (!prom) {
			prom = loader();
			prom.then(
				exports => {
					component = exports.default;
				},
				e => {
					error = e;
				}
			);
		}

		if (error) {
			throw error;
		}

		if (!component) {
			throw prom;
		}

		return createElement(component, props);
	}

	Lazy.displayName = 'Lazy';
	Lazy._forwarded = true;
	return Lazy;
}
