import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SquidShapes from '../components/SquidShapes';
import './Register.css';

const emptyMember = { name: '', email: '', department: '', roll_number: '', year: '', section: '', contact_number: '' };

export default function Register() {
  const { token } = useParams();
  const [leader, setLeader] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState([
    { ...emptyMember, role: 'leader' },
    { ...emptyMember, role: 'member' },
    { ...emptyMember, role: 'member' },
    { ...emptyMember, role: 'member' },
  ]);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/register/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          return;
        }
        setLeader(data.leader);
        setMembers(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], name: data.leader.name, email: data.leader.email };
          return updated;
        });
      } catch {
        setError('Failed to validate registration link');
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  const updateMember = (index, field, value) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }
    if (!members[0].name.trim()) {
      setError('Leader name is required');
      return;
    }

    setLoading(true);
    setError('');

    const validMembers = members.filter((m, i) => i === 0 || m.name.trim());

    try {
      const res = await fetch(`/api/register/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName, members: validMembers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="register-page">
        <div style={{ color: '#888', fontSize: 18 }}>Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="register-page">
        <div className="register-card" style={{ textAlign: 'center' }}>
          <SquidShapes size={32} />
          <h1 style={{ fontFamily: 'var(--font-number)', color: 'var(--sg-green-bright)', fontSize: 28, margin: '20px 0' }}>
            REGISTERED
          </h1>
          <p style={{ color: '#888' }}>Your team has been registered. See you at the game.</p>
        </div>
      </div>
    );
  }

  if (error && !leader) {
    return (
      <div className="register-page">
        <div className="register-card" style={{ textAlign: 'center' }}>
          <SquidShapes size={32} />
          <h1 style={{ fontFamily: 'var(--font-number)', color: 'var(--sg-red)', fontSize: 22, margin: '20px 0' }}>
            ACCESS DENIED
          </h1>
          <p style={{ color: '#888' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <div className="register-header">
          <SquidShapes size={28} />
          <h1>TEAM REGISTRATION</h1>
          {leader && <div className="player-num">{leader.player_number}</div>}
        </div>

        {error && <p style={{ color: 'var(--sg-red)', textAlign: 'center', marginBottom: 16 }}>{error}</p>}

        <div className="register-field" style={{ marginBottom: 20 }}>
          <label>TEAM NAME</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Enter team name" required />
        </div>

        {members.map((member, i) => (
          <div key={i} className="member-section">
            <h3>{i === 0 ? 'TEAM LEADER' : `MEMBER ${i + 1}`} {i > 0 ? '(optional)' : ''}</h3>
            <div className="register-grid">
              <div className="register-field">
                <label>NAME</label>
                <input value={member.name} onChange={(e) => updateMember(i, 'name', e.target.value)}
                  required={i === 0} placeholder="Full name" />
              </div>
              <div className="register-field">
                <label>EMAIL</label>
                <input type="email" value={member.email} onChange={(e) => updateMember(i, 'email', e.target.value)}
                  required={i === 0} placeholder="email@example.com" />
              </div>
              <div className="register-field">
                <label>DEPARTMENT</label>
                <input value={member.department} onChange={(e) => updateMember(i, 'department', e.target.value)} placeholder="CSE, ECE, etc." />
              </div>
              <div className="register-field">
                <label>ROLL NUMBER</label>
                <input value={member.roll_number} onChange={(e) => updateMember(i, 'roll_number', e.target.value)} placeholder="22B01A0501" />
              </div>
              <div className="register-field">
                <label>YEAR</label>
                <input value={member.year} onChange={(e) => updateMember(i, 'year', e.target.value)} placeholder="2nd, 3rd, etc." />
              </div>
              <div className="register-field">
                <label>SECTION</label>
                <input value={member.section} onChange={(e) => updateMember(i, 'section', e.target.value)} placeholder="A, B, C" />
              </div>
              <div className="register-field">
                <label>CONTACT NUMBER</label>
                <input value={member.contact_number} onChange={(e) => updateMember(i, 'contact_number', e.target.value)} placeholder="9876543210" />
              </div>
            </div>
          </div>
        ))}

        <button type="submit" className="register-submit" disabled={loading}>
          {loading ? 'SUBMITTING...' : 'SUBMIT REGISTRATION'}
        </button>
      </form>
    </div>
  );
}
