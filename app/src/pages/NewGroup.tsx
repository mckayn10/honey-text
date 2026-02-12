import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import {
	Container,
	Button,
	FormGroup,
	Card,
	inputStyle,
	inputFocusStyle,
} from '../components';
import { theme } from '../theme';

interface QuestionSet {
	id: string;
	slug: string;
	name: string;
}

const selectStyle: React.CSSProperties = {
	...inputStyle,
	cursor: 'pointer',
};

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
			if (data.length > 0) setQuestionSetId(data[0].id);
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
		<div style={{ padding: '0rem 0' }}>
			<Container maxWidth="narrow">
				<h1 style={{ color: theme.text, marginBottom: '2rem' }}>
					Create New Group
				</h1>
				<Card
					style={{
						background: theme.bg,
						padding: '2rem',
						marginBottom: 0,
					}}
				>
					<form onSubmit={handleSubmit}>
						{loadError && (
							<div
								style={{
									backgroundColor: theme.errorBg,
									color: theme.errorText,
									padding: '0.75rem',
									borderRadius: 4,
									marginBottom: '1rem',
								}}
							>
								{loadError}
							</div>
						)}
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
								{(error.includes('Upgrade') || error.includes('plan')) && (
									<div style={{ marginTop: '0.5rem' }}>
										<Link to="/app/subscribe" style={{ color: theme.primary, fontWeight: 600 }}>
											Subscribe or upgrade →
										</Link>
									</div>
								)}
							</div>
						)}

						<FormGroup
							label="Group Name"
							htmlFor="name"
						>
							<input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								placeholder="e.g., Family Check-in"
								style={inputStyle}
								onFocus={(e) =>
									Object.assign(
										e.target.style,
										inputFocusStyle,
									)
								}
								onBlur={(e) =>
									Object.assign(e.target.style, {
										outline: 'none',
										borderColor: theme.borderLight,
										boxShadow: 'none',
									})
								}
							/>
						</FormGroup>

						<FormGroup
							label="Question Set"
							htmlFor="questionSet"
						>
							<select
								id="questionSet"
								value={questionSetId}
								onChange={(e) =>
									setQuestionSetId(e.target.value)
								}
								required
								style={selectStyle}
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
						</FormGroup>

						<FormGroup
							label="Day of Week"
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
								disabled={loading}
							>
								{loading ? 'Creating...' : 'Create Group'}
							</Button>
						</div>
					</form>
				</Card>
			</Container>
		</div>
	);
}
