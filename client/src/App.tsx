// // import { useState, useEffect, useRef } from 'react';
// // import { io, Socket } from 'socket.io-client';
// // import {
// //   Mic, MicOff, Video, VideoOff, Phone,
// //   Users, Plus, LogIn, Lock, Unlock
// // } from 'lucide-react';

// // // --- CONFIG ---
// // // const SERVER_URL = "https://snatch-3.onrender.com"; // Update with your server URL
// // const SERVER_URL = "http://localhost:5000"; // Update with your server URL
// // const ICE_SERVERS = {
// //   iceServers: [
// //     { urls: "stun:stun.l.google.com:19302" },
// //     { urls: "stun:global.stun.twilio.com:3478" }
// //   ]
// // };

// // interface Participant {
// //   id: string;
// //   name: string;
// //   isLocal: boolean;
// //   stream?: MediaStream;
// //   isSnatched?: boolean;
// // }

// // type FlowMode = 'none' | 'create' | 'join';

// // export default function App() {
// //   const [isInMeeting, setIsInMeeting] = useState(false);
// //   const [flowMode, setFlowMode] = useState<FlowMode>('none');
// //   const [userName, setUserName] = useState('');
// //   const [roomId, setRoomId] = useState('');

// //   // Media State
// //   const [localStream, setLocalStream] = useState<MediaStream | null>(null);
// //   const [isMicOn, setIsMicOn] = useState(true);
// //   const [isCameraOn, setIsCameraOn] = useState(true);
// //   const [participants, setParticipants] = useState<Participant[]>([]);

// //   // --- SNATCH STATE ---
// //   const [snatchedWith, setSnatchedWith] = useState<string | null>(null);
// //   const [incomingRequest, setIncomingRequest] = useState<{ fromId: string, fromName: string } | null>(null);

// //   // --- ROOM SETTINGS (host + snatch toggle) ---
// //   const [allowSnatchOnCreate, setAllowSnatchOnCreate] = useState(true); // used only on the "create" form
// //   const [allowSnatch, setAllowSnatch] = useState(true); // live room setting once inside a meeting
// //   const [isHost, setIsHost] = useState(false);

// //   // --- REFS ---
// //   const socketRef = useRef<Socket | null>(null);
// //   const peersRef = useRef<Record<string, RTCPeerConnection>>({});
// //   const localVideoRef = useRef<HTMLVideoElement>(null);
// //   const localStreamRef = useRef<MediaStream | null>(null);

// //   // --- 1. SETUP SOCKET ---
// //   useEffect(() => {
// //     console.log("Initializing Socket Connection to:", SERVER_URL);
// //     socketRef.current = io(SERVER_URL);
// //     const socket = socketRef.current;

// //     socket.on('connect', () => console.log("✅ Socket Connected. My ID:", socket.id));
// //     socket.on('connect_error', (err) => console.error("❌ Socket Connection Error:", err));

// //     socket.on('existing-users', (users: any[]) => {
// //       console.log("👥 Received existing users:", users);
// //       users.forEach((u) => {
// //         addParticipant(u.id, u.name, false, u.isSnatched);
// //         createPeer(u.id, socket.id || '', true);
// //       });
// //     });

// //     socket.on('user-connected', (user: { userId: string, name: string }) => {
// //       console.log("👤 New user connected:", user.name);
// //       addParticipant(user.userId, user.name, false, false);
// //     });

// //     // --- ROOM SETTINGS LISTENERS ---

// //     // Sent once right after create-room / join-room
// //     socket.on('room-settings', ({ allowSnatch, isHost }: { allowSnatch: boolean, isHost: boolean }) => {
// //       console.log("⚙️ Room settings received:", { allowSnatch, isHost });
// //       setAllowSnatch(allowSnatch);
// //       setIsHost(isHost);
// //     });

// //     // Sent whenever the host toggles the setting
// //     socket.on('snatch-setting-updated', ({ allowSnatch }: { allowSnatch: boolean }) => {
// //       console.log("⚙️ Snatch setting updated:", allowSnatch);
// //       setAllowSnatch(allowSnatch);
// //     });

// //     // --- SNATCH LISTENERS ---

// //     // 1. Someone wants to snatch me
// //     socket.on('snatch-request', (data: { fromId: string, fromName: string }) => {
// //       console.log("📩 Received SNATCH REQUEST from:", data.fromName, data.fromId);
// //       setIncomingRequest(data);
// //     });

// //     // 2. Snatch accepted/started
// //     socket.on('snatch-started', ({ withId }: { withId: string }) => {
// //       console.log("🔒 SNATCH STARTED with:", withId);
// //       setIncomingRequest(null);
// //       setSnatchedWith(withId);
// //     });

// //     // 3. Someone else got snatched (Sid's view) / room-wide snatch state refresh
// //     socket.on('users-snatched-update', ({ snatchedUsers }: { snatchedUsers: string[] }) => {
// //       console.log("👀 Update: Users snatched:", snatchedUsers);
// //       setParticipants(prev => prev.map(p => ({
// //         ...p,
// //         isSnatched: snatchedUsers.includes(p.id)
// //       })));
// //     });

// //     // 4. Snatch ended (by me or by my partner) — return to main meeting, no reload
// //     socket.on('snatch-ended', () => {
// //       console.log("🔓 Snatch ended — returning to main meeting view");
// //       setSnatchedWith(null);
// //     });

// //     // --- WEBRTC ---
// //     socket.on('offer', async (payload) => {
// //       const pc = createPeer(payload.caller, socket.id || '', false);
// //       await pc.setRemoteDescription(payload.sdp);
// //       const answer = await pc.createAnswer();
// //       await pc.setLocalDescription(answer);
// //       socket.emit('answer', { target: payload.caller, caller: socket.id, sdp: answer });
// //     });

// //     socket.on('answer', async (payload) => {
// //       const pc = peersRef.current[payload.caller];
// //       if (pc) await pc.setRemoteDescription(payload.sdp);
// //     });

// //     socket.on('ice-candidate', async (payload) => {
// //       const pc = peersRef.current[payload.caller];
// //       if (pc && payload.candidate) await pc.addIceCandidate(payload.candidate);
// //     });

// //     socket.on('user-disconnected', (userId: string) => {
// //       console.log("User disconnected:", userId);
// //       if (peersRef.current[userId]) {
// //         peersRef.current[userId].close();
// //         delete peersRef.current[userId];
// //       }
// //       setParticipants(prev => prev.filter(p => p.id !== userId));
// //     });

// //     return () => { socket.disconnect(); };
// //   }, []);

// //   // --- 2. WEBRTC HELPER ---
// //   const createPeer = (targetId: string, myId: string, initiator: boolean) => {
// //     const pc = new RTCPeerConnection(ICE_SERVERS);
// //     peersRef.current[targetId] = pc;

// //     if (localStreamRef.current) {
// //       localStreamRef.current.getTracks().forEach(track => {
// //         pc.addTrack(track, localStreamRef.current!);
// //       });
// //     }

// //     pc.onicecandidate = (event) => {
// //       if (event.candidate) {
// //         socketRef.current?.emit('ice-candidate', {
// //           target: targetId, caller: myId, candidate: event.candidate
// //         });
// //       }
// //     };

// //     pc.ontrack = (event) => {
// //       const stream = event.streams[0];
// //       setParticipants(prev => prev.map(p => p.id === targetId ? { ...p, stream } : p));
// //     };

// //     if (initiator) {
// //       pc.createOffer().then(offer => {
// //         pc.setLocalDescription(offer);
// //         socketRef.current?.emit('offer', { target: targetId, caller: myId, sdp: offer });
// //       });
// //     }

// //     return pc;
// //   };

