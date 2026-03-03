import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import {
	Container,
	Button,
	FormGroup,
	Card,
	Loading,
	inputStyle,
} from '../components';
import { theme } from '../theme';

interface Group {
	id: string;
	name: string;
	schedule_day: number;
	schedule_time: string;
	schedule_timezone: string;
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

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
		<div style={{ padding: '0rem 0 3rem' }}>
			<Container maxWidth="narrow">
				<div style={{ marginBottom: '1rem' }}>
					<Link
						to={`/app/groups/${id}`}
						style={{
							color: theme.primary,
							textDecoration: 'none',
							fontSize: '0.95rem',
						}}
					>
						← Back to Group
					</Link>
				</div>
				<h1
					style={{
						color: theme.text,
						marginBottom: '1.5rem',
						fontSize: '1.75rem',
						letterSpacing: '-0.02em',
					}}
				>
					Settings: {group.name}
				</h1>

				<Card>
					<h2
						style={{
							color: theme.text,
							fontSize: '1.15rem',
							marginBottom: '0.5rem',
						}}
					>
						Question time
					</h2>
					<p
						style={{
							color: theme.textMuted,
							fontSize: '0.95rem',
							marginBottom: '1.25rem',
							lineHeight: 1.45,
						}}
					>
						When the weekly question is sent to this group (in the
						timezone below).
					</p>
					<form onSubmit={handleSaveSchedule}>
						{error && (
							<div
								style={{
									backgroundColor: theme.errorBg,
									color: theme.errorText,
									padding: '0.75rem',
									borderRadius: 4,
									marginBottom: '1rem',
								}}
							>
								{error}
							</div>
						)}
						<FormGroup
							label="Day of week"
							htmlFor="scheduleDay"
						>
							<select
								id="scheduleDay"
								value={scheduleDay}
								onChange={(e) =>
									setScheduleDay(Number(e.target.value))
								}
								required
								style={selectStyle}
							>
								<option value={0}>Sunday</option>
								<option value={1}>Monday</option>
								<option value={2}>Tuesday</option>
								<option value={3}>Wednesday</option>
								<option value={4}>Thursday</option>
								<option value={5}>Friday</option>
								<option value={6}>Saturday</option>
							</select>
						</FormGroup>
						<FormGroup
							label="Time"
							htmlFor="scheduleTime"
						>
							<input
								id="scheduleTime"
								type="time"
								value={scheduleTime}
								onChange={(e) =>
									setScheduleTime(e.target.value)
								}
								required
								style={inputStyle}
							/>
						</FormGroup>
						<FormGroup
							label="Timezone"
							htmlFor="scheduleTimezone"
						>
							<select
								id="scheduleTimezone"
								value={scheduleTimezone}
								onChange={(e) =>
									setScheduleTimezone(e.target.value)
								}
								required
								style={selectStyle}
							>
								<option value="America/Los_Angeles">
									Pacific Time
								</option>
								<option value="America/Denver">
									Mountain Time
								</option>
								<option value="America/Chicago">
									Central Time
								</option>
								<option value="America/New_York">
									Eastern Time
								</option>
							</select>
						</FormGroup>
						<div style={{ marginTop: '2rem' }}>
							<Button
								type="submit"
								variant="primary"
								disabled={saving}
							>
								{saving ? 'Saving...' : 'Save schedule'}
							</Button>
						</div>
					</form>
				</Card>

				<Card
					style={{
						borderColor: theme.dangerBorder,
						background: '#fffbfb',
					}}
				>
					<h2
						style={{
							color: theme.text,
							fontSize: '1.15rem',
							marginBottom: '0.5rem',
						}}
					>
						Delete group
					</h2>
					<p
						style={{
							color: theme.textMuted,
							fontSize: '0.95rem',
							marginBottom: '1.25rem',
							lineHeight: 1.45,
						}}
					>
						Permanently delete this group and its conversation.
						Invites and member list will be removed. This cannot be
						undone.
					</p>
					<Button
						type="button"
						variant="danger"
						disabled={deleting}
						onClick={handleDeleteGroup}
					>
						{deleting ? 'Deleting...' : 'Delete group'}
					</Button>
				</Card>
			</Container>
		</div>
	);
}
