interface LoadingProps {
  /** Optional message below the spinner */
  message?: string;
  /** Use full height to center in available space */
  fullHeight?: boolean;
}

export function Loading({ message, fullHeight = false }: LoadingProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: message ? '1rem' : 0,
        padding: '2rem',
        minHeight: fullHeight ? '60vh' : undefined,
      }}
    >
      <div className="loading-spinner" />
      {message && (
        <span style={{ color: '#666', fontSize: '0.95rem' }}>{message}</span>
      )}
    </div>
  );
}
