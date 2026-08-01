import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { formatPhoneForDisplay, formatPhoneForInput, parsePhoneToDigits } from '../lib/phone';
import { Container, Button, Card, Loading } from '../components';
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

const pillTagStyle: React.CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 7,
	padding: '8px 14px',
	background: 'white',
	border: `1px solid ${theme.border}`,
	borderRadius: 999,
	fontSize: 13,
	fontWeight: 700,
	color: '#5C574F',
};

const sectionHeading: React.CSSProperties = {
	color: theme.text,
	margin: '0 0 14px',
	fontSize: 15,
	fontWeight: 800,
	textTransform: 'uppercase',
	letterSpacing: '0.03em',
};

const pillInputWrapStyle: React.CSSProperties = {
	flex: '1 1 170px',
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	background: theme.bg,
	border: `1px solid ${theme.border}`,
	borderRadius: 999,
	padding: '10px 16px',
};

const pillInputStyle: React.CSSProperties = {
	border: 'none',
	background: 'transparent',
	fontSize: 14,
	width: '100%',
	padding: 0,
	fontFamily: 'inherit',
};

const peopleTabButtonStyle = (active: boolean): React.CSSProperties => ({
	background: active ? theme.primaryBg : 'transparent',
	color: active ? theme.primary : theme.textLight,
	border: 'none',
	padding: '9px 16px',
	borderRadius: 999,
	fontFamily: 'inherit',
	fontWeight: 700,
	fontSize: '13.5px',
	cursor: 'pointer',
});

interface QuestionThread {
	question: GroupMessage;
	replies: GroupMessage[];
}

