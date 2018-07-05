import { createElement as h, render, rerender, Component } from '../../src/index';

/** @jsx h */

let spyAll = obj => Object.keys(obj).forEach( key => sinon.spy(obj,key) );

const EMPTY_CHILDREN = [];

describe('Lifecycle methods', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});


	describe('static getDerivedStateFromProps', () => {
		it('should set initial state with value returned from getDerivedStateFromProps', () => {
			class Foo extends Component {
				static getDerivedStateFromProps(nextProps) {
					return {
						foo: nextProps.foo,
						bar: 'bar'
					};
				}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			let element = render(<Foo foo="foo" />, scratch);
			expect(element.className).to.be.equal('foo bar');
		});

		it('should update initial state with value returned from getDerivedStateFromProps', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						foo: 'foo',
						bar: 'bar'
					};
				}
				static getDerivedStateFromProps(nextProps, prevState) {
					return {
						foo: `not-${prevState.foo}`
					};
				}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			let element = render(<Foo />, scratch);
			expect(element.className).to.equal('not-foo bar');
		});

		it('should update the instance\'s state with the value returned from getDerivedStateFromProps when props change', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						value: 'initial'
					};
				}
				static getDerivedStateFromProps(nextProps) {
					if (nextProps.update) {
						return {
							value: 'updated'
						};
					}

					return null;
				}
				componentDidMount() {}
				componentDidUpdate() {}
				render() {
					return <div className={this.state.value} />;
				}
			}

			let element;
			sinon.spy(Foo, 'getDerivedStateFromProps');
			sinon.spy(Foo.prototype, 'componentDidMount');
			sinon.spy(Foo.prototype, 'componentDidUpdate');

			element = render(<Foo update={false} />, scratch, element);
			expect(element.className).to.equal('initial');
			expect(Foo.getDerivedStateFromProps).to.have.callCount(1);
			expect(Foo.prototype.componentDidMount).to.have.callCount(1); // verify mount occurred
			expect(Foo.prototype.componentDidUpdate).to.have.callCount(0);

			element = render(<Foo update />, scratch, element);
			expect(element.className).to.equal('updated');
			expect(Foo.getDerivedStateFromProps).to.have.callCount(2);
			expect(Foo.prototype.componentDidMount).to.have.callCount(1);
			expect(Foo.prototype.componentDidUpdate).to.have.callCount(1); // verify update occurred
		});

		it('should update the instance\'s state with the value returned from getDerivedStateFromProps when state changes', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						value: 'initial'
					};
				}
				static getDerivedStateFromProps(nextProps, prevState) {
					// Don't change state for call that happens after the constructor
					if (prevState.value === 'initial') {
						return null;
					}

					return {
						value: prevState.value + ' derived'
					};
				}
				componentDidMount() {
					// eslint-disable-next-line react/no-did-mount-set-state
					this.setState({ value: 'updated' });
				}
				render() {
					return <div className={this.state.value} />;
				}
			}

			let element = <Foo />;
			sinon.spy(Foo, 'getDerivedStateFromProps');

			render(<Foo />, scratch);
			expect(element.className).to.equal('initial');
			expect(Foo.getDerivedStateFromProps).to.have.been.calledOnce;

			render(<Foo />, scratch); // call rerender to handle cDM setState call
			expect(element.className).to.equal('updated derived');
			expect(Foo.getDerivedStateFromProps).to.have.been.calledTwice;
		});

		it('should NOT modify state if null is returned', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						foo: 'foo',
						bar: 'bar'
					};
				}
				static getDerivedStateFromProps() {
					return null;
				}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');

			let element = render(<Foo />, scratch);
			expect(element.className).to.equal('foo bar');
			expect(Foo.getDerivedStateFromProps).to.have.been.called;
		});

		// NOTE: Difference from React
		// React v16.3.2 warns if undefined if returned from getDerivedStateFromProps
		it('should NOT modify state if undefined is returned', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						foo: 'foo',
						bar: 'bar'
					};
				}
				static getDerivedStateFromProps() {}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');

			let element = render(<Foo />, scratch);
			expect(element.className).to.equal('foo bar');
			expect(Foo.getDerivedStateFromProps).to.have.been.called;
		});

		// TODO: Consider if componentWillUpdate should still be called
		// Likely, componentWillUpdate should not be called only if getSnapshotBeforeUpdate is implemented
		it('should NOT invoke deprecated lifecycles (cWM/cWRP) if new static gDSFP is present', () => {
			class Foo extends Component {
				static getDerivedStateFromProps() {}
				componentWillMount() {}
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');
			sinon.spy(Foo.prototype, 'componentWillMount');
			sinon.spy(Foo.prototype, 'componentWillReceiveProps');

			render(<Foo />, scratch);
			expect(Foo.getDerivedStateFromProps).to.have.been.called;
			expect(Foo.prototype.componentWillMount).to.not.have.been.called;
			expect(Foo.prototype.componentWillReceiveProps).to.not.have.been.called;
		});

		// TODO: Investigate this test:
		// [should not override state with stale values if prevState is spread within getDerivedStateFromProps](https://github.com/facebook/react/blob/25dda90c1ecb0c662ab06e2c80c1ee31e0ae9d36/packages/react-dom/src/__tests__/ReactComponentLifeCycle-test.js#L1035)
	});


	describe('#componentWillUpdate', () => {
		it('should NOT be called on initial render', () => {
			class ReceivePropsComponent extends Component {
				componentWillUpdate() {}
				render() {
					return <div />;
				}
			}
			sinon.spy(ReceivePropsComponent.prototype, 'componentWillUpdate');
			render(<ReceivePropsComponent />, scratch);
			expect(ReceivePropsComponent.prototype.componentWillUpdate).not.to.have.been.called;
		});

		it('should be called when rerender with new props from parent', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentWillUpdate(nextProps, nextState) {
					expect(nextProps).to.be.deep.equal({ children: EMPTY_CHILDREN, i: 1 });
					expect(nextState).to.be.deep.equal({});
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(Inner.prototype, 'componentWillUpdate');
			sinon.spy(Outer.prototype, 'componentDidMount');

			// Initial render
			render(<Outer />, scratch);
			expect(Inner.prototype.componentWillUpdate).not.to.have.been.called;

			// Rerender inner with new props
			doRender();
			rerender();
			expect(Inner.prototype.componentWillUpdate).to.have.been.called;
		});

		it('should be called on new state', () => {
			let doRender;
			class ReceivePropsComponent extends Component {
				componentWillUpdate() {}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(ReceivePropsComponent.prototype, 'componentWillUpdate');
			render(<ReceivePropsComponent />, scratch);
			expect(ReceivePropsComponent.prototype.componentWillUpdate).not.to.have.been.called;

			doRender();
			rerender();
			expect(ReceivePropsComponent.prototype.componentWillUpdate).to.have.been.called;
		});

		it('should be called after children are mounted', () => {
			let log = [];

			class Inner extends Component {
				componentDidMount() {
					log.push('Inner mounted');

					// Verify that the component is actually mounted when this
					// callback is invoked.
					expect(scratch.querySelector('#inner')).to.equal(this.base);
				}

				render() {
					return <div id="inner" />;
				}
			}

			class Outer extends Component {
				componentDidUpdate() {
					log.push('Outer updated');
				}

				render(props) {
					return props.renderInner ? <Inner /> : <div />;
				}
			}

			const elem = render(<Outer renderInner={false} />, scratch);
			render(<Outer renderInner />, scratch, elem);

			// expect(log).to.deep.equal(['Inner mounted', 'Outer updated']);
		});
	});

	describe('#componentWillReceiveProps', () => {
		it('should NOT be called on initial render', () => {
			class ReceivePropsComponent extends Component {
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}
			sinon.spy(ReceivePropsComponent.prototype, 'componentWillReceiveProps');
			render(<ReceivePropsComponent />, scratch);
			expect(ReceivePropsComponent.prototype.componentWillReceiveProps).not.to.have.been.called;
		});

		it('should be called when rerender with new props from parent', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentWillMount() {
					expect(this.props.i).to.be.equal(0);
				}
				componentWillReceiveProps(nextProps) {
					expect(nextProps.i).to.be.equal(1);
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(Inner.prototype, 'componentWillReceiveProps');
			sinon.spy(Outer.prototype, 'componentDidMount');

			// Initial render
			render(<Outer />, scratch);
			expect(Inner.prototype.componentWillReceiveProps).not.to.have.been.called;

			// Rerender inner with new props
			doRender();
			rerender();
			expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
		});

		it('should be called in right execution order', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentDidUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
					expect(Inner.prototype.componentWillUpdate).to.have.been.called;
				}
				componentWillReceiveProps() {
					expect(Inner.prototype.componentWillUpdate).not.to.have.been.called;
					expect(Inner.prototype.componentDidUpdate).not.to.have.been.called;
				}
				componentWillUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
					expect(Inner.prototype.componentDidUpdate).not.to.have.been.called;
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(Inner.prototype, 'componentWillReceiveProps');
			sinon.spy(Inner.prototype, 'componentDidUpdate');
			sinon.spy(Inner.prototype, 'componentWillUpdate');
			sinon.spy(Outer.prototype, 'componentDidMount');

			render(<Outer />, scratch);
			doRender();
			rerender();

			expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledBefore(Inner.prototype.componentWillUpdate);
			expect(Inner.prototype.componentWillUpdate).to.have.been.calledBefore(Inner.prototype.componentDidUpdate);
		});
	});


	describe('top-level componentWillUnmount', () => {
		it('should invoke componentWillUnmount for top-level components', () => {
			class Foo extends Component {
				componentDidMount() {}
				componentWillUnmount() {}
			}
			class Bar extends Component {
				componentDidMount() {}
				componentWillUnmount() {}
			}
			spyAll(Foo.prototype);
			spyAll(Bar.prototype);

			render(<Foo />, scratch, scratch.lastChild);
			expect(Foo.prototype.componentDidMount, 'initial render').to.have.been.calledOnce;

			render(<Bar />, scratch, scratch.lastChild);
			expect(Foo.prototype.componentWillUnmount, 'when replaced').to.have.been.calledOnce;
			expect(Bar.prototype.componentDidMount, 'when replaced').to.have.been.calledOnce;

			render(<div />, scratch, scratch.lastChild);
			expect(Bar.prototype.componentWillUnmount, 'when removed').to.have.been.calledOnce;
		});
	});


	let _it = it;
	describe('#constructor and component(Did|Will)(Mount|Unmount)', () => {
		/* global DISABLE_FLAKEY */
		let it = DISABLE_FLAKEY ? xit : _it;

		let setState;
		class Outer extends Component {
			constructor(p, c) {
				super(p, c);
				this.state = { show: true };
				setState = s => this.setState(s);
			}
			render(props, { show }) {
				return (
					<div>
						{ show && (
							<Inner {...props} />
						) }
					</div>
				);
			}
		}

		class LifecycleTestComponent extends Component {
			constructor(p, c) { super(p, c); this._constructor(); }
			_constructor() {}
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
			render() { return <div />; }
		}

		class Inner extends LifecycleTestComponent {
			render() {
				return (
					<div>
						<InnerMost />
					</div>
				);
			}
		}

		class InnerMost extends LifecycleTestComponent {
			render() { return <div />; }
		}

		let spies = ['_constructor', 'componentWillMount', 'componentDidMount', 'componentWillUnmount'];

		let verifyLifecycleMethods = (TestComponent) => {
			let proto = TestComponent.prototype;
			spies.forEach( s => sinon.spy(proto, s) );
			let reset = () => spies.forEach( s => proto[s].resetHistory() );

			it('should be invoked for components on initial render', () => {
				reset();
				render(<Outer />, scratch);
				expect(proto._constructor).to.have.been.called;
				expect(proto.componentDidMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});

			it('should be invoked for components on unmount', () => {
				reset();
				setState({ show: false });
				rerender();

				expect(proto.componentWillUnmount).to.have.been.called;
			});

			it('should be invoked for components on re-render', () => {
				reset();
				setState({ show: true });
				rerender();

				expect(proto._constructor).to.have.been.called;
				expect(proto.componentDidMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});
		};

		describe('inner components', () => {
			verifyLifecycleMethods(Inner);
		});

		describe('innermost components', () => {
			verifyLifecycleMethods(InnerMost);
		});

		describe('when shouldComponentUpdate() returns false', () => {
			let setState;

			class Outer extends Component {
				constructor() {
					super();
					this.state = { show: true };
					setState = s => this.setState(s);
				}
				render(props, { show }) {
					return (
						<div>
							{ show && (
								<div>
									<Inner {...props} />
								</div>
							) }
						</div>
					);
				}
			}

			class Inner extends Component {
				shouldComponentUpdate(){ return false; }
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				render() {
					return <div />;
				}
			}

			let proto = Inner.prototype;
			let spies = ['componentWillMount', 'componentDidMount', 'componentWillUnmount'];
			spies.forEach( s => sinon.spy(proto, s) );

			let reset = () => spies.forEach( s => proto[s].resetHistory() );

			beforeEach( () => reset() );

			it('should be invoke normally on initial mount', () => {
				render(<Outer />, scratch);
				expect(proto.componentWillMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});

			it('should be invoked normally on unmount', () => {
				setState({ show: false });
				rerender();

				expect(proto.componentWillUnmount).to.have.been.called;
			});

			it('should still invoke mount for shouldComponentUpdate():false', () => {
				setState({ show: true });
				rerender();

				expect(proto.componentWillMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});

			it('should still invoke unmount for shouldComponentUpdate():false', () => {
				setState({ show: false });
				rerender();

				expect(proto.componentWillUnmount).to.have.been.called;
			});
		});
	});


	describe('shouldComponentUpdate', () => {
		let setState;

		class Should extends Component {
			constructor() {
				super();
				this.state = { show: true };
				setState = s => this.setState(s);
			}
			render(props, { show }) {
				return show ? <div /> : null;
			}
		}

		class ShouldNot extends Should {
			shouldComponentUpdate() {
				return false;
			}
		}

		sinon.spy(Should.prototype, 'render');
		sinon.spy(ShouldNot.prototype, 'shouldComponentUpdate');

		beforeEach(() => Should.prototype.render.resetHistory());

		it('should rerender component on change by default', () => {
			render(<Should />, scratch);
			setState({ show: false });
			rerender();

			expect(Should.prototype.render).to.have.been.calledTwice;
		});

		it('should not rerender component if shouldComponentUpdate returns false', () => {
			render(<ShouldNot />, scratch);
			setState({ show: false });
			rerender();

			expect(ShouldNot.prototype.shouldComponentUpdate).to.have.been.calledOnce;
			expect(ShouldNot.prototype.render).to.have.been.calledOnce;
		});
	});


	describe('Lifecycle DOM Timing', () => {
		it('should be invoked when dom does (DidMount, WillUnmount) or does not (WillMount, DidUnmount) exist', () => {
			let setState;
			class Outer extends Component {
				constructor() {
					super();
					this.state = { show: true };
					setState = s => {
						this.setState(s);
						this.forceUpdate();
					};
				}
				componentWillMount() {
					expect(document.getElementById('OuterDiv'), 'Outer componentWillMount').to.not.exist;
				}
				componentDidMount() {
					expect(document.getElementById('OuterDiv'), 'Outer componentDidMount').to.exist;
				}
				componentWillUnmount() {
					expect(document.getElementById('OuterDiv'), 'Outer componentWillUnmount').to.exist;
					setTimeout( () => {
						expect(document.getElementById('OuterDiv'), 'Outer after componentWillUnmount').to.not.exist;
					}, 0);
				}
				render(props, { show }) {
					return (
						<div id="OuterDiv">
							{ show && (
								<div>
									<Inner {...props} />
								</div>
							) }
						</div>
					);
				}
			}

			class Inner extends Component {
				componentWillMount() {
					expect(document.getElementById('InnerDiv'), 'Inner componentWillMount').to.not.exist;
				}
				componentDidMount() {
					expect(document.getElementById('InnerDiv'), 'Inner componentDidMount').to.exist;
				}
				componentWillUnmount() {
					// @TODO Component mounted into elements (non-components)
					// are currently unmounted after those elements, so their
					// DOM is unmounted prior to the method being called.
					//expect(document.getElementById('InnerDiv'), 'Inner componentWillUnmount').to.exist;
					setTimeout( () => {
						expect(document.getElementById('InnerDiv'), 'Inner after componentWillUnmount').to.not.exist;
					}, 0);
				}

				render() {
					return <div id="InnerDiv" />;
				}
			}

			let proto = Inner.prototype;
			let spies = ['componentWillMount', 'componentDidMount', 'componentWillUnmount'];
			spies.forEach( s => sinon.spy(proto, s) );

			let reset = () => spies.forEach( s => proto[s].resetHistory() );

			render(<Outer />, scratch);
			expect(proto.componentWillMount).to.have.been.called;
			expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
			expect(proto.componentDidMount).to.have.been.called;

			reset();
			setState({ show: false });

			expect(proto.componentWillUnmount).to.have.been.called;

			reset();
			setState({ show: true });

			expect(proto.componentWillMount).to.have.been.called;
			expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
			expect(proto.componentDidMount).to.have.been.called;
		});

		it('should remove this.base for HOC', () => {
			let createComponent = (name, fn) => {
				class C extends Component {
					componentWillUnmount() {
						expect(this.base, `${name}.componentWillUnmount`).to.exist;
						setTimeout( () => {
							expect(this.base, `after ${name}.componentWillUnmount`).not.to.exist;
						}, 0);
					}
					render(props) { return fn(props); }
				}
				spyAll(C.prototype);
				return C;
			};

			class Wrapper extends Component {
				render({ children }) {
					return <div class="wrapper">{children}</div>;
				}
			}

			let One = createComponent('One', () => <Wrapper>one</Wrapper> );
			let Two = createComponent('Two', () => <Wrapper>two</Wrapper> );
			let Three = createComponent('Three', () => <Wrapper>three</Wrapper> );

			let components = [One, Two, Three];

			let Selector = createComponent('Selector', ({ page }) => {
				let Child = components[page];
				return Child && <Child />;
			});

			class App extends Component {
				render(_, { page }) {
					return <Selector page={page} />;
				}
			}

			let app;
			render(<App ref={c => app=c} />, scratch);

			for (let i=0; i<20; i++) {
				app.setState({ page: i%components.length });
				app.forceUpdate();
			}
		});
	});
});
