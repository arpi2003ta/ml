export const emitSocketEvent = (req, userId, event, data) => {
  const io = req.app.get("io");
  const userSocketMap = req.app.get("userSocketMap");
  const socketId = userSocketMap.get(userId);

  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};