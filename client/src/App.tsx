// import React, { useState, useEffect, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';
// import { 
//   Mic, MicOff, Video, VideoOff, Phone, 
//   Users, Plus, LogIn
// } from 'lucide-react';

// // --- CONFIG ---
// const SERVER_URL = "http://localhost:5000"; 
// const ICE_SERVERS = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:global.stun.twilio.com:3478" }
//   ]
// };

// interface Participant {
//   id: string;
//   name: string;
//   isLocal: boolean;
//   stream?: MediaStream;
// }

// export default function App() {
//   const [isInMeeting, setIsInMeeting] = useState(false);
//   const [showJoinInputs, setShowJoinInputs] = useState(false);
//   const [userName, setUserName] = useState('');
//   const [roomId, setRoomId] = useState('');
  
//   // Media State
//   const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//   const [isMicOn, setIsMicOn] = useState(true);
//   const [isCameraOn, setIsCameraOn] = useState(true);
//   const [participants, setParticipants] = useState<Participant[]>([]);
  
//   // --- REFS (Crucial for stability) ---
//   const socketRef = useRef<Socket | null>(null);
//   const peersRef = useRef<Record<string, RTCPeerConnection>>({}); 
//   const localVideoRef = useRef<HTMLVideoElement>(null);
  
//   // We use a Ref for the stream so the socket listeners 
//   // can access the LATEST stream without needing to re-run useEffect
//   const localStreamRef = useRef<MediaStream | null>(null);

//   // --- 1. SETUP SOCKET (Runs once) ---
//   useEffect(() => {
//     socketRef.current = io(SERVER_URL);

//     const socket = socketRef.current;

//     socket.on('connect', () => {
//         console.log("Connected w/ ID:", socket.id);
//     });

//     socket.on('existing-users', (users: any[]) => {
//         users.forEach((u) => {
//             addParticipant(u.id, u.name, false);
//             createPeer(u.id, socket.id || '', true); // We call them
//         });
//     });

//     socket.on('user-connected', (user: { userId: string, name: string }) => {
//         console.log("New user joined:", user.name);
//         addParticipant(user.userId, user.name, false);
//         // We wait for their offer
//     });

//     socket.on('offer', async (payload) => {
//         const pc = createPeer(payload.caller, socket.id || '', false);
//         await pc.setRemoteDescription(payload.sdp);
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socket.emit('answer', { target: payload.caller, caller: socket.id, sdp: answer });
//     });

//     socket.on('answer', async (payload) => {
//         const pc = peersRef.current[payload.caller];
//         if (pc) {
//             await pc.setRemoteDescription(payload.sdp);
//         }
//     });

//     socket.on('ice-candidate', async (payload) => {
//         const pc = peersRef.current[payload.caller];
//         if (pc && payload.candidate) {
//             await pc.addIceCandidate(payload.candidate);
//         }
//     });

//     socket.on('user-disconnected', (userId: string) => {
//         if (peersRef.current[userId]) {
//             peersRef.current[userId].close();
//             delete peersRef.current[userId];
//         }
//         setParticipants(prev => prev.filter(p => p.id !== userId));
//     });

//     return () => {
//         socket.disconnect();
//     };
//   }, []); // Empty dependency = stable socket

//   // --- 2. CORE WEBRTC LOGIC ---
//   const createPeer = (targetId: string, myId: string, initiator: boolean) => {
//     const pc = new RTCPeerConnection(ICE_SERVERS);
//     peersRef.current[targetId] = pc;

//     // Add local tracks to this new connection
//     if (localStreamRef.current) {
//         localStreamRef.current.getTracks().forEach(track => {
//             pc.addTrack(track, localStreamRef.current!);
//         });
//     }

//     pc.onicecandidate = (event) => {
//         if (event.candidate) {
//             socketRef.current?.emit('ice-candidate', { 
//                 target: targetId, caller: myId, candidate: event.candidate 
//             });
//         }
//     };

//     pc.ontrack = (event) => {
//         const stream = event.streams[0];
//         setParticipants(prev => prev.map(p => {
//             return p.id === targetId ? { ...p, stream } : p;
//         }));
//     };

