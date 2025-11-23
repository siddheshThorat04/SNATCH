import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

interface User {
    id: string;
    roomId: string;
    name: string;
    isSnatched: boolean;
    snatchedWith?: string;
}

const users: Record<string, User> = {};
const rooms: Record<string, string[]> = {};

io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId: string, name: string) => {
        socket.join(roomId);
        users[socket.id] = { id: socket.id, roomId, name, isSnatched: false };
        
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(socket.id);

        // Notify others so they can prepare to receive a call
        socket.to(roomId).emit('user-connected', { userId: socket.id, name });

        // Send existing users to the new joiner
        const usersInRoom = rooms[roomId]
            .filter(id => id !== socket.id)
            .map(id => users[id]);
        socket.emit('existing-users', usersInRoom);
    });

    // --- WebRTC Signaling (New) ---
    // These events allow two browsers to handshake and find each other

    socket.on('offer', (payload) => {
        // payload: { target: string, caller: string, sdp: RTCSessionDescription }
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        // payload: { target: string, caller: string, sdp: RTCSessionDescription }
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        // payload: { target: string, candidate: RTCIceCandidate }
        io.to(payload.target).emit('ice-candidate', payload);
    });

    // --- End Signaling ---

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            rooms[user.roomId] = rooms[user.roomId].filter(id => id !== socket.id);
            socket.to(user.roomId).emit('user-disconnected', user.id);
            delete users[socket.id];
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Snatch Server running on port ${PORT}`));