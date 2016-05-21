import { ATTR_KEY, UNDEFINED_ELEMENT, EMPTY } from '../constants';
import { createObject, hasOwnProperty, toArray, empty, toLowerCase, isString, isFunction } from '../util';
import { hook, deepHook } from '../hooks';
import { isSameNodeType } from '.';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { unmountComponent } from './component';
import { removeNode, appendChildren, setAccessor, getNodeData, getRawNodeAttributes, getNodeType } from '../dom';
import { createNode, collectNode } from '../dom/recycler';


function buildTextNode(dom, str) {
	if (dom) {
		let type = getNodeType(dom);
		if (type===3) {
			if (dom.nodeValue!==str) {
				dom.nodeValue = str;
			}
			return dom;
		}
		if (type===1) collectNode(dom);
	}
	return document.createTextNode(str);
}


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export default function diff(dom, vnode, context, mountAll) {
	let originalAttributes = vnode.attributes;

	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}

	if (isFunction(vnode.nodeName)) {
		return buildComponentFromVNode(dom, vnode, context);
	}

	if (isString(vnode)) {
		return buildTextNode(dom, vnode);
	}

	// return diffNode(dom, vnode, context);
// }


/** Morph a DOM node to look like the given VNode. Creates DOM if it doesn't exist. */
// function diffNode(dom, vnode, context) {
	let out = dom,
		nodeName = vnode.nodeName || UNDEFINED_ELEMENT;

	if (!dom) {
		out = createNode(nodeName);
	}
	else if (toLowerCase(dom.nodeName)!==nodeName) {
		out = createNode(nodeName);
		// move children into the replacement node
		appendChildren(out, toArray(dom.childNodes));
		// reclaim element nodes
		recollectNodeTree(dom);
	}

	innerDiffNode(out, vnode, context);
	diffAttributes(out, vnode);

	if (originalAttributes && originalAttributes.ref) {
		(out[ATTR_KEY].ref = originalAttributes.ref)(out);
	}

	return out;
}


/** Apply child and attribute changes between a VNode and a DOM Node to the DOM. */
function innerDiffNode(dom, vnode, context) {
	let children,
		keyed,
		keyedLen = 0,
		len = dom.childNodes.length,
		childrenLen = 0;
	if (len) {
		children = [];
		for (let i=0; i<len; i++) {
			let child = dom.childNodes[i],
				key = child._component ? child._component.__key : getAccessor(child, 'key');
			if (!empty(key)) {
				if (!keyed) keyed = createObject();
				keyed[key] = child;
				keyedLen++;
			}
			else {
				children[childrenLen++] = child;
			}
		}
	}


	let vchildren = vnode.children,
		vlen = vchildren && vchildren.length,
		min = 0;
	if (vlen) {
		for (let i=0; i<vlen; i++) {
			let vchild = vchildren[i],
				child;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			// attempt to find a node based on key matching
			if (keyedLen!==0 && vchild.attributes) {
				let key = vchild.key;
				if (!empty(key) && hasOwnProperty.call(keyed, key)) {
					child = keyed[key];
					keyed[key] = null;
					keyedLen--;
				}
			}

			// attempt to pluck a node of the same type from the existing children
			if (!child && min<childrenLen) {
				for (let j=min; j<childrenLen; j++) {
					let c = children[j];
					if (c && isSameNodeType(c, vchild)) {
						child = c;
						children[j] = null;
						if (j===childrenLen-1) childrenLen--;
						if (j===min) min++;
						break;
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = diff(child, vchild, context, mountAll);

			let c = (mountAll || child.parentNode!==dom) && child._component;

			if (c) deepHook(c, 'componentWillMount');

			if (originalChildren[i]!==child) {
				let next = originalChildren[i+1];
				if (next) {
					dom.insertBefore(child, next);
				}
				else {
					dom.appendChild(child);
				}
			}

			if (c) deepHook(c, 'componentDidMount');
		}
	}


	if (keyedLen) {
		/*eslint guard-for-in:0*/
		for (let i in keyed) if (hasOwnProperty.call(keyed, i) && keyed[i]) {
			children[min=childrenLen++] = keyed[i];
		}
	}

	// remove orphaned children
	if (min<childrenLen) {
		removeOrphanedChildren(children);
	}
}


/** Reclaim children that were unreferenced in the desired VTree */
export function removeOrphanedChildren(children, unmountOnly) {
	for (let i=children.length; i--; ) {
		let child = children[i];
		if (child) {
			recollectNodeTree(child, unmountOnly);
		}
	}
}


/** Reclaim an entire tree of nodes, starting at the root. */
export function recollectNodeTree(node, unmountOnly) {
	// @TODO: Need to make a call on whether Preact should remove nodes not created by itself.
	// Currently it *does* remove them. Discussion: https://github.com/developit/preact/issues/39
	//if (!node[ATTR_KEY]) return;

	let attrs = node[ATTR_KEY];
	if (attrs) hook(attrs, 'ref', null);

	let component = node._component;
	if (component) {
		unmountComponent(component, !unmountOnly);
	}
	else {
		if (!unmountOnly) {
			if (getNodeType(node)!==1) {
				removeNode(node);
				return;
			}

			collectNode(node);
		}

		let c = node.childNodes;
		if (c && c.length) {
			removeOrphanedChildren(c, unmountOnly);
		}
	}
}


/** Apply differences in attributes from a VNode to the given DOM Node. */
function diffAttributes(dom, vnode) {
		attrs = vnode.attributes || EMPTY,
		name, value;
	let old = getNodeData(dom) || getRawNodeAttributes(dom),

	// removed
	for (name in old) {
		if (empty(attrs[name])) {
			setAccessor(dom, name, null);
		}
	}

	// new & updated
	if (attrs!==EMPTY) {
		for (name in attrs) {
			if (hasOwnProperty.call(attrs, name)) {
				value = attrs[name];
				if (!empty(value) && value!=getAccessor(dom, name)) {
					setAccessor(dom, name, value);
				}
			}
		}
	}
}
