import { containerWidths } from '../theme';

type WidthKey = keyof typeof containerWidths;

interface ContainerProps {
  children: React.ReactNode;
  /** 'wide' 1200 | 'default' 960 | 'form' 720 | 'narrow' 600 | 'auth' 400 | 'invite' 500 */
  maxWidth?: WidthKey | number;
  /** 'center' (default, for full-width pages like Landing) | 'left' (for sidebar app pages) */
  align?: 'center' | 'left';
  style?: React.CSSProperties;
}

export function Container({ children, maxWidth = 'wide', align = 'center', style = {} }: ContainerProps) {
  const width =
    typeof maxWidth === 'string' ? containerWidths[maxWidth] : maxWidth;
  return (
    <div
      style={{
        maxWidth: width,
        margin: align === 'center' ? '0 auto' : '0',
        padding: align === 'center' ? '0 2rem' : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
