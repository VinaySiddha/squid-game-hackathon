import { useNavigate } from 'react-router-dom';
import SquidShapes from '../components/SquidShapes';
import './Levels.css';

const levels = [
  {
    number: 1,
    title: 'Red Light, Green Light',
    subtitle: 'Type the passage, but only during green light',
    icon: '🚦',
    color: '#E91E7B',
  },
  {
    number: 2,
    title: 'Disappearing Text',
    subtitle: 'Type fast before the words vanish',
    icon: '👻',
    color: '#c9a84c',
  },
  {
    number: 3,
    title: 'Tug of War',
    subtitle: 'Type to survive — the rope is pulling you down',
    icon: '🪢',
    color: '#067a52',
  },
  {
    number: 4,
    title: 'Glass Bridge',
    subtitle: 'Choose the right panel or fall',
    icon: '🌉',
    color: '#4a90d9',
  },
];

export default function Levels() {
  const navigate = useNavigate();

  return (
    <div className="levels-page">
      <div className="levels-bg" />

      <div className="levels-header">
        <SquidShapes size={28} />
        <h1 className="levels-title">SQUID GAME</h1>
        <p className="levels-subtitle">HACKATHON 2026</p>
        <div className="levels-line" />
      </div>

      <div className="levels-grid">
        {levels.map((level) => (
          <div
            key={level.number}
            className="level-card"
            style={{ '--level-color': level.color }}
            onClick={() => navigate(`/level/${level.number}`)}
          >
            <div className="level-card-glow" />
            <div className="level-number">
              <span>{String(level.number).padStart(2, '0')}</span>
            </div>
            <div className="level-icon">{level.icon}</div>
            <h2 className="level-title">{level.title}</h2>
            <p className="level-subtitle">{level.subtitle}</p>
            <div className="level-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
