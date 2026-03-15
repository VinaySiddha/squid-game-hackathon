import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/admin/Dashboard';
import CheckinStation from '../components/admin/CheckinStation';
import PlayerList from '../components/admin/PlayerList';
import TeamList from '../components/admin/TeamList';
import EmailSender from '../components/admin/EmailSender';
import TimerControls from '../components/admin/TimerControls';
import AudioControls from '../components/admin/AudioControls';
import AnnounceWinner from '../components/admin/AnnounceWinner';
import Settings from '../components/admin/Settings';
import Level1Controls from '../components/admin/Level1Controls';
import Level2Controls from '../components/admin/Level2Controls';
import Level3Controls from '../components/admin/Level3Controls';
import Level4Controls from '../components/admin/Level4Controls';
import './Admin.css';

const sections = [
  { key: 'dashboard', label: 'Dashboard', group: 'general' },
  { key: 'checkin', label: 'Check-in Station', group: 'general' },
  { key: 'players', label: 'Players', group: 'general' },
  { key: 'teams', label: 'Teams', group: 'general' },
  { key: 'emails', label: 'Send Emails', group: 'general' },
  { key: 'timer', label: 'Timer', group: 'general' },
  { key: 'audio', label: 'Audio', group: 'general' },
  { key: 'announce', label: 'Announce Winner', group: 'general' },
  { key: 'settings', label: 'Settings', group: 'general' },
  { key: 'level1', label: 'Level 1: RLGL', group: 'games', color: '#E91E7B' },
  { key: 'level2', label: 'Level 2: Disappearing', group: 'games', color: '#d4a03c' },
  { key: 'level3', label: 'Level 3: Tug of War', group: 'games', color: '#067a52' },
  { key: 'level4', label: 'Level 4: Glass Bridge', group: 'games', color: '#4a90d9' },
];

export default function Admin() {
  const [active, setActive] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleNav = (key) => {
    setActive(key);
    setMenuOpen(false);
  };

  const renderSection = () => {
    switch (active) {
      case 'dashboard': return <Dashboard />;
      case 'checkin': return <CheckinStation />;
      case 'players': return <PlayerList />;
      case 'teams': return <TeamList />;
      case 'emails': return <EmailSender />;
      case 'timer': return <TimerControls />;
      case 'audio': return <AudioControls />;
      case 'announce': return <AnnounceWinner />;
      case 'settings': return <Settings />;
      case 'level1': return <Level1Controls />;
      case 'level2': return <Level2Controls />;
      case 'level3': return <Level3Controls />;
      case 'level4': return <Level4Controls />;
      default: return null;
    }
  };

  const generalSections = sections.filter(s => s.group === 'general');
  const gameSections = sections.filter(s => s.group === 'games');

  return (
    <div className="admin-layout">
      <button className="admin-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✕' : '☰'}
      </button>
      <div className={`admin-sidebar-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <nav className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <h2>◯ △ ▢ ADMIN</h2>
        {generalSections.map(s => (
          <button key={s.key} className={active === s.key ? 'active' : ''} onClick={() => handleNav(s.key)}>
            {s.label}
          </button>
        ))}
        <div className="admin-sidebar-divider" />
        <p className="admin-sidebar-group-label">GAME COMMAND CENTERS</p>
        {gameSections.map(s => (
          <button
            key={s.key}
            className={active === s.key ? 'active' : ''}
            onClick={() => handleNav(s.key)}
            style={active === s.key ? { borderLeftColor: s.color, color: s.color, background: `${s.color}18` } : {}}
          >
            {s.label}
          </button>
        ))}
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </nav>
      <main className="admin-content">
        {renderSection()}
      </main>
    </div>
  );
}
