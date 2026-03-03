import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicApiRequest } from '../lib/api';
import { formatPhoneForDisplay } from '../lib/phone';
import { Button, Loading } from '../components';
import { theme } from '../theme';

interface InviteData {
	invitee_name: string;
	invitee_phone: string;
	group_name: string;
	creator_name?: string;
}

// Honeycomb pattern SVG
const honeycombPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23EF8128' fill-opacity='0.04'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5V28.97h-.01L17 36.35V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

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

export function InvitePage() {
	const { token } = useParams<{ token: string }>();
	const [invite, setInvite] = useState<InviteData | null>(null);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (token) loadInvite();
	}, [token]);

	const loadInvite = async () => {
		try {
			const data = await publicApiRequest(`/invites/${token}`);
			setInvite(data);
		} catch (err: any) {
			setError(err.message || 'Invalid invite link');
		} finally {
			setLoading(false);
		}
	};

	const handleAccept = async () => {
		if (!token) return;
		setAccepting(true);
		setError(null);
		try {
			await publicApiRequest(`/invites/${token}/accept`, { method: 'POST' });
			setAccepted(true);
		} catch (err: any) {
			setError(err.message || 'Failed to accept invite');
		} finally {
			setAccepting(false);
		}
	};

	if (loading) {
		return (
			<div style={pageStyle}>
				<div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
					<Loading />
				</div>
			</div>
		);
	}

	if (error && !invite) {
		return (
			<div style={pageStyle}>
				<div style={containerStyle}>
					<div style={{ backgroundColor: theme.errorBg, color: theme.errorText, padding: '0.75rem', borderRadius: 4, marginBottom: '1rem' }}>
						{error}
					</div>
				</div>
			</div>
		);
	}

	if (accepted) {
		return (
			<div style={pageStyle}>
				<div style={containerStyle}>
					<div>
						<h1 style={{ color: theme.primary, marginBottom: '1rem' }}>You're in!</h1>
						<p style={{ color: theme.text }}>
							You've been added to {invite?.group_name}. You'll start receiving weekly questions via text message.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div style={pageStyle}>
			<div style={containerStyle}>
				<h1 style={{ color: theme.primary, marginBottom: '1.5rem' }}>You're Invited!</h1>
				<div style={{ textAlign: 'left', marginBottom: '2rem' }}>
					<p style={{ marginBottom: '0.75rem', color: theme.text }}>
						You've been invited to join <strong>{invite?.group_name}</strong>
					</p>
					{invite?.creator_name && (
						<p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>by {invite.creator_name}</p>
					)}
					<div style={{ background: theme.bg, padding: '1rem', borderRadius: 4, margin: '1.5rem 0' }}>
						<p style={{ marginBottom: '0.5rem' }}>
							<strong>Name:</strong> {invite?.invitee_name}
						</p>
						<p style={{ marginBottom: 0 }}>
							<strong>Phone:</strong> {formatPhoneForDisplay(invite?.invitee_phone)}
						</p>
					</div>
					<p style={{ marginTop: '1rem', color: theme.textMuted, fontSize: '0.9rem' }}>
						Please confirm this information is correct, then click Accept.
					</p>

					<p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: theme.textMuted, lineHeight: 1.5 }}>
						By clicking Accept Invitation, you consent to receive text messages from HoneyText for this group (weekly discussion questions and related updates). Consent is not a condition of purchase. Msg & data rates may apply. Message frequency: about one message per week per group, plus occasional transactional messages. Reply <strong>STOP</strong> to opt out or <strong>HELP</strong> for help. <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: theme.primary }}>Privacy Policy</a> & <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: theme.primary }}>Terms</a>.
					</p>
				</div>

				{error && (
					<div style={{ backgroundColor: theme.errorBg, color: theme.errorText, padding: '0.75rem', borderRadius: 4, marginBottom: '1rem' }}>
						{error}
					</div>
				)}

				<Button
					type="button"
					variant="primary"
					onClick={handleAccept}
					disabled={accepting}
					style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
				>
					{accepting ? 'Accepting...' : 'Accept Invitation'}
				</Button>
			</div>
		</div>
	);
}
