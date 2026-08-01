import { Link } from 'react-router-dom';
import { Container, ButtonLink, Logo } from '../components';
import { theme } from '../theme';

const steps = [
	{ n: '1', title: 'Create a group', desc: 'Name your group and add members by phone number.' },
	{ n: '2', title: 'Invite via text', desc: 'Members get an SMS or web invite with opt-in disclosure.' },
	{ n: '3', title: 'Weekly questions', desc: 'Each week, a discussion question goes out to the group by text.' },
];

const chatBubble: React.CSSProperties = {
	maxWidth: '78%',
	padding: '10px 14px',
	fontSize: 13.5,
	lineHeight: 1.5,
};

export function Landing() {
	return (
		<div style={{ minHeight: '100vh', backgroundColor: theme.bg, color: theme.text }}>
			<header
				style={{
					padding: '22px 0',
					borderBottom: `1px solid ${theme.headerBorder}`,
				}}
			>
				<Container maxWidth="wide">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
						<Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
							<Logo size={26} />
						</Link>
						<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
							<ButtonLink to="/login" style={{ textDecoration: 'none', fontWeight: 600, color: theme.textMuted, padding: '10px 14px' }}>
								Log in
							</ButtonLink>
							<Link
								to="/signup"
								style={{
									background: theme.primary,
									color: 'white',
									border: 'none',
									padding: '11px 24px',
									borderRadius: 999,
									fontWeight: 700,
									fontSize: 15,
									textDecoration: 'none',
									display: 'inline-block',
									transition: 'background 0.2s ease',
								}}
								onMouseEnter={(e) => { e.currentTarget.style.background = theme.primaryHover; }}
								onMouseLeave={(e) => { e.currentTarget.style.background = theme.primary; }}
							>
								Sign up
							</Link>
						</div>
					</div>
				</Container>
			</header>

			<main style={{ padding: '72px 0 0' }}>
				<Container maxWidth="wide">
					<div
						className="hero-grid"
						style={{
							display: 'grid',
							gridTemplateColumns: 'minmax(0, 1fr) 300px',
							gap: 56,
							alignItems: 'center',
						}}
					>
						<div>
							<p
								style={{
									fontSize: 16,
									color: theme.primary,
									fontWeight: 800,
									margin: '0 0 16px',
									letterSpacing: '0.02em',
									textTransform: 'uppercase',
								}}
							>
								Little questions, deeper connections
							</p>
							<h1
								className="hero-heading"
								style={{
									fontSize: 52,
									fontWeight: 900,
									margin: '0 0 22px',
									letterSpacing: '-0.03em',
									lineHeight: 1.1,
									color: theme.text,
								}}
							>
								A weekly text that brings you closer together
							</h1>
							<p
								style={{
									fontSize: 18,
									color: theme.textMuted,
									margin: '0 0 32px',
									lineHeight: 1.7,
									maxWidth: 620,
								}}
							>
								Thoughtful questions, sent right to the group chat — for
								couples, families, and friends who want to stay close.
							</p>
							<div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
								<Link
									to="/signup"
									style={{
										padding: '16px 34px',
										borderRadius: 999,
										fontWeight: 700,
										fontSize: 16,
										background: theme.primary,
										color: 'white',
										border: 'none',
										textDecoration: 'none',
										display: 'inline-block',
										boxShadow: `0 6px 16px ${theme.primaryShadow}`,
										transition: 'background 0.2s ease',
									}}
									onMouseEnter={(e) => { e.currentTarget.style.background = theme.primaryHover; }}
									onMouseLeave={(e) => { e.currentTarget.style.background = theme.primary; }}
								>
									Start connecting
								</Link>
								<span style={{ color: theme.textLight, fontSize: 14 }}>
									Free to try · no credit card
								</span>
							</div>
						</div>

						<div className="hero-phone" style={{ display: 'flex', justifyContent: 'center' }}>
							<div
								style={{
									position: 'relative',
									width: 280,
									maxWidth: '100%',
									background: theme.text,
									borderRadius: 48,
									padding: 14,
									boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 24px 60px rgba(42,38,33,0.25)',
								}}
							>
								{/* Side buttons */}
								<div style={{ position: 'absolute', left: -3, top: 86, width: 3, height: 26, background: theme.text, borderRadius: '2px 0 0 2px' }} />
								<div style={{ position: 'absolute', left: -3, top: 122, width: 3, height: 44, background: theme.text, borderRadius: '2px 0 0 2px' }} />
								<div style={{ position: 'absolute', right: -3, top: 104, width: 3, height: 62, background: theme.text, borderRadius: '0 2px 2px 0' }} />

								<div
									style={{
										position: 'relative',
										background: theme.bg,
										borderRadius: 34,
										padding: '40px 16px 22px',
										minHeight: 440,
										display: 'flex',
										flexDirection: 'column',
										gap: 10,
										overflow: 'hidden',
									}}
								>
									{/* Notch */}
									<div
										style={{
											position: 'absolute',
											top: 12,
											left: '50%',
											transform: 'translateX(-50%)',
											width: 76,
											height: 21,
											background: theme.text,
											borderRadius: 999,
										}}
									/>

									<div style={{ textAlign: 'center', color: theme.textLight, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
										The Millers
									</div>
									<div style={{ ...chatBubble, alignSelf: 'flex-start', background: theme.primaryBg, color: theme.text, borderRadius: '16px 16px 16px 4px' }}>
										This week: what's one small thing someone did for you that made you feel loved?
									</div>
									<div style={{ ...chatBubble, alignSelf: 'flex-end', background: theme.primary, color: 'white', borderRadius: '16px 16px 4px 16px' }}>
										Dad picked me up early from practice just to talk 💬
									</div>
									<div style={{ ...chatBubble, alignSelf: 'flex-start', background: theme.primaryBg, color: theme.text, borderRadius: '16px 16px 16px 4px' }}>
										Sarah made my coffee exactly right without asking
									</div>
									<div style={{ ...chatBubble, alignSelf: 'flex-end', background: theme.primary, color: 'white', borderRadius: '16px 16px 4px 16px' }}>
										Love this one
									</div>

									{/* Home indicator */}
									<div
										style={{
											position: 'absolute',
											bottom: 9,
											left: '50%',
											transform: 'translateX(-50%)',
											width: 110,
											height: 4,
											background: theme.text,
											opacity: 0.2,
											borderRadius: 999,
										}}
									/>
								</div>
							</div>
						</div>
					</div>

					<div
						style={{
							marginTop: 100,
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
							gap: 32,
						}}
					>
						{steps.map((step) => (
							<div key={step.n} style={{ padding: 28, background: 'white', borderRadius: 20, border: `1px solid ${theme.border}` }}>
								<div
									style={{
										width: 38,
										height: 38,
										borderRadius: 11,
										background: theme.primaryBg,
										color: theme.primary,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontWeight: 800,
										fontSize: 16,
										marginBottom: 16,
									}}
								>
									{step.n}
								</div>
								<h3 style={{ color: theme.text, margin: '0 0 8px', fontSize: 16, fontWeight: 800 }}>{step.title}</h3>
								<p style={{ color: theme.textMuted, fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
							</div>
						))}
					</div>

					<div style={{ maxWidth: 680, margin: '80px auto 0' }}>
						<div style={{ padding: '28px 32px', background: theme.bgSubtle, borderRadius: 20, textAlign: 'left' }}>
							<h3 style={{ color: theme.text, margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>
								About our text messaging service
							</h3>
							<p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.7, margin: '0 0 12px' }}>
								HoneyText sends weekly discussion questions and group updates via SMS to members who have opted in. We do not send marketing or promotional messages. Message and data rates may apply. Frequency is about one message per week per group, plus occasional transactional messages.
							</p>
							<p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
								Reply <strong>STOP</strong> to opt out at any time, or <strong>HELP</strong> for assistance. Questions? Contact{' '}
								<a href="mailto:admin@honey-texting.app" style={{ color: theme.primary }}>admin@honey-texting.app</a>.
							</p>
						</div>
					</div>
				</Container>

				<footer style={{ marginTop: 64, padding: '40px 32px', borderTop: `1px solid ${theme.headerBorder}`, textAlign: 'center' }}>
					<Container maxWidth="wide">
						<div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 14 }}>
							<Link to="/privacy" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: 14 }}>
								Privacy Policy
							</Link>
							<Link to="/terms" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: 14 }}>
								Terms and Conditions
							</Link>
							<a href="mailto:admin@honey-texting.app" style={{ color: theme.textMuted, textDecoration: 'none', fontSize: 14 }}>
								Contact
							</a>
						</div>
						<p style={{ color: theme.textLight, fontSize: 13, margin: 0 }}>
							&copy; {new Date().getFullYear()} Honey Text LLC. All rights reserved.
						</p>
					</Container>
				</footer>
			</main>
		</div>
	);
}
