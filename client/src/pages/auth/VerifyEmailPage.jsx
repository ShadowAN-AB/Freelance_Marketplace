import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicLayout } from '../../layouts/Layouts'
import { Button, ErrorText, Field, Input } from '../../components/ui/Primitives'
import api from '../../services/api'
import { errorMessage } from '../../lib/format'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function verify(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.get('/auth/verify-email', { params: { token } })
      setOk('Email verified. You can close this page.')
    } catch (err) {
      setError(errorMessage(err, 'Could not verify email'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Verify email</h1>
        <form className="mt-6 space-y-3" onSubmit={verify}>
          <ErrorText error={error} />
          {ok ? <p className="font-semibold text-teal">{ok}</p> : null}
          <Field label="Token">
            <Input value={token} readOnly />
          </Field>
          <Button disabled={busy || !token}>{busy ? 'Verifying…' : 'Confirm email'}</Button>
        </form>
        <p className="mt-6 text-sm">
          <Link className="text-teal" to="/login">
            Back to login
          </Link>
        </p>
      </div>
    </PublicLayout>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setOk('If that account exists, a reset link was sent.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Forgot password</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <ErrorText error={error} />
          {ok ? <p className="font-semibold text-teal">{ok}</p> : null}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button disabled={busy}>Send reset link</Button>
        </form>
      </div>
    </PublicLayout>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({ token: params.get('token') || '', newPassword: '' })
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/auth/reset-password', form)
      setOk('Password updated. You can log in now.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">Reset password</h1>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <ErrorText error={error} />
          {ok ? <p className="font-semibold text-teal">{ok}</p> : null}
          <Field label="New password">
            <Input
              type="password"
              minLength={8}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              required
            />
          </Field>
          <Button disabled={busy}>Update password</Button>
        </form>
        <p className="mt-6 text-sm">
          <Link className="text-teal" to="/login">
            Back to login
          </Link>
        </p>
      </div>
    </PublicLayout>
  )
}
