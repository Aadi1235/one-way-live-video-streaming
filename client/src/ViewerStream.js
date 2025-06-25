import io from 'socket.io-client';

export async function startViewerStream(streamId, viewerId, name, onStream) {
  // Always create a new socket for each viewer session
  const socket = io('https://one-way-live-video-streaming.onrender.com');
  socket.on('connect', () => {
    console.log('[ViewerStream] Socket connected with id:', socket.id);
  });
  socket.emit('join-stream', streamId);
  socket.emit('viewer-join', { streamId, viewerId, name });
  console.log(`[ViewerStream] Emitted viewer-join for stream ${streamId} as ${viewerId} (${name})`);

  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  console.log('[ViewerStream] Created RTCPeerConnection');

  // Send ICE candidates to the host
  pc.onicecandidate = event => {
    if (event.candidate) {
      console.log('[ViewerStream] ICE candidate generated:', event.candidate);
      socket.emit('signal', {
        streamId,
        type: 'ice-candidate',
        data: event.candidate,
        viewerId,
        name,
      });
    } else {
      console.log('[ViewerStream] ICE candidate event is null (end of candidates)');
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[ViewerStream] ICE connection state:', pc.iceConnectionState);
  };
  pc.onconnectionstatechange = () => {
    console.log('[ViewerStream] Connection state:', pc.connectionState);
  };

  // When remote stream is added
  pc.ontrack = event => {
    console.log('[ViewerStream] ontrack fired, streams:', event.streams);
    if (onStream) onStream(event.streams[0]);
  };

  socket.on('signal', async ({ type, data }) => {
    console.log(`[ViewerStream] Received signal: ${type}`);
    if (type === 'offer') {
      if (pc.signalingState === 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          console.log('[ViewerStream] setRemoteDescription(offer) success');
          const answer = await pc.createAnswer();
          console.log('[ViewerStream] Created answer:', answer);
          await pc.setLocalDescription(answer);
          console.log('[ViewerStream] setLocalDescription(answer) success');
          socket.emit('signal', {
            streamId,
            type: 'answer',
            data: answer,
            viewerId,
            name,
          });
          console.log('[ViewerStream] Sent answer');
        } catch (e) {
          console.error('[ViewerStream] Error handling offer:', e);
        }
      } else {
        console.warn(`[ViewerStream] Skipping offer handling because signalingState is '${pc.signalingState}'`);
      }
    } else if (type === 'ice-candidate') {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
        console.log('[ViewerStream] Added ICE candidate');
      } catch (e) { console.warn('[ViewerStream] Failed to add ICE candidate:', e); }
    }
  });

  return { socket };
} 