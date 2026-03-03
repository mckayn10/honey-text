import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatPhoneForInput, parsePhoneToDigits } from '../lib/phone';
import { FormGroup, Button, inputStyle, inputFocusStyle } from '../components';
import { theme } from '../theme';

// Honeycomb pattern SVG
const honeycombPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23EF8128' fill-opacity='0.04'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5V28.97h-.01L17 36.35V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

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
			if (data.user) navigate('/app/groups');
		} catch (err: any) {
			setError(err.message || 'Failed to sign up');
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
				backgroundImage: honeycombPattern,
				padding: '2rem',
				position: 'relative',
			}}
		>
			<div
				style={{
					background: 'white',
					padding: '2.5rem',
					borderRadius: 20,
					boxShadow: '0 4px 20px rgba(61, 58, 53, 0.08)',
					width: '100%',
					maxWidth: 400,
					position: 'relative',
					zIndex: 1,
				}}
			>
				<h1 style={{ marginBottom: '1.5rem', color: theme.text, textAlign: 'center' }}>Sign Up</h1>
				<form onSubmit={handleSubmit}>
					{error && (
						<div style={{ backgroundColor: theme.errorBg, color: theme.errorText, padding: '0.75rem', borderRadius: 4, marginBottom: '1rem' }}>
							{error}
						</div>
					)}
					<FormGroup label="Display Name" htmlFor="displayName" style={{ marginBottom: '1rem' }}>
						<input
							id="displayName"
							type="text"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							required
							style={inputStyle}
							onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
							onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
						/>
					</FormGroup>
					<FormGroup label="Phone Number" htmlFor="phone" style={{ marginBottom: '1rem' }}>
						<input
							id="phone"
							type="tel"
							value={formatPhoneForInput(phone)}
							onChange={(e) => setPhone(parsePhoneToDigits(e.target.value))}
							required
							placeholder="(111) 111-1111"
							maxLength={14}
							style={inputStyle}
							onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
							onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
						/>
					</FormGroup>
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
							minLength={6}
							style={inputStyle}
							onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
							onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
						/>
					</FormGroup>
					<Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
						{loading ? 'Signing up...' : 'Sign Up'}
					</Button>
				</form>
				<p style={{ marginTop: '1.5rem', textAlign: 'center', color: theme.textMuted }}>
					Already have an account? <Link to="/login" style={{ color: theme.primary, textDecoration: 'none' }}>Log in</Link>
				</p>
			</div>
		</div>
	);
}
