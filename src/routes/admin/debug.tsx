import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/debug')({
  component: DebugPage,
})

function DebugPage() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-medium">Admin Debug</h2>
      <p>Show weights, reranker output, and pipeline traces here.</p>
    </div>
  )
}
/**
 * Admin Debug page
 * - Placeholder to visualize pipeline traces, weights, and outputs.
 * - Extend to show latest personality profiles and drafts.
 */
