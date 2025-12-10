import  { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Mic, MicOff, Video, VideoOff, Phone, 
  Users, Plus, LogIn, Lock, Unlock
} from 'lucide-react';

// --- CONFIG ---
const SERVER_URL = "http://localhost:5000"; // Update with your server URL
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};

interface Participant {
  id: string;
  name: string;
  isLocal: boolean;
  stream?: MediaStream;
  isSnatched?: boolean; 
}

export default function App() {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [showJoinInputs, setShowJoinInputs] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  
  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // --- SNATCH STATE ---
  const [snatchedWith, setSnatchedWith] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{fromId: string, fromName: string} | null>(null);

  // --- REFS ---
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({}); 
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // --- 1. SETUP SOCKET ---
  useEffect(() => {
    console.log("Initializing Socket Connection to:", SERVER_URL);
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on('connect', () => console.log("✅ Socket Connected. My ID:", socket.id));
    socket.on('connect_error', (err) => console.error("❌ Socket Connection Error:", err));

    socket.on('existing-users', (users: any[]) => {
        console.log("👥 Received existing users:", users);
        users.forEach((u) => {
            addParticipant(u.id, u.name, false, u.isSnatched);
            createPeer(u.id, socket.id || '', true); 
        });
    });

    socket.on('user-connected', (user: { userId: string, name: string }) => {
        console.log("👤 New user connected:", user.name);
        addParticipant(user.userId, user.name, false, false);
    });

    // --- SNATCH LISTENERS ---
    
    // 1. Someone wants to snatch me
    socket.on('snatch-request', (data: { fromId: string, fromName: string }) => {
        console.log("📩 Received SNATCH REQUEST from:", data.fromName, data.fromId);
        setIncomingRequest(data);
    });

    // 2. Snatch accepted/started
    socket.on('snatch-started', ({ withId }: { withId: string }) => {
        console.log("🔒 SNATCH STARTED with:", withId);
        setIncomingRequest(null); 
        setSnatchedWith(withId);
    });

    // 3. Someone else got snatched (Sid's view)
    socket.on('users-snatched-update', ({ snatchedUsers }: { snatchedUsers: string[] }) => {
        console.log("👀 Update: Users snatched:", snatchedUsers);
        setParticipants(prev => prev.map(p => ({
            ...p,
            isSnatched: snatchedUsers.includes(p.id)
        })));
    });

    // --- WEBRTC ---
    socket.on('offer', async (payload) => {
        const pc = createPeer(payload.caller, socket.id || '', false);
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: payload.caller, caller: socket.id, sdp: answer });
    });

    socket.on('answer', async (payload) => {
        const pc = peersRef.current[payload.caller];
        if (pc) await pc.setRemoteDescription(payload.sdp);
    });

    socket.on('ice-candidate', async (payload) => {
        const pc = peersRef.current[payload.caller];
        if (pc && payload.candidate) await pc.addIceCandidate(payload.candidate);
    });

    socket.on('user-disconnected', (userId: string) => {
        console.log("User disconnected:", userId);
        if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
        }
        setParticipants(prev => prev.filter(p => p.id !== userId));
    });

    return () => { socket.disconnect(); };
  }, []); 

  // --- 2. WEBRTC HELPER ---
  const createPeer = (targetId: string, myId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetId] = pc;

    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socketRef.current?.emit('ice-candidate', { 
                target: targetId, caller: myId, candidate: event.candidate 
            });
        }
    };

    pc.ontrack = (event) => {
        const stream = event.streams[0];
        setParticipants(prev => prev.map(p => p.id === targetId ? { ...p, stream } : p));
    };

    if (initiator) {
        pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            socketRef.current?.emit('offer', { target: targetId, caller: myId, sdp: offer });
        });
    }

    return pc;
  };

  const addParticipant = (id: string, name: string, isLocal: boolean, isSnatched: boolean = false) => {
    setParticipants(prev => {
        if (prev.find(p => p.id === id)) return prev;
        return [...prev, { id, name, isLocal, isSnatched }];
    });
  };

  // --- 3. SNATCH ACTIONS ---
  const requestSnatch = (targetId: string) => {
      console.log("👉 CLICKED SNATCH. Targeting user:", targetId);
      if (socketRef.current) {
          console.log("📤 Emitting 'request-snatch'...");
          socketRef.current.emit('request-snatch', { targetUserId: targetId });
      } else {
          console.error("❌ Socket not initialized!");
      }
  };

  const acceptSnatch = () => {
      if (incomingRequest) {
          console.log("👍 ACCEPTING SNATCH from:", incomingRequest.fromId);
          socketRef.current?.emit('accept-snatch', { requesterId: incomingRequest.fromId });
          setSnatchedWith(incomingRequest.fromId);
          setParticipants(prev => prev.map(p => 
             p.id === incomingRequest.fromId ? { ...p, isSnatched: true } : p
          ));
      } else {
          console.warn("⚠️ No incoming request to accept.");
      }
  };

  const endSnatch = () => {
      console.log("🔓 Ending Snatch");
      window.location.reload(); 
  };

  // --- 4. UI ACTIONS ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream; 
      setIsCameraOn(true);
      setIsMicOn(true);
      return stream;
    } catch (err) {
      console.error("Error", err);
      return null;
    }
  };

  const joinMeeting = async () => {
    if (!userName || !roomId) return;
    let stream = localStreamRef.current;
    if (!stream) stream = await startCamera();
    
    const myId = socketRef.current?.id || 'me';
    addParticipant(myId, userName, true);
    console.log("🚀 Joining room:", roomId, "as", userName);
    socketRef.current?.emit('join-room', roomId, userName);
    setIsInMeeting(true);
  };

  const generateRandomCode = () => {
    setRoomId(Math.floor(1000 + Math.random() * 9000).toString());
    setShowJoinInputs(true);
  };

  useEffect(() => {
    if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInMeeting]);

  const toggleMic = () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
        setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
        localStream.getVideoTracks().forEach(t => t.enabled = !isCameraOn);
        setIsCameraOn(!isCameraOn);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans">
      {!isInMeeting ? (
        // --- LOBBY ---
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-5xl font-bold mb-8 text-indigo-500">snatch</h1>
            <div className="w-full max-w-md bg-neutral-800 p-8 rounded-2xl space-y-4">
                {!showJoinInputs ? (
                    <>
                        <button onClick={generateRandomCode} className="w-full py-3 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2">
                           <Plus /> Create Meeting
                        </button>
                        <button onClick={() => setShowJoinInputs(true)} className="w-full py-3 bg-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2">
                           <LogIn /> Join Meeting
                        </button>
                    </>
                ) : (
                    <>
                        <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your Name" className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700" />
                        <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room ID" className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest" />
                        <button onClick={joinMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">Enter Room</button>
                    </>
                )}
            </div>
        </div>
      ) : (
        // --- MEETING ROOM ---
        <div className="h-screen flex flex-col relative">
            
            {/* 1. SNATCH REQUEST MODAL */}
            {incomingRequest && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-neutral-800 p-6 rounded-2xl border border-indigo-500 shadow-2xl max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Snatch Request</h3>
                        <p className="text-neutral-400 mb-6"><span className="text-white font-bold">{incomingRequest.fromName}</span> wants to talk privately.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIncomingRequest(null)} className="flex-1 py-3 bg-neutral-700 rounded-xl font-bold hover:bg-neutral-600">Deny</button>
                            <button onClick={acceptSnatch} className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500">Accept</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. HEADER */}
            <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/90 backdrop-blur">
                <div className="flex items-center gap-2">
                    <div className="font-bold text-xl text-indigo-500">snatch</div>
                    <span className="text-neutral-600">|</span>
                    <span className="font-mono text-sm">{roomId}</span>
                </div>
                {snatchedWith && (
                    <div className="px-4 py-1 bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
                        <Lock size={12} /> PRIVATE MODE
                    </div>
                )}
                {!snatchedWith && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-full text-sm">
                        <Users size={14} /> {participants.length} Online
                    </div>
                )}
            </header>
            
            {/* 3. VIDEO GRID */}
            <main className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto content-center overflow-y-auto">
                {participants.map(p => {
                    // --- VISIBILITY & AUDIO LOGIC ---
                    let isBlurred = false;
                    let isMuted = false;

                    if (snatchedWith) {
                        // CASE A: I AM SNATCHED
                        if (!p.isLocal && p.id !== snatchedWith) {
                            isBlurred = true;
                            isMuted = true;
                        }
                    } else {
                        // CASE B: I AM NOT SNATCHED
                        if (p.isSnatched && !p.isLocal) {
                            isBlurred = true;
                            isMuted = true;
                        }
                    }

                    return (
                        <div key={p.id} className={`relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border transition-all duration-500
                            ${isBlurred ? 'border-neutral-800 opacity-30 scale-95' : 'border-neutral-700 shadow-2xl scale-100'}
                            ${snatchedWith && (p.id === snatchedWith || p.isLocal) ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}
                        `}>
                            <div className={`w-full h-full transition-all duration-700 ${isBlurred ? 'blur-md grayscale' : ''}`}>
                                {p.isLocal ? (
                                    <>
                                        <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                        <AudioVisualizer stream={localStream!} isLocal={true} />
                                    </>
                                ) : (
                                    <RemoteVideo stream={p.stream} isMuted={isMuted} />
                                )}
                            </div>

                            {/* Overlays */}
                            {isBlurred ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                                        <Lock size={20} className="text-neutral-500" />
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium z-10 flex items-center gap-2">
                                    {p.name} {p.isLocal && '(You)'}
                                </div>
                            )}

                            {/* SNATCH BUTTON (The trigger) */}
                            {!p.isLocal && !snatchedWith && !p.isSnatched && !isBlurred && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-[2px]">
                                    <button 
                                        onClick={() => requestSnatch(p.id)}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Lock size={16} /> Snatch
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>

            {/* 4. CONTROLS */}
            <footer className="h-20 bg-neutral-900 flex items-center justify-center gap-4 z-20">
                <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
                    {isMicOn ? <Mic /> : <MicOff />}
                </button>
                <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
                    {isCameraOn ? <Video /> : <VideoOff />}
                </button>
                {snatchedWith ? (
                     <button onClick={endSnatch} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold flex gap-2">
                        <Unlock /> End Private Chat
                    </button>
                ) : (
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 rounded-full font-bold flex gap-2">
                        <Phone className="rotate-[135deg]" /> Leave
                    </button>
                )}
            </footer>
        </div>
      )}
    </div>
  );
}

// --- 5. AUDIO HELPERS ---

// Updated Remote Video to handle Muting for Privacy
const RemoteVideo = ({ stream, isMuted }: { stream?: MediaStream, isMuted: boolean }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    
    // Privacy Logic: If isMuted is true, we set muted on the video element
    return (
        <>
            <video ref={ref} autoPlay muted={isMuted} className="w-full h-full object-cover" />
            {stream && !isMuted && <AudioVisualizer stream={stream} isLocal={false} />}
        </>
    );
};

const AudioVisualizer = ({ stream }: { stream: MediaStream, isLocal: boolean }) => {
    const [volume, setVolume] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream) return;
        const activeTracks = stream.getAudioTracks();
        if (activeTracks.length === 0) return;

        // Init Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        try {
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            source.connect(analyser);
            analyser.fftSize = 256;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                const sum = dataArray.reduce((a, b) => a + b, 0);
                const avg = sum / dataArray.length; 
                setVolume(avg);
                rafRef.current = requestAnimationFrame(updateVolume);
            };

            updateVolume();
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceRef.current = source;
        } catch (e) {
            console.log("Audio context warning:", e);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            audioContextRef.current?.close();
        };
    }, [stream]);

    const isSpeaking = volume > 10;

    return (
        <div className={`absolute inset-0 pointer-events-none transition-all duration-200 border-4 
            ${isSpeaking ? 'border-green-500/80 shadow-[inset_0_0_20px_rgba(34,197,94,0.5)]' : 'border-transparent'}`} 
        />
    );
};