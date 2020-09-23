import { Component, createElement } from 'preact';
import { jsx, jsxs, jsxDEV, Fragment } from '../../jsx-runtime';
import { setupScratch, teardown } from '../_util/helpers';

describe('Babel jsx/jsxDEV', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should have needed exports', () => {
		expect(typeof jsx).to.equal('function');
		expect(typeof jsxs).to.equal('function');
		expect(typeof jsxDEV).to.equal('function');
		expect(typeof Fragment).to.equal('function');
	});

	it('should keep ref in props', () => {
		const ref = () => null;
		const vnode = jsx('div', { ref });
		expect(vnode.ref).to.equal(ref);
	});

	it('should add keys', () => {
		const vnode = jsx('div', null, 'foo');
		expect(vnode.key).to.equal('foo');
	});

	it('should apply defaultProps', () => {
		class Foo extends Component {
			render() {
				return <div />;
			}
		}

		Foo.defaultProps = {
			foo: 'bar'
		};

		const vnode = jsx(Foo, {}, null);
		expect(vnode.props).to.deep.equal({
			foo: 'bar'
		});
	});

	it('should set __source and __self', () => {
		const vnode = jsx('div', { class: 'foo' }, 'key', 'source', 'self');
		expect(vnode.__source).to.equal('source');
		expect(vnode.__self).to.equal('self');
	});

	it('should return a vnode like createElement', () => {
		const elementVNode = createElement('div', {
			class: 'foo',
			key: 'key'
		});
		const jsxVNode = jsx('div', { class: 'foo' }, 'key');
		delete jsxVNode.__self;
		delete jsxVNode.__source;
		expect(jsxVNode).to.deep.equal(elementVNode);
	});
});
