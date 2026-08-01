import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import { Container } from './Container';
import { Logo } from './Logo';

const navItemStyle = (active: boolean): React.CSSProperties => ({
	background: active ? theme.primaryBg : 'none',
	color: active ? theme.primary : theme.textMuted,
	border: 'none',
	padding: '9px 16px',
	borderRadius: 999,
	fontWeight: active ? 700 : 600,
	fontSize: '14.5px',
	cursor: 'pointer',
	fontFamily: 'inherit',
	textDecoration: 'none',
	display: 'inline-block',
	whiteSpace: 'nowrap',
});

export function AppLayout() {
	const navigate = useNavigate();
	const location = useLocation();

	const handleLogout = async () => {
		await supabase.auth.signOut();
		navigate('/');
	};

	const isActive = (path: string) => location.pathname.startsWith(path);

	return (
		<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg }}>
			<header style={{ padding: '14px 0', borderBottom: `1px solid ${theme.headerBorder}`, flexShrink: 0 }}>
				<Container maxWidth="wide">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
						<Link to="/app/groups" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
							<Logo size={22} />
						</Link>
						<nav style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
							<Link to="/app/groups" style={navItemStyle(isActive('/app/groups'))}>
								Groups
							</Link>
							<Link to="/app/subscribe" style={navItemStyle(isActive('/app/subscribe'))}>
								Billing
							</Link>
							<Link to="/app/profile" style={navItemStyle(isActive('/app/profile'))}>
								Profile
							</Link>
							<button
								type="button"
								onClick={handleLogout}
								style={{
									background: 'none',
									border: 'none',
									color: theme.textLight,
									cursor: 'pointer',
									fontFamily: 'inherit',
									fontSize: '14.5px',
									fontWeight: 600,
									padding: '9px 16px',
									whiteSpace: 'nowrap',
								}}
							>
								Log out
							</button>
						</nav>
					</div>
				</Container>
			</header>
			<main style={{ flex: 1, padding: '40px 0 60px' }}>
				<Outlet />
			</main>
		</div>
	);
}
