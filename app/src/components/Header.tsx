import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import './Header.css';

export function Header() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	const handleLogout = async () => {
		await supabase.auth.signOut();
		navigate('/');
	};

	// Don't show anything while checking auth state
	if (loading) {
		return (
			<header className="header">
				<div className="header-container">
					<div className="logo-container">
						<img
							src="/logo.png"
							alt="HoneyText"
							className="logo-image"
						/>
					</div>
				</div>
			</header>
		);
	}

	return (
		<header className="header">
			<div className="header-container">
				<div className="logo-container">
					<Link to={user ? '/app/groups' : '/'}>
						<img
							src="/logo.png"
							alt="HoneyText"
							className="logo-image"
						/>
					</Link>
				</div>
				<nav className="header-nav">
					{user ? (
						<div className="header-actions">
							<Link
								to="/app/profile"
								className="nav-link"
							>
								Profile
							</Link>
							<button
								onClick={handleLogout}
								className="nav-link"
							>
								Log out
							</button>
						</div>
					) : (
						<div className="header-actions">
							<Link
								to="/login"
								className="nav-link"
							>
								Log in
							</Link>
							<Link
								to="/signup"
								className="nav-link button-primary"
							>
								Sign up
							</Link>
						</div>
					)}
				</nav>
			</div>
		</header>
	);
}
