import { theme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, style = {} }: CardProps) {
  return (
    <div
      style={{
        background: theme.bg,
        padding: '1.5rem',
        borderRadius: 12,
        marginBottom: '1.5rem',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadowCard,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
