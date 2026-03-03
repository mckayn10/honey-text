import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import { Container } from './Container';
import { ButtonLink } from './Button';

export function AppLayout() {
	const navigate = useNavigate();
	const location = useLocation();

	const handleLogout = async () => {
		await supabase.auth.signOut();
		navigate('/');
	};

	const isActive = (path: string) => location.pathname.startsWith(path);
	const navStyle = (active: boolean) => ({
		color: theme.primary,
		textDecoration: 'none',
		fontWeight: active ? 700 : 500,
	});

	return (
		<div
			style={{
				minHeight: '100vh',
				backgroundColor: theme.bg,
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<header
				style={{
					background: theme.bg,
					padding: '0.5rem 0',
					borderBottom: `1px solid ${theme.headerBorder}`,
					flexShrink: 0,
				}}
			>
				<Container maxWidth="wide">
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<Link
							to="/app/groups"
							style={{
								display: 'flex',
								alignItems: 'center',
								textDecoration: 'none',
								color: 'inherit',
							}}
						>
							<img
								src="/logo.png"
								alt="HoneyText"
								style={{
									height: 60,
									width: 'auto',
									borderRadius: 10,
								}}
							/>
						</Link>
						<div
							style={{
								display: 'flex',
								gap: '1rem',
								alignItems: 'center',
							}}
						>
							<ButtonLink to="/app/groups" style={navStyle(isActive('/app/groups'))}>Groups</ButtonLink>
							<ButtonLink to="/app/subscribe" style={navStyle(isActive('/app/subscribe'))}>Billing</ButtonLink>
							<ButtonLink to="/app/profile" style={navStyle(isActive('/app/profile'))}>Profile</ButtonLink>
							<button
								type="button"
								onClick={handleLogout}
								style={{
									background: 'none',
									border: 'none',
									color: theme.primary,
									cursor: 'pointer',
									textDecoration: 'none',
									fontSize: '1rem',
									fontFamily: 'inherit',
								}}
							>
								Log out
							</button>
						</div>
					</div>
				</Container>
			</header>
			<main style={{ flex: 1, padding: '2rem 0' }}>
				<Outlet />
			</main>
		</div>
	);
}
