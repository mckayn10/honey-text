import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewGroup } from './pages/NewGroup';
import { GroupDetail } from './pages/GroupDetail';
import { GroupSettings } from './pages/GroupSettings';
import { InvitePage } from './pages/InvitePage';
import { Profile } from './pages/Profile';
import { useAuth } from './lib/useAuth';
import { isSupabaseConfigured } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!user) {
		return (
			<Navigate
				to="/login"
				replace
			/>
		);
	}

	return <>{children}</>;
}

function App() {
	return (
		<BrowserRouter>
			{!isSupabaseConfigured && (
				<div
					style={{
						background: '#f7a626',
						color: '#333',
						padding: '8px 16px',
						textAlign: 'center',
						fontSize: '14px',
					}}
				>
					Copy <code>app/.env.example</code> to <code>app/.env</code>{' '}
					and add your Supabase URL and anon key to enable sign-in and
					data.
				</div>
			)}
			<Routes>
				<Route
					path="/"
					element={<Landing />}
				/>
				<Route
					path="/signup"
					element={<SignUp />}
				/>
				<Route
					path="/login"
					element={<Login />}
				/>
				<Route
					path="/app/groups"
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/app/profile"
					element={
						<ProtectedRoute>
							<Profile />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/app/groups/new"
					element={
						<ProtectedRoute>
							<NewGroup />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/app/groups/:id"
					element={
						<ProtectedRoute>
							<GroupDetail />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/app/groups/:id/settings"
					element={
						<ProtectedRoute>
							<GroupSettings />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/invite/:token"
					element={<InvitePage />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