//     if (initiator) {
//         pc.createOffer().then(offer => {
//             pc.setLocalDescription(offer);
//             socketRef.current?.emit('offer', { target: targetId, caller: myId, sdp: offer });
//         });
//     }

//     return pc;
//   };

//   const addParticipant = (id: string, name: string, isLocal: boolean) => {
//     setParticipants(prev => {
//         if (prev.find(p => p.id === id)) return prev;
//         return [...prev, { id, name, isLocal }];
//     });
//   };

//   // --- 3. UI ACTIONS ---
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       setLocalStream(stream);
//       localStreamRef.current = stream; // Update ref for WebRTC logic
//       setIsCameraOn(true);
//       setIsMicOn(true);
//       return stream;
//     } catch (err) {
//       console.error("Error", err);
//       return null;
//     }
//   };

//   const joinMeeting = async () => {
//     if (!userName || !roomId) return;
    
//     let stream = localStreamRef.current;
//     if (!stream) {
//         stream = await startCamera();
//     }

//     // Add self
//     const myId = socketRef.current?.id || 'me';
//     addParticipant(myId, userName, true);

//     socketRef.current?.emit('join-room', roomId, userName);
//     setIsInMeeting(true);
//   };

//   const generateRandomCode = () => {
//     setRoomId(Math.floor(1000 + Math.random() * 9000).toString());
//     setShowJoinInputs(true);
//   };

//   // Attach local video
//   useEffect(() => {
//     if (localStream && localVideoRef.current) {
//         localVideoRef.current.srcObject = localStream;
//     }
//   }, [localStream, isInMeeting]);

//   // Toggle Controls
//   const toggleMic = () => {
//     if (localStream) {
//         localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
//         setIsMicOn(!isMicOn);
//     }
//   };

//   const toggleCamera = () => {
//     if (localStream) {
//         localStream.getVideoTracks().forEach(t => t.enabled = !isCameraOn);
//         setIsCameraOn(!isCameraOn);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-neutral-900 text-white font-sans">
//       {!isInMeeting ? (
//         <div className="flex flex-col items-center justify-center min-h-screen p-4">
//             <h1 className="text-5xl font-bold mb-8 text-indigo-500">snatch</h1>
//             <div className="w-full max-w-md bg-neutral-800 p-8 rounded-2xl space-y-4">
//                 {!showJoinInputs ? (
//                     <>
//                         <button onClick={generateRandomCode} className="w-full py-3 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2">
//                            <Plus /> Create Meeting
//                         </button>
//                         <button onClick={() => setShowJoinInputs(true)} className="w-full py-3 bg-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2">
//                            <LogIn /> Join Meeting
//                         </button>
//                     </>
//                 ) : (
//                     <>
//                         <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your Name" className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700" />
//                         <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room ID" className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest" />
//                         <button onClick={joinMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">Enter Room</button>
//                     </>
//                 )}
//             </div>
//         </div>
//       ) : (
//         <div className="h-screen flex flex-col">
//             <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6">
//                 <div className="font-bold text-xl">Room: {roomId}</div>
//                 <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-full text-sm">
//                     <Users size={14} /> {participants.length} Online
//                 </div>
//             </header>
            
//             <main className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto content-center">
//                 {participants.map(p => (
//                     <div key={p.id} className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700">
//                         {p.isLocal ? (
//                             <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
//                         ) : (
//                             <RemoteVideo stream={p.stream} />
//                         )}
//                         <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium">
//                             {p.name} {p.isLocal && '(You)'}
//                         </div>
//                     </div>
//                 ))}
//             </main>

//             <footer className="h-20 bg-neutral-900 flex items-center justify-center gap-4">
//                 <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
//                     {isMicOn ? <Mic /> : <MicOff />}
//                 </button>
//                 <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
//                     {isCameraOn ? <Video /> : <VideoOff />}
//                 </button>
//                 <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 rounded-full font-bold flex gap-2">
//                     <Phone className="rotate-[135deg]" /> Leave
//                 </button>
//             </footer>
//         </div>
//       )}
//     </div>
//   );
// }

