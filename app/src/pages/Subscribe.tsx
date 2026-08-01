import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiRequest } from '../lib/api';
import { Container, Button, Card, Loading } from '../components';
import { theme } from '../theme';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
/** Must match TRIAL_PERIOD_DAYS in api/src/lib/subscriptionConfig.ts */
const TRIAL_PERIOD_DAYS_DISPLAY = 14;

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
	trial_end: string | null;
}

function CheckoutForm({
	subscriptionId,
	mode,
	onSuccess,
}: {
	subscriptionId: string;
	mode: 'setup' | 'payment';
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
			const { error: confirmError } =
				mode === 'setup'
					? await stripe.confirmSetup({ elements, confirmParams: { return_url: returnUrl } })
					: await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });
			if (confirmError) {
				setError(confirmError.message || (mode === 'setup' ? 'Could not save card' : 'Payment failed'));
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
				<Button type="submit" variant="primary" disabled={!stripe || loading} style={{ borderRadius: 999 }}>
					{loading ? 'Processing...' : mode === 'setup' ? 'Start free trial' : 'Subscribe'}
				</Button>
			</div>
		</form>
	);
}

function PlanCard({
	plan,
	isCurrent,
	disabled,
	busyLabel,
	onSelect,
}: {
	plan: Plan;
	isCurrent: boolean;
	disabled: boolean;
	busyLabel?: string;
	onSelect: () => void;
}) {
	return (
		<div
			style={{
				background: 'white',
				border: `2px solid ${isCurrent ? theme.primary : theme.border}`,
				borderRadius: 18,
				padding: 22,
				display: 'flex',
				flexDirection: 'column',
				gap: 14,
			}}
		>
			<div>
				<p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.text }}>{plan.label}</p>
				<p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: theme.text }}>{plan.priceDisplay}</p>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				<span style={{ fontSize: 13, color: theme.textMuted }}>
					{plan.maxGroups} group{plan.maxGroups !== 1 ? 's' : ''}
				</span>
				<span style={{ fontSize: 13, color: theme.textMuted }}>
					Up to {plan.maxMembersPerGroup} members per group
				</span>
			</div>
			<Button
				type="button"
				disabled={isCurrent || disabled}
				onClick={onSelect}
				style={{
					marginTop: 'auto',
					borderRadius: 999,
					padding: '10px 18px',
					fontSize: '13.5px',
					width: 'auto',
					...(isCurrent
						? { background: theme.successBg, color: theme.successText, border: `1px solid ${theme.successText}` }
						: { background: theme.primary, color: 'white', border: 'none' }),
				}}
			>
				{isCurrent ? 'Current plan' : busyLabel ?? 'Switch to ' + plan.label}
			</Button>
		</div>
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
	const [intentType, setIntentType] = useState<'setup' | 'payment'>('payment');
	const [creating, setCreating] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
	const [preview, setPreview] = useState<{ amount_due: number; currency: string; is_charge: boolean; is_credit: boolean } | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [promoCode, setPromoCode] = useState('');
	const [redeemingPromo, setRedeemingPromo] = useState(false);
	const [promoError, setPromoError] = useState<string | null>(null);

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
			setIntentType(data.intent_type === 'setup' ? 'setup' : 'payment');
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

	const handleRedeemPromo = async (e: React.FormEvent) => {
		e.preventDefault();
		setRedeemingPromo(true);
		setPromoError(null);
		try {
			await apiRequest('/billing/redeem-promo', {
				method: 'POST',
				body: JSON.stringify({ code: promoCode }),
			});
			setPromoCode('');
			await loadPlansAndStatus();
		} catch (err: any) {
			setPromoError(err.message || 'Failed to redeem code');
		} finally {
			setRedeemingPromo(false);
		}
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

	const isBeta = status?.subscription_tier === 'beta';
	const hasSubscription =
		!!status?.subscription_tier &&
		(status.subscription_status === 'active' || status.subscription_status === 'past_due' || status.subscription_status === 'trialing');
	const currentPlan = plans.find((p) => p.tier === status?.subscription_tier);
	const trialDaysLeft =
		status?.subscription_status === 'trialing' && status.trial_end
			? Math.max(0, Math.ceil((new Date(status.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
			: null;

	return (
		<div>
			<Container maxWidth="default">
				<h1 style={{ color: theme.text, margin: '0 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
					Billing
				</h1>
				<p style={{ color: theme.textLight, fontSize: 14, margin: '0 0 28px' }}>
					Manage your plan and payment details
				</p>

				{error && (
					<Card style={{ marginBottom: '1.5rem', borderColor: theme.dangerBorder, background: theme.dangerBg }}>
						<p style={{ margin: 0, color: theme.errorText }}>{error}</p>
					</Card>
				)}

				{isBeta ? (
					<div
						style={{
							background: 'white',
							border: `1px solid ${theme.border}`,
							borderRadius: 18,
							padding: 24,
						}}
					>
						<span
							style={{
								display: 'inline-block',
								fontSize: 11,
								fontWeight: 800,
								color: theme.successText,
								background: theme.successBg,
								padding: '4px 10px',
								borderRadius: 999,
								marginBottom: 8,
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
							}}
						>
							Beta access
						</span>
						<p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: theme.text }}>
							Full access, on us
						</p>
						<p style={{ margin: '6px 0 0', fontSize: 14, color: theme.textMuted, lineHeight: 1.6 }}>
							You redeemed a beta code, so your account has unlimited groups and members with no subscription or charge.
						</p>
					</div>
				) : hasSubscription ? (
					<>
						{trialDaysLeft !== null && (
							<div
								style={{
									background: theme.primaryBg,
									border: `1px solid ${theme.border}`,
									borderRadius: 14,
									padding: '12px 18px',
									marginBottom: 20,
									fontSize: 14,
									color: theme.text,
								}}
							>
								<strong>Free trial</strong> — {trialDaysLeft === 0 ? 'ends today' : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`}. Your card will be charged automatically when it ends.
							</div>
						)}
						<div
							style={{
								background: 'white',
								border: `1px solid ${theme.border}`,
								borderRadius: 18,
								padding: 24,
								marginBottom: 32,
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								flexWrap: 'wrap',
								gap: 16,
							}}
						>
							<div>
								<span
									style={{
										display: 'inline-block',
										fontSize: 11,
										fontWeight: 800,
										color: theme.successText,
										background: theme.successBg,
										padding: '4px 10px',
										borderRadius: 999,
										marginBottom: 8,
										textTransform: 'uppercase',
										letterSpacing: '0.04em',
									}}
								>
									Current plan
								</span>
								<p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: theme.text }}>
									{currentPlan?.label ?? status?.subscription_tier} · {currentPlan?.priceDisplay ?? ''}
								</p>
							</div>
							<Button
								type="button"
								onClick={async () => {
									try {
										const data = await apiRequest('/billing/portal', { method: 'POST' });
										if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
									} catch (err: any) {
										setError(err.message || 'Failed to open billing portal');
									}
								}}
								style={{ borderRadius: 999, padding: '11px 22px', width: 'auto' }}
							>
								Manage billing
							</Button>
						</div>

						<p style={{ color: theme.textLight, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
							Change plan
						</p>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
							{plans.map((plan) => (
								<PlanCard
									key={plan.tier}
									plan={plan}
									isCurrent={plan.tier === status?.subscription_tier}
									disabled={updating}
									busyLabel={updating ? 'Updating...' : undefined}
									onSelect={() => handleRequestChangePlan(plan)}
								/>
							))}
						</div>
					</>
				) : clientSecret && subscriptionId ? (
					<Card>
						<h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.15rem' }}>
							{intentType === 'setup' ? 'Start your 14-day free trial' : 'Payment details'}
						</h2>
						{intentType === 'setup' && (
							<p style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem', color: theme.textMuted }}>
								We'll save your card now but won't charge it until the trial ends in {TRIAL_PERIOD_DAYS_DISPLAY} days. Cancel any time before then from Billing.
							</p>
						)}
						<Elements
							stripe={stripePromise}
							options={{
								clientSecret,
								appearance: { theme: 'stripe' },
							}}
						>
							<CheckoutForm
								subscriptionId={subscriptionId}
								mode={intentType}
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
							Subscribe to create groups and send weekly questions. Every plan includes a 14-day free trial — you won't be charged until it ends.
						</p>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
							{plans.map((plan) => (
								<PlanCard
									key={plan.tier}
									plan={plan}
									isCurrent={false}
									disabled={creating}
									busyLabel={creating ? 'Loading...' : 'Select'}
									onSelect={() => handleSelectPlan(plan)}
								/>
							))}
						</div>
						{plans.length === 0 && (
							<p style={{ color: theme.textMuted, fontStyle: 'italic' }}>
								No plans available. Contact support.
							</p>
						)}

						<div
							style={{
								marginTop: 28,
								background: 'white',
								border: `1px solid ${theme.border}`,
								borderRadius: 18,
								padding: 22,
							}}
						>
							<h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: theme.text }}>
								Have a beta code?
							</h2>
							<p style={{ margin: '0 0 14px', fontSize: 13.5, color: theme.textMuted }}>
								Redeem it for full access with no subscription or charge.
							</p>
							<form onSubmit={handleRedeemPromo} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
								<input
									type="text"
									value={promoCode}
									onChange={(e) => setPromoCode(e.target.value)}
									placeholder="Enter code"
									required
									style={{
										flex: '1 1 200px',
										padding: '10px 14px',
										border: `1px solid ${theme.border}`,
										borderRadius: 999,
										fontSize: 14,
										fontFamily: 'inherit',
										background: theme.bg,
									}}
								/>
								<Button
									type="submit"
									variant="primary"
									disabled={redeemingPromo || !promoCode.trim()}
									style={{ borderRadius: 999, padding: '10px 22px', width: 'auto' }}
								>
									{redeemingPromo ? 'Redeeming...' : 'Redeem'}
								</Button>
							</form>
							{promoError && (
								<p style={{ margin: '10px 0 0', color: theme.errorText, fontSize: 13.5 }}>{promoError}</p>
							)}
						</div>
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
