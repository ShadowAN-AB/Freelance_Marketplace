import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getSocket } from '../../lib/socket'
import { EmptyState, Input, Spinner } from '../../components/ui/Primitives'

export default function MessagesPage() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get('/conversations')).data,
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return undefined
    const onPresence = ({ userId, online }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev)
        if (online) next.add(String(userId))
        else next.delete(String(userId))
        return next
      })
    }
    socket.on('presence:update', onPresence)
    return () => socket.off('presence:update', onPresence)
  }, [])

  if (isLoading) return <Spinner />
  const list = data?.data || []
  const active = conversationId || list[0]?._id
  return (
    <div className="grid min-h-[70vh] gap-4 md:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border-2 border-ink/10 bg-white">
        <h1 className="font-display border-b border-line px-4 py-3 text-2xl">Messages</h1>
        {!list.length ? <div className="p-4"><EmptyState title="No threads" body="Chat opens after a proposal exists." /></div> : null}
        {list.map((c) => {
          const other = (c.participants || []).find((p) => (p._id || p) !== user._id)
          const online = other && onlineIds.has(String(other._id || other))
          return (
            <Link
              key={c._id}
              to={`/app/messages/${c._id}`}
              className={`block border-b border-line px-4 py-3 ${c._id === active ? 'bg-paper' : ''}`}
            >
              <p className="flex items-center gap-2 font-semibold">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? 'bg-teal' : 'bg-ink/20'}`} />
                {other?.name || c.projectId?.title}
              </p>
              <p className="line-clamp-1 text-sm text-muted">{c.lastMessagePreview || 'No messages yet'}</p>
            </Link>
          )
        })}
      </aside>
      {active ? <Thread id={active} /> : <div className="rounded-xl border border-dashed border-line p-10 text-muted">Select a conversation.</div>}
    </div>
  )
}

function Thread({ id }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const bottom = useRef(null)
  const { data, isLoading } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => (await api.get(`/conversations/${id}/messages`, { params: { limit: 50 } })).data,
  })

  useEffect(() => {
    api.post(`/conversations/${id}/read`).then(() => {
      qc.invalidateQueries({ queryKey: ['unread-count'] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    })
  }, [id, qc])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return undefined
    socket.emit('conversation:join', id)
    const onNew = (message) => {
      if (message.conversationId === id || message.conversationId?._id === id) {
        qc.invalidateQueries({ queryKey: ['messages', id] })
        qc.invalidateQueries({ queryKey: ['conversations'] })
        qc.invalidateQueries({ queryKey: ['unread-count'] })
        api.post(`/conversations/${id}/read`).then(() => qc.invalidateQueries({ queryKey: ['unread-count'] }))
      }
    }
    socket.on('message:new', onNew)
    return () => socket.off('message:new', onNew)
  }, [id, qc])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data])

  async function send(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    const socket = getSocket()
    setText('')
    if (socket) {
      socket.emit('message:send', { conversationId: id, text: value })
    } else {
      await api.post(`/conversations/${id}/messages`, { text: value })
      qc.invalidateQueries({ queryKey: ['messages', id] })
    }
  }

  if (isLoading) return <Spinner />
  return (
    <div className="flex flex-col rounded-2xl border-2 border-ink/10 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
        {(data?.data || []).map((m) => {
          const mine = (m.senderId?._id || m.senderId) === user._id
          return (
            <div key={m._id} className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'ml-auto bg-coral text-white' : 'bg-saffron/50'}`}>
              <p className="text-xs opacity-80">{m.senderId?.name}</p>
              <p>{m.text}</p>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" />
        <button className="rounded-full bg-coral px-4 py-2 font-bold text-white">Send</button>
      </form>
    </div>
  )
}
