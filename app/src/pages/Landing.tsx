import { Link } from 'react-router-dom';
import './Landing.css';

export function Landing() {
	return (
		<div className="landing">
			<header className="landing-header">
				<div className="container">
					<div className="logo-container">
						<img
							src="/logo.png"
							alt="HoneyText"
							className="logo-image"
						/>
					</div>
					<nav>
						<Link
							to="/login"
							className="nav-link"
						>
							Log in
						</Link>
						<Link
							to="/signup"
							className="nav-link button-primary"
						>
							Sign up
						</Link>
					</nav>
				</div>
			</header>

			<main className="landing-main">
				<div className="container">
					<div className="hero">
						{/* <img
							src="/logo.png"
							alt="HoneyText"
							className="hero-logo"
						/> */}
						<h2>Weekly questions that bring you closer</h2>
						<p className="hero-subtitle">
							Send thoughtful questions to your group every week
							via text message. Perfect for couples, families,
							siblings, and friends.
						</p>
						<Link
							to="/signup"
							className="button button-primary button-large"
						>
							Get Started
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
