import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function generateViewerId() {
  return crypto.randomUUID();
}

export default function ViewerJoin() {
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    let streamId = input.trim();
    // If a full URL is pasted, extract the streamId
    const match = streamId.match(/\/view\/([a-zA-Z0-9]+)/);
    if (match) streamId = match[1];
    if (streamId && name.trim()) {
      const viewerId = generateViewerId();
      navigate(`/view/${streamId}`, { state: { viewerId, name: name.trim() } });
    }
  };

  return (
    <div>
      <h2>Join a Live Stream</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Paste stream link or ID"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: '80%', maxWidth: 400 }}
        />
        <br />
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '80%', maxWidth: 400, marginTop: 8 }}
        />
        <br />
        <button type="submit" style={{ marginTop: 8 }}>Join</button>
      </form>
    </div>
  );
} 