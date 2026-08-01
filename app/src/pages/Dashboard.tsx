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
	/** Latest logged SMS thread line (from group_messages), if any */
	last_message_preview?: string | null;
	last_message_at?: string | null;
}

const pillLinkStyle: React.CSSProperties = {
	display: 'inline-block',
	textDecoration: 'none',
	background: theme.primary,
	color: 'white',
	padding: '11px 20px',
	borderRadius: 999,
	fontWeight: 700,
	fontSize: '14.5px',
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
				...(empty ? { alignItems: 'center', justifyContent: 'center' } : {}),
			}}
		>
			<Container maxWidth="default" style={{ width: '100%' }}>
				{!hasSubscription ? (
					<div style={{ textAlign: 'center', padding: '2rem', color: theme.textMuted }}>
						<h2 style={{ color: theme.text, marginBottom: '0.75rem', fontSize: '1.75rem' }}>My Groups</h2>
						<p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
							Subscribe to create your first group and start sending weekly questions.
						</p>
						<Link to="/app/subscribe" style={pillLinkStyle}>
							Subscribe
						</Link>
					</div>
				) : empty ? (
					<div style={{ textAlign: 'center', padding: '2rem', color: theme.textMuted }}>
						<h2 style={{ color: theme.text, marginBottom: '0.75rem', fontSize: '1.75rem' }}>My Groups</h2>
						<p style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
							No groups yet. Create your first group to get started!
						</p>
						<Link to="/app/groups/new" style={pillLinkStyle}>
							+ Create Group
						</Link>
					</div>
				) : (
					<>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
							<h1 style={{ color: theme.text, margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
								My Groups
							</h1>
							<Link to="/app/groups/new" style={pillLinkStyle}>
								+ Create Group
							</Link>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							{groups.map((group) => (
								<Link
									key={group.id}
									to={`/app/groups/${group.id}`}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 16,
										textAlign: 'left',
										background: 'white',
										border: `1px solid ${theme.border}`,
										padding: '16px 18px',
										borderRadius: 16,
										textDecoration: 'none',
										color: 'inherit',
									}}
								>
									<div
										style={{
											width: 44,
											height: 44,
											borderRadius: 13,
											background: theme.primaryBg,
											color: theme.primary,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontWeight: 800,
											fontSize: 17,
											flexShrink: 0,
										}}
									>
										{group.name.charAt(0).toUpperCase()}
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<span style={{ fontWeight: 800, color: theme.text, fontSize: '15.5px' }}>{group.name}</span>
											{group.status === 'pending' && (
												<span
													style={{
														fontSize: '10.5px',
														fontWeight: 700,
														color: '#A3823E',
														background: '#FBF1DC',
														padding: '2px 8px',
														borderRadius: 999,
													}}
												>
													Pending
												</span>
											)}
										</div>
										<p style={{ margin: '2px 0 0', color: theme.textMuted, fontSize: '13.5px' }}>
											{group.question_set_name ?? 'Unknown'} · {group.member_count ?? 0} member
											{(group.member_count ?? 0) !== 1 ? 's' : ''} · Weekly {getDayName(group.schedule_day)} {group.schedule_time}
										</p>
										{group.last_message_preview ? (
											<p
												style={{
													color: theme.textLight,
													fontSize: '0.85rem',
													marginTop: '0.5rem',
													paddingTop: '0.5rem',
													borderTop: `1px solid ${theme.borderLight}`,
													lineHeight: 1.4,
												}}
											>
												{group.last_message_preview}
												{group.last_message_at && (
													<span style={{ display: 'block', marginTop: '0.15rem' }}>
														{formatGroupListTime(group.last_message_at)}
													</span>
												)}
											</p>
										) : null}
									</div>
									<span style={{ color: theme.textLight, fontSize: 18, flexShrink: 0 }}>→</span>
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

function formatGroupListTime(iso: string): string {
	try {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	} catch {
		return '';
	}
}
