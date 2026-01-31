import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './GroupForm.css';

interface QuestionSet {
	id: string;
	slug: string;
	name: string;
}

export function NewGroup() {
	const [name, setName] = useState('');
	const [questionSetId, setQuestionSetId] = useState('');
	const [scheduleDay, setScheduleDay] = useState(0);
	const [scheduleTime, setScheduleTime] = useState('09:00');
	const [scheduleTimezone, setScheduleTimezone] = useState(
		'America/Los_Angeles',
	);
	const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		loadQuestionSets();
	}, []);

	const loadQuestionSets = async () => {
		try {
			setLoadError(null);
			const data = await apiRequest('/question-sets');
			setQuestionSets(data);
			if (data.length > 0) {
				setQuestionSetId(data[0].id);
			}
		} catch (err: any) {
			console.error('Failed to load question sets:', err);
			setLoadError(err?.message || 'Failed to load question sets');
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const data = await apiRequest('/groups', {
				method: 'POST',
				body: JSON.stringify({
					name,
					question_set_id: questionSetId,
					schedule_day: scheduleDay,
					schedule_time: scheduleTime,
					schedule_timezone: scheduleTimezone,
				}),
			});
			navigate(`/app/groups/${data.id}`);
		} catch (err: any) {
			setError(err.message || 'Failed to create group');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="group-form-page">
			<div className="container">
				<h1>Create New Group</h1>
				<form
					onSubmit={handleSubmit}
					className="group-form"
				>
					{loadError && <div className="error">{loadError}</div>}
					{error && <div className="error">{error}</div>}

					<div className="form-group">
						<label htmlFor="name">Group Name</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							placeholder="e.g., Family Check-in"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="questionSet">Question Set</label>
						<select
							id="questionSet"
							value={questionSetId}
							onChange={(e) => setQuestionSetId(e.target.value)}
							required
						>
							{questionSets.map((set) => (
								<option
									key={set.id}
									value={set.id}
								>
									{set.name}
								</option>
							))}
						</select>
					</div>

					<div className="form-group">
						<label htmlFor="scheduleDay">Day of Week</label>
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
							onChange={(e) => setScheduleTime(e.target.value)}
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
							disabled={loading}
						>
							{loading ? 'Creating...' : 'Create Group'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
