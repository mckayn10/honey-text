import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './GroupDetail.css';

interface Group {
	id: string;
	name: string;
	question_set_id: string;
	schedule_day: number;
	schedule_time: string;
	schedule_timezone: string;
}

interface Invite {
	id: string;
	invitee_name: string;
	invitee_phone: string;
	token: string;
	status: 'pending' | 'accepted';
	created_at: string;
}

interface Member {
	id: string;
	name: string;
	phone: string;
	confirmed_at: string;
}

interface MemberWithOwner extends Member {
	isOwner?: boolean;
}

interface UserProfile {
	id: string;
	email: string;
	display_name: string | null;
	phone: string | null;
}

export function GroupDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [group, setGroup] = useState<Group | null>(null);
	const [invites, setInvites] = useState<Invite[]>([]);
	const [members, setMembers] = useState<Member[]>([]);
	const [inviteeName, setInviteeName] = useState('');
	const [inviteePhone, setInviteePhone] = useState('');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

	useEffect(() => {
		if (id) {
			loadGroup();
		}
	}, [id]);

	const loadGroup = async () => {
		try {
			const [groupData, userData] = await Promise.all([
				apiRequest(`/groups/${id}`),
				apiRequest('/users/me'),
			]);
			setGroup(groupData.group);
			setInvites(groupData.invites || []);
			setMembers(groupData.members || []);
			setUserProfile(userData || null);
		} catch (error) {
			console.error('Failed to load group:', error);
			navigate('/app/groups');
		} finally {
			setLoading(false);
		}
	};

	const handleCreateInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			const data = await apiRequest(`/groups/${id}/invites`, {
				method: 'POST',
				body: JSON.stringify({
					invitee_name: inviteeName,
					invitee_phone: inviteePhone,
				}),
			});
			setInviteeName('');
			setInviteePhone('');
			loadGroup(); // Reload to show new invite
			alert(`Invite link: ${data.inviteUrl}`);
		} catch (err: any) {
			setError(err.message || 'Failed to create invite');
		} finally {
			setSubmitting(false);
		}
	};

	const copyInviteLink = (token: string) => {
		const url = `${window.location.origin}/invite/${token}`;
		navigator.clipboard.writeText(url);
		alert('Invite link copied to clipboard!');
	};

	const handleDeleteInvite = async (inviteId: string) => {
		try {
			await apiRequest(`/groups/${id}/invites/${inviteId}`, {
				method: 'DELETE',
			});
			loadGroup();
		} catch (err: any) {
			alert(err.message || 'Failed to delete invite');
		}
	};

	const handleDeleteMember = async (memberId: string) => {
		try {
			await apiRequest(`/groups/${id}/members/${memberId}`, {
				method: 'DELETE',
			});
			loadGroup();
		} catch (err: any) {
			alert(err.message || 'Failed to delete member');
		}
	};

	if (loading) {
		return <div className="group-detail">Loading...</div>;
	}

	if (!group) {
		return <div className="group-detail">Group not found</div>;
	}

	return (
		<div className="group-detail">
			<div className="container">
				<div className="group-header-row">
					<button
						onClick={() => navigate('/app/groups')}
						className="button-link"
					>
						← Back to Groups
					</button>
					<Link
						to={`/app/groups/${id}/settings`}
						className="group-settings-icon"
						title="Settings"
						aria-label="Group settings"
					>
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden
						>
							<circle
								cx="12"
								cy="12"
								r="3"
							/>
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					</Link>
				</div>

				<h1>{group.name}</h1>

				<div className="group-info">
					<p>
						<strong>Schedule:</strong>{' '}
						{getDayName(group.schedule_day)} at{' '}
						{formatTime12(group.schedule_time)} (
						{group.schedule_timezone})
					</p>
				</div>

				<section className="invite-section">
					<h2>Invite Members</h2>
					<form
						onSubmit={handleCreateInvite}
						className="invite-form"
					>
						{error && <div className="error">{error}</div>}
						<div className="form-row">
							<div className="form-group">
								<label htmlFor="inviteeName">Name</label>
								<input
									id="inviteeName"
									type="text"
									value={inviteeName}
									onChange={(e) =>
										setInviteeName(e.target.value)
									}
									required
								/>
							</div>
							<div className="form-group">
								<label htmlFor="inviteePhone">
									Phone Number
								</label>
								<input
									id="inviteePhone"
									type="tel"
									value={inviteePhone}
									onChange={(e) =>
										setInviteePhone(e.target.value)
									}
									required
									placeholder="+1234567890"
								/>
							</div>
							<button
								type="submit"
								className="button button-primary"
								disabled={submitting}
							>
								{submitting ? 'Creating...' : 'Create Invite'}
							</button>
						</div>
					</form>
				</section>

				<section className="invites-section">
					<h2>Pending Invites</h2>
					{invites.filter((i) => i.status === 'pending').length ===
					0 ? (
						<p className="empty">No pending invites</p>
					) : (
						<div className="invites-list">
							{invites
								.filter((i) => i.status === 'pending')
								.map((invite) => (
									<div
										key={invite.id}
										className="invite-item"
									>
										<div>
											<strong>
												{invite.invitee_name}
											</strong>{' '}
											- {invite.invitee_phone}
										</div>
										<div className="invite-actions">
											<button
												onClick={() =>
													copyInviteLink(invite.token)
												}
												className="button button-small"
											>
												Copy Link
											</button>
											<button
												onClick={() =>
													handleDeleteInvite(
														invite.id,
													)
												}
												className="button button-danger"
											>
												Delete
											</button>
										</div>
									</div>
								))}
						</div>
					)}
				</section>

				<section className="members-section">
					<h2>Confirmed Members</h2>
					{getMembersWithOwner(members, userProfile).length === 0 ? (
						<p className="empty">No confirmed members yet</p>
					) : (
						<div className="members-list">
							{getMembersWithOwner(members, userProfile).map(
								(member: MemberWithOwner) => (
									<div
										key={member.id}
										className="member-item"
									>
										<div>
											<strong>{member.name}</strong> -{' '}
											{member.phone || 'No phone on file'}
											{member.isOwner &&
												!member.phone && (
													<span className="member-note">
														Add your phone in{' '}
														<Link to="/app/profile">
															Profile
														</Link>
													</span>
												)}
										</div>
										{!member.isOwner && (
											<button
												onClick={() =>
													handleDeleteMember(
														member.id,
													)
												}
												className="button button-small button-danger"
											>
												Remove
											</button>
										)}
									</div>
								),
							)}
						</div>
					)}
				</section>
			</div>
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

/** Format "HH:mm" as 12-hour time e.g. "2:30 PM" */
function formatTime12(time: string): string {
	const [hStr, mStr] = time.split(':');
	const hour = parseInt(hStr, 10);
	const minute = mStr ? parseInt(mStr, 10) : 0;
	const period = hour >= 12 ? 'PM' : 'AM';
	const h12 = hour % 12 || 12;
	return minute > 0
		? `${h12}:${String(minute).padStart(2, '0')} ${period}`
		: `${h12} ${period}`;
}

function getMembersWithOwner(
	members: Member[],
	userProfile: UserProfile | null,
): MemberWithOwner[] {
	if (!userProfile) {
		return members.map((m) => ({ ...m, isOwner: false }));
	}

	const ownerName = userProfile.display_name || userProfile.email || 'You';
	const ownerPhone = userProfile.phone || '';
	const hasOwnerPhone = ownerPhone.length > 0;

	let hasOwner = false;
	const enriched = members.map((m) => {
		const isOwner = hasOwnerPhone && m.phone === ownerPhone;
		if (isOwner) hasOwner = true;
		return { ...m, isOwner: Boolean(isOwner) };
	});

	if (!hasOwner) {
		return [
			{
				id: 'owner',
				name: ownerName,
				phone: ownerPhone,
				confirmed_at: '',
				isOwner: true,
			},
			...enriched,
		];
	}

	return enriched;
}
