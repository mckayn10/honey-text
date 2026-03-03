import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Container, Loading } from '../components';
import { theme } from '../theme';

interface Group {
	id: string;
	name: string;
	status?: 'pending' | 'active';
	question_set_id: string;
	question_set_name?: string | null;
	member_count?: number;
	schedule_day: number;
	schedule_time: string;
	schedule_timezone: string;
	created_at: string;
}

const primaryLinkStyle: React.CSSProperties = {
	display: 'inline-block',
	textDecoration: 'none',
	background: theme.primary,
	color: 'white',
	padding: '0.7rem 1.2rem',
	borderRadius: 10,
	fontWeight: 600,
	boxShadow: `0 6px 16px ${theme.primaryShadow}`,
};

export function Dashboard() {
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			const [groupsData, statusData] = await Promise.all([
				apiRequest('/groups'),
				apiRequest('/billing/status').catch(() => ({ subscription_tier: null })),
			]);
			setGroups(groupsData);
			setSubscriptionTier((statusData as { subscription_tier?: string | null })?.subscription_tier ?? null);
		} catch (error) {
			console.error('Failed to load groups:', error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
				<Loading fullHeight />
			</div>
		);
	}

	const empty = groups.length === 0;
	const hasSubscription = subscriptionTier != null && subscriptionTier !== '';

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flex: 1,
				...(empty
					? { alignItems: 'center', justifyContent: 'center' }
					: {}),
			}}
		>
			<Container
				maxWidth="default"
				style={{ width: '100%' }}
			>
				{!hasSubscription ? (
					<div
						style={{
							textAlign: 'center',
							padding: '2rem',
							color: theme.textMuted,
						}}
					>
						<h2
							style={{
								color: theme.text,
								marginBottom: '0.75rem',
								fontSize: '1.75rem',
							}}
						>
							My Groups
						</h2>
						<p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
							Subscribe to create your first group and start
							sending weekly questions.
						</p>
						<Link
							to="/app/subscribe"
							style={primaryLinkStyle}
						>
							Subscribe
						</Link>
					</div>
				) : empty ? (
					<div
						style={{
							textAlign: 'center',
							padding: '2rem',
							color: theme.textMuted,
						}}
					>
						<h2
							style={{
								color: theme.text,
								marginBottom: '0.75rem',
								fontSize: '1.75rem',
							}}
						>
							My Groups
						</h2>
						<p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
							No groups yet. Create your first group to get
							started!
						</p>
						<Link
							to="/app/groups/new"
							style={primaryLinkStyle}
						>
							Create Group
						</Link>
					</div>
				) : (
					<>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '2rem',
							}}
						>
							<h2 style={{ color: theme.text }}>My Groups</h2>
							<Link
								to="/app/groups/new"
								style={primaryLinkStyle}
							>
								Create Group
							</Link>
						</div>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns:
									'repeat(auto-fill, minmax(300px, 1fr))',
								gap: '1.5rem',
							}}
						>
							{groups.map((group) => (
								<Link
									key={group.id}
									to={`/app/groups/${group.id}`}
									style={{
										background: 'white',
										padding: '1.5rem',
										borderRadius: 8,
										boxShadow: '0 4px 12px rgba(61, 58, 53, 0.08)',
										textDecoration: 'none',
										color: 'inherit',
										display: 'block',
									}}
								>
									<h3
										style={{
											marginBottom: '0.5rem',
											color: theme.text,
											display: 'flex',
											alignItems: 'center',
											gap: '0.5rem',
										}}
									>
										{group.name}
										{group.status === 'pending' && (
											<span
												style={{
													fontSize: '0.7rem',
													fontWeight: 500,
													color: theme.textMuted,
													background: theme.bgSubtle,
													padding: '0.15rem 0.5rem',
													borderRadius: 4,
												}}
											>
												Pending
											</span>
										)}
									</h3>
									<p
										style={{
											color: theme.textMuted,
											fontSize: '0.9rem',
											marginBottom: '0.25rem',
										}}
									>
										{group.question_set_name ?? 'Unknown'}{' '}
										· {group.member_count ?? 0} member
										{(group.member_count ?? 0) !== 1 ? 's' : ''}
									</p>
									<p
										style={{
											color: theme.textMuted,
											fontSize: '0.9rem',
										}}
									>
										Weekly on{' '}
										{getDayName(group.schedule_day)} at{' '}
										{group.schedule_time}
									</p>
								</Link>
							))}
						</div>
					</>
				)}
			</Container>
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
