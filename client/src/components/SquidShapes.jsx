export default function SquidShapes({ size = 24, className = '' }) {
  return (
    <span className={`sg-shapes ${className}`} style={{ fontSize: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ verticalAlign: 'middle' }}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      {' '}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ verticalAlign: 'middle' }}>
        <polygon points="12,2 22,22 2,22" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      {' '}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ verticalAlign: 'middle' }}>
        <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}
