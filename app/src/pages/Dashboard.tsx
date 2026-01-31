import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import './Dashboard.css';

interface Group {
	id: string;
	name: string;
	question_set_id: string;
	schedule_day: number;
	schedule_time: string;
	schedule_timezone: string;
	created_at: string;
}

export function Dashboard() {
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		loadGroups();
	}, []);

	const loadGroups = async () => {
		try {
			const data = await apiRequest('/groups');
			setGroups(data);
		} catch (error) {
			console.error('Failed to load groups:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
		navigate('/');
	};

	if (loading) {
		return <div className="dashboard">Loading...</div>;
	}

	return (
		<div className="dashboard">
			<header className="dashboard-header">
				<div className="container">
					<div className="logo-container">
						<img
							src="/logo.png"
							alt="HoneyText"
							className="logo-image"
						/>
					</div>
					<div className="header-actions">
						<Link
							to="/app/profile"
							className="button-link"
						>
							Profile
						</Link>
						<button
							onClick={handleLogout}
							className="button-link"
						>
							Log out
						</button>
					</div>
				</div>
			</header>

			<main
				className={`dashboard-main ${groups.length === 0 ? 'dashboard-main--empty' : ''}`}
			>
				<div className="container">
					{groups.length === 0 ? (
						<div className="empty-state">
							<h2>My Groups</h2>
							<p>
								No groups yet. Create your first group to get
								started!
							</p>
							<Link
								to="/app/groups/new"
								className="button button-primary"
							>
								Create Group
							</Link>
						</div>
					) : (
						<>
							<div className="dashboard-header-section">
								<h2>My Groups</h2>
								<Link
									to="/app/groups/new"
									className="button button-primary"
								>
									Create Group
								</Link>
							</div>
							<div className="groups-grid">
								{groups.map((group) => (
									<Link
										key={group.id}
										to={`/app/groups/${group.id}`}
										className="group-card"
									>
										<h3>{group.name}</h3>
										<p className="group-meta">
											Weekly on{' '}
											{getDayName(group.schedule_day)} at{' '}
											{group.schedule_time}
										</p>
									</Link>
								))}
							</div>
						</>
					)}
				</div>
			</main>
		</div>
	);
}

function getDayName(day: number): string {
	const days = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	return days[day] || 'Unknown';
}
