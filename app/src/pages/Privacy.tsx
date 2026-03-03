import { Link } from 'react-router-dom';
import { theme } from '../theme';

const pageStyle: React.CSSProperties = {
	minHeight: '100vh',
	backgroundColor: theme.bg,
	padding: '2rem',
};

const containerStyle: React.CSSProperties = {
	maxWidth: 720,
	margin: '0 auto',
	fontSize: '1rem',
	lineHeight: 1.6,
	color: theme.text,
};

const headingStyle: React.CSSProperties = {
	color: theme.primary,
	marginTop: '2rem',
	marginBottom: '0.75rem',
	fontSize: '1.5rem',
};

const pStyle: React.CSSProperties = { marginBottom: '1rem' };
const listStyle: React.CSSProperties = { marginBottom: '1rem', paddingLeft: '1.5rem' };

export function Privacy() {
	return (
		<div style={pageStyle}>
			<div style={containerStyle}>
				<p style={{ marginBottom: '1rem' }}>
					<Link to="/" style={{ color: theme.primary, textDecoration: 'none' }}>
						← HoneyText
					</Link>
				</p>
				<h1 style={{ color: theme.text, marginBottom: '1.5rem', fontSize: '1.75rem' }}>
					Privacy Policy
				</h1>
				<p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '2rem' }}>
					Last updated: {new Date().toLocaleDateString('en-US')}
				</p>

				<h2 style={headingStyle}>1. Information we collect</h2>
				<p style={pStyle}>
					We collect information you provide when you use HoneyText, including:
				</p>
				<ul style={listStyle}>
					<li>Account information: email address, display name, and password (hashed).</li>
					<li>Phone number: when you create a group or are added to a group, so we can send and receive text messages for that group.</li>
					<li>Group data: group names, member names and phone numbers, and messages sent within groups (e.g. weekly question replies).</li>
					<li>Billing information: if you subscribe, payment is processed by Stripe; we do not store full card numbers.</li>
				</ul>

				<h2 style={headingStyle}>2. How we use your information</h2>
				<p style={pStyle}>
					We use the information we collect to:
				</p>
				<ul style={listStyle}>
					<li>Provide HoneyText services (groups, weekly questions, and messaging).</li>
					<li>Send you text messages you have opted into (e.g. weekly discussion questions and invite/confirmation messages).</li>
					<li>Manage your account, subscription, and support requests.</li>
					<li>Improve our services and fix issues (e.g. error logs and analytics in aggregate).</li>
				</ul>

				<h2 style={headingStyle}>3. Sharing of information</h2>
				<p style={pStyle}>
					We do not sell your personal information. We do not share your information with third parties for their marketing purposes. We may share information only as needed to operate the service (e.g. with our SMS and hosting providers under strict agreements) or when required by law.
				</p>

				<h2 style={headingStyle}>4. Data retention and security</h2>
				<p style={pStyle}>
					We retain your data while your account is active and as needed to provide the service and comply with legal obligations. We use industry-standard measures to protect your data; no system is completely secure, and we cannot guarantee absolute security.
				</p>

				<h2 style={headingStyle}>5. Your choices</h2>
				<p style={pStyle}>
					You can update your profile and delete your account from the app. You can opt out of text messages at any time by replying <strong>STOP</strong> to any message or by being removed from a group by the group owner. For more on messaging and opt-out, see our <Link to="/terms" style={{ color: theme.primary }}>Terms and Conditions</Link>.
				</p>

				<h2 style={headingStyle}>6. Contact</h2>
				<p style={pStyle}>
					For privacy questions or requests, contact us at the support email or address listed in our Terms and Conditions.
				</p>
			</div>
		</div>
	);
}
