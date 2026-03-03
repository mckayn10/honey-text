import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import './Landing.css';

export function Landing() {
	return (
		<div className="landing">
			<Header />

			<main className="landing-main">
				<div className="container">
					<div className="hero">
						<p className="tagline">Little questions. Deeper connections.</p>
						<h1>Tiny texts that mean a lot</h1>
						<p className="hero-subtitle">
							A weekly nudge to grow closer. Send thoughtful questions to
							your partner, family, or friends via text message.
						</p>
						<div className="cta-group">
							<Link
								to="/signup"
								className="button button-primary button-large"
							>
								Start connecting 💛
							</Link>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
