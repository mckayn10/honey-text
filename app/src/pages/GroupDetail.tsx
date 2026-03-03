import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { apiRequest } from '../lib/api';
import { formatPhoneForDisplay, formatPhoneForInput, parsePhoneToDigits } from '../lib/phone';
import { Container, Button, ButtonLink, FormGroup, Card, Loading, inputStyle, inputFocusStyle } from '../components';
import { theme } from '../theme';

interface Group {
	id: string;
	name: string;
	status?: 'pending' | 'active';
	conversation_sid?: string | null;
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
	accept_code?: string;
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

const listItemStyle: React.CSSProperties = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: '0.85rem 1rem',
	background: theme.bgSubtle,
	borderRadius: 10,
	border: `1px solid ${theme.border}`,
};

const sectionHeading: React.CSSProperties = { marginBottom: '1rem', color: theme.text };

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
	const [ensuringConversation, setEnsuringConversation] = useState(false);
	const [conversationError, setConversationError] = useState<string | null>(null);

	useEffect(() => {
		if (id) loadGroup();
	}, [id]);

	// When group is active but has no conversation (e.g. owner-only), try to create one
	useEffect(() => {
		if (!id || !group || group.status !== 'active' || group.conversation_sid) {
			setConversationError(null);
			return;
		}
		let cancelled = false;
		setConversationError(null);
		setEnsuringConversation(true);
		apiRequest(`/groups/${id}/ensure-conversation`, { method: 'POST' })
			.then(() => {
				if (!cancelled) loadGroup();
			})
			.catch((err: { message?: string }) => {
				if (!cancelled) setConversationError(err?.message ?? 'Could not set up messaging');
			})
			.finally(() => {
				if (!cancelled) setEnsuringConversation(false);
			});
		return () => { cancelled = true; };
	}, [id, group?.id, group?.status, group?.conversation_sid]);

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
				body: JSON.stringify({ invitee_name: inviteeName, invitee_phone: inviteePhone }),
			});
			setInviteeName('');
			setInviteePhone('');
			loadGroup();
			const code = data.accept_code ?? '';
			alert(
				`Invite sent by SMS to ${formatPhoneForDisplay(data.invitee_phone)}. They can reply "YES ${code}" to join (no internet needed), or open this link when they have internet: ${data.inviteUrl}`,
			);
		} catch (err: any) {
			setError(err.message || 'Failed to create invite');
		} finally {
			setSubmitting(false);
		}
	};

	const copyInviteLink = (token: string) => {
		navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
		alert('Invite link copied to clipboard!');
	};

	const handleDeleteInvite = async (inviteId: string) => {
		try {
			await apiRequest(`/groups/${id}/invites/${inviteId}`, { method: 'DELETE' });
			loadGroup();
		} catch (err: any) {
			alert(err.message || 'Failed to delete invite');
		}
	};

	const handleDeleteMember = async (memberId: string) => {
		try {
			await apiRequest(`/groups/${id}/members/${memberId}`, { method: 'DELETE' });
			loadGroup();
		} catch (err: any) {
			alert(err.message || 'Failed to delete member');
		}
	};

	if (loading) return <div style={{ padding: '0 0 3rem' }}><Loading fullHeight /></div>;
	if (!group) return <div style={{ padding: '0 0 3rem' }}>Group not found</div>;

	const pendingInvites = invites.filter((i) => i.status === 'pending');
	const membersWithOwner = getMembersWithOwner(members, userProfile);

	return (
		<div style={{ padding: '0 0 3rem' }}>
			<Container maxWidth="default">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
					<ButtonLink onClick={() => navigate('/app/groups')} style={{ color: theme.primary, textDecoration: 'none' }}>← Back to Groups</ButtonLink>
					<Link
						to={`/app/groups/${id}/settings`}
						title="Settings"
						aria-label="Group settings"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '0.5rem',
							color: theme.textMuted,
							textDecoration: 'none',
							borderRadius: 10,
						}}
					>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					</Link>
				</div>

				<h1 style={{ color: theme.text, margin: '0.5rem 0 1.25rem', fontSize: '2rem', letterSpacing: '-0.02em' }}>
					{group.name}
				</h1>

				{group.status === 'active' && !group.conversation_sid && (
					<Card
						style={{
							background: theme.bgSubtle,
							borderColor: theme.border,
							marginBottom: '1.5rem',
						}}
					>
						{ensuringConversation ? (
							<p style={{ margin: 0, color: theme.textMuted }}>
								Setting up messaging…
							</p>
						) : (
							<>
								<p style={{ margin: 0, marginBottom: conversationError ? '0.75rem' : 0, color: theme.textMuted }}>
									{conversationError ?? 'This group has the same members as another group. Invite someone new to start receiving weekly questions via text.'}
								</p>
								{conversationError && (
									<Button
										type="button"
										variant="primary"
										size="small"
										onClick={() => {
											setConversationError(null);
											setEnsuringConversation(true);
											apiRequest(`/groups/${id}/ensure-conversation`, { method: 'POST' })
												.then(() => loadGroup())
												.catch((err: { message?: string }) => setConversationError(err?.message ?? 'Could not set up messaging'))
												.finally(() => setEnsuringConversation(false));
										}}
									>
										Retry
									</Button>
								)}
							</>
						)}
					</Card>
				)}

				<Card>
					<p style={{ margin: 0 }}>
						<strong>Schedule:</strong> {getDayName(group.schedule_day)} at {formatTime12(group.schedule_time)} ({group.schedule_timezone})
					</p>
				</Card>

				<Card>
					<h2 style={sectionHeading}>Invite Members</h2>
					<form onSubmit={handleCreateInvite} style={{ marginTop: '1rem' }}>
						{error && (
							<div style={{ backgroundColor: theme.errorBg, color: theme.errorText, padding: '0.75rem', borderRadius: 4, marginBottom: '1rem' }}>
								{error}
							</div>
						)}
						<div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
							<FormGroup label="Name" htmlFor="inviteeName" style={{ flex: '1 1 220px', marginBottom: 0 }}>
								<input
									id="inviteeName"
									type="text"
									value={inviteeName}
									onChange={(e) => setInviteeName(e.target.value)}
									required
									style={inputStyle}
									onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
									onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
								/>
							</FormGroup>
							<FormGroup label="Phone Number" htmlFor="inviteePhone" style={{ flex: '1 1 220px', marginBottom: 0 }}>
								<input
									id="inviteePhone"
									type="tel"
									value={formatPhoneForInput(inviteePhone)}
									onChange={(e) => setInviteePhone(parsePhoneToDigits(e.target.value))}
									required
									placeholder="(111) 111-1111"
									maxLength={14}
									style={inputStyle}
									onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
									onBlur={(e) => Object.assign(e.target.style, { outline: 'none', borderColor: theme.borderLight, boxShadow: 'none' })}
								/>
							</FormGroup>
							<Button type="submit" variant="primary" disabled={submitting}>
								{submitting ? 'Creating...' : 'Create Invite'}
							</Button>
						</div>
					</form>
				</Card>

				<Card>
					<h2 style={sectionHeading}>Confirmed Members</h2>
					{membersWithOwner.length === 0 ? (
						<p style={{ color: theme.textMuted, fontStyle: 'italic' }}>No confirmed members yet</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
							{membersWithOwner.map((member: MemberWithOwner) => (
								<div key={member.id} style={listItemStyle}>
									<div>
										<strong>{member.name}</strong> - {member.phone ? formatPhoneForDisplay(member.phone) : 'No phone on file'}
										{member.isOwner && !member.phone && (
											<span style={{ display: 'inline-block', marginLeft: '0.5rem', color: theme.danger, fontWeight: 600, fontSize: '0.9rem' }}>
												Add your phone in <Link to="/app/profile" style={{ color: theme.danger, textDecoration: 'underline' }}>Profile</Link>
											</span>
										)}
									</div>
									{!member.isOwner && (
										<Button type="button" variant="danger" size="small" onClick={() => handleDeleteMember(member.id)} style={{ width: 'auto' }}>
											Remove
										</Button>
									)}
								</div>
							))}
						</div>
					)}
				</Card>

				<Card>
					<h2 style={sectionHeading}>Pending Invites</h2>
					{pendingInvites.length === 0 ? (
						<p style={{ color: theme.textMuted, fontStyle: 'italic' }}>No pending invites</p>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
							{pendingInvites.map((invite) => (
								<div key={invite.id} style={listItemStyle}>
									<div>
										<strong>{invite.invitee_name}</strong> - {formatPhoneForDisplay(invite.invitee_phone)}
										{invite.accept_code && (
											<span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.9rem', color: theme.textMuted }}>
												Reply YES {invite.accept_code} to accept
											</span>
										)}
									</div>
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<Button type="button" size="small" onClick={() => copyInviteLink(invite.token)}>
											Copy Link
										</Button>
										<Button type="button" variant="danger" size="small" onClick={() => handleDeleteInvite(invite.id)}>
											Delete
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			</Container>
		</div>
	);
}

function getDayName(day: number): string {
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return days[day] || 'Unknown';
}

function formatTime12(time: string): string {
	const [hStr, mStr] = time.split(':');
	const hour = parseInt(hStr, 10);
	const minute = mStr ? parseInt(mStr, 10) : 0;
	const period = hour >= 12 ? 'PM' : 'AM';
	const h12 = hour % 12 || 12;
	return minute > 0 ? `${h12}:${String(minute).padStart(2, '0')} ${period}` : `${h12} ${period}`;
}

function getMembersWithOwner(members: Member[], userProfile: UserProfile | null): MemberWithOwner[] {
	if (!userProfile) return members.map((m) => ({ ...m, isOwner: false }));
	const ownerDigits = parsePhoneToDigits(userProfile.phone || '');
	const hasOwnerPhone = ownerDigits.length > 0;
	return members.map((m) => {
		const isOwner = hasOwnerPhone && m.phone && parsePhoneToDigits(m.phone) === ownerDigits;
		return { ...m, isOwner: Boolean(isOwner) };
	});
}
