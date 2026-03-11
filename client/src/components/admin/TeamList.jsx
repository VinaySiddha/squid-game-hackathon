import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

export default function TeamList() {
  const [teams, setTeams] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const fetchTeams = async () => {
    try {
      const data = await apiFetch('/teams');
      setTeams(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTeams(); }, []);

  const deleteTeam = async (id) => {
    if (!confirm('Delete this team?')) return;
    try {
      await apiFetch(`/teams/${id}`, { method: 'DELETE' });
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>TEAMS ({teams.length})</h1>
      {teams.map(team => (
        <div key={team.id} style={{
          background: '#1a1a2e', border: '1px solid #333', borderRadius: 8,
          padding: 16, marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: 'var(--sg-pink)', fontFamily: 'var(--font-number)', fontSize: 14 }}>
                {team.team_name}
              </strong>
              <span style={{ color: '#888', fontSize: 12, marginLeft: 12 }}>
                Leader: {team.leader_name} ({team.leader_number})
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setExpanded(expanded === team.id ? null : team.id)} style={{
                padding: '6px 12px', background: 'none', border: '1px solid #444',
                color: '#ccc', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}>
                {expanded === team.id ? 'HIDE' : 'VIEW'}
              </button>
              <button onClick={() => deleteTeam(team.id)} style={{
                padding: '6px 12px', background: 'var(--sg-red-dim)',
                color: 'var(--sg-red)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}>
                DELETE
              </button>
            </div>
          </div>
          {expanded === team.id && team.members && (
            <table style={{ width: '100%', marginTop: 12, fontSize: 12, color: '#ccc', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Role</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Name</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Player #</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Dept</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Roll</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Section</th>
                </tr>
              </thead>
              <tbody>
                {team.members.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: 6, color: m.role === 'leader' ? 'var(--sg-gold)' : '#ccc' }}>{m.role}</td>
                    <td style={{ padding: 6 }}>{m.name}</td>
                    <td style={{ padding: 6, fontFamily: 'var(--font-number)' }}>{m.player_number || '---'}</td>
                    <td style={{ padding: 6 }}>{m.department}</td>
                    <td style={{ padding: 6 }}>{m.roll_number}</td>
                    <td style={{ padding: 6 }}>{m.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