// //   const addParticipant = (id: string, name: string, isLocal: boolean, isSnatched: boolean = false) => {
// //     setParticipants(prev => {
// //       if (prev.find(p => p.id === id)) return prev;
// //       return [...prev, { id, name, isLocal, isSnatched }];
// //     });
// //   };

// //   // --- 3. SNATCH ACTIONS ---
// //   const requestSnatch = (targetId: string) => {
// //     console.log("👉 CLICKED SNATCH. Targeting user:", targetId);
// //     if (!allowSnatch) {
// //       console.warn("⚠️ Snatch is disabled by the host for this room.");
// //       return;
// //     }
// //     if (socketRef.current) {
// //       console.log("📤 Emitting 'request-snatch'...");
// //       socketRef.current.emit('request-snatch', { targetUserId: targetId });
// //     } else {
// //       console.error("❌ Socket not initialized!");
// //     }
// //   };

// //   const acceptSnatch = () => {
// //     if (incomingRequest) {
// //       console.log("👍 ACCEPTING SNATCH from:", incomingRequest.fromId);
// //       socketRef.current?.emit('accept-snatch', { requesterId: incomingRequest.fromId });
// //       setSnatchedWith(incomingRequest.fromId);
// //       setParticipants(prev => prev.map(p =>
// //         p.id === incomingRequest.fromId ? { ...p, isSnatched: true } : p
// //       ));
// //     } else {
// //       console.warn("⚠️ No incoming request to accept.");
// //     }
// //   };

// //   // Ends the private (snatch) session and returns to the main meeting.
// //   // Does NOT reload the page or disconnect the socket / peer connections.
// //   const endSnatch = () => {
// //     console.log("🔓 Ending Snatch — staying in main meeting");
// //     if (snatchedWith) {
// //       socketRef.current?.emit('end-snatch', { partnerId: snatchedWith });
// //     }
// //     setSnatchedWith(null);
// //   };

// //   // --- 4. UI ACTIONS ---
// //   const startCamera = async () => {
// //     try {
// //       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
// //       setLocalStream(stream);
// //       localStreamRef.current = stream;
// //       setIsCameraOn(true);
// //       setIsMicOn(true);
// //       return stream;
// //     } catch (err) {
// //       console.error("Error", err);
// //       return null;
// //     }
// //   };

// //   const createMeeting = async () => {
// //     if (!userName || !roomId) return;
// //     let stream = localStreamRef.current;
// //     if (!stream) stream = await startCamera();

// //     const myId = socketRef.current?.id || 'me';
// //     addParticipant(myId, userName, true);
// //     console.log("🚀 Creating room:", roomId, "as", userName, "| allowSnatch:", allowSnatchOnCreate);
// //     socketRef.current?.emit('create-room', roomId, userName, allowSnatchOnCreate);
// //     setIsInMeeting(true);
// //   };

// //   const joinMeeting = async () => {
// //     if (!userName || !roomId) return;
// //     let stream = localStreamRef.current;
// //     if (!stream) stream = await startCamera();

// //     const myId = socketRef.current?.id || 'me';
// //     addParticipant(myId, userName, true);
// //     console.log("🚀 Joining room:", roomId, "as", userName);
// //     socketRef.current?.emit('join-room', roomId, userName);
// //     setIsInMeeting(true);
// //   };

// //   const toggleSnatchSetting = () => {
// //     if (!isHost) return;
// //     socketRef.current?.emit('toggle-snatch');
// //   };

// //   const generateRandomCode = () => {
// //     setRoomId(Math.floor(1000 + Math.random() * 9000).toString());
// //   };

// //   useEffect(() => {
// //     if (localStream && localVideoRef.current) {
// //       localVideoRef.current.srcObject = localStream;
// //     }
// //   }, [localStream, isInMeeting]);

// //   const toggleMic = () => {
// //     if (localStream) {
// //       localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
// //       setIsMicOn(!isMicOn);
// //     }
// //   };

// //   const toggleCamera = () => {
// //     if (localStream) {
// //       localStream.getVideoTracks().forEach(t => t.enabled = !isCameraOn);
// //       setIsCameraOn(!isCameraOn);
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen bg-neutral-900 text-white font-sans">
// //       {!isInMeeting ? (
// //         // --- LOBBY ---
// //         <div className="flex flex-col items-center justify-center min-h-screen p-4">
// //           <h1 className="text-5xl font-bold mb-8 text-indigo-500">snatch</h1>
// //           <div className="w-full max-w-md bg-neutral-800 p-8 rounded-2xl space-y-4">

// //             {flowMode === 'none' && (
// //               <>
// //                 <button
// //                   onClick={() => { generateRandomCode(); setFlowMode('create'); }}
// //                   className="w-full py-3 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2"
// //                 >
// //                   <Plus /> Create Meeting
// //                 </button>
// //                 <button
// //                   onClick={() => setFlowMode('join')}
// //                   className="w-full py-3 bg-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2"
// //                 >
// //                   <LogIn /> Join Meeting
// //                 </button>
// //               </>
// //             )}

// //             {flowMode === 'create' && (
// //               <>
// //                 <input
// //                   value={userName}
// //                   onChange={e => setUserName(e.target.value)}
// //                   placeholder="Your Name"
// //                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700"
// //                 />
// //                 <input
// //                   value={roomId}
// //                   onChange={e => setRoomId(e.target.value)}
// //                   placeholder="Room ID"
// //                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest"
// //                 />

// //                 <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-neutral-700">
// //                   <span className="text-sm font-medium">Allow "Snatch" (private chat)</span>
// //                   <button
// //                     onClick={() => setAllowSnatchOnCreate(prev => !prev)}
// //                     className={`w-12 h-6 rounded-full relative transition-colors ${allowSnatchOnCreate ? 'bg-indigo-600' : 'bg-neutral-700'}`}
// //                   >
// //                     <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${allowSnatchOnCreate ? 'translate-x-6' : ''}`} />
// //                   </button>
// //                 </div>

// //                 <button onClick={createMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
// //                   Create &amp; Enter
// //                 </button>
// //                 <button
// //                   onClick={() => setFlowMode('none')}
// //                   className="w-full py-2 text-neutral-400 text-sm hover:text-white"
// //                 >
// //                   Back
// //                 </button>
// //               </>
// //             )}

// //             {flowMode === 'join' && (
// //               <>
// //                 <input
// //                   value={userName}
// //                   onChange={e => setUserName(e.target.value)}
// //                   placeholder="Your Name"
// //                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700"
// //                 />
// //                 <input
// //                   value={roomId}
// //                   onChange={e => setRoomId(e.target.value)}
// //                   placeholder="Room ID"
// //                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest"
// //                 />
// //                 <button onClick={joinMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
// //                   Enter Room
// //                 </button>
// //                 <button
// //                   onClick={() => setFlowMode('none')}
// //                   className="w-full py-2 text-neutral-400 text-sm hover:text-white"
// //                 >
// //                   Back
// //                 </button>
// //               </>
// //             )}

// //           </div>
// //         </div>
// //       ) : (
// //         // --- MEETING ROOM ---
// //         <div className="h-screen flex flex-col relative">

// //           {/* 1. SNATCH REQUEST MODAL */}
// //           {incomingRequest && (
// //             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
// //               <div className="bg-neutral-800 p-6 rounded-2xl border border-indigo-500 shadow-2xl max-w-sm w-full text-center">
// //                 <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
// //                   <Lock size={32} />
// //                 </div>
// //                 <h3 className="text-2xl font-bold mb-2">Snatch Request</h3>
// //                 <p className="text-neutral-400 mb-6"><span className="text-white font-bold">{incomingRequest.fromName}</span> wants to talk privately.</p>
// //                 <div className="flex gap-3">
// //                   <button onClick={() => setIncomingRequest(null)} className="flex-1 py-3 bg-neutral-700 rounded-xl font-bold hover:bg-neutral-600">Deny</button>
// //                   <button onClick={acceptSnatch} className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500">Accept</button>
// //                 </div>
// //               </div>
// //             </div>
// //           )}

