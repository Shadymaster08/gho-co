'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Sparkles, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

interface Finding {
  category: string
  item: string
  current_supplier: string
  current_price: string
  alternative_name: string
  alternative_url: string
  estimated_price: string
  estimated_saving_pct: number
  notes: string
}

interface Report {
  id: string
  ran_at: string
  findings: Finding[]
  total_findings: number
  triggered_by: string
  email_sent: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  shirts: 'bg-indigo-50 text-indigo-700',
  dtf: 'bg-pink-50 text-pink-700',
  filament: 'bg-emerald-50 text-emerald-700',
}

export function SupplierScoutPanel() {
  const [reports, setReports] = useState<Report[]>([])
  const [running, setRunning] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadReports() {
    setLoading(true)
    const res = await fetch('/api/agents/supplier-scout')
    if (res.ok) {
      const data = await res.json()
      setReports(data.reports ?? [])
      if (data.reports?.length > 0 && !expandedId) {
        setExpandedId(data.reports[0].id)
      }
    }
    setLoading(false)
  }

  async function runScout() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/supplier-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'manual' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Scout failed')
        setRunning(false)
        return
      }
      await loadReports()
      if (data.report_id) setExpandedId(data.report_id)
    } catch {
      setError('Network error — try again')
    }
    setRunning(false)
  }

  useEffect(() => { loadReports() }, [])

  const latest = reports[0]

  return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d2d2d7] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0071e3]" />
            <span className="font-semibold text-[#1d1d1f]">Supplier Scout</span>
          </div>
          <p className="mt-0.5 text-xs text-[#86868b]">
            Asks Claude to research cheaper alternatives to your current suppliers
            {latest && (
              <span className="ml-2">· Last run {new Date(latest.ran_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </p>
        </div>
        <button
          onClick={runScout}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] disabled:opacity-60"
        >
          {running ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Scouting…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Run scout
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-6">
        {running && (
          <div className="mb-4 rounded-xl bg-[#f5f5f7] p-4">
            <p className="text-sm font-medium text-[#1d1d1f]">Analysing your supplier prices…</p>
            <p className="mt-1 text-xs text-[#86868b]">Claude is researching alternatives. This takes about 15–30 seconds.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !running ? (
          <p className="text-sm text-[#86868b]">Loading reports…</p>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d2d2d7] p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#d2d2d7]" />
            <p className="text-sm font-medium text-[#1d1d1f]">No scout reports yet</p>
            <p className="mt-1 text-xs text-[#86868b]">Click "Run scout" to find savings opportunities. Also requires migration 004 in Supabase.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map(report => (
              <div key={report.id} className="rounded-xl border border-[#d2d2d7] overflow-hidden">
                {/* Report header row */}
                <button
                  onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#f5f5f7] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-3.5 w-3.5 text-[#86868b]" />
                    <span className="text-sm font-medium text-[#1d1d1f]">
                      {new Date(report.ran_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {report.total_findings > 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {report.total_findings} finding{report.total_findings > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-xs font-medium text-[#86868b]">
                        No alternatives found
                      </span>
                    )}
                    {report.email_sent && (
                      <span className="text-xs text-[#86868b]">· Email sent</span>
                    )}
                  </div>
                  {expandedId === report.id ? (
                    <ChevronUp className="h-4 w-4 text-[#86868b]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#86868b]" />
                  )}
                </button>

                {/* Findings table */}
                {expandedId === report.id && report.findings.length > 0 && (
                  <div className="border-t border-[#d2d2d7] px-4 pb-4">
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#d2d2d7] text-left">
                          <th className="pb-2 text-xs font-medium text-[#86868b]">Item</th>
                          <th className="pb-2 text-xs font-medium text-[#86868b]">Current</th>
                          <th className="pb-2 text-xs font-medium text-[#86868b]">Alternative</th>
                          <th className="pb-2 text-center text-xs font-medium text-[#86868b]">Saving</th>
                          <th className="pb-2 text-xs font-medium text-[#86868b]">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.findings.map((f, i) => (
                          <tr key={i} className="border-b border-[#d2d2d7] last:border-0">
                            <td className="py-3 pr-3">
                              <p className="font-medium text-[#1d1d1f]">{f.item}</p>
                              <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-xs ${CATEGORY_COLORS[f.category] ?? 'bg-gray-100 text-gray-600'}`}>
                                {f.category}
                              </span>
                            </td>
                            <td className="py-3 pr-3">
                              <p className="text-[#1d1d1f]">{f.current_supplier}</p>
                              <p className="text-xs text-[#86868b]">{f.current_price}</p>
                            </td>
                            <td className="py-3 pr-3">
                              <a
                                href={f.alternative_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-[#0071e3] hover:underline"
                              >
                                {f.alternative_name} <ExternalLink className="h-3 w-3" />
                              </a>
                              <p className="text-xs text-[#86868b]">{f.estimated_price}</p>
                            </td>
                            <td className="py-3 pr-3 text-center">
                              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                ~{f.estimated_saving_pct}% less
                              </span>
                            </td>
                            <td className="py-3 text-xs text-[#86868b] max-w-[200px]">{f.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {expandedId === report.id && report.findings.length === 0 && (
                  <div className="border-t border-[#d2d2d7] px-4 py-4">
                    <p className="text-sm text-[#86868b]">No cheaper alternatives found — your current suppliers appear to be competitive.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#d2d2d7] px-6 py-3">
        <p className="text-xs text-[#86868b]">
          Findings are AI-generated estimates. Always verify prices directly with suppliers before switching.
          Run every 2–4 weeks to stay on top of market changes.
        </p>
      </div>
    </div>
  )
}