// // Helper for Remote Video
// const RemoteVideo = ({ stream }: { stream?: MediaStream }) => {
//     const ref = useRef<HTMLVideoElement>(null);
//     useEffect(() => {
//         if (ref.current && stream) ref.current.srcObject = stream;
//     }, [stream]);
//     // Added 'muted' to prevent loud echo when testing on localhost
//     return <video ref={ref} autoPlay muted className="w-full h-full object-cover" />;
// };


import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Mic, MicOff, Video, VideoOff, Phone, 
  Users, Plus, LogIn
} from 'lucide-react';

// --- CONFIG ---
const SERVER_URL = "http://localhost:5000"; 
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
  
  // --- REFS ---
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({}); 
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // --- 1. SETUP SOCKET (Runs once) ---
  useEffect(() => {
    socketRef.current = io(SERVER_URL);
    const socket = socketRef.current;

    socket.on('connect', () => console.log("Connected w/ ID:", socket.id));

    socket.on('existing-users', (users: any[]) => {
        users.forEach((u) => {
            addParticipant(u.id, u.name, false);
            createPeer(u.id, socket.id || '', true); 
        });
    });

    socket.on('user-connected', (user: { userId: string, name: string }) => {
        addParticipant(user.userId, user.name, false);
    });

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
        if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
        }
        setParticipants(prev => prev.filter(p => p.id !== userId));
    });

    return () => { socket.disconnect(); };
  }, []); 

  // --- 2. WEBRTC LOGIC ---
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

  const addParticipant = (id: string, name: string, isLocal: boolean) => {
    setParticipants(prev => {
        if (prev.find(p => p.id === id)) return prev;
        return [...prev, { id, name, isLocal }];
    });
  };

  // --- 3. UI ACTIONS ---
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
        <div className="h-screen flex flex-col">
            <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6">
                <div className="font-bold text-xl">Room: {roomId}</div>
                <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-full text-sm">
                    <Users size={14} /> {participants.length} Online
                </div>
            </header>
            
            <main className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto content-center">
                {participants.map(p => (
                    <div key={p.id} className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700">
                        {p.isLocal ? (
                            <>
                                <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                                {/* Local Audio Visualizer */}
                                <AudioVisualizer stream={localStream!} isLocal={true} />
                            </>
                        ) : (
                            <RemoteVideo stream={p.stream} />
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium">
                            {p.name} {p.isLocal && '(You)'}
                        </div>
                    </div>
                ))}
            </main>

            <footer className="h-20 bg-neutral-900 flex items-center justify-center gap-4">
                <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
                    {isMicOn ? <Mic /> : <MicOff />}
                </button>
                <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
                    {isCameraOn ? <Video /> : <VideoOff />}
                </button>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 rounded-full font-bold flex gap-2">
                    <Phone className="rotate-[135deg]" /> Leave
                </button>
            </footer>
        </div>
      )}
    </div>
  );
}

// --- 4. AUDIO VISUALIZER HELPERS ---

const RemoteVideo = ({ stream }: { stream?: MediaStream }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    
    // IMPORTANT: removed 'muted' here. You will now hear remote users.
    return (
        <>
            <video ref={ref} autoPlay className="w-full h-full object-cover" />
            {stream && <AudioVisualizer stream={stream} isLocal={false} />}
        </>
    );
};

const AudioVisualizer = ({ stream, isLocal }: { stream: MediaStream, isLocal: boolean }) => {
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
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        source.connect(analyser);
        // Do NOT connect to destination (speakers) here, the <video> tag handles that.
        // We only want to analyze data.

        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const avg = sum / dataArray.length; // 0 to 255
            setVolume(avg);
            rafRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            audioContext.close();
        };
    }, [stream]);

    // Show green glow if volume > 10 (arbitrary threshold)
    const isSpeaking = volume > 10;

    return (
        <div className={`absolute inset-0 pointer-events-none transition-all duration-200 border-4 
            ${isSpeaking ? 'border-green-500/80 shadow-[inset_0_0_20px_rgba(34,197,94,0.5)]' : 'border-transparent'}`} 
        />
    );
};
