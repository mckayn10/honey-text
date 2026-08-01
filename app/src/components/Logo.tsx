import { useId } from 'react';
import { theme } from '../theme';

const HEX_PATH =
	'M 41.34 9.0 Q 50.0 4.0 58.66 9.0 L 81.18 22.0 Q 89.84 27.0 89.84 37.0 L 89.84 63.0 Q 89.84 73.0 81.18 78.0 L 58.66 91.0 Q 50.0 96.0 41.34 91.0 L 18.82 78.0 Q 10.16 73.0 10.16 63.0 L 10.16 37.0 Q 10.16 27.0 18.82 22.0 Z';

interface LogoProps {
	/** Icon height in px; wordmark font-size scales proportionally */
	size?: number;
	style?: React.CSSProperties;
}

export function Logo({ size = 26, style = {} }: LogoProps) {
	const gradientId = `logo-hex-gradient-${useId()}`;
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: size * 0.4, ...style }}>
			<svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
				<defs>
					<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor={theme.gradientTop} />
						<stop offset="100%" stopColor={theme.gradientBottom} />
					</linearGradient>
				</defs>
				<path d={HEX_PATH} fill={`url(#${gradientId})`} />
			</svg>
			<span style={{ fontWeight: 800, fontSize: size * 0.85, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
				<span style={{ color: theme.text }}>honey</span>
				<span style={{ color: theme.primary }}>text</span>
			</span>
		</div>
	);
}
