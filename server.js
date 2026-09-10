import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
app.get('/health', (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });
const waiting = [];
const partners = new Map();
const reports = new Map();

function removeWaiting(id) {
  const i = waiting.indexOf(id);
  if (i !== -1) waiting.splice(i, 1);
}
function match(socket) {
  removeWaiting(socket.id);
  while (waiting.length) {
    const otherId = waiting.shift();
    if (otherId === socket.id) continue;
    const other = io.sockets.sockets.get(otherId);
    if (!other || partners.has(otherId)) continue;
    partners.set(socket.id, otherId);
    partners.set(otherId, socket.id);
    socket.emit('matched', { initiator: true });
    other.emit('matched', { initiator: false });
    return;
  }
  waiting.push(socket.id);
  socket.emit('waiting');
}
function disconnectPair(id, notify = true) {
  const partnerId = partners.get(id);
  partners.delete(id);
  removeWaiting(id);
  if (partnerId) {
    partners.delete(partnerId);
    const p = io.sockets.sockets.get(partnerId);
    if (p && notify) p.emit('partner-left');
  }
}

io.on('connection', socket => {
  socket.on('find-partner', () => match(socket));
  socket.on('next', () => { disconnectPair(socket.id); match(socket); });
  socket.on('signal', ({ type, data }) => {
    const pid = partners.get(socket.id);
    if (pid) io.to(pid).emit('signal', { type, data });
  });
  socket.on('chat-message', text => {
    const pid = partners.get(socket.id);
    if (pid && typeof text === 'string') io.to(pid).emit('chat-message', text.slice(0, 1000));
  });
  socket.on('report', reason => {
    const pid = partners.get(socket.id);
    if (pid) reports.set(pid, { reason: String(reason || 'unspecified').slice(0,200), at: Date.now() });
    disconnectPair(socket.id);
    socket.emit('reported');
  });
  socket.on('stop', () => disconnectPair(socket.id));
  socket.on('disconnect', () => disconnectPair(socket.id, true));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
