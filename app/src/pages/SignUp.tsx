import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

export function SignUp() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [phone, setPhone] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const { data, error: signUpError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						display_name: displayName || email.split('@')[0],
						phone,
					},
				},
			});

			if (signUpError) throw signUpError;

			if (data.user) {
				// User profile is created by the database trigger (handle_new_user)
				navigate('/app/groups');
			}
		} catch (err: any) {
			setError(err.message || 'Failed to sign up');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-container">
				<h1>Sign Up</h1>
				<form onSubmit={handleSubmit}>
					{error && <div className="error">{error}</div>}
					<div className="form-group">
						<label htmlFor="displayName">Display Name</label>
						<input
							id="displayName"
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="phone">Phone Number</label>
						<input
							id="phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							required
							placeholder="+1234567890"
						/>
					</div>
					<div className="form-group">
						<label htmlFor="email">Email</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
						/>
					</div>
					<button
						type="submit"
						className="button button-primary"
						disabled={loading}
					>
						{loading ? 'Signing up...' : 'Sign Up'}
					</button>
				</form>
				<p className="auth-footer">
					Already have an account? <Link to="/login">Log in</Link>
				</p>
			</div>
		</div>
	);
}
