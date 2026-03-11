import { useState } from 'react';
import { apiFetch } from '../../api';

export default function EmailSender() {
  const [csvText, setCsvText] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

  const handleBulkCreate = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const lines = csvText.trim().split('\n').filter(l => l.trim());
      const participants = lines.map(line => {
        const [name, email] = line.split(',').map(s => s.trim());
        return { name, email };
      }).filter(p => p.name && p.email);

      if (participants.length === 0) {
        setStatus({ type: 'error', message: 'No valid entries found. Format: name, email' });
        return;
      }

      const result = await apiFetch('/participants/bulk', {
        method: 'POST',
        body: JSON.stringify({ participants }),
      });
      setStatus({ type: 'success', message: `Created ${result.count} participants` });
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
          Paste names and emails, one per line: <code style={{ color: '#aaa' }}>Name, email@example.com</code>
        </p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={10}
          placeholder={"John Doe, john@example.com\nJane Smith, jane@example.com"}
          style={{
            width: '100%', padding: 12, background: '#0f0f1a', border: '1px solid #333',
            borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'monospace', resize: 'vertical',
          }}
        />
        <button onClick={handleBulkCreate} disabled={loading} style={{
          marginTop: 8, padding: '10px 20px', background: 'var(--sg-green)',
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
          STEP 2: SEND REGISTRATION EMAILS
        </h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>
          Sends Squid Game themed emails to all participants who haven't received one yet.
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
