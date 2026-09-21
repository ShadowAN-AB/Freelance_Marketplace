import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../services/api'
import { errorMessage } from '../lib/format'
import { useToast } from '../context/ToastContext'

export function MessageButton({ projectId, userId, label = 'Message' }) {
  const navigate = useNavigate()
  const toast = useToast()
  const pid = projectId?._id || projectId
  const uid = userId?._id || userId
  const open = useMutation({
    mutationFn: () => api.post('/conversations', { projectId: pid, userId: uid }),
    onSuccess: ({ data }) => navigate(`/app/messages/${data.conversation._id}`),
    onError: (err) => toast.push(errorMessage(err)),
  })
  if (!pid || !uid) return null
  return (
    <button
      type="button"
      className="text-sm font-semibold text-teal disabled:opacity-50"
      onClick={() => open.mutate()}
      disabled={open.isPending}
    >
      {open.isPending ? 'Opening…' : label}
    </button>
  )
}
