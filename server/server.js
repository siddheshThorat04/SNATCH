import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const users = {};
const rooms = {};
const roomSettings = {}; // { [roomId]: { hostId, allowSnatch } }
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Storage
// const users = {};
// const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId, name) => {
        socket.join(roomId);
        users[socket.id] = {
            id: socket.id,
            roomId,
            name,
            isSnatched: false,
            snatchedWith: null
        };

        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(socket.id);

        // Fallback in case someone joins a room with no settings yet
        if (!roomSettings[roomId]) {
            roomSettings[roomId] = { hostId: socket.id, allowSnatch: true };
        }

        socket.to(roomId).emit('user-connected', { userId: socket.id, name });

        const usersInRoom = rooms[roomId]
            .filter(id => id !== socket.id)
            .map(id => users[id]);
        socket.emit('existing-users', usersInRoom);

        socket.emit('room-settings', {
            allowSnatch: roomSettings[roomId].allowSnatch,
            isHost: roomSettings[roomId].hostId === socket.id
        });
    });

    // --- SNATCH LOGIC (NEW) ---

    // 1. Handle Request
    socket.on('request-snatch', ({ targetUserId }) => {
    const requester = users[socket.id];
    if (!requester) return;
    const settings = roomSettings[requester.roomId];
    if (!settings || !settings.allowSnatch) return; // blocked

    io.to(targetUserId).emit('snatch-request', {
        fromId: socket.id,
        fromName: requester.name
    });
});

    // 2. Handle Acceptance
    socket.on('accept-snatch', ({ requesterId }) => {
        const accepterId = socket.id;

        if (users[requesterId]) {
            users[requesterId].isSnatched = true;
            users[requesterId].snatchedWith = accepterId;
        }
        if (users[accepterId]) {
            users[accepterId].isSnatched = true;
            users[accepterId].snatchedWith = requesterId;
        }

        io.to(requesterId).emit('snatch-started', { withId: accepterId });
        io.to(accepterId).emit('snatch-started', { withId: requesterId });

        const roomId = users[accepterId]?.roomId;
        if (roomId && rooms[roomId]) {
            const currentlySnatched = rooms[roomId]
                .filter(id => users[id]?.isSnatched)
                .map(id => id);
            io.to(roomId).emit('users-snatched-update', { snatchedUsers: currentlySnatched });
        }
    });
    // --- WebRTC Signaling ---
    socket.on('create-room', (roomId, name, allowSnatch) => {
        socket.join(roomId);

        users[socket.id] = {
            id: socket.id,
            roomId,
            name,
            isSnatched: false,
            snatchedWith: null
        };

        rooms[roomId] = [socket.id];
        roomSettings[roomId] = { hostId: socket.id, allowSnatch };

        // Tell the creator their host status + current setting
        socket.emit('room-settings', { allowSnatch, isHost: true });
    });
    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });
    socket.on('toggle-snatch', () => {
        const user = users[socket.id];
        if (!user) return;
        const settings = roomSettings[user.roomId];
        if (!settings || settings.hostId !== socket.id) return; // only host can toggle

        settings.allowSnatch = !settings.allowSnatch;
        io.to(user.roomId).emit('snatch-setting-updated', { allowSnatch: settings.allowSnatch });
    });
    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        io.to(payload.target).emit('ice-candidate', payload);
    });
    socket.on('end-snatch', ({ partnerId }) => {
        const selfId = socket.id;

        // Reset state for both users
        if (users[selfId]) {
            users[selfId].isSnatched = false;
            users[selfId].snatchedWith = null;
        }
        if (users[partnerId]) {
            users[partnerId].isSnatched = false;
            users[partnerId].snatchedWith = null;
        }

        // Tell both parties to exit private mode locally
        io.to(selfId).emit('snatch-ended');
        io.to(partnerId).emit('snatch-ended');

        // Recompute and broadcast the room's current snatched list
        // (so other ongoing private pairs aren't affected)
        const roomId = users[selfId]?.roomId || users[partnerId]?.roomId;
        if (roomId && rooms[roomId]) {
            const stillSnatched = rooms[roomId]
                .filter(id => users[id]?.isSnatched)
                .map(id => id);
            io.to(roomId).emit('users-snatched-update', { snatchedUsers: stillSnatched });
        }
    });
    // --- Disconnect ---

    socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
        rooms[user.roomId] = rooms[user.roomId].filter(id => id !== socket.id);
        socket.to(user.roomId).emit('user-disconnected', user.id);
        delete users[socket.id];

        if (rooms[user.roomId].length === 0) {
            delete rooms[user.roomId];
            delete roomSettings[user.roomId];
        }
    }
});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Snatch Server running on port ${PORT}`));