// //           {/* 2. HEADER */}
// //           <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/90 backdrop-blur">
// //             <div className="flex items-center gap-2">
// //               <div className="font-bold text-xl text-indigo-500">snatch</div>
// //               <span className="text-neutral-600">|</span>
// //               <span className="font-mono text-sm">{roomId}</span>
// //             </div>

// //             <div className="flex items-center gap-3">
// //               {isHost && (
// //                 <button
// //                   onClick={toggleSnatchSetting}
// //                   title="Toggle whether participants can snatch"
// //                   className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
// //                     allowSnatch
// //                       ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50'
// //                       : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
// //                   }`}
// //                 >
// //                   {allowSnatch ? <Unlock size={14} /> : <Lock size={14} />}
// //                   Snatch {allowSnatch ? 'On' : 'Off'}
// //                 </button>
// //               )}

// //               {snatchedWith && (
// //                 <div className="px-4 py-1 bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
// //                   <Lock size={12} /> PRIVATE MODE
// //                 </div>
// //               )}
// //               {!snatchedWith && (
// //                 <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-full text-sm">
// //                   <Users size={14} /> {participants.length} Online
// //                 </div>
// //               )}
// //             </div>
// //           </header>

// //           {/* 3. VIDEO GRID */}
// //           <main className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto content-center overflow-y-auto">
// //             {participants.map(p => {
// //               // --- VISIBILITY & AUDIO LOGIC ---
// //               let isBlurred = false;
// //               let isMuted = false;

// //               if (snatchedWith) {
// //                 // CASE A: I AM SNATCHED
// //                 if (!p.isLocal && p.id !== snatchedWith) {
// //                   isBlurred = true;
// //                   isMuted = true;
// //                 }
// //               } else {
// //                 // CASE B: I AM NOT SNATCHED
// //                 if (p.isSnatched && !p.isLocal) {
// //                   isBlurred = true;
// //                   isMuted = true;
// //                 }
// //               }

// //               return (
// //                 <div key={p.id} className={`relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border transition-all duration-500
// //                             ${isBlurred ? 'border-neutral-800 opacity-30 scale-95' : 'border-neutral-700 shadow-2xl scale-100'}
// //                             ${snatchedWith && (p.id === snatchedWith || p.isLocal) ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}
// //                         `}>
// //                   <div className={`w-full h-full transition-all duration-700 ${isBlurred ? 'blur-md grayscale' : ''}`}>
// //                     {p.isLocal ? (
// //                       <>
// //                         <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
// //                         <AudioVisualizer stream={localStream!} isLocal={true} />
// //                       </>
// //                     ) : (
// //                       <RemoteVideo stream={p.stream} isMuted={isMuted} />
// //                     )}
// //                   </div>

// //                   {/* Overlays */}
// //                   {isBlurred ? (
// //                     <div className="absolute inset-0 flex items-center justify-center">
// //                       <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
// //                         <Lock size={20} className="text-neutral-500" />
// //                       </div>
// //                     </div>
// //                   ) : (
// //                     <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium z-10 flex items-center gap-2">
// //                       {p.name} {p.isLocal && '(You)'}
// //                     </div>
// //                   )}

// //                   {/* SNATCH BUTTON (The trigger) — only shown when host allows it */}
// //                   {!p.isLocal && !snatchedWith && !p.isSnatched && !isBlurred && allowSnatch && (
// //                     <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-[2px]">
// //                       <button
// //                         onClick={() => requestSnatch(p.id)}
// //                         className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
// //                       >
// //                         <Lock size={16} /> Snatch
// //                       </button>
// //                     </div>
// //                   )}
// //                 </div>
// //               );
// //             })}
// //           </main>

// //           {/* 4. CONTROLS */}
// //           <footer className="h-20 bg-neutral-900 flex items-center justify-center gap-4 z-20">
// //             <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
// //               {isMicOn ? <Mic /> : <MicOff />}
// //             </button>
// //             <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
// //               {isCameraOn ? <Video /> : <VideoOff />}
// //             </button>
// //             {snatchedWith ? (
// //               <button onClick={endSnatch} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold flex gap-2">
// //                 <Unlock /> End Private Chat
// //               </button>
// //             ) : (
// //               <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 rounded-full font-bold flex gap-2">
// //                 <Phone className="rotate-[135deg]" /> Leave
// //               </button>
// //             )}
// //           </footer>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // // --- 5. AUDIO HELPERS ---

// // // Updated Remote Video to handle Muting for Privacy
// // const RemoteVideo = ({ stream, isMuted }: { stream?: MediaStream, isMuted: boolean }) => {
// //   const ref = useRef<HTMLVideoElement>(null);
// //   useEffect(() => {
// //     if (ref.current && stream) ref.current.srcObject = stream;
// //   }, [stream]);

// //   // Privacy Logic: If isMuted is true, we set muted on the video element
// //   return (
// //     <>
// //       <video ref={ref} autoPlay muted={isMuted} className="w-full h-full object-cover" />
// //       {stream && !isMuted && <AudioVisualizer stream={stream} isLocal={false} />}
// //     </>
// //   );
// // };

// // const AudioVisualizer = ({ stream }: { stream: MediaStream, isLocal: boolean }) => {
// //   const [volume, setVolume] = useState(0);
// //   const audioContextRef = useRef<AudioContext | null>(null);
// //   const analyserRef = useRef<AnalyserNode | null>(null);
// //   const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
// //   const rafRef = useRef<number | null>(null);

// //   useEffect(() => {
// //     if (!stream) return;
// //     const activeTracks = stream.getAudioTracks();
// //     if (activeTracks.length === 0) return;

// //     // Init Audio Context
// //     const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
// //     const audioContext = new AudioContextClass();

// //     try {
// //       const analyser = audioContext.createAnalyser();
// //       const source = audioContext.createMediaStreamSource(stream);

// //       source.connect(analyser);
// //       analyser.fftSize = 256;
// //       const dataArray = new Uint8Array(analyser.frequencyBinCount);

// //       const updateVolume = () => {
// //         analyser.getByteFrequencyData(dataArray);
// //         const sum = dataArray.reduce((a, b) => a + b, 0);
// //         const avg = sum / dataArray.length;
// //         setVolume(avg);
// //         rafRef.current = requestAnimationFrame(updateVolume);
// //       };

// //       updateVolume();
// //       audioContextRef.current = audioContext;
// //       analyserRef.current = analyser;
// //       sourceRef.current = source;
// //     } catch (e) {
// //       console.log("Audio context warning:", e);
// //     }

// //     return () => {
// //       if (rafRef.current) cancelAnimationFrame(rafRef.current);
// //       audioContextRef.current?.close();
// //     };
// //   }, [stream]);

// //   const isSpeaking = volume > 10;

// //   return (
// //     <div className={`absolute inset-0 pointer-events-none transition-all duration-200 border-4 
// //             ${isSpeaking ? 'border-green-500/80 shadow-[inset_0_0_20px_rgba(34,197,94,0.5)]' : 'border-transparent'}`}
// //     />
// //   );
// // };


// import { useState, useEffect, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';
// import {
//   Mic, MicOff, Video, VideoOff, Phone,
//   Users, Plus, LogIn, Lock, Unlock, ShieldCheck, ShieldOff, Clock, Check, X
// } from 'lucide-react';

// // --- CONFIG ---
// const SERVER_URL = "https://snatch-3.onrender.com"; // Update with your server URL
// // const SERVER_URL = "http://localhost:5000"; // Update with your server URL
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
//   isSnatched?: boolean;
// }

