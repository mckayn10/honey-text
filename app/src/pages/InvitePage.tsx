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

const pageStyle: React.CSSProperties = {
	minHeight: '100vh',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	backgroundColor: theme.bg,
	padding: '2rem',
};

const containerStyle: React.CSSProperties = {
	background: theme.bg,
	padding: '3rem',
	borderRadius: 8,
	boxShadow: theme.shadow,
	maxWidth: 500,
	width: '100%',
	textAlign: 'center',
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
