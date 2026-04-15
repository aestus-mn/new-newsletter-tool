'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import ReviewPanel from '@/components/ReviewPanel';
import type { Bullet } from '@/types';

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Load bullets on mount
  useEffect(() => {
    async function loadBullets() {
      try {
        const res = await fetch(`/api/bullets/${sessionId}`);
        if (!res.ok) throw new Error('Could not load bullets');
        const data = await res.json();
        setBullets(data.bullets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bullets');
      } finally {
        setLoading(false);
      }
    }
    loadBullets();
  }, [sessionId]);

  // Optimistic update when a bullet is edited or approved
  function handleBulletChange(updated: Bullet) {
    setBullets((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b)),
    );
  }

  // Export to .docx
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lp-bullets-${sessionId.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const flaggedCount = bullets.filter((b) => b.flagged && !b.approved).length;
  const approvedCount = bullets.filter((b) => b.approved).length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-2 text-xs text-brand-500 hover:underline"
          >
            ← New run
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Review Bullets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Edit inline, approve each bullet, then export to .docx.
          </p>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      {/* Stats bar */}
      {!loading && bullets.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-4">
          <Stat label="Total companies" value={bullets.length} />
          <Stat label="Needs review" value={flaggedCount} amber={flaggedCount > 0} />
          <Stat label="Approved" value={approvedCount} />
        </div>
      )}

      {/* Legend */}
      {!loading && bullets.length > 0 && (
        <div className="mb-4 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
            Flagged — needs review
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-green-400" />
            Approved
          </span>
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-500">
          Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && (
        <ReviewPanel
          bullets={bullets}
          sessionId={sessionId}
          onBulletChange={handleBulletChange}
        />
      )}

      {/* Export bar */}
      {!loading && bullets.length > 0 && (
        <div className="mt-8 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            {approvedCount} of {bullets.length} bullets approved
            {flaggedCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {flaggedCount} still flagged
              </span>
            )}
          </p>
          <div className="flex gap-3">
            {exportSuccess && (
              <span className="self-center text-xs text-green-600">
                ✓ Downloaded
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary"
            >
              {exporting ? 'Exporting…' : 'Export to .docx'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  amber,
}: {
  label: string;
  value: number;
  amber?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-2 ${
        amber
          ? 'border-amber-200 bg-amber-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`text-xl font-bold ${
          amber ? 'text-amber-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
