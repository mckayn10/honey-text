import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiRequest } from '../lib/api';
import { Container, Button, Card, Loading } from '../components';
import { theme } from '../theme';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Plan {
	tier: string;
	priceId: string;
	maxGroups: number;
	maxMembersPerGroup: number;
	label: string;
	priceDisplay: string;
}

interface BillingStatus {
	subscription_tier: string | null;
	subscription_status: string | null;
}

function CheckoutForm({
	subscriptionId,
	onSuccess,
}: {
	subscriptionId: string;
	onSuccess: () => void;
}) {
	const stripe = useStripe();
	const elements = useElements();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!stripe || !elements) return;
		setLoading(true);
		setError(null);
		try {
			const returnUrl = `${window.location.origin}/app/subscribe?success=true&subscription_id=${encodeURIComponent(subscriptionId)}`;
			const { error: confirmError } = await stripe.confirmPayment({
				elements,
				confirmParams: { return_url: returnUrl },
			});
			if (confirmError) {
				setError(confirmError.message || 'Payment failed');
				setLoading(false);
				return;
			}
			await apiRequest('/billing/confirm-subscription', {
				method: 'POST',
				body: JSON.stringify({ subscription_id: subscriptionId }),
			});
			onSuccess();
		} catch (err: any) {
			setError(err.message || 'Something went wrong');
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<PaymentElement />
			{error && (
				<div
					style={{
						marginTop: '1rem',
						padding: '0.75rem',
						background: theme.errorBg,
						color: theme.errorText,
						borderRadius: 4,
					}}
				>
					{error}
				</div>
			)}
			<div style={{ marginTop: '1.5rem' }}>
				<Button type="submit" variant="primary" disabled={!stripe || loading}>
					{loading ? 'Processing...' : 'Subscribe'}
				</Button>
			</div>
		</form>
	);
}

