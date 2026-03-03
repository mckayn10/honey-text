import { useState } from 'react';
import { Link } from 'react-router-dom';
import { theme } from '../theme';

const baseButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.7rem 1.2rem',
  borderRadius: 10,
  fontWeight: 600,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '1rem',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s, background 0.15s, color 0.15s',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'default';
  size?: 'default' | 'small';
  children: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'default',
  disabled,
  children,
  style = {},
  ...props
}: ButtonProps) {
  const [hover, setHover] = useState(false);

  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          background: theme.primary,
          color: 'white',
          boxShadow: `0 6px 16px ${theme.primaryShadow}`,
          ...(hover && !disabled ? { transform: 'translateY(-1px)' } : {}),
        }
      : variant === 'danger'
        ? {
            background: hover && !disabled ? theme.dangerBg : theme.bg,
            color: theme.danger,
            border: `1px solid ${theme.dangerBorder}`,
          }
        : {};

  const sizeStyle: React.CSSProperties =
    size === 'small'
      ? { padding: '0.5rem 1rem', fontSize: '0.9rem' }
      : {};

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...baseButton,
        ...variantStyle,
        ...sizeStyle,
        ...(disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
        width: style.width ?? 'auto',
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...props}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  to?: string;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: theme.textMuted,
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '0.95rem',
  padding: 0,
  fontFamily: 'inherit',
};

export function ButtonLink({ to, href, onClick, children, style = {}, className }: ButtonLinkProps) {
  const s = { ...linkStyle, ...style };
  if (to) return <Link to={to} style={s} className={className}>{children}</Link>;
  if (href) return <a href={href} style={s} className={className}>{children}</a>;
  return <button type="button" onClick={onClick} style={s} className={className}>{children}</button>;
}
