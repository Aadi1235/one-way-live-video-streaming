import io from 'socket.io-client';

export async function startHostStream(streamId, onRemoteJoin, onChatMessage) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  console.log('[HostStream] Got local media stream:', stream);
  const socket = io('http://localhost:5000');
  socket.on('connect', () => {
    console.log('[HostStream] Socket connected with id:', socket.id);
  });
  socket.emit('join-stream', streamId);
  console.log('[HostStream] Emitted join-stream for', streamId);

  // Store peer connections by viewerId
  const peers = {};

  socket.on('signal', async ({ type, data, from, viewerId, name }) => {
    console.log(`[HostStream] Received signal: type=${type}, from=${from}, viewerId=${viewerId}, name=${name}`);
    if (!viewerId) return; // Ignore if no viewerId
    if (type === 'answer') {
      const pc = peers[viewerId];
      if (pc) {
        if (pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            console.log(`[HostStream] setRemoteDescription(answer) success for ${viewerId}`);
          } catch (e) {
            console.warn(`[HostStream] Warning: setRemoteDescription for answer from ${viewerId} failed, but signalingState was 'have-local-offer':`, e);
          }
        } else {
          console.warn(`[HostStream] Skipping setRemoteDescription for answer from ${viewerId} because signalingState is '${pc.signalingState}'`);
        }
      } else {
        console.log(`[HostStream] No peer connection found for ${viewerId}`);
      }
    } else if (type === 'ice-candidate') {
      if (peers[viewerId]) {
        try {
          await peers[viewerId].addIceCandidate(new RTCIceCandidate(data));
          console.log(`[HostStream] Added ICE candidate for ${viewerId}`);
        } catch (e) { console.warn(`[HostStream] Failed to add ICE candidate for ${viewerId}:`, e); }
      }
    }
  });

  // Listen for new viewers joining
  socket.on('new-viewer', async ({ viewerId, name }) => {
    console.log(`[HostStream] New viewer joined: ${viewerId} (${name})`);
    if (!viewerId || peers[viewerId]) return; // Only create if not already exists
    // Create a new peer connection for each viewer
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    console.log(`[HostStream] Created new RTCPeerConnection for ${viewerId}`);
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log(`[HostStream] Added track to ${viewerId}:`, track);
    });

    pc.onicecandidate = event => {
      if (event.candidate) {
        console.log(`[HostStream] ICE candidate generated for ${viewerId}:`, event.candidate);
        socket.emit('signal', {
          streamId,
          to: null, // will be filled by server
          type: 'ice-candidate',
          data: event.candidate,
          viewerId,
          name,
        });
      } else {
        console.log(`[HostStream] ICE candidate event for ${viewerId} is null (end of candidates)`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[HostStream] ICE connection state for ${viewerId}:`, pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log(`[HostStream] Connection state for ${viewerId}:`, pc.connectionState);
    };

    // Create offer and send to viewer
    const offer = await pc.createOffer();
    console.log(`[HostStream] Created offer for ${viewerId}:`, offer);
    await pc.setLocalDescription(offer);
    console.log(`[HostStream] Set local description (offer) for ${viewerId}`);
    socket.emit('signal', {
      streamId,
      to: null, // will be filled by server
      type: 'offer',
      data: offer,
      viewerId,
      name,
    });
    console.log(`[HostStream] Sent offer to ${viewerId}`);

    peers[viewerId] = pc;
    if (onRemoteJoin) onRemoteJoin(viewerId, name);
  });

  // Notify server that host is ready to accept viewers
  console.log(`[HostStream] Emitting host-ready for stream ${streamId}`);
  socket.emit('host-ready', { streamId });

  if (onChatMessage) {
    socket.on('chat-message', (msg) => {
      onChatMessage(msg);
    });
  }

  return { stream, socket };
} 