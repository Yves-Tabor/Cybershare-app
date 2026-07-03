let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emitToUser(userId, eventName, payload) {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(`user:${userId}`).emit(eventName, payload);
}

module.exports = {
  setIO,
  getIO,
  emitToUser,
};
