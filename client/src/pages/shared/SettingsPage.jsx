import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button, ErrorText, Field, Input } from '../../components/ui/Primitives'
import { errorMessage } from '../../lib/format'
import api from '../../services/api'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pending, setPending] = useState(false)

  async function changePassword(e) {
    e.preventDefault()
    setError('')
    setOk('')
    if (form.newPassword !== form.confirm) {
      setError('New passwords do not match')
      return
    }
    setPending(true)
    try {
      await api.patch('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setOk('Password updated')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="mt-4 text-muted">Signed in as {user.email}. Admin accounts are seeded, not self-registered.</p>

      <form className="mt-8 space-y-3 rounded-2xl border-2 border-ink/10 bg-white p-5" onSubmit={changePassword}>
        <h2 className="font-display text-2xl">Change password</h2>
        <ErrorText error={error} />
        {ok ? <p className="text-sm font-semibold text-teal">{ok}</p> : null}
        <Field label="Current password">
          <Input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
        </Field>
        <Field label="New password">
          <Input type="password" minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" minLength={8} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        </Field>
        <Button disabled={pending}>{pending ? 'Saving…' : 'Update password'}</Button>
      </form>

      <div className="mt-6">
        <Button variant="danger" onClick={logout}>Log out</Button>
      </div>
    </div>
  )
}
