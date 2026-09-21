import { io } from 'socket.io-client'

let socket

export function connectSocket(token) {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  if (!token) return null
  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
