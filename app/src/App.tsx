import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewGroup } from './pages/NewGroup';
import { GroupDetail } from './pages/GroupDetail';
import { GroupSettings } from './pages/GroupSettings';
import { InvitePage } from './pages/InvitePage';
import { DemoInvitePage } from './pages/DemoInvitePage';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Profile } from './pages/Profile';
import { Subscribe } from './pages/Subscribe';
import { AppLayout } from './components/AppLayout';
import { Loading } from './components/Loading';
import { useAuth } from './lib/useAuth';
import { isSupabaseConfigured } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
				<Loading fullHeight />
			</div>
		);
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
					path="/app"
					element={
						<ProtectedRoute>
							<AppLayout />
						</ProtectedRoute>
					}
				>
					<Route index element={<Navigate to="/app/groups" replace />} />
					<Route path="groups" element={<Dashboard />} />
					<Route path="profile" element={<Profile />} />
					<Route path="subscribe" element={<Subscribe />} />
					<Route path="groups/new" element={<NewGroup />} />
					<Route path="groups/:id" element={<GroupDetail />} />
					<Route path="groups/:id/settings" element={<GroupSettings />} />
				</Route>
				<Route
					path="/invite/:token"
					element={<InvitePage />}
				/>
				<Route
					path="/demo-invite"
					element={<DemoInvitePage />}
				/>
				<Route path="/privacy" element={<Privacy />} />
				<Route path="/terms" element={<Terms />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
