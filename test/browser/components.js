import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupScratch, teardown, setupRerender, getMixedArray, mixedArrayHTML } from '../_util/helpers';

/** @jsx h */

let spyAll = obj => Object.keys(obj).forEach( key => sinon.spy(obj,key) );

function getAttributes(node) {
	let attrs = {};
	if (node.attributes) {
		for (let i=node.attributes.length; i--; ) {
			attrs[node.attributes[i].name] = node.attributes[i].value;
		}
	}
	return attrs;
}

// hacky normalization of attribute order across browsers.
function sortAttributes(html) {
	return html.replace(/<([a-z0-9-]+)((?:\s[a-z0-9:_.-]+=".*?")+)((?:\s*\/)?>)/gi, (s, pre, attrs, after) => {
		let list = attrs.match(/\s[a-z0-9:_.-]+=".*?"/gi).sort( (a, b) => a>b ? 1 : -1 );
		if (~after.indexOf('/')) after = '></'+pre+'>';
		return '<' + pre + list.join('') + after;
	});
}

describe('Components', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('Component construction', () => {

		/** @type {object} */
		let instance;
		let PROPS;
		let STATE;

		beforeEach(() => {
			instance = null;
			PROPS = { foo: 'bar', onBaz: () => {} };
			STATE = { text: 'Hello' };
		});

		it('should render components', () => {
			class C1 extends Component {
				render() {
					return <div>C1</div>;
				}
			}
			sinon.spy(C1.prototype, 'render');
			render(<C1 />, scratch);

			expect(C1.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch({}, {})
				.and.to.have.returned(sinon.match({ type: 'div' }));

			expect(scratch.innerHTML).to.equal('<div>C1</div>');
		});


		it('should render functional components', () => {
			const C3 = sinon.spy( props => <div {...props} /> );

			render(<C3 {...PROPS} />, scratch);

			expect(C3)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(sinon.match({
					type: 'div',
					props: PROPS
				}));

			expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
		});

		it('should render components with props', () => {
			let constructorProps;

			class C2 extends Component {
				constructor(props) {
					super(props);
					constructorProps = props;
				}
				render(props) {
					return <div {...props} />;
				}
			}
			sinon.spy(C2.prototype, 'render');

			render(<C2 {...PROPS} />, scratch);

			expect(constructorProps).to.deep.equal(PROPS);

			expect(C2.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, {})
				.and.to.have.returned(sinon.match({
					type: 'div',
					props: PROPS
				}));

			expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
		});

		it('should initialize props & context but not state in Component constructor', () => {
			// Not initializing state matches React behavior: https://codesandbox.io/s/rml19v8o2q
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					expect(this.props).to.equal(props);
					expect(this.state).to.deep.equal(undefined);
					expect(this.context).to.equal(context);

					instance = this;
				}
				render(props) {
					return <div {...props}>Hello</div>;
				}
			}

			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render Component classes that don\'t pass args into the Component constructor', () => {
			function Foo () {
				Component.call(this);
				instance = this;
				this.state = STATE;
			}
			Foo.prototype.render = sinon.spy((props, state) => <div {...props}>{state.text}</div>);

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, STATE, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render components that don\'t pass args into the Component constructor (unistore pattern)', () => {
			// Pattern unistore uses for connect: https://git.io/fxRqu
			function Wrapper() {
				instance = this;
				this.state = STATE;
				this.render = sinon.spy((props, state) => <div {...props} >{state.text}</div>);
			}
			(Wrapper.prototype = new Component()).constructor = Wrapper;

			render(<Wrapper {...PROPS} />, scratch);

			expect(instance.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, STATE, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render components that don\'t call Component constructor', () => {
			function Foo() {
				instance = this;
				this.state = STATE;
			}
			Foo.prototype = Object.create(Component);
			Foo.prototype.render = sinon.spy((props, state) => <div {...props}>{state.text}</div>);

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, STATE, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render components that don\'t call Component constructor and don\'t initialize state', () => {
			function Foo () {
				instance = this;
			}
			Foo.prototype.render = sinon.spy((props) => <div {...props}>Hello</div>);

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render components that don\'t inherit from Component', () => {
			class Foo {
				constructor() {
					instance = this;
					this.state = STATE;
				}
				render(props, state) {
					return <div {...props}>{state.text}</div>;
				}
			}
			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, STATE, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render components that don\'t inherit from Component (unistore pattern)', () => {
			// Pattern unistore uses for Provider: https://git.io/fxRqR
			function Provider() {
				instance = this;
				this.state = STATE;
			}
			Provider.prototype.render = sinon.spy((props, state) => <div {...PROPS}>{state.text}</div>);

			render(<Provider {...PROPS} />, scratch);

			expect(Provider.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, STATE, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal(STATE);
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render components that don\'t inherit from Component and don\'t initialize state', () => {
			class Foo {
				constructor() {
					instance = this;
				}
				render(props, state) {
					return <div {...props}>Hello</div>;
				}
			}
			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(sinon.match({ type: 'div', props: PROPS }));
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('<div foo="bar">Hello</div>');
		});

		it('should render class components that inherit from Component without a render method', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					instance = this;
				}
			}

			sinon.spy(Foo.prototype, 'render');

			render(<Foo {...PROPS} />, scratch);

			expect(Foo.prototype.render)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS, {}, {})
				.and.to.have.returned(undefined);
			expect(instance.props).to.deep.equal(PROPS);
			expect(instance.state).to.deep.equal({});
			expect(instance.context).to.deep.equal({});

			expect(scratch.innerHTML).to.equal('');
		});
	});

	it('should render string', () => {
		class StringComponent extends Component {
			render() {
				return 'Hi there';
			}
		}

		render(<StringComponent />, scratch);
		expect(scratch.innerHTML).to.equal('Hi there');
	});

	it('should render number as string', () => {
		class NumberComponent extends Component {
			render() {
				return 42;
			}
		}

		render(<NumberComponent />, scratch);
		expect(scratch.innerHTML).to.equal('42');
	});

	it('should render null as empty string', () => {
		class NullComponent extends Component {
			render() {
				return null;
			}
		}

		render(<NullComponent />, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	// Test for Issue #73
	it('should remove orphaned elements replaced by Components', () => {
		class Comp extends Component {
			render() {
				return <span>span in a component</span>;
			}
		}

		let root;
		function test(content) {
			root = render(content, scratch, root);
		}

		test(<Comp />);
		test(<div>just a div</div>);
		test(<Comp />);

		expect(scratch.innerHTML).to.equal('<span>span in a component</span>');
	});

	// Test for Issue developit/preact#176
	it('should remove children when root changes to text node', () => {
		let comp;

		class Comp extends Component {
			constructor() {
				super();
				comp = this;
			}
			render(_, { alt }) {
				return alt ? 'asdf' : <div>test</div>;
			}
		}

		render(<Comp />, scratch);

		comp.setState({ alt: true });
		comp.forceUpdate();
		expect(scratch.innerHTML, 'switching to textnode').to.equal('asdf');

		comp.setState({ alt: false });
		comp.forceUpdate();
		expect(scratch.innerHTML, 'switching to element').to.equal('<div>test</div>');

		comp.setState({ alt: true });
		comp.forceUpdate();
		expect(scratch.innerHTML, 'switching to textnode 2').to.equal('asdf');
	});

	// Test for Issue developit/preact#254
	it('should not recycle common class children with different keys', () => {
		let idx = 0;
		let msgs = ['A','B','C','D','E','F','G','H'];
		let sideEffect = sinon.spy();

		class Comp extends Component {
			componentWillMount() {
				this.innerMsg = msgs[(idx++ % 8)];
				sideEffect();
			}
			render() {
				return <div>{this.innerMsg}</div>;
			}
		}
		sinon.spy(Comp.prototype, 'componentWillMount');

		let good, bad;
		class GoodContainer extends Component {
			constructor(props) {
				super(props);
				this.state = { alt: false };
				good = this;
			}

			render(_, { alt }) {
				return (
					<div>
						{alt ? null : (<Comp key={1} alt={alt} />)}
						{alt ? null : (<Comp key={2} alt={alt} />)}
						{alt ? (<Comp key={3} alt={alt} />) : null}
					</div>
				);
			}
		}

		class BadContainer extends Component {
			constructor(props) {
				super(props);
				this.state = { alt: false };
				bad = this;
			}

			render(_, { alt }) {
				return (
					<div>
						{alt ? null : (<Comp alt={alt} />)}
						{alt ? null : (<Comp alt={alt} />)}
						{alt ? (<Comp alt={alt} />) : null}
					</div>
				);
			}
		}

		render(<GoodContainer />, scratch);
		expect(scratch.textContent, 'new component with key present').to.equal('AB');
		expect(Comp.prototype.componentWillMount).to.have.been.calledTwice;
		expect(sideEffect).to.have.been.calledTwice;

		sideEffect.resetHistory();
		Comp.prototype.componentWillMount.resetHistory();
		good.setState({ alt: true });
		rerender();
		expect(scratch.textContent, 'new component with key present re-rendered').to.equal('C');
		//we are recycling the first 2 components already rendered, just need a new one
		expect(Comp.prototype.componentWillMount).to.have.been.calledOnce;
		expect(sideEffect).to.have.been.calledOnce;

		sideEffect.resetHistory();
		Comp.prototype.componentWillMount.resetHistory();
		render(<BadContainer />, scratch);
		expect(scratch.textContent, 'new component without key').to.equal('DE');
		expect(Comp.prototype.componentWillMount).to.have.been.calledTwice;
		expect(sideEffect).to.have.been.calledTwice;

		sideEffect.resetHistory();
		Comp.prototype.componentWillMount.resetHistory();
		bad.setState({ alt: true });
		rerender();
		expect(scratch.textContent, 'new component without key re-rendered').to.equal('D');
		expect(Comp.prototype.componentWillMount).to.not.have.been.called;
		expect(sideEffect).to.not.have.been.called;
	});

	describe('array children', () => {
		it('should render DOM element\'s array children', () => {
			render(<div>{getMixedArray()}</div>, scratch);
			expect(scratch.firstChild.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render Component\'s array children', () => {
			const Foo = () => getMixedArray();

			render(<Foo />, scratch);

			expect(scratch.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render Fragment\'s array children', () => {
			const Foo = () => (
				<Fragment>
					{getMixedArray()}
				</Fragment>
			);

			render(<Foo />, scratch);

			expect(scratch.innerHTML).to.equal(mixedArrayHTML);
		});

		it('should render sibling array children', () => {
			const Todo = () => (
				<ul>
					<li>A header</li>
					{['a','b'].map(value => <li>{value}</li>)}
					<li>A divider</li>
					{['c', 'd'].map(value => <li>{value}</li>)}
					<li>A footer</li>
				</ul>
			);

			render(<Todo />, scratch);

			let ul = scratch.firstChild;
			expect(ul.childNodes.length).to.equal(7);
			expect(ul.childNodes[0].textContent).to.equal('A header');
			expect(ul.childNodes[1].textContent).to.equal('a');
			expect(ul.childNodes[2].textContent).to.equal('b');
			expect(ul.childNodes[3].textContent).to.equal('A divider');
			expect(ul.childNodes[4].textContent).to.equal('c');
			expect(ul.childNodes[5].textContent).to.equal('d');
			expect(ul.childNodes[6].textContent).to.equal('A footer');
		});
	});

	describe('props.children', () => {
		let children;

		let Foo = props => {
			children = props.children;
			return <div>{props.children}</div>;
		};

		let FunctionFoo = props => {
			children = props.children;
			return <div>{props.children(2)}</div>;
		};

		let Bar = () => <span>Bar</span>;

		beforeEach(() => {
			children = undefined;
		});

		it('should support passing children as a prop', () => {
			const Foo = props => <div {...props} />;

			render(<Foo a="b" children={[
				<span class="bar">bar</span>,
				'123',
				456
			]}
			       />, scratch);

			expect(scratch.innerHTML).to.equal('<div a="b"><span class="bar">bar</span>123456</div>');
		});

		it('should be ignored when explicit children exist', () => {
			const Foo = props => <div {...props}>a</div>;

			render(<Foo children={'b'} />, scratch);

			expect(scratch.innerHTML).to.equal('<div>a</div>');
		});

		it('should be undefined with no child', () => {
			render(<Foo />, scratch);

			expect(children).to.be.undefined;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be undefined with null as a child', () => {
			render(<Foo>{null}</Foo>, scratch);

			expect(children).to.be.undefined;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be false with false as a child', () => {
			render(<Foo>{false}</Foo>, scratch);

			expect(children).to.be.false;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be true with true as a child', () => {
			render(<Foo>{true}</Foo>, scratch);

			expect(children).to.be.true;
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should be a string with a text child', () => {
			render(<Foo>text</Foo>, scratch);

			expect(children).to.be.a('string');
			expect(children).to.equal('text');
			expect(scratch.innerHTML).to.equal('<div>text</div>');
		});

		it('should be a string with a number child', () => {
			render(<Foo>1</Foo>, scratch);

			expect(children).to.be.a('string');
			expect(children).to.equal('1');
			expect(scratch.innerHTML).to.equal('<div>1</div>');
		});

		it('should be a VNode with a DOM node child', () => {
			render(<Foo><span /></Foo>, scratch);

			expect(children).to.be.an('object');
			expect(children.tag).to.equal('span');
			expect(scratch.innerHTML).to.equal('<div><span></span></div>');
		});

		it('should be a VNode with a Component child', () => {
			render(<Foo><Bar /></Foo>, scratch);

			expect(children).to.be.an('object');
			expect(children.tag).to.equal(Bar);
			expect(scratch.innerHTML).to.equal('<div><span>Bar</span></div>');
		});

		it('should be a function with a function child', () => {
			const child = num => num.toFixed(2);
			render(<FunctionFoo>{child}</FunctionFoo>, scratch);

			expect(children).to.be.an('function');
			expect(children).to.equal(child);
			expect(scratch.innerHTML).to.equal('<div>2.00</div>');
		});

		it('should be an array with multiple children', () => {
			render(<Foo>0<span /><input /><div />1</Foo>, scratch);

			expect(children).to.be.an('array');
			expect(children[0]).to.equal('0');
			expect(children[1].tag).to.equal('span');
			expect(children[2].tag).to.equal('input');
			expect(children[3].tag).to.equal('div');
			expect(children[4]).to.equal('1');
			expect(scratch.innerHTML).to.equal(`<div>0<span></span><input><div></div>1</div>`);
		});

		it('should be an array with an array as children', () => {
			const mixedArray = getMixedArray();
			render(<Foo>{mixedArray}</Foo>, scratch);

			expect(children).to.be.an('array');
			expect(children).to.deep.equal(mixedArray);
			expect(scratch.innerHTML).to.equal(`<div>${mixedArrayHTML}</div>`);
		});

		it('should not flatten sibling and nested arrays', () => {
			const list1 = [0, 1];
			const list2 = [2, 3];
			const list3 = [4, 5];
			const list4 = [6, 7];
			const list5 = [8, 9];

			render(<Foo>{[list1, list2]}{[list3, list4]}{list5}</Foo>, scratch);

			expect(children).to.be.an('array');
			expect(children).to.deep.equal([
				[list1, list2],
				[list3, list4],
				list5
			]);
			expect(scratch.innerHTML).to.equal('<div>0123456789</div>');
		});
	});

	describe('High-Order Components', () => {
		it('should render wrapper HOCs', () => {
			const text = 'We\'ll throw some happy little limbs on this tree.';

			function withBobRoss(ChildComponent) {
				return class BobRossIpsum extends Component {
					getChildContext() {
						return { text };
					}

					render(props) {
						return <ChildComponent {...props} />;
					}
				};
			}

			const PaintSomething = (props, context) => <div>{context.text}</div>;
			const Paint = withBobRoss(PaintSomething);

			render(<Paint />, scratch);
			expect(scratch.innerHTML).to.equal(`<div>${text}</div>`);
		});

		it('should render HOCs with generic children', () => {
			const text = 'Let your imagination just wonder around when you\'re doing these things.';

			class BobRossProvider extends Component {
				getChildContext() {
					return { text };
				}

				render(props) {
					return props.children;
				}
			}

			function BobRossConsumer(props, context) {
				return props.children(context.text);
			}

			const Say = props => <div>{props.text}</div>;

			const Speak = () => (
				<BobRossProvider>
					<span>A span</span>
					<BobRossConsumer>
						{ text => <Say text={text} /> }
					</BobRossConsumer>
					<span>A final span</span>
				</BobRossProvider>
			);

			render(<Speak />, scratch);

			expect(scratch.innerHTML).to.equal(`<span>A span</span><div>${text}</div><span>A final span</span>`);
		});

		it('should render nested functional components', () => {
			const PROPS = { foo: 'bar', onBaz: () => {} };

			const Outer = sinon.spy(
				props => <Inner {...props} />
			);

			const Inner = sinon.spy(
				props => <div {...props}>inner</div>
			);

			render(<Outer {...PROPS} />, scratch);


			expect(Outer)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(sinon.match({
					type: Inner,
					props: PROPS
				}));

			expect(Inner)
				.to.have.been.calledOnce
				.and.to.have.been.calledWithMatch(PROPS)
				.and.to.have.returned(sinon.match({
					type: 'div',
					props: { ...PROPS, children: 'inner' }
				}));

			expect(scratch.innerHTML).to.equal('<div foo="bar">inner</div>');
		});

		it('should re-render nested functional components', () => {
			let doRender = null;
			class Outer extends Component {
				componentDidMount() {
					let i = 1;
					doRender = () => this.setState({ i: ++i });
				}
				componentWillUnmount() {}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			sinon.spy(Outer.prototype, 'render');
			sinon.spy(Outer.prototype, 'componentWillUnmount');

			let j = 0;
			const Inner = sinon.spy(
				props => <div j={++j} {...props}>inner</div>
			);

			render(<Outer foo="bar" />, scratch);

			// update & flush
			doRender();
			rerender();

			expect(Outer.prototype.componentWillUnmount)
				.not.to.have.been.called;

			expect(Inner).to.have.been.calledTwice;

			expect(Inner.secondCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 2 })
				.and.to.have.returned(sinon.match({
					props: {
						j: 2,
						i: 2,
						foo: 'bar'
					}
				}));

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '2',
				i: '2',
				foo: 'bar'
			});

			// update & flush
			doRender();
			rerender();

			expect(Inner).to.have.been.calledThrice;

			expect(Inner.thirdCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 3 })
				.and.to.have.returned(sinon.match({
					props: {
						j: 3,
						i: 3,
						foo: 'bar'
					}
				}));

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '3',
				i: '3',
				foo: 'bar'
			});
		});

		it('should re-render nested components', () => {
			let doRender = null,
				alt = false;

			class Outer extends Component {
				componentDidMount() {
					let i = 1;
					doRender = () => this.setState({ i: ++i });
				}
				componentWillUnmount() {}
				render(props, { i }) {
					if (alt) return <div is-alt />;
					return <Inner i={i} {...props} />;
				}
			}
			sinon.spy(Outer.prototype, 'render');
			sinon.spy(Outer.prototype, 'componentDidMount');
			sinon.spy(Outer.prototype, 'componentWillUnmount');

			let j = 0;
			class Inner extends Component {
				constructor(...args) {
					super();
					this._constructor(...args);
				}
				_constructor() {}
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				render(props) {
					return <div j={++j} {...props}>inner</div>;
				}
			}
			sinon.spy(Inner.prototype, '_constructor');
			sinon.spy(Inner.prototype, 'render');
			sinon.spy(Inner.prototype, 'componentWillMount');
			sinon.spy(Inner.prototype, 'componentDidMount');
			sinon.spy(Inner.prototype, 'componentWillUnmount');

			render(<Outer foo="bar" />, scratch);

			expect(Outer.prototype.componentDidMount).to.have.been.calledOnce;

			// update & flush
			doRender();
			rerender();

			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

			expect(Inner.prototype._constructor).to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledTwice;

			expect(Inner.prototype.render.secondCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 2 })
				.and.to.have.returned(sinon.match({
					props: {
						j: 2,
						i: 2,
						foo: 'bar'
					}
				}));

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '2',
				i: '2',
				foo: 'bar'
			});

			expect(sortAttributes(scratch.innerHTML)).to.equal(sortAttributes('<div foo="bar" j="2" i="2">inner</div>'));

			// update & flush
			doRender();
			rerender();

			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledThrice;

			expect(Inner.prototype.render.thirdCall)
				.to.have.been.calledWithMatch({ foo: 'bar', i: 3 })
				.and.to.have.returned(sinon.match({
					props: {
						j: 3,
						i: 3,
						foo: 'bar'
					}
				}));

			expect(getAttributes(scratch.firstElementChild)).to.eql({
				j: '3',
				i: '3',
				foo: 'bar'
			});


			// update & flush
			alt = true;
			doRender();
			rerender();

			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;

			expect(scratch.innerHTML).to.equal('<div is-alt="true"></div>');

			// update & flush
			alt = false;
			doRender();
			rerender();

			expect(sortAttributes(scratch.innerHTML)).to.equal(sortAttributes('<div foo="bar" j="4" i="5">inner</div>'));
		});

		it('should resolve intermediary functional component', () => {
			let ctx = {};
			class Root extends Component {
				getChildContext() {
					return { ctx };
				}
				render() {
					return <Func />;
				}
			}
			const Func = () => <Inner />;
			class Inner extends Component {
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				render() {
					return <div>inner</div>;
				}
			}

			spyAll(Inner.prototype);

			render(<Root />, scratch);

			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentWillMount).to.have.been.calledBefore(Inner.prototype.componentDidMount);

			render(<asdf />, scratch);

			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;
		});

		it('should unmount children of high-order components without unmounting parent', () => {
			let outer, inner2, counter=0;

			class Outer extends Component {
				constructor(props, context) {
					super(props, context);
					outer = this;
					this.state = {
						child: this.props.child
					};
				}
				componentWillUnmount(){}
				componentWillMount(){}
				componentDidMount(){}
				render(_, { child: C }) {
					return <C />;
				}
			}
			spyAll(Outer.prototype);

			class Inner extends Component {
				componentWillUnmount(){}
				componentWillMount(){}
				componentDidMount(){}
				render() {
					return h('element'+(++counter));
				}
			}
			spyAll(Inner.prototype);

			class Inner2 extends Component {
				constructor(props, context) {
					super(props, context);
					inner2 = this;
				}
				componentWillUnmount(){}
				componentWillMount(){}
				componentDidMount(){}
				render() {
					return h('element'+(++counter));
				}
			}
			spyAll(Inner2.prototype);

			render(<Outer child={Inner} />, scratch);

			// outer should only have been mounted once
			expect(Outer.prototype.componentWillMount, 'outer initial').to.have.been.calledOnce;
			expect(Outer.prototype.componentDidMount, 'outer initial').to.have.been.calledOnce;
			expect(Outer.prototype.componentWillUnmount, 'outer initial').not.to.have.been.called;

			// inner should only have been mounted once
			expect(Inner.prototype.componentWillMount, 'inner initial').to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount, 'inner initial').to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount, 'inner initial').not.to.have.been.called;

			outer.setState({ child: Inner2 });
			outer.forceUpdate();

			expect(Inner2.prototype.render).to.have.been.calledOnce;

			// outer should still only have been mounted once
			expect(Outer.prototype.componentWillMount, 'outer swap').to.have.been.calledOnce;
			expect(Outer.prototype.componentDidMount, 'outer swap').to.have.been.calledOnce;
			expect(Outer.prototype.componentWillUnmount, 'outer swap').not.to.have.been.called;

			// inner should only have been mounted once
			expect(Inner2.prototype.componentWillMount, 'inner2 swap').to.have.been.calledOnce;
			expect(Inner2.prototype.componentDidMount, 'inner2 swap').to.have.been.calledOnce;
			expect(Inner2.prototype.componentWillUnmount, 'inner2 swap').not.to.have.been.called;

			inner2.forceUpdate();

			expect(Inner2.prototype.render, 'inner2 update').to.have.been.calledTwice;
			expect(Inner2.prototype.componentWillMount, 'inner2 update').to.have.been.calledOnce;
			expect(Inner2.prototype.componentDidMount, 'inner2 update').to.have.been.calledOnce;
			expect(Inner2.prototype.componentWillUnmount, 'inner2 update').not.to.have.been.called;
		});

		it('should remount when swapping between HOC child types', () => {
			class Outer extends Component {
				render({ child: Child }) {
					return <Child />;
				}
			}

			class Inner extends Component {
				componentWillMount() {}
				componentWillUnmount() {}
				render() {
					return <div class="inner">foo</div>;
				}
			}
			spyAll(Inner.prototype);

			const InnerFunc = () => (
				<div class="inner-func">bar</div>
			);

			render(<Outer child={Inner} />, scratch);

			expect(Inner.prototype.componentWillMount, 'initial mount').to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount, 'initial mount').not.to.have.been.called;

			Inner.prototype.componentWillMount.resetHistory();
			render(<Outer child={InnerFunc} />, scratch);

			expect(Inner.prototype.componentWillMount, 'unmount').not.to.have.been.called;
			expect(Inner.prototype.componentWillUnmount, 'unmount').to.have.been.calledOnce;

			Inner.prototype.componentWillUnmount.resetHistory();
			render(<Outer child={Inner} />, scratch);

			expect(Inner.prototype.componentWillMount, 'remount').to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount, 'remount').not.to.have.been.called;
		});
	});

	describe('Component Nesting', () => {
		let useIntermediary = false;

		let createComponent = (Intermediary) => {
			class C extends Component {
				componentWillMount() {}
				render({ children }) {
					if (!useIntermediary) return children;
					let I = useIntermediary===true ? Intermediary : useIntermediary;
					return <I>{children}</I>;
				}
			}
			spyAll(C.prototype);
			return C;
		};

		let createFunction = () => sinon.spy( ({ children }) => children );

		let F1 = createFunction();
		let F2 = createFunction();
		let F3 = createFunction();

		let C1 = createComponent(F1);
		let C2 = createComponent(F2);
		let C3 = createComponent(F3);

		let reset = () => [C1, C2, C3].reduce(
			(acc, c) => acc.concat( Object.keys(c.prototype).map(key => c.prototype[key]) ),
			[F1, F2, F3]
		).forEach( c => c.resetHistory() );


		it('should handle lifecycle for no intermediary in component tree', () => {
			reset();
			render(<C1><C2><C3>Some Text</C3></C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'initial mount').to.have.been.calledOnce;
			expect(C2.prototype.componentWillMount, 'initial mount').to.have.been.calledOnce;
			expect(C3.prototype.componentWillMount, 'initial mount').to.have.been.calledOnce;

			reset();
			render(<C1><C2>Some Text</C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'unmount innermost, C1').not.to.have.been.called;
			expect(C2.prototype.componentWillMount, 'unmount innermost, C2').not.to.have.been.called;

			reset();
			render(<C1><C3>Some Text</C3></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'swap innermost').not.to.have.been.called;
			expect(C3.prototype.componentWillMount, 'swap innermost').to.have.been.calledOnce;

			reset();
			render(<C1><C2><C3>Some Text</C3></C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'inject between, C1').not.to.have.been.called;
			expect(C2.prototype.componentWillMount, 'inject between, C2').to.have.been.calledOnce;
			expect(C3.prototype.componentWillMount, 'inject between, C3').to.have.been.calledOnce;
		});


		it('should handle lifecycle for nested intermediary functional components', () => {
			useIntermediary = true;

			render(<div />, scratch);
			reset();
			render(<C1><C2><C3>Some Text</C3></C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'initial mount w/ intermediary fn, C1').to.have.been.calledOnce;
			expect(C2.prototype.componentWillMount, 'initial mount w/ intermediary fn, C2').to.have.been.calledOnce;
			expect(C3.prototype.componentWillMount, 'initial mount w/ intermediary fn, C3').to.have.been.calledOnce;

			reset();
			render(<C1><C2>Some Text</C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'unmount innermost w/ intermediary fn, C1').not.to.have.been.called;
			expect(C2.prototype.componentWillMount, 'unmount innermost w/ intermediary fn, C2').not.to.have.been.called;

			reset();
			render(<C1><C3>Some Text</C3></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'swap innermost w/ intermediary fn').not.to.have.been.called;
			expect(C3.prototype.componentWillMount, 'swap innermost w/ intermediary fn').to.have.been.calledOnce;

			reset();
			render(<C1><C2><C3>Some Text</C3></C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'inject between, C1 w/ intermediary fn').not.to.have.been.called;
			expect(C2.prototype.componentWillMount, 'inject between, C2 w/ intermediary fn').to.have.been.calledOnce;
			expect(C3.prototype.componentWillMount, 'inject between, C3 w/ intermediary fn').to.have.been.calledOnce;
		});


		it('should handle lifecycle for nested intermediary elements', () => {
			useIntermediary = 'div';

			render(<div />, scratch);
			reset();
			render(<C1><C2><C3>Some Text</C3></C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'initial mount w/ intermediary div, C1').to.have.been.calledOnce;
			expect(C2.prototype.componentWillMount, 'initial mount w/ intermediary div, C2').to.have.been.calledOnce;
			expect(C3.prototype.componentWillMount, 'initial mount w/ intermediary div, C3').to.have.been.calledOnce;

			reset();
			render(<C1><C2>Some Text</C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'unmount innermost w/ intermediary div, C1').not.to.have.been.called;
			expect(C2.prototype.componentWillMount, 'unmount innermost w/ intermediary div, C2').not.to.have.been.called;

			reset();
			render(<C1><C3>Some Text</C3></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'swap innermost w/ intermediary div').not.to.have.been.called;
			expect(C3.prototype.componentWillMount, 'swap innermost w/ intermediary div').to.have.been.calledOnce;

			reset();
			render(<C1><C2><C3>Some Text</C3></C2></C1>, scratch);

			expect(C1.prototype.componentWillMount, 'inject between, C1 w/ intermediary div').not.to.have.been.called;
			expect(C2.prototype.componentWillMount, 'inject between, C2 w/ intermediary div').to.have.been.calledOnce;
			expect(C3.prototype.componentWillMount, 'inject between, C3 w/ intermediary div').to.have.been.calledOnce;
		});
	});
});
