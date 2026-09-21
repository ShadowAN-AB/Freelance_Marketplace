import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PublicLayout } from '../../layouts/Layouts'
import { Button, ErrorText, Field, Input } from '../../components/ui/Primitives'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/format'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'freelancer' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      navigate('/app/dashboard')
    } catch (err) {
      setError(errorMessage(err, 'Could not register'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border-2 border-ink/10 bg-white p-8 shadow-[10px_10px_0_rgba(0,133,111,0.25)]">
        <h1 className="font-display text-4xl">Create an account</h1>
        <p className="mt-2 text-muted">Join as a client to hire, or as a freelancer to bid on open work.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <ErrorText error={error} />
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Password">
            <Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
          <Field label="I am a">
            <select
              className="w-full rounded-xl border-2 border-line bg-white px-3 py-2.5"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="freelancer">Freelancer</option>
              <option value="client">Client</option>
            </select>
          </Field>
          <Button disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
        </form>
        <p className="mt-6 text-sm font-semibold">
          Already have an account? <Link to="/login" className="text-coral">Log in</Link>
        </p>
        </div>
      </div>
    </PublicLayout>
  )
}
