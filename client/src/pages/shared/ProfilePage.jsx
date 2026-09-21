import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { Button, ErrorText, Field, Input, Textarea } from '../../components/ui/Primitives'
import { errorMessage } from '../../lib/format'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    title: user.freelancerProfile?.title || '',
    skills: (user.freelancerProfile?.skills || []).join(', '),
    hourlyRate: user.freelancerProfile?.hourlyRate || '',
    availability: user.freelancerProfile?.availability || 'available',
    companyName: user.clientProfile?.companyName || '',
    portfolio: (user.freelancerProfile?.portfolio || [])
      .map((item) => [item.title, item.url, item.imageUrl].filter(Boolean).join(' | '))
      .join('\n'),
  })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      const payload = { name: form.name, bio: form.bio, location: form.location }
      if (user.role === 'freelancer') {
        payload.freelancerProfile = {
          title: form.title,
          skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
          hourlyRate: Number(form.hourlyRate) || 0,
          availability: form.availability,
          portfolio: form.portfolio
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [title, url = '', imageUrl = ''] = line.split('|').map((p) => p.trim())
              return { title, url, imageUrl }
            }),
        }
      }
      if (user.role === 'client') payload.clientProfile = { companyName: form.companyName }
      const { data } = await api.patch('/users/me', payload)
      setUser(data.user)
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function onAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('avatar', file)
    const { data } = await api.post('/users/me/avatar', fd)
    setUser(data.user)
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">Profile</h1>
      <form onSubmit={save} className="mt-6 space-y-4">
        <ErrorText error={error} />
        {saved ? <p className="text-teal">Saved.</p> : null}
        <Field label="Avatar">
          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} />
        </Field>
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Location">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        <Field label="Bio">
          <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        {user.role === 'client' ? (
          <Field label="Company">
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
        ) : null}
        {user.role === 'freelancer' ? (
          <>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Skills (comma separated)">
              <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </Field>
            <Field label="Hourly rate (INR)">
              <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
            </Field>
            <Field label="Availability">
              <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
                <option value="available">available</option>
                <option value="busy">busy</option>
                <option value="unavailable">unavailable</option>
              </select>
            </Field>
            <Field label="Portfolio (one per line: title | url | image url)">
              <Textarea rows={4} value={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.value })} />
            </Field>
            {(user.freelancerProfile?.verifiedSkills || []).length ? (
              <p className="text-sm font-semibold text-teal">Verified: {user.freelancerProfile.verifiedSkills.join(', ')}</p>
            ) : null}
          </>
        ) : null}
        <Button>Save profile</Button>
      </form>
    </div>
  )
}
