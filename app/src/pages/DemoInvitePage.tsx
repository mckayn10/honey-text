import { useState } from 'react';
import { Button } from '../components';
import { theme } from '../theme';

// Honeycomb pattern SVG (same as InvitePage)
const honeycombPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23EF8128' fill-opacity='0.04'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5V28.97h-.01L17 36.35V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// Demo/Sample data for reviewers
const DEMO_INVITE = {
	invitee_name: 'Sarah Johnson',
	invitee_phone: '+1 (555) 123-4567',
	group_name: 'Sunday Dinner Discussion Group',
	creator_name: 'Michael Chen',
};

const pageStyle: React.CSSProperties = {
	minHeight: '100vh',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	backgroundColor: theme.bg,
	backgroundImage: honeycombPattern,
	padding: '2rem',
	position: 'relative',
};

const containerStyle: React.CSSProperties = {
	background: 'white',
	padding: '3rem',
	borderRadius: 20,
	boxShadow: '0 4px 20px rgba(61, 58, 53, 0.08)',
	maxWidth: 500,
	width: '100%',
	textAlign: 'center',
	position: 'relative',
	zIndex: 1,
};

const badgeStyle: React.CSSProperties = {
	display: 'inline-block',
	background: theme.primary,
	color: 'white',
	padding: '0.5rem 1rem',
	borderRadius: 20,
	fontSize: '0.85rem',
	fontWeight: 600,
	marginBottom: '1.5rem',
};

const infoBoxStyle: React.CSSProperties = {
	background: theme.bg,
	padding: '1rem',
	borderRadius: 4,
	margin: '1.5rem 0',
	textAlign: 'left',
};

const disclosureBoxStyle: React.CSSProperties = {
	background: theme.bgSubtle,
	border: `1px solid ${theme.borderLight}`,
	padding: '1.25rem',
	borderRadius: 8,
	marginTop: '1.5rem',
	textAlign: 'left',
};

const linkStyle: React.CSSProperties = {
	color: theme.primary,
	textDecoration: 'underline',
};

export function DemoInvitePage() {
	const [accepting, setAccepting] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [consented, setConsented] = useState(false);

	const handleAccept = async () => {
		setAccepting(true);
		// Simulate the acceptance for demo purposes
		await new Promise((resolve) => setTimeout(resolve, 1000));
		setAccepted(true);
		setAccepting(false);
	};

	if (accepted) {
		return (
			<div style={pageStyle}>
				<div style={containerStyle}>
					<div style={badgeStyle}>DEMO</div>
					<h1 style={{ color: theme.primary, marginBottom: '1rem' }}>Welcome to HoneyText!</h1>
					<p style={{ color: theme.text, marginBottom: '1.5rem' }}>
						You've joined <strong>{DEMO_INVITE.group_name}</strong>. You'll receive weekly discussion questions via text message.
					</p>
					<p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
						Reply <strong>STOP</strong> to opt out. Reply <strong>HELP</strong> for help.
						<br />
						<br />
						Msg & data rates may apply.
					</p>
					<div style={{ marginTop: '2rem', padding: '1rem', background: theme.bg, borderRadius: 4 }}>
						<p style={{ color: theme.textMuted, fontSize: '0.85rem', margin: 0 }}>
							<strong>Note:</strong> This is a demo page for Twilio A2P campaign review.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div style={pageStyle}>
			<div style={containerStyle}>
				<div style={badgeStyle}>DEMO - FOR TWILIO REVIEWERS</div>

				<h1 style={{ color: theme.primary, marginBottom: '1.5rem' }}>You're Invited!</h1>

				<div style={{ textAlign: 'left', marginBottom: '2rem' }}>
					<p style={{ marginBottom: '0.75rem', color: theme.text }}>
						You've been invited to join <strong>{DEMO_INVITE.group_name}</strong>
					</p>
					<p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
						by {DEMO_INVITE.creator_name}
					</p>

					<div style={infoBoxStyle}>
						<p style={{ marginBottom: '0.5rem' }}>
							<strong>Name:</strong> {DEMO_INVITE.invitee_name}
						</p>
						<p style={{ marginBottom: 0 }}>
							<strong>Phone:</strong> {DEMO_INVITE.invitee_phone}
						</p>
					</div>

					<p style={{ marginTop: '1rem', color: theme.textMuted, fontSize: '0.9rem' }}>
						Please confirm this information is correct, then click Accept.
					</p>

					{/* SMS Consent Disclosure - This is what Twilio reviewers need to see */}
					<div style={disclosureBoxStyle}>
						<h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: theme.text, fontSize: '1rem' }}>
							SMS Consent Disclosure
						</h3>
						<p style={{ marginBottom: '0.75rem', color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
							By checking the box and clicking <strong>"Accept Invitation"</strong>, you consent to receive text messages from <strong>HoneyText</strong> for this group.
						</p>
						<ul style={{ marginBottom: '1rem', color: theme.textMuted, fontSize: '0.85rem', lineHeight: 1.6, paddingLeft: '1.25rem' }}>
							<li><strong>Message Content:</strong> Weekly discussion questions and related group updates</li>
							<li><strong>Message Frequency:</strong> About one message per week per group, plus occasional transactional messages</li>
							<li><strong>Consent:</strong> Not a condition of purchase</li>
							<li><strong>Cost:</strong> Msg & data rates may apply</li>
							<li><strong>Opt-out:</strong> Reply <strong>STOP</strong> to opt out at any time</li>
							<li><strong>Help:</strong> Reply <strong>HELP</strong> for assistance</li>
						</ul>
						<p style={{ marginBottom: '0.5rem', color: theme.textMuted, fontSize: '0.85rem' }}>
							<a href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
								Privacy Policy
							</a>
							{' & '}
							<a href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
								Terms of Service
							</a>
						</p>
					</div>
				</div>

				<label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem', cursor: 'pointer', textAlign: 'left' }}>
					<input
						type="checkbox"
						checked={consented}
						onChange={(e) => setConsented(e.target.checked)}
						style={{ marginTop: '0.2rem', width: 18, height: 18, accentColor: theme.primary, flexShrink: 0 }}
					/>
					<span style={{ color: theme.text, fontSize: '0.9rem', lineHeight: 1.5 }}>
						I agree to receive text messages from HoneyText as described above.
						<br />
						<br />
						Msg & data rates may apply.
					</span>
				</label>

				<Button
					type="button"
					variant="primary"
					onClick={handleAccept}
					disabled={accepting || !consented}
					style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
				>
					{accepting ? 'Accepting...' : 'Accept Invitation'}
				</Button>

				<div style={{ marginTop: '1.5rem', padding: '1rem', background: theme.bg, borderRadius: 4 }}>
					<p style={{ color: theme.textMuted, fontSize: '0.85rem', margin: 0 }}>
						<strong>Note for Twilio Reviewers:</strong> This is a demo page showing the web form opt-in flow.
						The actual invite flow uses the same disclosure and consent mechanism.
					</p>
				</div>
			</div>
		</div>
	);
}