// interface PendingAdmission {
//   userId: string;
//   name: string;
// }

// type FlowMode = 'none' | 'create' | 'join';

// export default function App() {
//   const [isInMeeting, setIsInMeeting] = useState(false);
//   const [flowMode, setFlowMode] = useState<FlowMode>('none');
//   const [userName, setUserName] = useState('');
//   const [roomId, setRoomId] = useState('');

//   // Media State
//   const [localStream, setLocalStream] = useState<MediaStream | null>(null);
//   const [isMicOn, setIsMicOn] = useState(true);
//   const [isCameraOn, setIsCameraOn] = useState(true);
//   const [participants, setParticipants] = useState<Participant[]>([]);

//   // --- SNATCH STATE ---
//   const [snatchedWith, setSnatchedWith] = useState<string | null>(null);
//   const [incomingRequest, setIncomingRequest] = useState<{ fromId: string, fromName: string } | null>(null);

//   // --- ROOM SETTINGS (host + snatch toggle) ---
//   const [allowSnatchOnCreate, setAllowSnatchOnCreate] = useState(true); // used only on the "create" form
//   const [allowSnatch, setAllowSnatch] = useState(true); // live room setting once inside a meeting
//   const [isHost, setIsHost] = useState(false);

//   // --- ADMISSION / WAITING ROOM STATE ---
//   const [requireAdmissionOnCreate, setRequireAdmissionOnCreate] = useState(false); // used only on the "create" form
//   const [requireAdmission, setRequireAdmission] = useState(false); // live room setting once inside a meeting
//   const [isWaiting, setIsWaiting] = useState(false); // true while parked in the waiting room
//   const [admissionDenied, setAdmissionDenied] = useState(false); // host rejected us
//   const [pendingAdmissions, setPendingAdmissions] = useState<PendingAdmission[]>([]); // host-only queue

//   // --- REFS ---
//   const socketRef = useRef<Socket | null>(null);
//   const peersRef = useRef<Record<string, RTCPeerConnection>>({});
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const waitingVideoRef = useRef<HTMLVideoElement>(null);
//   const localStreamRef = useRef<MediaStream | null>(null);

//   // --- 1. SETUP SOCKET ---
//   useEffect(() => {
//     console.log("Initializing Socket Connection to:", SERVER_URL);
//     socketRef.current = io(SERVER_URL);
//     const socket = socketRef.current;

//     socket.on('connect', () => console.log("✅ Socket Connected. My ID:", socket.id));
//     socket.on('connect_error', (err) => console.error("❌ Socket Connection Error:", err));

//     socket.on('existing-users', (users: any[]) => {
//       console.log("👥 Received existing users:", users);
//       users.forEach((u) => {
//         addParticipant(u.id, u.name, false, u.isSnatched);
//         createPeer(u.id, socket.id || '', true);
//       });
//     });

//     socket.on('user-connected', (user: { userId: string, name: string }) => {
//       console.log("👤 New user connected:", user.name);
//       addParticipant(user.userId, user.name, false, false);
//     });

//     // --- ROOM SETTINGS LISTENERS ---

//     // Sent once right after create-room / join-room (or once admitted)
//     socket.on('room-settings', ({ allowSnatch, requireAdmission, isHost }: { allowSnatch: boolean, requireAdmission: boolean, isHost: boolean }) => {
//       console.log("⚙️ Room settings received:", { allowSnatch, requireAdmission, isHost });
//       setAllowSnatch(allowSnatch);
//       setRequireAdmission(!!requireAdmission);
//       setIsHost(isHost);
//     });

//     // Sent whenever the host toggles the snatch setting
//     socket.on('snatch-setting-updated', ({ allowSnatch }: { allowSnatch: boolean }) => {
//       console.log("⚙️ Snatch setting updated:", allowSnatch);
//       setAllowSnatch(allowSnatch);
//     });

//     // Sent whenever the host toggles the admission setting
//     socket.on('admission-setting-updated', ({ requireAdmission }: { requireAdmission: boolean }) => {
//       console.log("⚙️ Admission setting updated:", requireAdmission);
//       setRequireAdmission(requireAdmission);
//     });

//     // --- ADMISSION / WAITING ROOM LISTENERS ---

//     // Joiner: parked in the waiting room, host must let them in
//     socket.on('waiting-for-admission', () => {
//       console.log("⏳ Waiting for host to admit us");
//       setIsWaiting(true);
//       setAdmissionDenied(false);
//     });

//     // Joiner: host let us in — proceed into the meeting
//     socket.on('admission-granted', () => {
//       console.log("✅ Admitted into the meeting");
//       setIsWaiting(false);
//     });

//     // Joiner: host rejected us
//     socket.on('admission-denied', () => {
//       console.log("⛔ Admission denied");
//       setIsWaiting(false);
//       setAdmissionDenied(true);
//     });

//     // Host: someone is waiting to be let in
//     socket.on('admission-request', (data: PendingAdmission) => {
//       console.log("🔔 Admission requested by:", data.name);
//       setPendingAdmissions(prev => prev.find(p => p.userId === data.userId) ? prev : [...prev, data]);
//     });

//     // Host: a waiting user left before being admitted (e.g. closed the tab)
//     socket.on('admission-cancelled', ({ userId }: { userId: string }) => {
//       console.log("↩️ Admission request cancelled:", userId);
//       setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
//     });

//     // --- SNATCH LISTENERS ---

//     socket.on('snatch-request', (data: { fromId: string, fromName: string }) => {
//       console.log("📩 Received SNATCH REQUEST from:", data.fromName, data.fromId);
//       setIncomingRequest(data);
//     });

//     socket.on('snatch-started', ({ withId }: { withId: string }) => {
//       console.log("🔒 SNATCH STARTED with:", withId);
//       setIncomingRequest(null);
//       setSnatchedWith(withId);
//     });

//     socket.on('users-snatched-update', ({ snatchedUsers }: { snatchedUsers: string[] }) => {
//       console.log("👀 Update: Users snatched:", snatchedUsers);
//       setParticipants(prev => prev.map(p => ({
//         ...p,
//         isSnatched: snatchedUsers.includes(p.id)
//       })));
//     });

//     socket.on('snatch-ended', () => {
//       console.log("🔓 Snatch ended — returning to main meeting view");
//       setSnatchedWith(null);
//     });

//     // --- WEBRTC ---
//     socket.on('offer', async (payload) => {
//       const pc = createPeer(payload.caller, socket.id || '', false);
//       await pc.setRemoteDescription(payload.sdp);
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       socket.emit('answer', { target: payload.caller, caller: socket.id, sdp: answer });
//     });

//     socket.on('answer', async (payload) => {
//       const pc = peersRef.current[payload.caller];
//       if (pc) await pc.setRemoteDescription(payload.sdp);
//     });

//     socket.on('ice-candidate', async (payload) => {
//       const pc = peersRef.current[payload.caller];
//       if (pc && payload.candidate) await pc.addIceCandidate(payload.candidate);
//     });

//     socket.on('user-disconnected', (userId: string) => {
//       console.log("User disconnected:", userId);
//       if (peersRef.current[userId]) {
//         peersRef.current[userId].close();
//         delete peersRef.current[userId];
//       }
//       setParticipants(prev => prev.filter(p => p.id !== userId));
//       setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
//     });

//     return () => { socket.disconnect(); };
//   }, []);

//   // --- 2. WEBRTC HELPER ---
//   const createPeer = (targetId: string, myId: string, initiator: boolean) => {
//     const pc = new RTCPeerConnection(ICE_SERVERS);
//     peersRef.current[targetId] = pc;

