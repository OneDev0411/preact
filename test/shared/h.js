import { createElement as h } from '../../src/index';
// import { VNode } from '../../src/vnode';
import { expect } from 'chai';

/*eslint-env browser, mocha */

/** @jsx h */

const buildVNode = (nodeName, attributes, children=[]) => ({
	nodeName,
	children,
	attributes,
	key: attributes && attributes.key
});

describe('h(jsx)', () => {
	it('should return a VNode', () => {
		let r;
		expect( () => r = h('foo') ).not.to.throw();
		expect(r).to.be.an('object');
		// expect(r).to.be.an.instanceof(VNode);
		expect(r).to.have.property('tag', 'foo');
		expect(r).to.have.property('props').that.eql({});
		// expect(r).to.have.deep.property('props.children').that.eql(null);
	});

	it('should preserve raw props', () => {
		let props = { foo: 'bar', baz: 10, func: () => {} },
			r = h('foo', props);
		expect(r).to.be.an('object')
			.with.property('props')
			.that.deep.equals(props);
	});

	it('should support element children', () => {
		let kid1 = h('bar');
		let kid2 = h('baz');
		let r = h(
			'foo',
			null,
			kid1,
			kid2
		);

		expect(r).to.be.an('object')
			.with.nested.deep.property('props.children', [
				kid1,
				kid2
			]);
	});

	it('should support multiple element children, given as arg list', () => {
		let kid1 = h('bar');
		let kid3 = h('test');
		let kid2 = h('baz', null, kid3);

		let r = h(
			'foo',
			null,
			kid1,
			kid2
		);

		expect(r).to.be.an('object')
			.with.nested.deep.property('props.children', [
				kid1,
				kid2
			]);
	});

	it('should handle multiple element children, given as an array', () => {
		let kid1 = h('bar');
		let kid3 = h('test');
		let kid2 = h('baz', null, kid3);

		let r = h(
			'foo',
			null,
			[
				kid1,
				kid2
			]
		);

		expect(r).to.be.an('object')
			.with.nested.deep.property('props.children', [
				kid1,
				kid2
			]);
	});

	it('should support nested children', () => {
		const m = x => h(x);
		expect(
			h('foo', null, m('a'), [m('b'), m('c')], m('d'))
		).to.have.nested.property('props.children')
			.that.eql([m('a'), [m('b'), m('c')], m('d')]);

		expect(
			h('foo', null, [m('a'), [m('b'), m('c')], m('d')])
		).to.have.nested.property('props.children')
			.that.eql([m('a'), [m('b'), m('c')], m('d')]);

		expect(
			h('foo', { children: [m('a'), [m('b'), m('c')], m('d')] })
		).to.have.nested.property('props.children')
			.that.eql([m('a'), [m('b'), m('c')], m('d')]);

		expect(
			h('foo', { children: [[m('a'), [m('b'), m('c')], m('d')]] })
		).to.have.nested.property('props.children')
			.that.eql([[m('a'), [m('b'), m('c')], m('d')]]);

		expect(
			h('foo', { children: m('a') })
		).to.have.nested.property('props.children').that.eql(m('a'));

		expect(
			h('foo', { children: 'a' })
		).to.have.nested.property('props.children').that.eql('a');
	});

	it('should support text children', () => {
		let r = h(
			'foo',
			null,
			'textstuff'
		);

		expect(r).to.be.an('object')
			.with.nested.property('props.children')
			.that.equals('textstuff');
	});

	it('should NOT merge adjacent text children', () => {
		let r = h(
			'foo',
			null,
			'one',
			'two',
			h('bar'),
			'three',
			h('baz'),
			h('baz'),
			'four',
			null,
			'five',
			'six'
		);

		expect(r).to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals([
				'one',
				'two',
				h('bar'),
				'three',
				h('baz'),
				h('baz'),
				'four',
				null,
				'five',
				'six'
			]);
	});

	it('should not merge nested adjacent text children', () => {
		let r = h(
			'foo',
			null,
			'one',
			['two', null, 'three'],
			null,
			['four', null, 'five', null],
			'six',
			null
		);

		expect(r).to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals([
				'one',
				['two', null, 'three'],
				null,
				['four', null, 'five', null],
				'six',
				null
			]);
	});
	it('should not merge children that are boolean values', () => {
		let r = h(
			'foo',
			null,
			'one',
			true,
			'two',
			false,
			'three'
		);

		expect(r).to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals(['one',true,'two',false,'three']);
	});

	it('should not merge children of components', () => {
		let Component = ({ children }) => children;
		let r = h(Component, null, 'x', 'y');

		expect(r).to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals(['x', 'y']);
	});
});
