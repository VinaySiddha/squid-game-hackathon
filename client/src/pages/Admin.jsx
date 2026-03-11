import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckinStation from '../components/admin/CheckinStation';
import PlayerList from '../components/admin/PlayerList';
import TeamList from '../components/admin/TeamList';
import EmailSender from '../components/admin/EmailSender';
import TimerControls from '../components/admin/TimerControls';
import AudioControls from '../components/admin/AudioControls';
import './Admin.css';

const sections = [
  { key: 'checkin', label: 'Check-in Station' },
  { key: 'players', label: 'Players' },
  { key: 'teams', label: 'Teams' },
  { key: 'emails', label: 'Send Emails' },
  { key: 'timer', label: 'Timer' },
  { key: 'audio', label: 'Audio' },
];

export default function Admin() {
  const [active, setActive] = useState('checkin');
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

  const renderSection = () => {
    switch (active) {
      case 'checkin': return <CheckinStation />;
      case 'players': return <PlayerList />;
      case 'teams': return <TeamList />;
      case 'emails': return <EmailSender />;
      case 'timer': return <TimerControls />;
      case 'audio': return <AudioControls />;
      default: return null;
    }
  };

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar">
        <h2>◯ △ ▢ ADMIN</h2>
        {sections.map(s => (
          <button key={s.key} className={active === s.key ? 'active' : ''} onClick={() => setActive(s.key)}>
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
