import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { formatPhoneForInput, parsePhoneToDigits } from '../lib/phone';
import { Container, Button, Loading } from '../components';
import { theme } from '../theme';

interface UserProfile {
	id: string;
	email: string;
	display_name: string | null;
	phone: string | null;
}

const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 14,
	padding: '16px 20px',
	borderBottom: `1px solid ${theme.borderLight}`,
};

const rowLabelStyle: React.CSSProperties = {
	width: 120,
	flexShrink: 0,
	fontSize: '13.5px',
	fontWeight: 700,
	color: theme.textMuted,
};

const rowInputStyle: React.CSSProperties = {
	flex: 1,
	border: 'none',
	background: 'transparent',
	fontSize: '14.5px',
	color: theme.text,
	textAlign: 'right',
	fontFamily: 'inherit',
};

export function Profile() {
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

	const initial = (displayName || profile?.email || '?').charAt(0).toUpperCase();

	return (
		<div>
			<Container maxWidth="narrow">
				<h1 style={{ color: theme.text, margin: '0 0 24px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
					Your Profile
				</h1>

				<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
					<div
						style={{
							width: 56,
							height: 56,
							borderRadius: '50%',
							background: theme.primaryBg,
							color: theme.primary,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontWeight: 800,
							fontSize: 22,
							flexShrink: 0,
						}}
					>
						{initial}
					</div>
					<div>
						<p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text }}>
							{displayName || profile?.email}
						</p>
						<p style={{ margin: '2px 0 0', fontSize: '13.5px', color: theme.textLight }}>{profile?.email}</p>
					</div>
				</div>

				<form onSubmit={handleSave}>
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

					<div style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
						<div className="form-row" style={rowStyle}>
							<label htmlFor="displayName" className="form-row-label" style={rowLabelStyle}>Display name</label>
							<input
								id="displayName"
								type="text"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder={profile?.email || ''}
								className="form-row-field"
								style={rowInputStyle}
							/>
						</div>
						<div className="form-row" style={{ ...rowStyle, borderBottom: 'none' }}>
							<label htmlFor="phone" className="form-row-label" style={rowLabelStyle}>Phone number</label>
							<input
								id="phone"
								type="tel"
								value={formatPhoneForInput(phone)}
								onChange={(e) => setPhone(parsePhoneToDigits(e.target.value))}
								placeholder="(111) 111-1111"
								className="form-row-field"
								maxLength={14}
								required
								style={rowInputStyle}
							/>
						</div>
					</div>
					<p style={{ color: theme.textLight, fontSize: 13, margin: '-14px 0 22px', lineHeight: 1.5 }}>
						Keep your phone number up to date so you can receive weekly questions.
					</p>

					<Button type="submit" variant="primary" disabled={saving} style={{ borderRadius: 999, padding: '12px 26px', fontSize: '14.5px' }}>
						{saving ? 'Saving...' : 'Save changes'}
					</Button>
				</form>
			</Container>
		</div>
	);
}
