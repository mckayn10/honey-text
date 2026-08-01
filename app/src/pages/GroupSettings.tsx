import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Container, Button, Loading } from '../components';
import { theme } from '../theme';

interface Group {
	id: string;
	name: string;
	schedule_day: number;
	schedule_time: string;
	schedule_timezone: string;
}

const iconRowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 14,
	padding: '16px 20px',
	borderBottom: `1px solid ${theme.borderLight}`,
	flexWrap: 'wrap',
};

const rowLabelStyle: React.CSSProperties = {
	flex: 1,
	fontSize: '14.5px',
	fontWeight: 700,
	color: theme.text,
};

const rowFieldStyle: React.CSSProperties = {
	border: 'none',
	background: 'transparent',
	fontSize: '14.5px',
	color: theme.textMuted,
	textAlign: 'right',
	fontFamily: 'inherit',
};

function CalendarIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
			<rect x="3" y="4" width="18" height="18" rx="3" />
			<path d="M3 9h18M8 2v4M16 2v4" />
		</svg>
	);
}

function ClockIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 3" />
		</svg>
	);
}

function GlobeIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
			<circle cx="12" cy="12" r="9" />
			<path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
		</svg>
	);
}

export function GroupSettings() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [group, setGroup] = useState<Group | null>(null);
	const [scheduleDay, setScheduleDay] = useState(0);
	const [scheduleTime, setScheduleTime] = useState('09:00');
	const [scheduleTimezone, setScheduleTimezone] = useState(
		'America/Los_Angeles',
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (id) loadGroup();
	}, [id]);

	const loadGroup = async () => {
		try {
			const data = await apiRequest(`/groups/${id}`);
			const g = data.group;
			if (!g) {
				navigate('/app/groups');
				return;
			}
			setGroup(g);
			setScheduleDay(g.schedule_day);
			setScheduleTime(g.schedule_time);
			setScheduleTimezone(g.schedule_timezone);
		} catch {
			navigate('/app/groups');
		} finally {
			setLoading(false);
		}
	};

	const handleSaveSchedule = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!group) return;
		setSaving(true);
		setError(null);
		try {
			await apiRequest(`/groups/${group.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					schedule_day: scheduleDay,
					schedule_time: scheduleTime,
					schedule_timezone: scheduleTimezone,
				}),
			});
			setGroup((prev) =>
				prev
					? {
							...prev,
							schedule_day: scheduleDay,
							schedule_time: scheduleTime,
							schedule_timezone: scheduleTimezone,
						}
					: null,
			);
		} catch (err: any) {
			setError(err.message || 'Failed to update schedule');
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteGroup = async () => {
		if (!group) return;
		if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`))
			return;
		setDeleting(true);
		setError(null);
		try {
			await apiRequest(`/groups/${group.id}`, { method: 'DELETE' });
			navigate('/app/groups');
		} catch (err: any) {
			setError(err.message || 'Failed to delete group');
		} finally {
			setDeleting(false);
		}
	};

	if (loading)
		return (
			<div style={{ padding: '2.5rem 0 3rem' }}>
				<Loading fullHeight />
			</div>
		);
	if (!group) return null;

	return (
		<div>
			<Container maxWidth="narrow">
				<Link
					to={`/app/groups/${id}`}
					style={{
						color: theme.primary,
						textDecoration: 'none',
						fontWeight: 700,
						fontSize: '13.5px',
						display: 'inline-block',
						marginBottom: 14,
					}}
				>
					← Back to Group
				</Link>
				<h1 style={{ color: theme.text, margin: '0 0 4px', fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em' }}>
					Settings
				</h1>
				<p style={{ color: theme.textLight, fontSize: '13.5px', margin: '0 0 24px' }}>{group.name}</p>

				{error && (
					<div
						style={{
							backgroundColor: theme.errorBg,
							color: theme.errorText,
							padding: '0.75rem',
							borderRadius: 8,
							marginBottom: '1rem',
						}}
					>
						{error}
					</div>
				)}

				<p style={{ color: theme.textLight, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
					Weekly schedule
				</p>
				<form onSubmit={handleSaveSchedule}>
					<div style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 16, marginBottom: 26, overflow: 'hidden' }}>
						<div style={iconRowStyle}>
							<CalendarIcon />
							<span style={rowLabelStyle}>Day of week</span>
							<select
								id="scheduleDay"
								value={scheduleDay}
								onChange={(e) => setScheduleDay(Number(e.target.value))}
								required
								style={{ ...rowFieldStyle, cursor: 'pointer' }}
							>
								<option value={0}>Sunday</option>
								<option value={1}>Monday</option>
								<option value={2}>Tuesday</option>
								<option value={3}>Wednesday</option>
								<option value={4}>Thursday</option>
								<option value={5}>Friday</option>
								<option value={6}>Saturday</option>
							</select>
						</div>
						<div style={iconRowStyle}>
							<ClockIcon />
							<span style={rowLabelStyle}>Time</span>
							<input
								id="scheduleTime"
								type="time"
								value={scheduleTime}
								onChange={(e) => setScheduleTime(e.target.value)}
								required
								style={rowFieldStyle}
							/>
						</div>
						<div style={{ ...iconRowStyle, borderBottom: 'none' }}>
							<GlobeIcon />
							<span style={rowLabelStyle}>Timezone</span>
							<select
								id="scheduleTimezone"
								value={scheduleTimezone}
								onChange={(e) => setScheduleTimezone(e.target.value)}
								required
								style={{ ...rowFieldStyle, cursor: 'pointer' }}
							>
								<option value="America/Los_Angeles">Pacific Time</option>
								<option value="America/Denver">Mountain Time</option>
								<option value="America/Chicago">Central Time</option>
								<option value="America/New_York">Eastern Time</option>
							</select>
						</div>
					</div>
					<div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-14px 0 30px' }}>
						<Button type="submit" variant="primary" disabled={saving} style={{ borderRadius: 999, padding: '11px 22px', fontSize: '13.5px' }}>
							{saving ? 'Saving...' : 'Save changes'}
						</Button>
					</div>
				</form>

				<p style={{ color: theme.textLight, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
					Danger zone
				</p>
				<div style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
					<div style={{ width: 38, height: 38, borderRadius: 11, background: theme.dangerBg, color: theme.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
						<TrashIcon />
					</div>
					<div style={{ flex: '1 1 160px' }}>
						<p style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: theme.text }}>Delete this group</p>
						<p style={{ margin: '2px 0 0', fontSize: 13, color: theme.textLight }}>
							Removes the conversation, members, and invites. Cannot be undone.
						</p>
					</div>
					<Button
						type="button"
						variant="danger"
						disabled={deleting}
						onClick={handleDeleteGroup}
						style={{ width: 'auto', borderRadius: 999, padding: '10px 18px', fontSize: '13.5px', whiteSpace: 'nowrap' }}
					>
						{deleting ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</Container>
		</div>
	);
}
