import { createElement, render, hydrate, Component, options } from 'ceviche';
import * as preact from 'preact';
import renderToString from 'preact-render-to-string';
import './style.scss';
import { Router } from 'preact-router';
import { Link } from 'preact-router/match';
import Pythagoras from './pythagoras';
import Spiral from './spiral';
import Reorder from './reorder';
import Todo from './todo';
import Fragments from './fragments';
import installLogger from './logger';
import ProfilerDemo from './profiler';
import KeyBug from './key_bug';
import { initDevTools } from 'ceviche/debug/src/devtools';

let isBenchmark = /(\/spiral|\/pythagoras|[#&]bench)/g.test(window.location.href);
if (!isBenchmark) {
	// eslint-disable-next-line no-console
	console.log('Enabling devtools');
	initDevTools();
}

window.ceviche = { createElement, render, hydrate, Component, options };

class Home extends Component {
	a = 1;
	render() {
		return (
			<div>
				<h1>Hello</h1>
			</div>
		);
	}
}

class DevtoolsWarning extends Component {
	onClick = () => {
		window.location.reload();
	}

	render() {
		return (
			<button onClick={this.onClick}>Start Benchmark (disables devtools)</button>
		);
	}
}

class App extends Component {
	render({ url }) {
		return (
			<div class="app">
				<header>
					<nav>
						<Link href="/" activeClassName="active">Home</Link>
						<Link href="/reorder" activeClassName="active">Reorder</Link>
						<Link href="/spiral" activeClassName="active">Spiral</Link>
						<Link href="/pythagoras" activeClassName="active">Pythagoras</Link>
						<Link href="/todo" activeClassName="active">ToDo</Link>
						<Link href="/fragments" activeClassName="active">Fragments</Link>
						<Link href="/key_bug" activeClassName="active">Key Bug</Link>
						<Link href="/profiler" activeClassName="active">Profiler</Link>
					</nav>
				</header>
				<main>
					<Router url={url}>
						<Home path="/" />
						<Reorder path="/reorder" />
						<div path="/spiral">
							{!isBenchmark
								? <DevtoolsWarning />
								: <Spiral />
							}
						</div>
						<div path="/pythagoras">
							{!isBenchmark
								? <DevtoolsWarning />
								: <Pythagoras />
							}
						</div>
						<Todo path="/todo" />
						<Fragments path="/fragments" />
						<ProfilerDemo path="/profiler" />
						<KeyBug path="/key_bug" />
					</Router>
				</main>
			</div>
		);
	}
}


document.body.innerHTML = renderToString(<App url={location.href.match(/[#&]ssr/) ? undefined : '/'} />);
// document.body.firstChild.setAttribute('is-ssr', 'true');

installLogger(
	String(localStorage.LOG)==='true' || location.href.match(/logger/),
	String(localStorage.CONSOLE)==='true' || location.href.match(/console/)
);

render(<App />, document.body);
