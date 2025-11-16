import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [name, setName] = useState('')
  const [gpa, setGpa] = useState<string>('')
  const [major, setMajor] = useState('')
  const [country, setCountry] = useState('')
  const [stories, setStories] = useState('')
  const [minGpa, setMinGpa] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults([])

    // Build a simple summary string for embeddings
    const parts = [
      name && `Name: ${name}`,
      gpa && `GPA: ${gpa}`,
      major && `Major: ${major}`,
      country && `Country: ${country}`,
      stories && `Stories: ${stories}`,
    ].filter(Boolean)
    const student_summary = parts.join('\n') || 'Student profile summary'

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_summary,
          min_gpa: minGpa ? Number(minGpa) : undefined,
          k: 20,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      setResults(data.rows || [])
    } catch (err: any) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Student Profile</h1>
      <p className="text-slate-500">Fill out a few fields and fetch top matching scholarships.</p>

      <form onSubmit={onSubmit} className="space-y-4 bg-slate-800/40 border border-slate-700 p-4 rounded">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">GPA</label>
            <input value={gpa} onChange={(e) => setGpa(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2" placeholder="e.g., 3.7" />
          </div>
          <div>
            <label className="block text-sm mb-1">Major</label>
            <input value={major} onChange={(e) => setMajor(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Filter: Min Scholarship GPA</label>
            <input value={minGpa} onChange={(e) => setMinGpa(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2" placeholder="optional" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Stories / Achievements</label>
          <textarea value={stories} onChange={(e) => setStories(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-800 p-2" rows={5} placeholder="Briefly describe projects, leadership, community, need, etc." />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50">
            {loading ? 'Matching…' : 'Find Scholarships'}
          </button>
          {error && <span className="text-red-400 text-sm">{error}</span>}
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Results</h2>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id} className="p-3 rounded border border-slate-700 bg-slate-800/40">
                <div className="font-medium">{r.name}</div>
                {r.url && (
                  <a href={r.url} className="text-cyan-400 text-sm" target="_blank" rel="noreferrer">
                    {r.url}
                  </a>
                )}
                <div className="text-xs text-slate-400">min_gpa: {r.min_gpa ?? '—'} | dot_sim: {typeof r.dot_sim === 'number' ? r.dot_sim.toFixed(4) : '—'}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
/**
 * Simple Profile page (Day 1 demo)
 * - Collects minimal student profile info and calls /api/match.
 * - Not persisted; only builds a summary string for embeddings.
 */
