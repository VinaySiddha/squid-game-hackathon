export default function PlayerTile({ participant }) {
  const { player_number, photo_url, is_alive, is_checked_in } = participant;

  const tileStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#111',
    filter: is_checked_in && !is_alive ? 'grayscale(100%)' : 'none',
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: is_checked_in && photo_url ? 'block' : 'none',
  };

  const numberStyle = {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    color: '#fff',
    fontFamily: 'var(--font-number)',
    fontSize: '11px',
    textAlign: 'center',
    lineHeight: 1,
    textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)',
    pointerEvents: 'none',
  };

  const placeholderStyle = {
    display: is_checked_in && photo_url ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: '#111',
    color: '#333',
    fontFamily: 'var(--font-number)',
    fontSize: '14px',
  };

  return (
    <div style={tileStyle}>
      {is_checked_in && photo_url ? (
        <img src={photo_url} alt={`Player ${player_number}`} style={imgStyle} loading="lazy" />
      ) : (
        <div style={placeholderStyle}>{player_number}</div>
      )}
      <div style={numberStyle}>{player_number}</div>
    </div>
  );
}
