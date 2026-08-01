import { theme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, style = {} }: CardProps) {
  return (
    <div
      style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: 18,
        marginBottom: '1.5rem',
        border: `1px solid ${theme.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
