import { Link } from 'react-router-dom';
import { Container } from '../components';
import { theme } from '../theme';

export function Landing() {
	return (
		<div style={{ minHeight: '100vh', backgroundColor: theme.bg }}>
			<header
				style={{
					padding: '0rem 0',
					borderBottom: `1px solid ${theme.headerBorder}`,
				}}
			>
				<Container maxWidth="wide">
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<img
								src="/logo.png"
								alt="HoneyText"
								style={{
									height: 80,
									width: 'auto',
									borderRadius: 16,
								}}
							/>
						</div>
						<nav
							style={{
								display: 'flex',
								gap: '1rem',
								alignItems: 'center',
							}}
						>
							<Link
								to="/login"
								style={{
									textDecoration: 'none',
									color: theme.text,
									padding: '0.5rem 1rem',
									borderRadius: 4,
								}}
							>
								Log in
							</Link>
							<Link
								to="/signup"
								style={{
									backgroundColor: theme.primary,
									color: 'white',
									border: 'none',
									padding: '0.5rem 1.5rem',
									borderRadius: 4,
									textDecoration: 'none',
									display: 'inline-block',
								}}
							>
								Sign up
							</Link>
						</nav>
					</div>
				</Container>
			</header>

			<main style={{ padding: '4rem 0' }}>
				<Container
					maxWidth={800}
					style={{ textAlign: 'center' }}
				>
					<div>
						<h2
							style={{
								fontSize: '3rem',
								marginBottom: '1rem',
								color: theme.text,
							}}
						>
							Weekly questions that bring you closer
						</h2>
						<p
							style={{
								fontSize: '1.25rem',
								color: theme.textMuted,
								marginBottom: '2rem',
								lineHeight: 1.6,
							}}
						>
							Send thoughtful questions to your group every week
							via text message. Perfect for couples, families,
							siblings, and friends.
						</p>
						<Link
							to="/signup"
							style={{
								display: 'inline-block',
								padding: '1rem 2rem',
								borderRadius: 4,
								textDecoration: 'none',
								fontWeight: 500,
								backgroundColor: theme.primary,
								color: 'white',
								fontSize: '1.1rem',
							}}
						>
							Get Started
						</Link>
					</div>
				</Container>
			</main>
		</div>
	);
}
