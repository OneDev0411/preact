import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
	Suspense,
	SuspenseList
} from 'preact/compat';
import { useState } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';

const h = React.createElement;
/* eslint-env browser, mocha */

function getSuspendableComponent(text) {
	let resolver;
	const SuspendableComponent = () => {
		const [loaded, setLoaded] = useState(false);
		if (!loaded) {
			let promise = new Promise(resolve => {
				resolver = () => {
					setLoaded(true);
					return resolve();
				};
			});
			throw promise;
		}
		return <span>{text}</span>;
	};
	SuspendableComponent.resolve = () => {
		resolver();
	};

	return SuspendableComponent;
}

describe('suspense-list', () => {
	/** @type {HTMLDivElement} */
	let scratch,
		rerender,
		unhandledEvents = [];

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	function getSuspenseList(revealOrder) {
		const A = getSuspendableComponent('A');
		const B = getSuspendableComponent('B');
		const C = getSuspendableComponent('C');
		render(
			<SuspenseList revealOrder={revealOrder}>
				<Suspense fallback={<span>Loading...</span>}>
					<A />
				</Suspense>
				<Suspense fallback={<span>Loading...</span>}>
					<B />
				</Suspense>
				<Suspense fallback={<span>Loading...</span>}>
					<C />
				</Suspense>
			</SuspenseList>,
			scratch
		); // Render initial state

		return [A.resolve, B.resolve, C.resolve];
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		unhandledEvents = [];

		if ('onunhandledrejection' in window) {
			window.addEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	afterEach(() => {
		teardown(scratch);

		if ('onunhandledrejection' in window) {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);

			if (unhandledEvents.length) {
				throw unhandledEvents[0].reason;
			}
		}
	});

	it('should work for single element', async () => {
		const Component = getSuspendableComponent('A');
		render(
			<SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<Component />
				</Suspense>
			</SuspenseList>,
			scratch
		); // Render initial state

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(`<span>Loading...</span>`);

		await Component.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(`<span>A</span>`);
	});

	it('should let components appear backwards if no revealOrder is mentioned', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList();

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>B</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>B</span><span>C</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should let components appear forwards if no revealOrder is mentioned', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList();

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should let components appear in forwards if revealOrder=forwards and first one resolves before others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('forwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should make components appear together if revealOrder=forwards and others resolves before first', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('forwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should let components appear backwards if revealOrder=backwards and others resolves before first', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('backwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>C</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>B</span><span>C</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should make components appear together if revealOrder=backwards and first one resolves others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('backwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>C</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should make components appear together if revealOrder=together and first one resolves others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('together');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should make components appear together if revealOrder=together and second one resolves before others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('together');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>C</span>`
		);
	});

	it('should not do anything to non suspense elements', async () => {
		const A = getSuspendableComponent('A');
		const B = getSuspendableComponent('B');
		render(
			<SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<A />
				</Suspense>
				<div>foo</div>
				<Suspense fallback={<span>Loading...</span>}>
					<B />
				</Suspense>
				<span>bar</span>
			</SuspenseList>,
			scratch
		);

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><div>foo</div><span>Loading...</span><span>bar</span>`
		);

		await A.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><div>foo</div><span>Loading...</span><span>bar</span>`
		);

		await B.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><div>foo</div><span>B</span><span>bar</span>`
		);
	});

	it('should make sure nested SuspenseList works with forwards', async () => {
		const A = getSuspendableComponent('A');
		const B = getSuspendableComponent('B');
		const C = getSuspendableComponent('C');
		const D = getSuspendableComponent('D');

		render(
			<SuspenseList revealOrder="forwards">
				<Suspense fallback={<span>Loading...</span>}>
					<A />
				</Suspense>
				<SuspenseList revealOrder="forwards">
					<Suspense fallback={<span>Loading...</span>}>
						<B />
					</Suspense>
					<Suspense fallback={<span>Loading...</span>}>
						<C />
					</Suspense>
				</SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<D />
				</Suspense>
			</SuspenseList>,
			scratch
		);

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await B.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await A.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>Loading...</span><span>Loading...</span>`
		);

		await D.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>Loading...</span><span>Loading...</span>`
		);

		await C.resolve();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>A</span><span>B</span><span>B</span><span>C</span>`
		);
	});

	it.skip('should make sure nested SuspenseList works with backwards', async () => {});

	it.skip('should make sure nested SuspenseList works with together', async () => {});
});
