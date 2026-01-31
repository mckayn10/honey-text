import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './Profile.css';

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
			setPhone(data.phone || '');
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
		return <div className="profile-page">Loading...</div>;
	}

	return (
		<div className="profile-page">
			<div className="container">
				<button
					onClick={() => navigate('/app/groups')}
					className="button-link"
				>
					← Back to Groups
				</button>
				<h1>Your Profile</h1>
				<p className="profile-subtitle">
					Keep your phone number up to date so you can receive weekly
					questions.
				</p>

				<form
					onSubmit={handleSave}
					className="profile-form"
				>
					{error && <div className="error">{error}</div>}
					{success && <div className="success">{success}</div>}
					<div className="form-group">
						<label htmlFor="displayName">Display Name</label>
						<input
							id="displayName"
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder={profile?.email || ''}
						/>
					</div>
					<div className="form-group">
						<label htmlFor="phone">Phone Number</label>
						<input
							id="phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+1234567890"
							required
						/>
					</div>
					<button
						type="submit"
						className="button button-primary"
						disabled={saving}
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
				</form>
			</div>
		</div>
	);
}
