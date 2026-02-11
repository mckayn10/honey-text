import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Container, Button, FormGroup, inputStyle, inputFocusStyle } from '../components';
import { theme } from '../theme';

export function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
			if (signInError) throw signInError;
			navigate('/app/groups');
		} catch (err: any) {
			setError(err.message || 'Failed to log in');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: theme.bg,
				padding: '2rem',
			}}
		>
			<div
				style={{
					background: theme.bg,
					padding: '2rem',
					borderRadius: 8,
					boxShadow: theme.shadow,
					width: '100%',
					maxWidth: 400,
				}}
			>
				<h1 style={{ marginBottom: '1.5rem', color: theme.text, textAlign: 'center' }}>Log In</h1>
				<form onSubmit={handleSubmit}>
					{error && (
						<div style={{ backgroundColor: theme.errorBg, color: theme.errorText, padding: '0.75rem', borderRadius: 4, marginBottom: '1rem' }}>
							{error}
						</div>
					)}
					<FormGroup label="Email" htmlFor="email" style={{ marginBottom: '1rem' }}>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							style={inputStyle}
							onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
							onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
						/>
					</FormGroup>
					<FormGroup label="Password" htmlFor="password" style={{ marginBottom: '1rem' }}>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							style={inputStyle}
							onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
							onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
						/>
					</FormGroup>
					<Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
						{loading ? 'Logging in...' : 'Log In'}
					</Button>
				</form>
				<p style={{ marginTop: '1.5rem', textAlign: 'center', color: theme.textMuted }}>
					Don't have an account? <Link to="/signup" style={{ color: theme.primary, textDecoration: 'none' }}>Sign up</Link>
				</p>
			</div>
		</div>
	);
}
