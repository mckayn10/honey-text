import { containerWidths } from '../theme';

type WidthKey = keyof typeof containerWidths;

interface ContainerProps {
  children: React.ReactNode;
  /** 'wide' 1200 | 'default' 960 | 'form' 720 | 'narrow' 600 | 'auth' 400 | 'invite' 500 */
  maxWidth?: WidthKey | number;
  style?: React.CSSProperties;
}

export function Container({ children, maxWidth = 'wide', style = {} }: ContainerProps) {
  const width =
    typeof maxWidth === 'string' ? containerWidths[maxWidth] : maxWidth;
  return (
    <div
      style={{
        maxWidth: width,
        margin: '0 auto',
        padding: '0 2rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
