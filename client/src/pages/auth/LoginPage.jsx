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
        <div className="rounded-3xl border-2 border-ink/10 bg-white p-8 shadow-[10px_10px_0_rgba(255,77,46,0.12)]">
          <h1 className="font-display text-4xl">Welcome back</h1>
          <p className="mt-2 text-muted">Sign in to manage projects, proposals, and escrow.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <ErrorText error={error} />
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </Field>
            <Button disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-sm font-semibold">
            <Link to="/forgot-password" className="text-teal">
              Forgot password?
            </Link>
          </p>
          <p className="mt-6 text-sm text-muted">
            New here?{' '}
            <Link to="/register" className="font-semibold text-coral">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
