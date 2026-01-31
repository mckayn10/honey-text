import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './GroupSettings.css';
import './GroupForm.css';

interface Group {
	id: string;
	name: string;
	schedule_day: number;
	schedule_time: string;
	schedule_timezone: string;
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
		const confirmDelete = window.confirm(
			`Delete "${group.name}"? This cannot be undone.`,
		);
		if (!confirmDelete) return;
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

	if (loading) {
		return <div className="group-settings-page">Loading...</div>;
	}

	if (!group) {
		return null;
	}

	return (
		<div className="group-settings-page">
			<div className="container">
				<div className="settings-header">
					<Link
						to={`/app/groups/${id}`}
						className="button-link"
					>
						← Back to Group
					</Link>
				</div>

				<h1>Settings: {group.name}</h1>

				<section className="settings-section">
					<h2>Question time</h2>
					<p className="settings-description">
						When the weekly question is sent to this group (in the
						timezone below).
					</p>
					<form
						onSubmit={handleSaveSchedule}
						className="group-form"
					>
						{error && <div className="error">{error}</div>}

						<div className="form-group">
							<label htmlFor="scheduleDay">Day of week</label>
							<select
								id="scheduleDay"
								value={scheduleDay}
								onChange={(e) =>
									setScheduleDay(Number(e.target.value))
								}
								required
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

						<div className="form-group">
							<label htmlFor="scheduleTime">Time</label>
							<input
								id="scheduleTime"
								type="time"
								value={scheduleTime}
								onChange={(e) =>
									setScheduleTime(e.target.value)
								}
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="scheduleTimezone">Timezone</label>
							<select
								id="scheduleTimezone"
								value={scheduleTimezone}
								onChange={(e) =>
									setScheduleTimezone(e.target.value)
								}
								required
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
						</div>

						<div className="form-actions">
							<button
								type="submit"
								className="button button-primary"
								disabled={saving}
							>
								{saving ? 'Saving...' : 'Save schedule'}
							</button>
						</div>
					</form>
				</section>

				<section className="settings-section settings-danger">
					<h2>Delete group</h2>
					<p className="settings-description">
						Permanently delete this group and its conversation.
						Invites and member list will be removed. This cannot be
						undone.
					</p>
					<button
						type="button"
						onClick={handleDeleteGroup}
						className="button button-danger"
						disabled={deleting}
					>
						{deleting ? 'Deleting...' : 'Delete group'}
					</button>
				</section>
			</div>
		</div>
	);
}