//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach(track => {
//         pc.addTrack(track, localStreamRef.current!);
//       });
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socketRef.current?.emit('ice-candidate', {
//           target: targetId, caller: myId, candidate: event.candidate
//         });
//       }
//     };

//     pc.ontrack = (event) => {
//       const stream = event.streams[0];
//       setParticipants(prev => prev.map(p => p.id === targetId ? { ...p, stream } : p));
//     };

//     if (initiator) {
//       pc.createOffer().then(offer => {
//         pc.setLocalDescription(offer);
//         socketRef.current?.emit('offer', { target: targetId, caller: myId, sdp: offer });
//       });
//     }

//     return pc;
//   };

//   const addParticipant = (id: string, name: string, isLocal: boolean, isSnatched: boolean = false) => {
//     setParticipants(prev => {
//       if (prev.find(p => p.id === id)) return prev;
//       return [...prev, { id, name, isLocal, isSnatched }];
//     });
//   };

//   // --- 3. SNATCH ACTIONS ---
//   const requestSnatch = (targetId: string) => {
//     console.log("👉 CLICKED SNATCH. Targeting user:", targetId);
//     if (!allowSnatch) {
//       console.warn("⚠️ Snatch is disabled by the host for this room.");
//       return;
//     }
//     if (socketRef.current) {
//       console.log("📤 Emitting 'request-snatch'...");
//       socketRef.current.emit('request-snatch', { targetUserId: targetId });
//     } else {
//       console.error("❌ Socket not initialized!");
//     }
//   };

//   const acceptSnatch = () => {
//     if (incomingRequest) {
//       console.log("👍 ACCEPTING SNATCH from:", incomingRequest.fromId);
//       socketRef.current?.emit('accept-snatch', { requesterId: incomingRequest.fromId });
//       setSnatchedWith(incomingRequest.fromId);
//       setParticipants(prev => prev.map(p =>
//         p.id === incomingRequest.fromId ? { ...p, isSnatched: true } : p
//       ));
//     } else {
//       console.warn("⚠️ No incoming request to accept.");
//     }
//   };

//   const endSnatch = () => {
//     console.log("🔓 Ending Snatch — staying in main meeting");
//     if (snatchedWith) {
//       socketRef.current?.emit('end-snatch', { partnerId: snatchedWith });
//     }
//     setSnatchedWith(null);
//   };

//   // --- 4. ADMISSION ACTIONS (host side) ---
//   const admitUser = (userId: string) => {
//     socketRef.current?.emit('admit-user', { userId });
//     setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
//   };

//   const denyUser = (userId: string) => {
//     socketRef.current?.emit('deny-user', { userId });
//     setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
//   };

//   const toggleAdmissionSetting = () => {
//     if (!isHost) return;
//     socketRef.current?.emit('toggle-admission');
//   };

//   const toggleSnatchSetting = () => {
//     if (!isHost) return;
//     socketRef.current?.emit('toggle-snatch');
//   };

//   // --- 5. UI ACTIONS ---
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       setLocalStream(stream);
//       localStreamRef.current = stream;
//       setIsCameraOn(true);
//       setIsMicOn(true);
//       return stream;
//     } catch (err) {
//       console.error("Error", err);
//       return null;
//     }
//   };

//   const createMeeting = async () => {
//     if (!userName || !roomId) return;
//     let stream = localStreamRef.current;
//     if (!stream) stream = await startCamera();

//     const myId = socketRef.current?.id || 'me';
//     addParticipant(myId, userName, true);
//     console.log("🚀 Creating room:", roomId, "as", userName, "| allowSnatch:", allowSnatchOnCreate, "| requireAdmission:", requireAdmissionOnCreate);
//     socketRef.current?.emit('create-room', roomId, userName, allowSnatchOnCreate, requireAdmissionOnCreate);
//     setIsInMeeting(true);
//   };

//   const joinMeeting = async () => {
//     if (!userName || !roomId) return;
//     let stream = localStreamRef.current;
//     if (!stream) stream = await startCamera();

//     const myId = socketRef.current?.id || 'me';
//     addParticipant(myId, userName, true);
//     console.log("🚀 Joining room:", roomId, "as", userName);
//     setAdmissionDenied(false);
//     socketRef.current?.emit('join-room', roomId, userName);
//     setIsInMeeting(true);
//   };

//   // Bail out of the waiting room / denied screen back to the lobby
//   const leaveWaitingRoom = () => {
//     localStreamRef.current?.getTracks().forEach(t => t.stop());
//     window.location.reload();
//   };

//   const generateRandomCode = () => {
//     setRoomId(Math.floor(1000 + Math.random() * 9000).toString());
//   };

//   useEffect(() => {
//     if (localStream && localVideoRef.current) {
//       localVideoRef.current.srcObject = localStream;
//     }
//     if (localStream && waitingVideoRef.current) {
//       waitingVideoRef.current.srcObject = localStream;
//     }
//   }, [localStream, isInMeeting, isWaiting]);

//   const toggleMic = () => {
//     if (localStream) {
//       localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
//       setIsMicOn(!isMicOn);
//     }
//   };

//   const toggleCamera = () => {
//     if (localStream) {
//       localStream.getVideoTracks().forEach(t => t.enabled = !isCameraOn);
//       setIsCameraOn(!isCameraOn);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-neutral-900 text-white font-sans">
//       {!isInMeeting ? (
//         // --- LOBBY ---
//         <div className="flex flex-col items-center justify-center min-h-screen p-4">
//           <h1 className="text-5xl font-bold mb-8 text-indigo-500">snatch</h1>
//           <div className="w-full max-w-md bg-neutral-800 p-8 rounded-2xl space-y-4">

//             {flowMode === 'none' && (
//               <>
//                 <button
//                   onClick={() => { generateRandomCode(); setFlowMode('create'); }}
//                   className="w-full py-3 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2"
//                 >
//                   <Plus /> Create Meeting
//                 </button>
//                 <button
//                   onClick={() => setFlowMode('join')}
//                   className="w-full py-3 bg-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2"
//                 >
//                   <LogIn /> Join Meeting
//                 </button>
//               </>
//             )}

//             {flowMode === 'create' && (
//               <>
//                 <input
//                   value={userName}
//                   onChange={e => setUserName(e.target.value)}
//                   placeholder="Your Name"
//                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700"
//                 />
//                 <input
//                   value={roomId}
//                   onChange={e => setRoomId(e.target.value)}
//                   placeholder="Room ID"
//                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest"
//                 />

//                 <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-neutral-700">
//                   <span className="text-sm font-medium">Allow "Snatch" (private chat)</span>
//                   <button
//                     onClick={() => setAllowSnatchOnCreate(prev => !prev)}
//                     className={`w-12 h-6 rounded-full relative transition-colors ${allowSnatchOnCreate ? 'bg-indigo-600' : 'bg-neutral-700'}`}
//                   >
//                     <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${allowSnatchOnCreate ? 'translate-x-6' : ''}`} />
//                   </button>
//                 </div>

//                 <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-neutral-700">
//                   <span className="text-sm font-medium">Require permission to join</span>
//                   <button
//                     onClick={() => setRequireAdmissionOnCreate(prev => !prev)}
//                     className={`w-12 h-6 rounded-full relative transition-colors ${requireAdmissionOnCreate ? 'bg-indigo-600' : 'bg-neutral-700'}`}
//                   >
//                     <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${requireAdmissionOnCreate ? 'translate-x-6' : ''}`} />
//                   </button>
//                 </div>

//                 <button onClick={createMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
//                   Create &amp; Enter
//                 </button>
//                 <button
//                   onClick={() => setFlowMode('none')}
//                   className="w-full py-2 text-neutral-400 text-sm hover:text-white"
//                 >
//                   Back
//                 </button>
//               </>
//             )}

//             {flowMode === 'join' && (
//               <>
//                 <input
//                   value={userName}
//                   onChange={e => setUserName(e.target.value)}
//                   placeholder="Your Name"
//                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700"
//                 />
//                 <input
//                   value={roomId}
//                   onChange={e => setRoomId(e.target.value)}
//                   placeholder="Room ID"
//                   className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest"
//                 />
//                 <button onClick={joinMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
//                   Enter Room
//                 </button>
//                 <button
//                   onClick={() => setFlowMode('none')}
//                   className="w-full py-2 text-neutral-400 text-sm hover:text-white"
//                 >
//                   Back
//                 </button>
//               </>
//             )}

//           </div>
//         </div>
//       ) : admissionDenied ? (
//         // --- ADMISSION DENIED ---
//         <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
//           <div className="w-16 h-16 bg-red-600/20 border border-red-500/50 rounded-full flex items-center justify-center mb-4">
//             <ShieldOff size={32} className="text-red-400" />
//           </div>
//           <h2 className="text-2xl font-bold mb-2">Admission Denied</h2>
//           <p className="text-neutral-400 mb-6">The host didn't let you into this meeting.</p>
//           <button onClick={leaveWaitingRoom} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold">
//             Back to Lobby
//           </button>
//         </div>
//       ) : isWaiting ? (
//         // --- WAITING ROOM ---
//         <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
//           <div className="w-full max-w-md aspect-video bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 mb-6 relative">
//             <video ref={waitingVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
//             <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium">
//               {userName} (You)
//             </div>
//           </div>

//           <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
//             <Clock size={32} className="text-indigo-400" />
//           </div>
//           <h2 className="text-2xl font-bold mb-2">Waiting for host to let you in</h2>
//           <p className="text-neutral-400 mb-6">Room <span className="font-mono">{roomId}</span> requires admission.</p>

//           <div className="flex items-center gap-3">
//             <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
//               {isMicOn ? <Mic /> : <MicOff />}
//             </button>
//             <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
//               {isCameraOn ? <Video /> : <VideoOff />}
//             </button>
//             <button onClick={leaveWaitingRoom} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold">
//               Cancel
//             </button>
//           </div>
//         </div>
//       ) : (
//         // --- MEETING ROOM ---
//         <div className="h-screen flex flex-col relative">

//           {/* 1. SNATCH REQUEST MODAL */}
//           {incomingRequest && (
//             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
//               <div className="bg-neutral-800 p-6 rounded-2xl border border-indigo-500 shadow-2xl max-w-sm w-full text-center">
//                 <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
//                   <Lock size={32} />
//                 </div>
//                 <h3 className="text-2xl font-bold mb-2">Snatch Request</h3>
//                 <p className="text-neutral-400 mb-6"><span className="text-white font-bold">{incomingRequest.fromName}</span> wants to talk privately.</p>
//                 <div className="flex gap-3">
//                   <button onClick={() => setIncomingRequest(null)} className="flex-1 py-3 bg-neutral-700 rounded-xl font-bold hover:bg-neutral-600">Deny</button>
//                   <button onClick={acceptSnatch} className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500">Accept</button>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* 1b. ADMISSION REQUESTS (host only) — floating panel, supports multiple waiting people */}
//           {isHost && pendingAdmissions.length > 0 && (
//             <div className="absolute top-20 right-4 z-50 w-full max-w-xs space-y-2">
//               {pendingAdmissions.map(req => (
//                 <div key={req.userId} className="bg-neutral-800 border border-indigo-500/60 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-right">
//                   <div className="flex items-center gap-2 mb-3">
//                     <Clock size={16} className="text-indigo-400" />
//                     <p className="text-sm">
//                       <span className="font-bold">{req.name}</span> wants to join
//                     </p>
//                   </div>
//                   <div className="flex gap-2">
//                     <button
//                       onClick={() => denyUser(req.userId)}
//                       className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
//                     >
//                       <X size={14} /> Deny
//                     </button>
//                     <button
//                       onClick={() => admitUser(req.userId)}
//                       className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
//                     >
//                       <Check size={14} /> Admit
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* 2. HEADER */}
//           <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/90 backdrop-blur">
//             <div className="flex items-center gap-2">
//               <div className="font-bold text-xl text-indigo-500">snatch</div>
//               <span className="text-neutral-600">|</span>
//               <span className="font-mono text-sm">{roomId}</span>
//             </div>

//             <div className="flex items-center gap-3">
//               {isHost && (
//                 <button
//                   onClick={toggleAdmissionSetting}
//                   title="Toggle whether new joiners need admission"
//                   className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
//                     requireAdmission
//                       ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50'
//                       : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
//                   }`}
//                 >
//                   {requireAdmission ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
//                   Waiting Room {requireAdmission ? 'On' : 'Off'}
//                 </button>
//               )}

//               {isHost && (
//                 <button
//                   onClick={toggleSnatchSetting}
//                   title="Toggle whether participants can snatch"
//                   className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
//                     allowSnatch
//                       ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50'
//                       : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
//                   }`}
//                 >
//                   {allowSnatch ? <Unlock size={14} /> : <Lock size={14} />}
//                   Snatch {allowSnatch ? 'On' : 'Off'}
//                 </button>
//               )}

//               {snatchedWith && (
//                 <div className="px-4 py-1 bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
//                   <Lock size={12} /> PRIVATE MODE
//                 </div>
//               )}
//               {!snatchedWith && (
//                 <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-full text-sm">
//                   <Users size={14} /> {participants.length} Online
//                 </div>
//               )}
//             </div>
//           </header>

//           {/* 3. VIDEO GRID */}
//           <main className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto content-center overflow-y-auto">
//             {participants.map(p => {
//               // --- VISIBILITY & AUDIO LOGIC ---
//               let isBlurred = false;
//               let isMuted = false;

//               if (snatchedWith) {
//                 // CASE A: I AM SNATCHED
//                 if (!p.isLocal && p.id !== snatchedWith) {
//                   isBlurred = true;
//                   isMuted = true;
//                 }
//               } else {
//                 // CASE B: I AM NOT SNATCHED
//                 if (p.isSnatched && !p.isLocal) {
//                   isBlurred = true;
//                   isMuted = true;
//                 }
//               }

//               return (
//                 <div key={p.id} className={`relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden border transition-all duration-500
//                             ${isBlurred ? 'border-neutral-800 opacity-30 scale-95' : 'border-neutral-700 shadow-2xl scale-100'}
//                             ${snatchedWith && (p.id === snatchedWith || p.isLocal) ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}
//                         `}>
//                   <div className={`w-full h-full transition-all duration-700 ${isBlurred ? 'blur-md grayscale' : ''}`}>
//                     {p.isLocal ? (
//                       <>
//                         <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
//                         <AudioVisualizer stream={localStream!} isLocal={true} />
//                       </>
//                     ) : (
//                       <RemoteVideo stream={p.stream} isMuted={isMuted} />
//                     )}
//                   </div>

//                   {/* Overlays */}
//                   {isBlurred ? (
//                     <div className="absolute inset-0 flex items-center justify-center">
//                       <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
//                         <Lock size={20} className="text-neutral-500" />
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium z-10 flex items-center gap-2">
//                       {p.name} {p.isLocal && '(You)'}
//                     </div>
//                   )}

//                   {/* SNATCH BUTTON (The trigger) — only shown when host allows it */}
//                   {!p.isLocal && !snatchedWith && !p.isSnatched && !isBlurred && allowSnatch && (
//                     <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20 backdrop-blur-[2px]">
//                       <button
//                         onClick={() => requestSnatch(p.id)}
//                         className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
//                       >
//                         <Lock size={16} /> Snatch
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </main>

//           {/* 4. CONTROLS */}
//           <footer className="h-20 bg-neutral-900 flex items-center justify-center gap-4 z-20">
//             <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
//               {isMicOn ? <Mic /> : <MicOff />}
//             </button>
//             <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
//               {isCameraOn ? <Video /> : <VideoOff />}
//             </button>
//             {snatchedWith ? (
//               <button onClick={endSnatch} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold flex gap-2">
//                 <Unlock /> End Private Chat
//               </button>
//             ) : (
//               <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 rounded-full font-bold flex gap-2">
//                 <Phone className="rotate-[135deg]" /> Leave
//               </button>
//             )}
//           </footer>
//         </div>
//       )}
//     </div>
//   );
// }

// // --- 6. AUDIO HELPERS ---

// const RemoteVideo = ({ stream, isMuted }: { stream?: MediaStream, isMuted: boolean }) => {
//   const ref = useRef<HTMLVideoElement>(null);
//   useEffect(() => {
//     if (ref.current && stream) ref.current.srcObject = stream;
//   }, [stream]);

//   return (
//     <>
//       <video ref={ref} autoPlay muted={isMuted} className="w-full h-full object-cover" />
//       {stream && !isMuted && <AudioVisualizer stream={stream} isLocal={false} />}
//     </>
//   );
// };

// const AudioVisualizer = ({ stream }: { stream: MediaStream, isLocal: boolean }) => {
//   const [volume, setVolume] = useState(0);
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const analyserRef = useRef<AnalyserNode | null>(null);
//   const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
//   const rafRef = useRef<number | null>(null);

//   useEffect(() => {
//     if (!stream) return;
//     const activeTracks = stream.getAudioTracks();
//     if (activeTracks.length === 0) return;

//     const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
//     const audioContext = new AudioContextClass();

//     try {
//       const analyser = audioContext.createAnalyser();
//       const source = audioContext.createMediaStreamSource(stream);

//       source.connect(analyser);
//       analyser.fftSize = 256;
//       const dataArray = new Uint8Array(analyser.frequencyBinCount);

//       const updateVolume = () => {
//         analyser.getByteFrequencyData(dataArray);
//         const sum = dataArray.reduce((a, b) => a + b, 0);
//         const avg = sum / dataArray.length;
//         setVolume(avg);
//         rafRef.current = requestAnimationFrame(updateVolume);
//       };

//       updateVolume();
//       audioContextRef.current = audioContext;
//       analyserRef.current = analyser;
//       sourceRef.current = source;
//     } catch (e) {
//       console.log("Audio context warning:", e);
//     }

//     return () => {
//       if (rafRef.current) cancelAnimationFrame(rafRef.current);
//       audioContextRef.current?.close();
//     };
//   }, [stream]);

//   const isSpeaking = volume > 10;

//   return (
//     <div className={`absolute inset-0 pointer-events-none transition-all duration-200 border-4 
//             ${isSpeaking ? 'border-green-500/80 shadow-[inset_0_0_20px_rgba(34,197,94,0.5)]' : 'border-transparent'}`}
//     />
//   );
// };

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Mic, MicOff, Video, VideoOff, Phone,
  Users, Plus, LogIn, Lock, Unlock, ShieldCheck, ShieldOff, Clock, Check, X
} from 'lucide-react';

