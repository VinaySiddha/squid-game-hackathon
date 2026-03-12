import { useState } from 'react';
import { apiFetch } from '../../api';

export default function EmailSender() {
  const [csvText, setCsvText] = useState('');
  const [isLeader, setIsLeader] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

  const handleBulkCreate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const lines = csvText.trim().split('\n').filter(l => l.trim());
      const participants = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length >= 3) {
          return { player_number: parts[0], name: parts[1], email: parts[2] };
        }
        return null;
      }).filter(p => p && p.player_number && p.name && p.email);

      if (participants.length === 0) {
        setStatus({ type: 'error', message: 'No valid entries found. Format: player_number, name, email' });
        return;
      }

      const result = await apiFetch('/participants/bulk', {
        method: 'POST',
        body: JSON.stringify({ participants, isLeader }),
      });
      setStatus({
        type: 'success',
        message: `Created ${result.count} participants${isLeader ? ' (Team Leaders with registration links)' : ' (Regular — invitation only)'}`,
      });
      setCsvText('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    setLoading(true);
    setSendStatus(null);
    try {
      const result = await apiFetch('/emails/send', { method: 'POST' });
      setSendStatus({ type: 'success', message: `Sent: ${result.sent}, Failed: ${result.failed}` });
    } catch (err) {
      setSendStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>SEND EMAILS</h1>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--sg-pink)', fontSize: 13, letterSpacing: 2, marginBottom: 8 }}>
          STEP 1: CREATE PARTICIPANTS
        </h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
          Paste data, one per line: <code style={{ color: '#aaa' }}>player_number, name, email</code>
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={10}
          placeholder={"001, John Doe, john@example.com\n002, Jane Smith, jane@example.com\n003, Bob Wilson, bob@example.com"}
          style={{
            width: '100%', padding: 12, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'monospace', resize: 'vertical',
          }}
        />

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 10,
          color: '#e0e0e0', fontSize: 13, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={isLeader}
            onChange={(e) => setIsLeader(e.target.checked)}
            style={{ accentColor: 'var(--sg-pink)', width: 16, height: 16 }}
          />
          <span>
            These are <strong style={{ color: 'var(--sg-pink)' }}>Team Leaders</strong> — they will receive a registration form link to fill in their team details
          </span>
        </label>

        <p style={{ color: '#666', fontSize: 11, marginBottom: 10 }}>
          {isLeader
            ? '✓ Leaders will get a unique registration link in their email to register their team (team name + up to 4 members).'
            : '✓ Regular participants will get a "You Have Been Chosen" invitation email with their player number (no registration link).'}
        </p>

        <button onClick={handleBulkCreate} disabled={loading} style={{
          padding: '10px 20px', background: 'var(--sg-green)',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
        }}>
          CREATE PARTICIPANTS
        </button>
        {status && (
          <p style={{
            marginTop: 8, padding: 10, borderRadius: 6, fontSize: 13,
            background: status.type === 'success' ? 'var(--sg-green-dim)' : 'var(--sg-red-dim)',
            color: status.type === 'success' ? 'var(--sg-green-bright)' : 'var(--sg-red)',
          }}>{status.message}</p>
        )}
      </div>

      <div>
        <h3 style={{ color: 'var(--sg-pink)', fontSize: 13, letterSpacing: 2, marginBottom: 8 }}>
          STEP 2: SEND EMAILS
        </h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
          Sends Squid Game themed emails to all participants who haven't received one yet.<br />
          <span style={{ color: '#666' }}>
            Leaders → invitation + registration link &nbsp;|&nbsp; Others → invitation only
          </span>
        </p>
        <button onClick={handleSendEmails} disabled={loading} style={{
          padding: '10px 20px', background: 'var(--sg-pink)',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, letterSpacing: 2,
        }}>
          SEND EMAILS
        </button>
        {sendStatus && (
          <p style={{
            marginTop: 8, padding: 10, borderRadius: 6, fontSize: 13,
            background: sendStatus.type === 'success' ? 'var(--sg-green-dim)' : 'var(--sg-red-dim)',
            color: sendStatus.type === 'success' ? 'var(--sg-green-bright)' : 'var(--sg-red)',
          }}>{sendStatus.message}</p>
        )}
      </div>
    </div>
  );
}
