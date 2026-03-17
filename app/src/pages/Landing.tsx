import { Link } from 'react-router-dom';
import { Container, ButtonLink } from '../components';
import { theme } from '../theme';

// Honeycomb pattern SVG
const honeycombPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23EF8128' fill-opacity='0.04'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5V28.97h-.01L17 36.35V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// Sparkle doodle SVG
const sparkleDoodle = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23EF8128' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'/%3E%3C/svg%3E")`;

// Heart doodle SVG
const heartDoodle = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23EF8128' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/%3E%3C/svg%3E")`;

export function Landing() {
	return (
		<div
			style={{
				minHeight: '100vh',
				backgroundColor: theme.bg,
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Honeycomb pattern background */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundImage: honeycombPattern,
					pointerEvents: 'none',
					zIndex: 0,
				}}
			/>

			{/* Content wrapper */}
			<div style={{ position: 'relative', zIndex: 1 }}>
				{/* Same header style as AppLayout */}
				<header
					style={{
						background: theme.bg,
						padding: '0.5rem 0',
						borderBottom: `1px solid ${theme.headerBorder}`,
						flexShrink: 0,
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
							<Link
								to="/"
								style={{
									display: 'flex',
									alignItems: 'center',
									textDecoration: 'none',
									color: 'inherit',
								}}
							>
							<img
								src="/logo.png"
								alt="HoneyText"
								style={{
									height: 60,
									width: 'auto',
									borderRadius: 10,
								}}
							/>
							</Link>
							<div
								style={{
									display: 'flex',
									gap: '1rem',
									alignItems: 'center',
								}}
							>
								<ButtonLink to="/login" style={{ textDecoration: 'none' }}>Log in</ButtonLink>
								<Link
									to="/signup"
									style={{
										backgroundColor: theme.primary,
										color: 'white',
										border: 'none',
										padding: '0.6rem 1.75rem',
										borderRadius: 14,
										textDecoration: 'none',
										display: 'inline-block',
										fontWeight: 600,
										boxShadow: '0 2px 8px rgba(239, 129, 40, 0.2)',
										transition: 'all 0.2s ease',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'translateY(-2px)';
										e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 129, 40, 0.3)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 129, 40, 0.2)';
									}}
								>
									Sign up
								</Link>
							</div>
						</div>
					</Container>
				</header>

				<main style={{ padding: '4rem 0', position: 'relative' }}>
					{/* Sparkle doodle - top right */}
					<div
						style={{
							position: 'absolute',
							top: '40px',
							right: '10%',
							width: 60,
							height: 60,
							backgroundImage: sparkleDoodle,
							backgroundSize: 'contain',
							backgroundRepeat: 'no-repeat',
							transform: 'rotate(15deg)',
							opacity: 0.6,
							pointerEvents: 'none',
						}}
					/>
					{/* Heart doodle - bottom left */}
					<div
						style={{
							position: 'absolute',
							bottom: '20%',
							left: '5%',
							width: 40,
							height: 40,
							backgroundImage: heartDoodle,
							backgroundSize: 'contain',
							backgroundRepeat: 'no-repeat',
							transform: 'rotate(-10deg)',
							opacity: 0.6,
							pointerEvents: 'none',
						}}
					/>

					<Container
						maxWidth={800}
						style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
					>
						<div style={{ paddingTop: '3rem' }}>
							<p
								style={{
									fontSize: '1.5rem',
									color: theme.primary,
									fontWeight: 700,
									marginBottom: '1rem',
									letterSpacing: '-0.01em',
								}}
							>
								Little questions. Deeper connections.
							</p>
							<h1
								style={{
									fontSize: '3.5rem',
									fontWeight: 800,
									marginBottom: '1.25rem',
									color: theme.text,
									letterSpacing: '-0.02em',
									lineHeight: 1.2,
								}}
							>
								Tiny texts that mean a lot
							</h1>
							<p
								style={{
									fontSize: '1.25rem',
									color: theme.textMuted,
									marginBottom: '2.5rem',
									lineHeight: 1.8,
									maxWidth: 600,
									marginLeft: 'auto',
									marginRight: 'auto',
								}}
							>
								A weekly nudge to grow closer. Send thoughtful questions to
								your partner, family, or friends via text message.
							</p>

							{/* Improved CTA Button */}
							<Link
								to="/signup"
								style={{
									display: 'inline-block',
									padding: '1.1rem 2.75rem',
									borderRadius: 16,
									textDecoration: 'none',
									fontWeight: 600,
									fontSize: '1.15rem',
									backgroundColor: theme.primary,
									color: 'white',
									border: `2px solid ${theme.primary}`,
									boxShadow: '0 4px 14px rgba(239, 129, 40, 0.25), 0 1px 3px rgba(239, 129, 40, 0.15)',
									transition: 'all 0.25s ease',
									cursor: 'pointer',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = 'translateY(-3px)';
									e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 129, 40, 0.35), 0 2px 6px rgba(239, 129, 40, 0.2)';
									e.currentTarget.style.backgroundColor = 'white';
									e.currentTarget.style.color = theme.primary;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = 'translateY(0)';
									e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 129, 40, 0.25), 0 1px 3px rgba(239, 129, 40, 0.15)';
									e.currentTarget.style.backgroundColor = theme.primary;
									e.currentTarget.style.color = 'white';
								}}
							>
								Start connecting 💛
							</Link>
						</div>

						{/* How it works */}
						<div
							style={{
								marginTop: '5rem',
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
								gap: '2rem',
								textAlign: 'center',
							}}
						>
							{[
								{ step: '1', title: 'Create a group', desc: 'Name your group and add members by phone number.' },
								{ step: '2', title: 'Invite via text', desc: 'Members get an SMS or web invite with opt-in disclosure.' },
								{ step: '3', title: 'Weekly questions', desc: 'Each week, a discussion question is sent to the group via text message.' },
							].map((item) => (
								<div key={item.step} style={{ padding: '1.5rem' }}>
									<div
										style={{
											width: 48,
											height: 48,
											borderRadius: '50%',
											backgroundColor: theme.primary,
											color: 'white',
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontWeight: 700,
											fontSize: '1.25rem',
											marginBottom: '1rem',
										}}
									>
										{item.step}
									</div>
									<h3 style={{ color: theme.text, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
										{item.title}
									</h3>
									<p style={{ color: theme.textMuted, fontSize: '0.95rem', lineHeight: 1.6 }}>
										{item.desc}
									</p>
								</div>
							))}
						</div>

						{/* SMS program summary */}
						<div
							style={{
								marginTop: '3rem',
								padding: '2rem',
								background: 'white',
								borderRadius: 16,
								boxShadow: theme.shadow,
								textAlign: 'left',
								maxWidth: 600,
								marginLeft: 'auto',
								marginRight: 'auto',
							}}
						>
							<h3 style={{ color: theme.text, marginBottom: '0.75rem', fontSize: '1.1rem' }}>
								About our text messaging service
							</h3>
							<p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
								HoneyText sends weekly discussion questions and group updates via SMS to members who have opted in. We do not send marketing or promotional messages. Message and data rates may apply. Message frequency is about one per week per group, plus occasional transactional messages.
							</p>
							<p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
								Reply <strong>STOP</strong> to opt out at any time. Reply <strong>HELP</strong> for assistance. For questions, contact <a href="mailto:honeytexting@gmail.com" style={{ color: theme.primary }}>honeytexting@gmail.com</a>.
							</p>
						</div>
					</Container>
				</main>

				{/* Footer */}
				<footer
					style={{
						borderTop: `1px solid ${theme.headerBorder}`,
						padding: '2rem 0',
						textAlign: 'center',
					}}
				>
					<Container maxWidth="wide">
						<div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
							<Link to="/privacy" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: '0.9rem' }}>
								Privacy Policy
							</Link>
							<Link to="/terms" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: '0.9rem' }}>
								Terms and Conditions
							</Link>
							<a href="mailto:honeytexting@gmail.com" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: '0.9rem' }}>
								Contact
							</a>
						</div>
						<p style={{ color: theme.textLight, fontSize: '0.85rem', margin: 0 }}>
							&copy; {new Date().getFullYear()} HoneyText. All rights reserved.
						</p>
					</Container>
				</footer>
			</div>
		</div>
	);
}