// --- CONFIG ---
const SERVER_URL = "https://snatch-3.onrender.com"; // Update with your server URL
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

interface PendingAdmission {
  userId: string;
  name: string;
}

type FlowMode = 'none' | 'create' | 'join';

export default function App() {
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [flowMode, setFlowMode] = useState<FlowMode>('none');
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');

  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // --- SNATCH STATE ---
  const [snatchedWith, setSnatchedWith] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{ fromId: string, fromName: string } | null>(null);

  // --- ROOM SETTINGS (host + snatch toggle) ---
  const [allowSnatchOnCreate, setAllowSnatchOnCreate] = useState(true); // used only on the "create" form
  const [allowSnatch, setAllowSnatch] = useState(true); // live room setting once inside a meeting
  const [isHost, setIsHost] = useState(false);

  // --- ADMISSION / WAITING ROOM STATE ---
  const [requireAdmissionOnCreate, setRequireAdmissionOnCreate] = useState(false); // used only on the "create" form
  const [requireAdmission, setRequireAdmission] = useState(false); // live room setting once inside a meeting
  const [isWaiting, setIsWaiting] = useState(false); // true while parked in the waiting room
  const [admissionDenied, setAdmissionDenied] = useState(false); // host rejected us
  const [pendingAdmissions, setPendingAdmissions] = useState<PendingAdmission[]>([]); // host-only queue

  // --- REFS ---
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const waitingVideoRef = useRef<HTMLVideoElement>(null);
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

    // --- ROOM SETTINGS LISTENERS ---

    // Sent once right after create-room / join-room (or once admitted)
    socket.on('room-settings', ({ allowSnatch, requireAdmission, isHost }: { allowSnatch: boolean, requireAdmission: boolean, isHost: boolean }) => {
      console.log("⚙️ Room settings received:", { allowSnatch, requireAdmission, isHost });
      setAllowSnatch(allowSnatch);
      setRequireAdmission(!!requireAdmission);
      setIsHost(isHost);
    });

    // Sent whenever the host toggles the snatch setting
    socket.on('snatch-setting-updated', ({ allowSnatch }: { allowSnatch: boolean }) => {
      console.log("⚙️ Snatch setting updated:", allowSnatch);
      setAllowSnatch(allowSnatch);
    });

    // Sent whenever the host toggles the admission setting
    socket.on('admission-setting-updated', ({ requireAdmission }: { requireAdmission: boolean }) => {
      console.log("⚙️ Admission setting updated:", requireAdmission);
      setRequireAdmission(requireAdmission);
    });

    // --- ADMISSION / WAITING ROOM LISTENERS ---

    // Joiner: parked in the waiting room, host must let them in
    socket.on('waiting-for-admission', () => {
      console.log("⏳ Waiting for host to admit us");
      setIsWaiting(true);
      setAdmissionDenied(false);
    });

    // Joiner: host let us in — proceed into the meeting
    socket.on('admission-granted', () => {
      console.log("✅ Admitted into the meeting");
      setIsWaiting(false);
    });

    // Joiner: host rejected us
    socket.on('admission-denied', () => {
      console.log("⛔ Admission denied");
      setIsWaiting(false);
      setAdmissionDenied(true);
    });

    // Host: someone is waiting to be let in
    socket.on('admission-request', (data: PendingAdmission) => {
      console.log("🔔 Admission requested by:", data.name);
      setPendingAdmissions(prev => prev.find(p => p.userId === data.userId) ? prev : [...prev, data]);
    });

    // Host: a waiting user left before being admitted (e.g. closed the tab)
    socket.on('admission-cancelled', ({ userId }: { userId: string }) => {
      console.log("↩️ Admission request cancelled:", userId);
      setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
    });

    // --- SNATCH LISTENERS ---

    socket.on('snatch-request', (data: { fromId: string, fromName: string }) => {
      console.log("📩 Received SNATCH REQUEST from:", data.fromName, data.fromId);
      setIncomingRequest(data);
    });

    socket.on('snatch-started', ({ withId }: { withId: string }) => {
      console.log("🔒 SNATCH STARTED with:", withId);
      setIncomingRequest(null);
      setSnatchedWith(withId);
    });

    socket.on('users-snatched-update', ({ snatchedUsers }: { snatchedUsers: string[] }) => {
      console.log("👀 Update: Users snatched:", snatchedUsers);
      setParticipants(prev => prev.map(p => ({
        ...p,
        isSnatched: snatchedUsers.includes(p.id)
      })));
    });

    socket.on('snatch-ended', () => {
      console.log("🔓 Snatch ended — returning to main meeting view");
      setSnatchedWith(null);
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
      setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
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
    if (!allowSnatch) {
      console.warn("⚠️ Snatch is disabled by the host for this room.");
      return;
    }
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
    console.log("🔓 Ending Snatch — staying in main meeting");
    if (snatchedWith) {
      socketRef.current?.emit('end-snatch', { partnerId: snatchedWith });
    }
    setSnatchedWith(null);
  };

  // --- 4. ADMISSION ACTIONS (host side) ---
  const admitUser = (userId: string) => {
    socketRef.current?.emit('admit-user', { userId });
    setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
  };

  const denyUser = (userId: string) => {
    socketRef.current?.emit('deny-user', { userId });
    setPendingAdmissions(prev => prev.filter(p => p.userId !== userId));
  };

  const toggleAdmissionSetting = () => {
    if (!isHost) return;
    socketRef.current?.emit('toggle-admission');
  };

  const toggleSnatchSetting = () => {
    if (!isHost) return;
    socketRef.current?.emit('toggle-snatch');
  };

  // --- 5. UI ACTIONS ---
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

  const createMeeting = async () => {
    if (!userName || !roomId) return;
    let stream = localStreamRef.current;
    if (!stream) stream = await startCamera();

    const myId = socketRef.current?.id || 'me';
    addParticipant(myId, userName, true);
    console.log("🚀 Creating room:", roomId, "as", userName, "| allowSnatch:", allowSnatchOnCreate, "| requireAdmission:", requireAdmissionOnCreate);
    socketRef.current?.emit('create-room', roomId, userName, allowSnatchOnCreate, requireAdmissionOnCreate);
    setIsInMeeting(true);
  };

  const joinMeeting = async () => {
    if (!userName || !roomId) return;
    let stream = localStreamRef.current;
    if (!stream) stream = await startCamera();

    const myId = socketRef.current?.id || 'me';
    addParticipant(myId, userName, true);
    console.log("🚀 Joining room:", roomId, "as", userName);
    setAdmissionDenied(false);
    socketRef.current?.emit('join-room', roomId, userName);
    setIsInMeeting(true);
  };

  // Bail out of the waiting room / denied screen back to the lobby
  const leaveWaitingRoom = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    window.location.reload();
  };

  const generateRandomCode = () => {
    setRoomId(Math.floor(1000 + Math.random() * 9000).toString());
  };

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    if (localStream && waitingVideoRef.current) {
      waitingVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInMeeting, isWaiting]);

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

            {flowMode === 'none' && (
              <>
                <button
                  onClick={() => { generateRandomCode(); setFlowMode('create'); }}
                  className="w-full py-3 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Plus /> Create Meeting
                </button>
                <button
                  onClick={() => setFlowMode('join')}
                  className="w-full py-3 bg-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <LogIn /> Join Meeting
                </button>
              </>
            )}

            {flowMode === 'create' && (
              <>
                <input
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700"
                />
                <input
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="Room ID"
                  className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest"
                />

                <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-neutral-700">
                  <span className="text-sm font-medium">Allow "Snatch" (private chat)</span>
                  <button
                    onClick={() => setAllowSnatchOnCreate(prev => !prev)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${allowSnatchOnCreate ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${allowSnatchOnCreate ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl border border-neutral-700">
                  <span className="text-sm font-medium">Require permission to join</span>
                  <button
                    onClick={() => setRequireAdmissionOnCreate(prev => !prev)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${requireAdmissionOnCreate ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${requireAdmissionOnCreate ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <button onClick={createMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
                  Create &amp; Enter
                </button>
                <button
                  onClick={() => setFlowMode('none')}
                  className="w-full py-2 text-neutral-400 text-sm hover:text-white"
                >
                  Back
                </button>
              </>
            )}

            {flowMode === 'join' && (
              <>
                <input
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700"
                />
                <input
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  placeholder="Room ID"
                  className="w-full p-3 bg-neutral-900 rounded-xl border border-neutral-700 text-center font-mono tracking-widest"
                />
                <button onClick={joinMeeting} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">
                  Enter Room
                </button>
                <button
                  onClick={() => setFlowMode('none')}
                  className="w-full py-2 text-neutral-400 text-sm hover:text-white"
                >
                  Back
                </button>
              </>
            )}

          </div>
        </div>
      ) : admissionDenied ? (
        // --- ADMISSION DENIED ---
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <div className="w-16 h-16 bg-red-600/20 border border-red-500/50 rounded-full flex items-center justify-center mb-4">
            <ShieldOff size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Admission Denied</h2>
          <p className="text-neutral-400 mb-6">The host didn't let you into this meeting.</p>
          <button onClick={leaveWaitingRoom} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold">
            Back to Lobby
          </button>
        </div>
      ) : isWaiting ? (
        // --- WAITING ROOM ---
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <div className="w-full max-w-md aspect-video bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 mb-6 relative">
            <video ref={waitingVideoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-sm font-medium">
              {userName} (You)
            </div>
          </div>

          <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/50 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Clock size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Waiting for host to let you in</h2>
          <p className="text-neutral-400 mb-6">Room <span className="font-mono">{roomId}</span> requires admission.</p>

          <div className="flex items-center gap-3">
            <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
              {isMicOn ? <Mic /> : <MicOff />}
            </button>
            <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-neutral-800' : 'bg-red-500 text-white'}`}>
              {isCameraOn ? <Video /> : <VideoOff />}
            </button>
            <button onClick={leaveWaitingRoom} className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold">
              Cancel
            </button>
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

          {/* 1b. ADMISSION REQUESTS (host only) — floating panel, supports multiple waiting people */}
          {isHost && pendingAdmissions.length > 0 && (
            <div className="absolute top-20 right-4 z-50 w-full max-w-xs space-y-2">
              {pendingAdmissions.map(req => (
                <div key={req.userId} className="bg-neutral-800 border border-indigo-500/60 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-right">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-indigo-400" />
                    <p className="text-sm">
                      <span className="font-bold">{req.name}</span> wants to join
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => denyUser(req.userId)}
                      className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Deny
                    </button>
                    <button
                      onClick={() => admitUser(req.userId)}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Admit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. HEADER */}
          <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/90 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="font-bold text-xl text-indigo-500">snatch</div>
              <span className="text-neutral-600">|</span>
              <span className="font-mono text-sm">{roomId}</span>
            </div>

            <div className="flex items-center gap-3">
              {isHost && (
                <button
                  onClick={toggleAdmissionSetting}
                  title="Toggle whether new joiners need admission"
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                    requireAdmission
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {requireAdmission ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                  Waiting Room {requireAdmission ? 'On' : 'Off'}
                </button>
              )}

              {isHost && (
                <button
                  onClick={toggleSnatchSetting}
                  title="Toggle whether participants can snatch"
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                    allowSnatch
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {allowSnatch ? <Unlock size={14} /> : <Lock size={14} />}
                  Snatch {allowSnatch ? 'On' : 'Off'}
                </button>
              )}

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
            </div>
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

                  {/* SNATCH BUTTON (The trigger) — only shown when host allows it.
                      Always visible (not hover-only) so it actually shows up on touch
                      devices, which have no hover state. Desktop still gets a hover
                      "pop" via scale, it just doesn't rely on hover to appear at all. */}
                  {!p.isLocal && !snatchedWith && !p.isSnatched && !isBlurred && allowSnatch && (
                    <button
                      onClick={() => requestSnatch(p.id)}
                      title={`Snatch ${p.name}`}
                      className="absolute top-3 right-3 z-20 w-10 h-10 md:w-9 md:h-9 rounded-full bg-indigo-600/90 hover:bg-indigo-500 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all"
                    >
                      <Lock size={16} />
                    </button>
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

// --- 6. AUDIO HELPERS ---

const RemoteVideo = ({ stream, isMuted }: { stream?: MediaStream, isMuted: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

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