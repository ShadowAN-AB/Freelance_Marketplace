import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Button, ErrorText, Field, Input, Textarea } from '../../components/ui/Primitives'
import { CATEGORIES, errorMessage } from '../../lib/format'

export default function PostProjectPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    skills: '',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
  })
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/projects', {
        ...form,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        budgetMin: Number(form.budgetMin),
        budgetMax: Number(form.budgetMax),
      })
      navigate(`/projects/${data.project._id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">Post a project</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <ErrorText error={error} />
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </Field>
        <Field label="Description">
          <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </Field>
        <Field label="Category">
          <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Skills (comma separated)">
          <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget min">
            <Input type="number" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} required />
          </Field>
          <Field label="Budget max">
            <Input type="number" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} required />
          </Field>
        </div>
        <Field label="Deadline">
          <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
        </Field>
        <Button>Publish</Button>
      </form>
    </div>
  )
}
