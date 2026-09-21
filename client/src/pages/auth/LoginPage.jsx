import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PublicLayout } from '../../layouts/Layouts'
import { Button, ErrorText, Field, Input } from '../../components/ui/Primitives'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/format'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate(data.user.role === 'admin' ? '/admin' : '/app/dashboard')
    } catch (err) {
      setError(errorMessage(err, 'Could not log in'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Log in</h1>
        <p className="mt-2 text-muted">
          Demo password <code className="rounded bg-paper-2 px-1">Password123!</code>
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <ErrorText error={error} />
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
          <Button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-6 text-sm">
          New here? <Link to="/register" className="text-teal">Create an account</Link>
        </p>
      </div>
    </PublicLayout>
  )
}
