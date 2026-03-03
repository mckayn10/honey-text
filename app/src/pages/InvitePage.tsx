import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { publicApiRequest } from '../lib/api';
import './InvitePage.css';

interface InviteData {
	invitee_name: string;
	invitee_phone: string;
	group_name: string;
	creator_name?: string;
}

export function InvitePage() {
	const { token } = useParams<{ token: string }>();
	const [invite, setInvite] = useState<InviteData | null>(null);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (token) {
			loadInvite();
		}
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
			await publicApiRequest(`/invites/${token}/accept`, {
				method: 'POST',
			});
			setAccepted(true);
		} catch (err: any) {
			setError(err.message || 'Failed to accept invite');
		} finally {
			setAccepting(false);
		}
	};

	if (loading) {
		return (
			<div className="invite-page">
				<Header />
				<div className="invite-container">Loading...</div>
			</div>
		);
	}

	if (error && !invite) {
		return (
			<div className="invite-page">
				<Header />
				<div className="invite-container">
					<div className="error">{error}</div>
				</div>
			</div>
		);
	}

	if (accepted) {
		return (
			<div className="invite-page">
				<Header />
				<div className="invite-container">
					<div className="success">
						<h1>You're in!</h1>
						<p>
							You've been added to {invite?.group_name}. You'll
							start receiving weekly questions via text message.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="invite-page">
			<Header />
			<div className="invite-container">
				<h1>You're Invited!</h1>
				<div className="invite-details">
					<p>
						You've been invited to join{' '}
						<strong>{invite?.group_name}</strong>
					</p>
					{invite?.creator_name && (
						<p className="creator">by {invite.creator_name}</p>
					)}
					<div className="confirmation-box">
						<p>
							<strong>Name:</strong> {invite?.invitee_name}
						</p>
						<p>
							<strong>Phone:</strong> {invite?.invitee_phone}
						</p>
					</div>
					<p className="confirm-text">
						Please confirm this information is correct, then click
						Accept.
					</p>
				</div>

				{error && <div className="error">{error}</div>}

				<button
					onClick={handleAccept}
					className="button button-primary button-large"
					disabled={accepting}
				>
					{accepting ? 'Accepting...' : 'Accept Invitation'}
				</button>
			</div>
		</div>
	);
}
