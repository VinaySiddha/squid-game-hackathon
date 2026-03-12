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
import './Admin.css';

const sections = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'checkin', label: 'Check-in Station' },
  { key: 'players', label: 'Players' },
  { key: 'teams', label: 'Teams' },
  { key: 'emails', label: 'Send Emails' },
  { key: 'timer', label: 'Timer' },
  { key: 'audio', label: 'Audio' },
  { key: 'announce', label: 'Announce Winner' },
  { key: 'settings', label: 'Settings' },
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
      default: return null;
    }
  };

  return (
    <div className="admin-layout">
      <button className="admin-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✕' : '☰'}
      </button>
      <div className={`admin-sidebar-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <nav className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
        <h2>◯ △ ▢ ADMIN</h2>
        {sections.map(s => (
          <button key={s.key} className={active === s.key ? 'active' : ''} onClick={() => handleNav(s.key)}>
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
