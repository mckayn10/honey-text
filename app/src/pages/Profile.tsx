import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { formatPhoneForInput, parsePhoneToDigits } from '../lib/phone';
import {
	Container,
	Button,
	ButtonLink,
	FormGroup,
	Card,
	Loading,
	inputStyle,
	inputFocusStyle,
} from '../components';
import { theme } from '../theme';

interface UserProfile {
	id: string;
	email: string;
	display_name: string | null;
	phone: string | null;
}

export function Profile() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [displayName, setDisplayName] = useState('');
	const [phone, setPhone] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			const data = await apiRequest('/users/me');
			setProfile(data);
			setDisplayName(data.display_name || '');
			setPhone(parsePhoneToDigits(data.phone || ''));
		} catch (err: any) {
			console.error('Failed to load profile:', err);
			setError(err.message || 'Failed to load profile');
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(null);
		try {
			const updated = await apiRequest('/users/me', {
				method: 'PATCH',
				body: JSON.stringify({
					display_name: displayName,
					phone,
				}),
			});
			setProfile(updated);
			setSuccess('Profile updated');
		} catch (err: any) {
			setError(err.message || 'Failed to update profile');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div style={{ padding: '2.5rem 0 3rem' }}>
				<Loading fullHeight />
			</div>
		);
	}

	return (
		<div style={{ padding: '0rem 0 3rem' }}>
			<Container maxWidth="form">
				<ButtonLink
					onClick={() => navigate('/app/groups')}
					style={{ marginBottom: '0.75rem' }}
				>
					← Back to Groups
				</ButtonLink>
				<h1
					style={{
						color: theme.text,
						margin: '0.5rem 0 0.75rem',
						fontSize: '2rem',
					}}
				>
					Your Profile
				</h1>
				<p style={{ color: theme.textMuted, marginBottom: '1.5rem' }}>
					Keep your phone number up to date so you can receive weekly
					questions.
				</p>

				<Card>
					<form
						onSubmit={handleSave}
						style={{
							background: 'transparent',
							padding: 0,
							margin: 0,
							border: 'none',
							boxShadow: 'none',
						}}
					>
						{error && (
							<div
								style={{
									backgroundColor: theme.errorBg,
									color: theme.errorText,
									padding: '0.75rem',
									borderRadius: 8,
									marginBottom: '1rem',
								}}
							>
								{error}
							</div>
						)}
						{success && (
							<div
								style={{
									background: theme.successBg,
									color: theme.successText,
									padding: '0.75rem',
									borderRadius: 8,
									marginBottom: '1rem',
								}}
							>
								{success}
							</div>
						)}
						<FormGroup
							label="Display Name"
							htmlFor="displayName"
							style={{ marginBottom: '1.25rem' }}
						>
							<input
								id="displayName"
								type="text"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder={profile?.email || ''}
								style={inputStyle}
								onFocus={(e) =>
									Object.assign(
										e.target.style,
										inputFocusStyle,
									)
								}
								onBlur={(e) =>
									Object.assign(e.target.style, {
										outline: 'none',
										borderColor: theme.borderLight,
										boxShadow: 'none',
									})
								}
							/>
						</FormGroup>
						<FormGroup
							label="Phone Number"
							htmlFor="phone"
							style={{ marginBottom: '1.25rem' }}
						>
							<input
								id="phone"
								type="tel"
								value={formatPhoneForInput(phone)}
								onChange={(e) =>
									setPhone(parsePhoneToDigits(e.target.value))
								}
								placeholder="(111) 111-1111"
								maxLength={14}
								required
								style={inputStyle}
								onFocus={(e) =>
									Object.assign(
										e.target.style,
										inputFocusStyle,
									)
								}
								onBlur={(e) =>
									Object.assign(e.target.style, {
										outline: 'none',
										borderColor: theme.borderLight,
										boxShadow: 'none',
									})
								}
							/>
						</FormGroup>
						<Button
							type="submit"
							variant="primary"
							disabled={saving}
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</Button>
					</form>
				</Card>
			</Container>
		</div>
	);
}