const weeklyQuestionPrefix = "This week's question for ";

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
	const [peopleTab, setPeopleTab] = useState<'members' | 'pending'>('members');
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

	if (loading) return <div><Loading fullHeight /></div>;
	if (!group) return <div>Group not found</div>;

	const pendingInvites = invites.filter((i) => i.status === 'pending');
	const membersWithOwner = getMembersWithOwner(members, userProfile);
	const { questionThreads, otherMessages } = groupMessagesIntoThreads(threadMessages);

	return (
		<div>
			<Container maxWidth={1040}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
					<Link to="/app/groups" style={{ background: 'none', border: 'none', color: theme.primary, fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
						← Back to Groups
					</Link>
					<Link
						to={`/app/groups/${id}/settings`}
						title="Group settings"
						aria-label="Group settings"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: 34,
							height: 34,
							color: theme.textMuted,
							textDecoration: 'none',
							borderRadius: 10,
						}}
					>
						<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					</Link>
				</div>

				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
					<h1 style={{ color: theme.text, margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em' }}>
						{group.name}
					</h1>
					{group.status === 'active' && (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 6,
								padding: '6px 12px',
								background: theme.successBg,
								borderRadius: 999,
								fontSize: '12.5px',
								fontWeight: 700,
								color: theme.successText,
							}}
						>
							<span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.successText }} />
							Active
						</span>
					)}
				</div>
				<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
					<span style={pillTagStyle}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
						{getDayName(group.schedule_day)}
					</span>
					<span style={pillTagStyle}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
						{formatTime12(group.schedule_time)}
					</span>
					<span style={pillTagStyle}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" /></svg>
						{group.schedule_timezone}
					</span>
				</div>

				{group.status === 'active' && !group.conversation_sid && (
					<Card style={{ background: theme.bgSubtle, borderColor: theme.border, marginBottom: '1.5rem' }}>
						{ensuringConversation ? (
							<p style={{ margin: 0, color: theme.textMuted }}>Setting up messaging…</p>
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
					!(
						messagingHealth.envConfigured &&
						messagingHealth.bound &&
						messagingHealth.matchesEnv
					) && (
						<Card style={{ marginBottom: '1.5rem', background: theme.dangerBg, borderColor: theme.danger }}>
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

				<div className="group-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
					<div>
						<div style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 18, padding: 22, marginBottom: 18 }}>
							<h2 style={sectionHeading}>Invite someone</h2>
							<form onSubmit={handleCreateInvite}>
								{error && (
									<div style={{ backgroundColor: theme.errorBg, color: theme.errorText, padding: '0.75rem', borderRadius: 8, marginBottom: '1rem' }}>
										{error}
									</div>
								)}
								<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
									<div style={pillInputWrapStyle}>
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
										<input
											type="text"
											placeholder="Full name"
											value={inviteeName}
											onChange={(e) => setInviteeName(e.target.value)}
											required
											style={pillInputStyle}
										/>
									</div>
									<div style={pillInputWrapStyle}>
										<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
										<input
											type="tel"
											placeholder="(111) 111-1111"
											value={formatPhoneForInput(inviteePhone)}
											onChange={(e) => setInviteePhone(parsePhoneToDigits(e.target.value))}
											required
											maxLength={14}
											style={pillInputStyle}
										/>
									</div>
									<Button type="submit" variant="primary" disabled={submitting} style={{ borderRadius: 999, padding: '11px 22px', fontSize: '13.5px', width: 'auto', whiteSpace: 'nowrap' }}>
										{submitting ? 'Creating...' : 'Send invite'}
									</Button>
								</div>
							</form>
						</div>

						<div style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 18, padding: 22 }}>
							<div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
								<button type="button" onClick={() => setPeopleTab('members')} style={peopleTabButtonStyle(peopleTab === 'members')}>
									Members · {membersWithOwner.length}
								</button>
								<button type="button" onClick={() => setPeopleTab('pending')} style={peopleTabButtonStyle(peopleTab === 'pending')}>
									Pending · {pendingInvites.length}
								</button>
							</div>

							{peopleTab === 'members' ? (
								membersWithOwner.length === 0 ? (
									<p style={{ color: theme.textLight, fontStyle: 'italic', margin: 0 }}>No confirmed members yet</p>
								) : (
									<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
										{membersWithOwner.map((member) => (
											<div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 4px', borderBottom: `1px solid ${theme.borderLight}`, gap: 12, flexWrap: 'wrap' }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
													<div style={{ width: 32, height: 32, borderRadius: '50%', background: theme.primaryBg, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
														{member.name.charAt(0).toUpperCase()}
													</div>
													<div>
														<span style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{member.name}</span>
														<span style={{ display: 'block', fontSize: '12.5px', color: theme.textLight }}>
															{member.phone ? formatPhoneForDisplay(member.phone) : 'No phone on file'}
														</span>
														{member.isOwner && !member.phone && (
															<span style={{ display: 'block', color: theme.danger, fontWeight: 600, fontSize: '0.85rem' }}>
																Add your phone in <Link to="/app/profile" style={{ color: theme.danger, textDecoration: 'underline' }}>Profile</Link>
															</span>
														)}
													</div>
												</div>
												{member.isOwner ? (
													<span style={{ fontSize: '11.5px', fontWeight: 700, color: theme.textLight }}>You</span>
												) : (
													<Button type="button" variant="danger" size="small" onClick={() => handleDeleteMember(member.id)} style={{ width: 'auto' }}>
														Remove
													</Button>
												)}
											</div>
										))}
									</div>
								)
							) : pendingInvites.length === 0 ? (
								<p style={{ color: theme.textLight, fontStyle: 'italic', margin: 0 }}>No pending invites</p>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
									{pendingInvites.map((invite) => (
										<div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 4px', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${theme.borderLight}` }}>
											<div>
												<span style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{invite.invitee_name}</span>
												<span style={{ color: theme.textLight, fontSize: '13.5px' }}> · {formatPhoneForDisplay(invite.invitee_phone)}</span>
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
													Cancel
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="group-detail-thread" style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 18, padding: 24, position: 'sticky', top: 20 }}>
						<h2 style={sectionHeading}>Text thread</h2>
						<p style={{ margin: '-8px 0 14px', fontSize: '0.85rem', color: theme.textLight, lineHeight: 1.45 }}>
							Messages logged from your group’s SMS thread. Full history stays in your phone’s Messages app.
						</p>
						{threadMessages.length === 0 ? (
							<p style={{ margin: 0, color: theme.textLight, fontStyle: 'italic', fontSize: '0.95rem' }}>
								No messages yet. After the first weekly question or a reply in the group text, they will show up here.
							</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'min(560px, 65vh)', overflowY: 'auto' }}>
								{otherMessages.map((msg) => (
									<MessageBubble key={msg.id} msg={msg} members={membersWithOwner} />
								))}
								{[...questionThreads].reverse().map((thread) => (
									<div key={thread.question.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
										<MessageBubble msg={thread.question} members={membersWithOwner} />
										{thread.replies.map((reply) => (
											<MessageBubble key={reply.id} msg={reply} members={membersWithOwner} />
										))}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
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

function isWeeklyQuestion(msg: GroupMessage): boolean {
	return msg.direction === 'outbound' && (msg.body?.startsWith(weeklyQuestionPrefix) ?? false);
}

function groupMessagesIntoThreads(messages: GroupMessage[]): {
	questionThreads: QuestionThread[];
	otherMessages: GroupMessage[];
} {
	const sorted = [...messages].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
	);
	const questionThreads: QuestionThread[] = [];
	const otherMessages: GroupMessage[] = [];
	let currentThread: QuestionThread | null = null;

	for (const msg of sorted) {
		if (isWeeklyQuestion(msg)) {
			currentThread = { question: msg, replies: [] };
			questionThreads.push(currentThread);
			continue;
		}
		if (msg.direction === 'inbound' && currentThread) {
			currentThread.replies.push(msg);
			continue;
		}
		otherMessages.push(msg);
	}

	return { questionThreads, otherMessages };
}

function messageAuthorLabel(msg: GroupMessage, members: MemberWithOwner[]): string {
	if (msg.direction === 'outbound') {
		if (msg.author === 'honeytext' || msg.author?.startsWith('honeytext-')) return 'HoneyText';
		return msg.author?.trim() || 'HoneyText';
	}
	const author = msg.author?.trim();
	if (!author) return 'Member';
	const authorDigits = parsePhoneToDigits(author);
	if (authorDigits.length === 10) {
		const member = members.find((m) => m.phone && parsePhoneToDigits(m.phone) === authorDigits);
		if (member?.name) return member.name;
	}
	return author;
}

function MessageBubble({
	msg,
	members,
}: {
	msg: GroupMessage;
	members: MemberWithOwner[];
}) {
	const outbound = msg.direction === 'outbound';
	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: outbound ? 'flex-start' : 'flex-end' }}>
			<div
				style={{
					maxWidth: '92%',
					background: outbound ? theme.primaryBg : theme.primary,
					color: outbound ? theme.text : 'white',
					padding: outbound ? '12px 16px' : '11px 15px',
					borderRadius: outbound ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
					fontSize: 14,
					lineHeight: 1.5,
					whiteSpace: 'pre-wrap',
				}}
			>
				{msg.body ?? ''}
			</div>
			<div style={{ fontSize: '11.5px', color: theme.textLight, marginTop: 3, padding: '0 2px' }}>
				{messageAuthorLabel(msg, members)} · {formatMessageTimestamp(msg.created_at)}
			</div>
		</div>
	);
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
