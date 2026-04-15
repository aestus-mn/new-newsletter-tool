'use client';

import { useState } from 'react';
import type { Bullet } from '@/types';

interface Props {
  bullet: Bullet;
  sessionId: string;
  onChange: (updated: Bullet) => void;
}

export default function BulletCard({ bullet, sessionId, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(bullet.edited_text ?? bullet.bullet_text);
  const [saving, setSaving] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const displayText = bullet.edited_text ?? bullet.bullet_text;

  async function save() {
    if (editText.trim() === displayText) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bullets/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullet_id: bullet.id, edited_text: editText.trim() }),
      });
      if (!res.ok) throw new Error('Save failed');
      const { bullet: updated } = await res.json();
      onChange(updated);
      setEditing(false);
    } catch {
      alert('Could not save edit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleApprove() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bullets/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullet_id: bullet.id, approved: !bullet.approved }),
      });
      if (!res.ok) throw new Error('Update failed');
      const { bullet: updated } = await res.json();
      onChange(updated);
    } catch {
      alert('Could not update approval. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const borderColor = bullet.approved
    ? 'border-green-200'
    : bullet.flagged
    ? 'border-amber-300'
    : 'border-gray-200';

  const bgColor = bullet.approved
    ? 'bg-green-50'
    : bullet.flagged
    ? 'bg-amber-50'
    : 'bg-white';

  const confidenceBadge = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  }[bullet.confidence];

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-4 transition-all`}>
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{bullet.company_name}</h3>

          {bullet.flagged && !bullet.approved && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
              ⚠ Needs review
            </span>
          )}
          {bullet.approved && (
            <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
              ✓ Approved
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBadge}`}>
            {bullet.confidence} confidence
          </span>
          {bullet.edited_text && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Edited
            </span>
          )}
        </div>
      </div>

      {/* Bullet text */}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-brand-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditText(displayText); setEditing(false); }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-sm leading-relaxed text-gray-800">{displayText}</p>
      )}

      {/* Source quote (collapsible) */}
      {bullet.source_quote && (
        <div className="mb-3">
          <button
            onClick={() => setShowSource((s) => !s)}
            className="text-xs text-gray-400 hover:text-brand-500 transition-colors"
          >
            {showSource ? '▲ Hide source' : '▼ Show source quote'}
          </button>
          {showSource && (
            <blockquote className="mt-2 border-l-4 border-gray-200 pl-3 text-xs italic text-gray-500">
              {bullet.source_quote}
            </blockquote>
          )}
        </div>
      )}

      {/* Action row */}
      {!editing && (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            disabled={saving || bullet.approved}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            ✏ Edit
          </button>
          <button
            onClick={toggleApprove}
            disabled={saving}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-colors ${
              bullet.approved
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {saving ? '…' : bullet.approved ? 'Unapprove' : '✓ Approve'}
          </button>
        </div>
      )}
    </div>
  );
}
