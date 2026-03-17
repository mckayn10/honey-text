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

export function Terms() {
	return (
		<div style={pageStyle}>
			<div style={containerStyle}>
				<p style={{ marginBottom: '1rem' }}>
					<Link to="/" style={{ color: theme.primary, textDecoration: 'none' }}>
						← HoneyText
					</Link>
				</p>
				<h1 style={{ color: theme.text, marginBottom: '1.5rem', fontSize: '1.75rem' }}>
					Terms and Conditions
				</h1>
				<p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '2rem' }}>
					Last updated: {new Date().toLocaleDateString('en-US')}
				</p>

				<h2 style={headingStyle}>SMS / Text Messaging Program</h2>

				<p style={pStyle}>
					<strong>Program name:</strong> HoneyText
				</p>
				<p style={pStyle}>
					<strong>Description:</strong> HoneyText is a group messaging service that sends weekly discussion questions via text message to members who have opted in. Messages are sent to group members for the groups they have joined. We do not send marketing or promotional messages.
				</p>
				<p style={pStyle}>
					<strong>Message and data rates:</strong> Message and data rates may apply. Charges depend on your wireless plan. HoneyText does not charge for the content of messages; your carrier may charge for SMS/MMS.
				</p>
				<p style={pStyle}>
					<strong>Message frequency:</strong> Message frequency varies. You typically receive about one text message per week per group (the weekly discussion question), plus occasional transactional messages (e.g. invite confirmations, join confirmations). You will not receive marketing or promotional texts.
				</p>
				<p style={pStyle}>
					<strong>Support contact:</strong> For help with the program or your account, contact us at <a href="mailto:honeytexting@gmail.com" style={{ color: theme.primary }}>honeytexting@gmail.com</a>.
				</p>
				<p style={pStyle}>
					<strong>Opt-out instructions:</strong> You can opt out of text messages at any time. Reply <strong>STOP</strong> to any message to unsubscribe from messages for that number. Reply <strong>HELP</strong> for help or to get support contact information. After you reply STOP, you will receive a final confirmation message and will not receive further messages until you opt back in (e.g. by joining a group again). You can also be removed from a group by the group owner, which stops messages for that group.
				</p>
				<p style={pStyle}>
					By opting in (e.g. by accepting an invitation or replying YES to join a group), you agree to receive these messages and to these terms. Consent is not required as a condition of purchase. For our full terms of use and privacy practices, see the rest of these Terms and our <Link to="/privacy" style={{ color: theme.primary }}>Privacy Policy</Link>.
				</p>

				<h2 style={headingStyle}>General terms</h2>
				<p style={pStyle}>
					Use of HoneyText (the website and app) is subject to these Terms and Conditions. By creating an account or using the service, you agree to use HoneyText only for lawful purposes and in accordance with these terms. We may update these terms from time to time; continued use after changes constitutes acceptance. For privacy practices, see our <Link to="/privacy" style={{ color: theme.primary }}>Privacy Policy</Link>.
				</p>
			</div>
		</div>
	);
}
