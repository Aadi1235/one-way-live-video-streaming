import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { startViewerStream } from './ViewerStream';

export default function Viewer() {
  const { streamId } = useParams();
  const location = useLocation();
  const videoRef = useRef();
  const viewerId = location.state && location.state.viewerId;
  const name = location.state && location.state.name;
  const [videoState, setVideoState] = useState('paused');
  const startedRef = useRef(false);
  const cleanupRef = useRef(null);
  const [chatInput, setChatInput] = useState('');
  const [chat, setChat] = useState([]); // {name, message}
  const socketRef = useRef(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (viewerId && name) {
      startViewerStream(streamId, viewerId, name, (remoteStream) => {
        if (videoRef.current) {
          console.log('[Viewer] Setting video srcObject', remoteStream);
          console.log('[Viewer] Remote stream tracks:', remoteStream.getTracks());
          const tracks = remoteStream.getVideoTracks();
          if (tracks.length > 0) {
            console.log('[Viewer] Video track settings:', tracks[0].getSettings());
            console.log('[Viewer] Video track readyState:', tracks[0].readyState);
          } else {
            console.log('[Viewer] No video tracks found');
          }
          videoRef.current.srcObject = remoteStream;
          // Add event listeners for debugging
          videoRef.current.onplay = () => { console.log('[Viewer] Video element playing'); setVideoState('playing'); };
          videoRef.current.onpause = () => { console.log('[Viewer] Video element paused'); setVideoState('paused'); };
          videoRef.current.onerror = (e) => { console.error('[Viewer] Video element error', e); setVideoState('error'); };
          videoRef.current.onwaiting = () => { console.log('[Viewer] Video element waiting'); };
          videoRef.current.oncanplay = () => { console.log('[Viewer] Video element can play'); };
          // Try to force play
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().then(() => {
                console.log('[Viewer] videoRef.current.play() succeeded');
              }).catch(err => {
                console.error('[Viewer] videoRef.current.play() failed', err);
              });
            }
          }, 100);
        } else {
          console.log('[Viewer] videoRef.current is null');
        }
      }).then(({ socket }) => {
        cleanupRef.current = () => {
          socket.disconnect();
          startedRef.current = false;
        };
        socketRef.current = socket;
        // Listen for chat messages (optional, for echo)
        socket.on('chat-message', (msg) => {
          setChat(prev => [...prev, msg]);
        });
      });
    }
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
    // eslint-disable-next-line
  }, [streamId, viewerId, name]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (socketRef.current) {
      socketRef.current.emit('chat-message', { streamId, name, message: chatInput.trim() });
      setChatInput('');
    }
  };

  return (
    <div>
      <h2>Viewing Stream: {streamId}</h2>
      <div id="video-container">
        {/* Video will appear here */}
        <video ref={videoRef} autoPlay playsInline muted={true} controls={true} style={{ width: '100%', maxWidth: 600 }} />
        {videoState !== 'playing' && (
          <div style={{ color: 'red', marginTop: 10 }}>
            Video is not playing. Check browser autoplay settings or click play.
          </div>
        )}
      </div>
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
        <form onSubmit={handleChatSubmit} style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Type a comment..."
            style={{ flex: 1, padding: 6 }}
          />
          <button type="submit" style={{ padding: '6px 16px' }}>Send</button>
        </form>
      </div>
    </div>
  );
} 