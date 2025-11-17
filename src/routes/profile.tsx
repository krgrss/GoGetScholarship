import { Link, createFileRoute } from '@tanstack/react-router'
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
  const [educationLevel, setEducationLevel] = useState('')
  const [currentStatus, setCurrentStatus] = useState('')
  const [gender, setGender] = useState('')
  const [raceEthnicity, setRaceEthnicity] = useState('')
  const [occupation, setOccupation] = useState('')
  const [hasFinancialNeed, setHasFinancialNeed] = useState(false)
  const [identityTags, setIdentityTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [studentSummary, setStudentSummary] = useState<string | null>(null)
  const [ranking, setRanking] = useState<any[] | null>(null)
  const [rerankError, setRerankError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults([])
    setRanking(null)
    setRerankError(null)

    // Build a simple summary string for embeddings
    const parts = [
      name && `Name: ${name}`,
      gpa && `GPA: ${gpa}`,
      major && `Major: ${major}`,
      country && `Country: ${country}`,
      educationLevel && `Education level: ${educationLevel}`,
      currentStatus && `Current status: ${currentStatus}`,
      gender && `Gender: ${gender}`,
      raceEthnicity && `Race/ethnicity: ${raceEthnicity}`,
      occupation && `Current occupation: ${occupation}`,
      hasFinancialNeed && 'Financial need: yes',
      identityTags && `Background / identity: ${identityTags}`,
      stories && `Stories: ${stories}`,
    ].filter(Boolean)
    const student_summary = parts.join('\n') || 'Student profile summary'
    setStudentSummary(student_summary)

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
      const rows = data.rows || []
      setResults(rows)

      if (rows.length > 0) {
        try {
          const rerankRes = await fetch('/api/rerank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_summary,
              candidates: rows.map((r: any) => ({
                id: String(r.id),
                name: r.name,
                snippet: r.raw_text ?? '',
                min_gpa: typeof r.min_gpa === 'number' ? r.min_gpa : undefined,
                country: r.country ?? undefined,
                fields: Array.isArray(r.fields) ? r.fields : [],
              })),
              top_k: 20,
            }),
          })
          const rerankData = await rerankRes.json()
          if (!rerankRes.ok || !rerankData.ok) {
            throw new Error(rerankData?.error || `Rerank request failed (${rerankRes.status})`)
          }

          const rankingById = new Map<string, any>()
          for (const item of rerankData.ranking || []) {
            rankingById.set(String(item.id), item)
          }

          const enriched = rows
            .map((r: any) => {
              const rr = rankingById.get(String(r.id))
              if (!rr) return null
              return {
                ...r,
                score: rr.score,
                rationale: rr.rationale,
              }
            })
            .filter(Boolean)

          setRanking(enriched as any[])
        } catch (err: any) {
          setRerankError(String(err.message || err))
        }
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Education Level</label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 p-2"
            >
              <option value="">Select...</option>
              <option value="High school">High school</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Graduate / Postgraduate">Graduate / Postgraduate</option>
              <option value="Other / non-traditional">Other / non-traditional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Current Status</label>
            <select
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 p-2"
            >
              <option value="">Select...</option>
              <option value="High school junior">High school junior</option>
              <option value="High school senior">High school senior</option>
              <option value="Undergrad year 1">Undergrad year 1</option>
              <option value="Undergrad year 2">Undergrad year 2</option>
              <option value="Undergrad year 3+">Undergrad year 3+</option>
              <option value="Graduate student">Graduate student</option>
              <option value="Working and returning to school">
                Working and returning to school
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Gender (optional)</label>
            <input
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 p-2"
              placeholder="e.g., woman, man, non-binary"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Race / Ethnicity (optional)</label>
            <input
              value={raceEthnicity}
              onChange={(e) => setRaceEthnicity(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 p-2"
              placeholder="e.g., Black, Latinx, Indigenous, Asian"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Current Occupation (optional)</label>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 p-2"
              placeholder="e.g., full-time student, part-time worker"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Financial Need</label>
            <div className="flex items-center gap-2">
              <input
                id="financial-need"
                type="checkbox"
                checked={hasFinancialNeed}
                onChange={(e) => setHasFinancialNeed(e.target.checked)}
                className="h-4 w-4 rounded border border-slate-600 bg-slate-800"
              />
              <label htmlFor="financial-need" className="text-xs text-slate-300">
                I have significant financial need
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Background / Identity (optional)</label>
            <input
              value={identityTags}
              onChange={(e) => setIdentityTags(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 p-2"
              placeholder="e.g., first-gen college student, low-income, immigrant, woman in STEM"
            />
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
          <h2 className="text-xl font-semibold">Vector Matches (Voyage + pgvector)</h2>
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
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Claude-Ranked Scholarships</h2>
            {rerankError && (
              <span className="text-xs text-red-400">Rerank error: {rerankError}</span>
            )}
          </div>
          {!ranking && !rerankError && (
            <p className="text-sm text-slate-400">Reranking with Claude�?�</p>
          )}
          {ranking && ranking.length > 0 && (
            <ul className="space-y-2">
              {ranking.map((r) => (
                <li
                  key={r.id}
                  className="p-3 rounded border border-slate-700 bg-slate-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/scholarship/$id"
                      params={{ id: String(r.id) }}
                      search={studentSummary ? { studentSummary } : undefined}
                      className="font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      {r.name}
                    </Link>
                    <span className="text-xs text-slate-300 bg-slate-900/60 px-2 py-1 rounded">
                      Score: {typeof r.score === 'number' ? r.score : '�?"'}
                    </span>
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      className="text-cyan-400 text-xs"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.url}
                    </a>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    {r.rationale || 'No rationale provided.'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
/**
 * Simple Profile page (Day 1 demo)
 * - Collects minimal student profile info and calls /api/match.
 * - Also calls /api/rerank to show a Claude-ranked list with rationales.
 * - Not persisted; only builds a summary string for embeddings.
 */
