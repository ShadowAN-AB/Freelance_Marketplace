import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { Button, ErrorText, Field, Input, Textarea } from '../../components/ui/Primitives'
import { CATEGORIES, errorMessage } from '../../lib/format'

function emptyMilestones() {
  return [
    { title: 'Discovery', amount: '' },
    { title: 'Build', amount: '' },
  ]
}

export default function PostProjectPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    skills: '',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    pricingType: 'fixed',
  })
  const [split, setSplit] = useState(false)
  const [milestones, setMilestones] = useState(emptyMilestones)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    if (!editing) return undefined
    let cancelled = false
    api.get(`/projects/${id}`).then(({ data }) => {
      if (cancelled) return
      const p = data.project
      setForm({
        title: p.title || '',
        description: p.description || '',
        category: p.category || 'Web Development',
        skills: (p.skills || []).join(', '),
        budgetMin: p.budgetMin ?? '',
        budgetMax: p.budgetMax ?? '',
        deadline: p.deadline ? String(p.deadline).slice(0, 10) : '',
        pricingType: p.pricingType || 'fixed',
      })
      if (p.milestones?.length > 1) {
        setSplit(true)
        setMilestones(p.milestones.map((m) => ({ title: m.title, amount: String(m.amount) })))
      }
    }).catch((err) => setError(errorMessage(err))).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [editing, id])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      budgetMin: Number(form.budgetMin),
      budgetMax: Number(form.budgetMax),
      deadline: form.deadline,
      pricingType: form.pricingType,
    }
    if (form.pricingType === 'fixed' && split) {
      const rows = milestones
        .map((m) => ({ title: m.title.trim(), amount: Number(m.amount) }))
        .filter((m) => m.title && m.amount > 0)
      if (rows.length < 2 || rows.length > 3) {
        setError('Use 2 or 3 milestones')
        return
      }
      const sum = rows.reduce((s, m) => s + m.amount, 0)
      if (sum !== Number(form.budgetMax)) {
        setError('Milestone amounts must add up to the max budget')
        return
      }
      payload.milestones = rows
    } else {
      payload.milestones = []
    }
    try {
      const { data } = editing
        ? await api.patch(`/projects/${id}`, payload)
        : await api.post('/projects', payload)
      navigate(`/projects/${data.project._id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (loading) return <p className="p-8 font-semibold text-teal">Loading…</p>

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">{editing ? 'Edit project' : 'Post a project'}</h1>
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
        <Field label="Pricing">
          <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}>
            <option value="fixed">Fixed price</option>
            <option value="hourly">Hourly (escrow cap = max budget)</option>
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
        {form.pricingType === 'fixed' ? (
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} />
            Split into milestones
          </label>
        ) : null}
        {form.pricingType === 'fixed' && split ? (
          <div className="space-y-2 rounded-2xl border-2 border-ink/10 bg-white p-4">
            {milestones.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Input placeholder="Title" value={row.title} onChange={(e) => {
                  const next = [...milestones]
                  next[i] = { ...row, title: e.target.value }
                  setMilestones(next)
                }} />
                <Input type="number" placeholder="Amount" value={row.amount} onChange={(e) => {
                  const next = [...milestones]
                  next[i] = { ...row, amount: e.target.value }
                  setMilestones(next)
                }} />
              </div>
            ))}
            {milestones.length < 3 ? (
              <button type="button" className="text-sm font-bold text-teal" onClick={() => setMilestones([...milestones, { title: '', amount: '' }])}>
                Add milestone
              </button>
            ) : null}
          </div>
        ) : null}
        <Button>{editing ? 'Save changes' : 'Publish'}</Button>
      </form>
    </div>
  )
}
