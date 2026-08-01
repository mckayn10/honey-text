import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Container, Button } from '../components';
import { theme } from '../theme';

interface QuestionSet {
	id: string;
	slug: string;
	name: string;
}

const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 20,
	padding: '18px 0',
	borderBottom: `1px solid ${theme.borderLight}`,
};

const rowLabelStyle: React.CSSProperties = {
	width: 150,
	flexShrink: 0,
	fontSize: 14,
	fontWeight: 700,
	color: theme.textMuted,
};

const rowInputStyle: React.CSSProperties = {
	flex: 1,
	padding: '10px 0',
	border: 'none',
	fontSize: 15,
	background: 'transparent',
	fontFamily: 'inherit',
	color: theme.text,
};

const rowSelectStyle: React.CSSProperties = { ...rowInputStyle, cursor: 'pointer' };

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
		<div>
			<Container maxWidth="narrow">
				<h1 style={{ color: theme.text, margin: '0 0 24px', fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em' }}>
					Create New Group
				</h1>

				{loadError && (
					<div
						style={{
							backgroundColor: theme.errorBg,
							color: theme.errorText,
							padding: '0.75rem',
							borderRadius: 8,
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
							borderRadius: 8,
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

				<form onSubmit={handleSubmit}>
					<div className="form-card" style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: 18, padding: '8px 28px' }}>
						<div className="form-row" style={rowStyle}>
							<label htmlFor="name" className="form-row-label" style={rowLabelStyle}>Group name</label>
							<input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								placeholder="e.g., Family Check-in"
								style={rowInputStyle}
							/>
						</div>

						<div className="form-row" style={rowStyle}>
							<label htmlFor="questionSet" className="form-row-label" style={rowLabelStyle}>Question set</label>
							<select
								id="questionSet"
								value={questionSetId}
								onChange={(e) => setQuestionSetId(e.target.value)}
								required
								style={rowSelectStyle}
							>
								{questionSets.map((set) => (
									<option key={set.id} value={set.id}>
										{set.name}
									</option>
								))}
							</select>
						</div>

						<div className="form-row" style={rowStyle}>
							<label htmlFor="scheduleDay" className="form-row-label" style={rowLabelStyle}>Day &amp; time</label>
							<div className="form-row-subgroup" style={{ flex: 1, display: 'flex', gap: 10 }}>
								<select
									id="scheduleDay"
									value={scheduleDay}
									onChange={(e) => setScheduleDay(Number(e.target.value))}
									required
									style={{ ...rowSelectStyle, flex: 1 }}
								>
									<option value={0}>Sunday</option>
									<option value={1}>Monday</option>
									<option value={2}>Tuesday</option>
									<option value={3}>Wednesday</option>
									<option value={4}>Thursday</option>
									<option value={5}>Friday</option>
									<option value={6}>Saturday</option>
								</select>
								<input
									id="scheduleTime"
									type="time"
									value={scheduleTime}
									onChange={(e) => setScheduleTime(e.target.value)}
									required
									style={{ ...rowInputStyle, flex: 1 }}
								/>
							</div>
						</div>

						<div className="form-row" style={{ ...rowStyle, borderBottom: 'none' }}>
							<label htmlFor="scheduleTimezone" className="form-row-label" style={rowLabelStyle}>Timezone</label>
							<select
								id="scheduleTimezone"
								value={scheduleTimezone}
								onChange={(e) => setScheduleTimezone(e.target.value)}
								required
								style={rowSelectStyle}
							>
								<option value="America/Los_Angeles">Pacific Time</option>
								<option value="America/Denver">Mountain Time</option>
								<option value="America/Chicago">Central Time</option>
								<option value="America/New_York">Eastern Time</option>
							</select>
						</div>
					</div>

					<div style={{ marginTop: 24 }}>
						<Button type="submit" variant="primary" disabled={loading} style={{ borderRadius: 999, padding: '13px 28px' }}>
							{loading ? 'Creating...' : 'Create Group'}
						</Button>
					</div>
				</form>
			</Container>
		</div>
	);
}
