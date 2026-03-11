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
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.7)',
    color: is_alive ? '#0B6E4F' : '#ff0040',
    fontFamily: 'var(--font-number)',
    fontSize: '10px',
    textAlign: 'center',
    padding: '1px 0',
    lineHeight: 1,
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

  const eliminatedOverlay = is_checked_in && !is_alive ? (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 0, 64, 0.15)',
      color: '#ff0040',
      fontSize: '28px',
      fontWeight: 'bold',
      pointerEvents: 'none',
    }}>
      ✕
    </div>
  ) : null;

  return (
    <div style={tileStyle}>
      {is_checked_in && photo_url ? (
        <img src={photo_url} alt={`Player ${player_number}`} style={imgStyle} loading="lazy" />
      ) : (
        <div style={placeholderStyle}>{player_number}</div>
      )}
      {eliminatedOverlay}
      <div style={numberStyle}>{player_number}</div>
    </div>
  );
}
