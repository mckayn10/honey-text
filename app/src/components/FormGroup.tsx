import { theme } from '../theme';

interface FormGroupProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormGroup({ label, htmlFor, children, style = {} }: FormGroupProps) {
  return (
    <div style={{ marginBottom: '1.5rem', ...style }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          color: theme.text,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.9rem',
  border: `1px solid ${theme.borderLight}`,
  borderRadius: 10,
  fontSize: '1rem',
  background: theme.bg,
  fontFamily: 'inherit',
};

export const inputFocusStyle = {
  outline: 'none',
  borderColor: theme.primary,
  boxShadow: `0 0 0 3px ${theme.primaryFocus}`,
};