export function Subscribe() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [plans, setPlans] = useState<Plan[]>([]);
	const [status, setStatus] = useState<BillingStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [, setSelectedPlan] = useState<Plan | null>(null);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
	const [preview, setPreview] = useState<{ amount_due: number; currency: string; is_charge: boolean; is_credit: boolean } | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	useEffect(() => {
		loadPlansAndStatus();
	}, []);

	// Handle return from 3DS or success
	useEffect(() => {
		const success = searchParams.get('success');
		const subId = searchParams.get('subscription_id');
		if (success === 'true' && subId) {
			apiRequest('/billing/confirm-subscription', {
				method: 'POST',
				body: JSON.stringify({ subscription_id: subId }),
			})
				.then(() => navigate('/app/groups'))
				.catch(() => setError('Failed to confirm subscription'));
		}
	}, [searchParams, navigate]);

	const loadPlansAndStatus = async () => {
		setLoading(true);
		setError(null);
		try {
			const [plansData, statusData] = await Promise.all([
				apiRequest('/billing/plans'),
				apiRequest('/billing/status').catch(() => null),
			]);
			setPlans(Array.isArray(plansData) ? plansData : []);
			setStatus(statusData as BillingStatus | null);
		} catch (err: any) {
			setError(err.message || 'Failed to load plans');
		} finally {
			setLoading(false);
		}
	};

	const handleSelectPlan = async (plan: Plan) => {
		setSelectedPlan(plan);
		setCreating(true);
		setError(null);
		try {
			const data = await apiRequest('/billing/create-subscription', {
				method: 'POST',
				body: JSON.stringify({ price_id: plan.priceId }),
			});
			if (data.skip_payment) {
				handleSuccess();
				return;
			}
			setClientSecret(data.client_secret);
			setSubscriptionId(data.subscription_id);
		} catch (err: any) {
			setError(err.message || 'Failed to start checkout');
			setSelectedPlan(null);
		} finally {
			setCreating(false);
		}
	};

	const handleSuccess = () => {
		navigate('/app/groups');
	};

	const handleRequestChangePlan = async (plan: Plan) => {
		if (plan.tier === status?.subscription_tier) return;
		setPendingPlan(plan);
		setPreview(null);
		setPreviewLoading(true);
		setError(null);
		try {
			const data = await apiRequest('/billing/preview-change', {
				method: 'POST',
				body: JSON.stringify({ price_id: plan.priceId }),
			}) as { amount_due: number; currency: string; is_charge: boolean; is_credit: boolean };
			setPreview(data);
		} catch (err: any) {
			setError(err.message || 'Failed to load preview');
			setPendingPlan(null);
		} finally {
			setPreviewLoading(false);
		}
	};

	const handleConfirmChangePlan = async () => {
		if (!pendingPlan) return;
		setUpdating(true);
		setError(null);
		try {
			await apiRequest('/billing/update-subscription', {
				method: 'POST',
				body: JSON.stringify({ price_id: pendingPlan.priceId }),
			});
			setPendingPlan(null);
			setPreview(null);
			await loadPlansAndStatus();
		} catch (err: any) {
			setError(err.message || 'Failed to change plan');
		} finally {
			setUpdating(false);
		}
	};

	function formatAmount(cents: number, currency: string): string {
		const amount = Math.abs(cents) / 100;
		const sym = currency.toUpperCase() === 'USD' ? '$' : currency + ' ';
		return sym + amount.toFixed(2);
	}

	if (loading) {
		return (
			<div style={{ padding: '2rem 0' }}>
				<Loading fullHeight />
			</div>
		);
	}

	const hasSubscription = status?.subscription_tier && (status.subscription_status === 'active' || status.subscription_status === 'past_due');

	return (
		<div style={{ padding: '0 0 3rem' }}>
			<Container maxWidth="narrow">
				<div style={{ marginBottom: '1rem' }}>
					<Link to="/app/groups" style={{ color: theme.primary, textDecoration: 'none' }}>
						← Back to Groups
					</Link>
				</div>
				<h1 style={{ color: theme.text, marginBottom: '1.5rem', fontSize: '1.75rem' }}>
					Billing
				</h1>

				{error && (
					<Card style={{ marginBottom: '1.5rem', borderColor: theme.dangerBorder, background: theme.dangerBg }}>
						<p style={{ margin: 0, color: theme.errorText }}>{error}</p>
					</Card>
				)}

				{hasSubscription ? (
					<>
						<Card>
							<p style={{ margin: 0, marginBottom: '1rem' }}>
								You're on the <strong>{status.subscription_tier}</strong> plan.
							</p>
							<Button
								type="button"
								variant="primary"
								onClick={async () => {
									try {
										const data = await apiRequest('/billing/portal', { method: 'POST' });
										if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
									} catch (err: any) {
										setError(err.message || 'Failed to open billing portal');
									}
								}}
							>
								Manage billing
							</Button>
						</Card>
						<h2 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.15rem' }}>
							Change plan
						</h2>
						<p style={{ color: theme.textMuted, marginBottom: '1rem', fontSize: '0.95rem' }}>
							Upgrade or downgrade. Changes are prorated and take effect immediately.
						</p>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							{plans.map((plan) => {
								const isCurrent = plan.tier === status?.subscription_tier;
								return (
									<Card
										key={plan.tier}
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											flexWrap: 'wrap',
											gap: '1rem',
										}}
									>
										<div>
											<h3 style={{ margin: 0, fontSize: '1.1rem' }}>{plan.label}</h3>
											<p style={{ margin: '0.25rem 0 0', color: theme.textMuted, fontSize: '0.95rem' }}>
												{plan.priceDisplay} · {plan.maxGroups} group{plan.maxGroups !== 1 ? 's' : ''}, up to {plan.maxMembersPerGroup} members per group
											</p>
										</div>
										<Button
											type="button"
											variant={isCurrent ? 'default' : 'primary'}
											disabled={isCurrent || updating}
											onClick={() => handleRequestChangePlan(plan)}
											style={isCurrent ? { background: theme.successBg, color: theme.successText, border: `1px solid ${theme.successText}` } : undefined}
										>
											{isCurrent ? 'Current plan' : updating ? 'Updating...' : 'Switch to ' + plan.label}
										</Button>
									</Card>
								);
							})}
						</div>
					</>
				) : clientSecret && subscriptionId ? (
					<Card>
						<h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.15rem' }}>
							Payment details
						</h2>
						<Elements
							stripe={stripePromise}
							options={{
								clientSecret,
								appearance: { theme: 'stripe' },
							}}
						>
							<CheckoutForm
								subscriptionId={subscriptionId}
								onSuccess={handleSuccess}
							/>
						</Elements>
						<p style={{ marginTop: '1rem', fontSize: '0.9rem', color: theme.textMuted }}>
							<button
								type="button"
								onClick={() => {
									setClientSecret(null);
									setSubscriptionId(null);
									setSelectedPlan(null);
								}}
								style={{
									background: 'none',
									border: 'none',
									color: theme.primary,
									textDecoration: 'underline',
									cursor: 'pointer',
									fontSize: 'inherit',
								}}
							>
								Choose a different plan
							</button>
						</p>
					</Card>
				) : (
					<>
						<p style={{ color: theme.textMuted, marginBottom: '1.5rem' }}>
							Subscribe to create groups and send weekly questions.
						</p>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							{plans.map((plan) => (
								<Card
									key={plan.tier}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										flexWrap: 'wrap',
										gap: '1rem',
									}}
								>
									<div>
										<h3 style={{ margin: 0, fontSize: '1.1rem' }}>{plan.label}</h3>
										<p style={{ margin: '0.25rem 0 0', color: theme.textMuted, fontSize: '0.95rem' }}>
											{plan.priceDisplay} · {plan.maxGroups} group{plan.maxGroups !== 1 ? 's' : ''}, up to {plan.maxMembersPerGroup} members per group
										</p>
									</div>
									<Button
										type="button"
										variant="primary"
										disabled={creating}
										onClick={() => handleSelectPlan(plan)}
									>
										{creating ? 'Loading...' : 'Select'}
									</Button>
								</Card>
							))}
						</div>
						{plans.length === 0 && (
							<p style={{ color: theme.textMuted, fontStyle: 'italic' }}>
								No plans available. Contact support.
							</p>
						)}
					</>
				)}

				{/* Confirmation modal for plan change */}
				{pendingPlan && (
					<div
						style={{
							position: 'fixed',
							inset: 0,
							background: 'rgba(0,0,0,0.4)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 1000,
							padding: '1rem',
						}}
						onClick={(e) => {
							if (e.target === e.currentTarget && !updating) {
								setPendingPlan(null);
								setPreview(null);
							}
						}}
					>
						<div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
							<Card
								style={{
									maxWidth: 420,
									width: '100%',
									padding: '1.5rem',
								}}
							>
							<h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem' }}>
								Switch to {pendingPlan.label}?
							</h3>
							{previewLoading ? (
								<p style={{ margin: 0, color: theme.textMuted }}>Loading...</p>
							) : preview ? (
								<>
									{preview.is_charge && (
										<p style={{ margin: 0, marginBottom: '0.75rem', color: theme.text }}>
											You'll be charged <strong>{formatAmount(preview.amount_due, preview.currency)}</strong> now (prorated for the rest of your billing period).
										</p>
									)}
									{preview.is_credit && (
										<p style={{ margin: 0, marginBottom: '0.75rem', color: theme.text }}>
											You're downgrading. You'll receive a proration credit of <strong>{formatAmount(preview.amount_due, preview.currency)}</strong>. The change takes effect immediately; your next invoice will reflect the new rate.
										</p>
									)}
									{!preview.is_charge && !preview.is_credit && (
										<p style={{ margin: 0, marginBottom: '0.75rem', color: theme.text }}>
											No charge or credit. Your plan will change to {pendingPlan.label} immediately.
										</p>
									)}
									<div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
										<Button
											type="button"
											variant="default"
											disabled={updating}
											onClick={() => {
												setPendingPlan(null);
												setPreview(null);
											}}
										>
											Cancel
										</Button>
										<Button
											type="button"
											variant="primary"
											disabled={updating}
											onClick={handleConfirmChangePlan}
										>
											{updating ? 'Updating...' : 'Confirm'}
										</Button>
									</div>
								</>
							) : null}
							</Card>
						</div>
					</div>
				)}
			</Container>
		</div>
	);
}
