import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

interface GroupMessage {
	id: string;
	body: string | null;
	author: string | null;
	direction: 'inbound' | 'outbound';
	created_at: string;
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

const messageRowStyle: React.CSSProperties = {
	padding: '0.85rem 1rem',
	background: theme.bgSubtle,
	borderRadius: 10,
	border: `1px solid ${theme.border}`,
};

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
	/** From POST /ensure-conversation: Twilio Group MMS needs a Messaging Service on the Conversation */
	const [messagingHealth, setMessagingHealth] = useState<{
		bound: boolean;
		envConfigured: boolean;
		matchesEnv: boolean;
	} | null>(null);
	const [messagingHealthCheckError, setMessagingHealthCheckError] = useState<string | null>(null);
	const [threadMessages, setThreadMessages] = useState<GroupMessage[]>([]);

	const applyEnsureConversationPayload = (data: unknown): boolean => {
		const d = data as {
			messaging_service_bound?: boolean;
			messaging_service_env_configured?: boolean;
			messaging_service_matches_env?: boolean;
		};
		if (typeof d.messaging_service_bound === 'boolean') {
			setMessagingHealth({
				bound: d.messaging_service_bound,
				envConfigured: d.messaging_service_env_configured ?? false,
				matchesEnv: d.messaging_service_matches_env ?? false,
			});
			return true;
		}
		return false;
	};

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
		setMessagingHealth(null);
		setEnsuringConversation(true);
		apiRequest(`/groups/${id}/ensure-conversation`, { method: 'POST' })
			.then((data) => {
				if (!cancelled) {
					const ok = applyEnsureConversationPayload(data);
					if (!ok) {
						setMessagingHealthCheckError(
							'Could not verify Twilio Messaging Service binding. API response did not include messaging health fields.'
						);
					}
					loadGroup();
				}
			})
			.catch((err: { message?: string }) => {
				if (!cancelled) setConversationError(err?.message ?? 'Could not set up messaging');
			})
			.finally(() => {
				if (!cancelled) setEnsuringConversation(false);
			});
		return () => { cancelled = true; };
	}, [id, group?.id, group?.status, group?.conversation_sid]);

	// Active group with a Conversation: refresh Messaging Service binding status (needed for shared Group MMS)
	useEffect(() => {
		if (!id || !group || group.status !== 'active' || !group.conversation_sid) {
			setMessagingHealthCheckError(null);
			return;
		}
		let cancelled = false;
		setMessagingHealthCheckError(null);
		apiRequest(`/groups/${id}/ensure-conversation`, { method: 'POST' })
			.then((data) => {
				if (!cancelled) {
					const ok = applyEnsureConversationPayload(data);
					if (ok) {
						setMessagingHealthCheckError(null);
					} else {
						setMessagingHealthCheckError(
							'Could not verify Twilio Messaging Service binding. API response did not include messaging health fields.'
						);
					}
				}
			})
			.catch(() => {
				if (!cancelled) {
					setMessagingHealthCheckError('Could not verify Twilio Messaging Service binding. Check API/Twilio configuration and reload.');
				}
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
			setThreadMessages(
				Array.isArray(groupData.messages) ? groupData.messages : [],
			);
			setUserProfile(userData || null);
			if (
				groupData.group?.conversation_sid &&
				typeof groupData.messaging_service_bound === 'boolean'
			) {
				applyEnsureConversationPayload(groupData);
				setMessagingHealthCheckError(null);
			} else if (!groupData.group?.conversation_sid) {
				setMessagingHealth(null);
				setMessagingHealthCheckError(null);
			} else {
				setMessagingHealthCheckError(
					'Could not verify Twilio Messaging Service binding. API response did not include messaging health fields.'
				);
			}
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
				`Invite sent by SMS to ${formatPhoneForDisplay(data.invitee_phone)}. The message asks them to reply exactly "YES ${code}". To invite via the web instead, share this link: ${data.inviteUrl}`,
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
												.then((data) => {
													applyEnsureConversationPayload(data);
													loadGroup();
												})
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

				{group.status === 'active' &&
					group.conversation_sid &&
					!messagingHealth && (
						<Card
							style={{
								marginBottom: '1.5rem',
								background: messagingHealthCheckError ? 'rgba(220, 53, 69, 0.10)' : theme.bgSubtle,
								borderColor: messagingHealthCheckError ? theme.danger : theme.border,
								borderWidth: 1,
								borderStyle: 'solid',
							}}
						>
							<p style={{ margin: 0, fontSize: '0.95rem', color: messagingHealthCheckError ? theme.text : theme.textMuted, lineHeight: 1.5 }}>
								<strong style={{ display: 'block', marginBottom: '0.35rem', color: theme.text }}>
									{messagingHealthCheckError ? 'Group text threading status unavailable' : 'Checking group text threading…'}
								</strong>
								{messagingHealthCheckError ??
									'We are verifying this group’s Twilio Messaging Service binding now.'}
							</p>
						</Card>
					)}

				{group.status === 'active' &&
					group.conversation_sid &&
					messagingHealth &&
					messagingHealth.envConfigured &&
					messagingHealth.bound &&
					messagingHealth.matchesEnv && (
						<Card
							style={{
								marginBottom: '1.5rem',
								background: 'rgba(46, 160, 67, 0.10)',
								borderColor: '#2ea043',
								borderWidth: 1,
								borderStyle: 'solid',
							}}
						>
							<p style={{ margin: 0, fontSize: '0.95rem', color: theme.text, lineHeight: 1.5 }}>
								<strong style={{ display: 'block', marginBottom: '0.35rem' }}>Group text threading ready</strong>
								This group’s conversation is correctly bound to your configured Messaging Service. Messages should send as one shared group thread (carrier/device behavior can still vary).
							</p>
						</Card>
					)}

				{group.status === 'active' &&
					group.conversation_sid &&
					messagingHealth &&
					!(
						messagingHealth.envConfigured &&
						messagingHealth.bound &&
						messagingHealth.matchesEnv
					) && (
						<Card
							style={{
								marginBottom: '1.5rem',
								background: 'rgba(220, 53, 69, 0.10)',
								borderColor: theme.danger,
								borderWidth: 1,
								borderStyle: 'solid',
							}}
						>
							<p style={{ margin: 0, fontSize: '0.95rem', color: theme.text, lineHeight: 1.5 }}>
								<strong style={{ display: 'block', marginBottom: '0.35rem' }}>Group text threading</strong>
								{!messagingHealth.bound ? (
									<>
										Weekly messages may arrive as separate one-on-one threads instead of one shared group chat. The API host should bind this
										conversation to a Messaging Service: set{' '}
										<code style={{ fontSize: '0.88em' }}>TWILIO_MESSAGING_SERVICE_SID</code> (your A2P <code style={{ fontSize: '0.88em' }}>MG…</code>{' '}
										service that includes this app’s number), redeploy, open this page again (or use Retry if shown above), and confirm in Twilio
										that the Conversation has a Messaging Service.
									</>
								) : !messagingHealth.envConfigured ? (
									<>
										The API does not have a valid <code style={{ fontSize: '0.88em' }}>TWILIO_MESSAGING_SERVICE_SID</code>. The host should add
										it to the server environment (the same <code style={{ fontSize: '0.88em' }}>MG…</code> Messaging Service the Twilio number
										uses for A2P), redeploy, then reload this page so HoneyText can keep the Conversation aligned for shared group MMS.
									</>
								) : (
									<>
										This group’s conversation is tied to a different Messaging Service than <code style={{ fontSize: '0.88em' }}>TWILIO_MESSAGING_SERVICE_SID</code> on
										the API. Update the env var or recreate the group conversation so they match (see deploy docs).
									</>
								)}
							</p>
						</Card>
					)}

				<Card>
					<p style={{ margin: 0 }}>
						<strong>Schedule:</strong> {getDayName(group.schedule_day)} at {formatTime12(group.schedule_time)} ({group.schedule_timezone})
					</p>
				</Card>

				<Card>
					<h2 style={sectionHeading}>Text thread</h2>
					<p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: theme.textMuted, lineHeight: 1.45 }}>
						Messages we log from your group’s SMS thread (weekly questions and replies). Full history stays in your phone’s Messages app.
					</p>
					{threadMessages.length === 0 ? (
						<p style={{ margin: 0, color: theme.textMuted, fontStyle: 'italic', fontSize: '0.95rem' }}>
							No messages yet. After the first weekly question or a reply in the group text, they will show up here.
						</p>
					) : (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.75rem',
								maxHeight: 'min(420px, 55vh)',
								overflowY: 'auto',
							}}
						>
							{[...threadMessages].reverse().map((msg) => (
								<div
									key={msg.id}
									style={{
										...messageRowStyle,
										display: 'flex',
										flexDirection: 'column',
										gap: '0.35rem',
									}}
								>
									<div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
										<span style={{ fontWeight: 600, fontSize: '0.88rem', color: theme.text }}>
											{messageAuthorLabel(msg)}
										</span>
										<span style={{ fontSize: '0.8rem', color: theme.textLight }}>
											{formatMessageTimestamp(msg.created_at)}
										</span>
									</div>
									<p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.45, color: theme.text }}>
										{msg.body ?? ''}
									</p>
								</div>
							))}
						</div>
					)}
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

function messageAuthorLabel(msg: GroupMessage): string {
	if (msg.direction === 'outbound') {
		if (msg.author === 'honeytext') return 'HoneyText';
		return msg.author?.trim() || 'HoneyText';
	}
	return msg.author?.trim() || 'Member';
}

function formatMessageTimestamp(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	} catch {
		return iso;
	}
}
