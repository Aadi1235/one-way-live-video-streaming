import { useState, useRef } from 'react';
import { startHostStream } from './HostStream';

export default function Host() {
  const [streamId, setStreamId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState([]); // {id, name}
  const [chat, setChat] = useState([]); // {name, message}
  const videoRef = useRef();

  const createStream = async () => {
    setLoading(true);
    const res = await fetch('https://one-way-live-video-streaming.onrender.com/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setStreamId(data.streamId);
    setLoading(false);

    // Start streaming
    const { stream } = await startHostStream(
      data.streamId,
      (viewerId, name) => {
        setViewers(prev => prev.some(v => v.id === viewerId) ? prev : [...prev, { id: viewerId, name }]);
      },
      (msg) => {
        setChat(prev => [...prev, msg]);
      }
    );
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  return (
    <div>
      <h2>Host a Live Stream</h2>
      {!streamId ? (
        <button onClick={createStream} disabled={loading}>
          {loading ? 'Creating...' : 'Create Stream'}
        </button>
      ) : (
        <div>
          <p>Share this link with viewers:</p>
          <input
            type="text"
            value={window.location.origin + '/view/' + streamId}
            readOnly
            style={{ width: '100%' }}
            onFocus={e => e.target.select()}
          />
          <div style={{ marginTop: 20 }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 600 }} />
            <p style={{ fontSize: '0.9em', color: '#888' }}>This is your local preview.</p>
          </div>
          <div style={{ marginTop: 20 }}>
            <strong>Viewers connected:</strong> {viewers.length}
            {viewers.length > 0 && (
              <ul>
                {viewers.map(v => <li key={v.id}>{v.name || v.id}</li>)}
              </ul>
            )}
          </div>
          {streamId && (
            <div style={{ marginTop: 20 }}>
              <h3>Chat</h3>
              <div style={{ border: '1px solid #ccc', padding: 10, minHeight: 100, maxHeight: 200, overflowY: 'auto', background: '#222' }}>
                {chat.length === 0 && <div style={{ color: '#888' }}>No comments yet.</div>}
                {chat.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <strong style={{ color: '#6cf' }}>{msg.name}:</strong> <span style={{ color: '#fff' }}>{msg.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 