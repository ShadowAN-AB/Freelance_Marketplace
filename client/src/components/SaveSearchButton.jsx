import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

export function SaveSearchButton({ kind, params }) {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const save = useMutation({
    mutationFn: () =>
      api.post('/users/me/saved-searches', {
        name: name || 'Saved search',
        kind,
        q: params.q || '',
        category: params.category || '',
        dueSoon: Boolean(params.dueSoon),
        minRate: params.minRate ? Number(params.minRate) : undefined,
        maxRate: params.maxRate ? Number(params.maxRate) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-searches'] })
      toast.push('Search saved')
      setOpen(false)
      setName('')
    },
  })
  if (!user) return null
  return (
    <div className="relative">
      <button type="button" className="rounded-full border-2 border-ink/15 bg-white px-4 py-2 text-sm font-bold" onClick={() => setOpen((v) => !v)}>
        Save search
      </button>
      {open ? (
        <form
          className="absolute right-0 z-10 mt-2 w-56 rounded-2xl border-2 border-ink/10 bg-white p-3 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <input className="w-full rounded-md border border-line px-2 py-1 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="mt-2 w-full rounded-full bg-coral py-1.5 text-sm font-bold text-white" disabled={save.isPending}>
            Save
          </button>
        </form>
      ) : null}
    </div>
  )
}
