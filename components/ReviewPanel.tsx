'use client';

import { useState } from 'react';
import BulletCard from './BulletCard';
import type { Bullet } from '@/types';

type FilterMode = 'all' | 'flagged' | 'approved' | 'pending';

interface Props {
  bullets: Bullet[];
  sessionId: string;
  onBulletChange: (updated: Bullet) => void;
}

export default function ReviewPanel({ bullets, sessionId, onBulletChange }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all');

  const filtered = bullets.filter((b) => {
    if (filter === 'flagged') return b.flagged && !b.approved;
    if (filter === 'approved') return b.approved;
    if (filter === 'pending') return !b.approved && !b.flagged;
    return true;
  });

  const counts = {
    all: bullets.length,
    flagged: bullets.filter((b) => b.flagged && !b.approved).length,
    approved: bullets.filter((b) => b.approved).length,
    pending: bullets.filter((b) => !b.approved && !b.flagged).length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(counts) as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === mode
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}{' '}
            <span className="opacity-70">({counts[mode]})</span>
          </button>
        ))}
      </div>

      {/* Bullet list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No bullets in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BulletCard
              key={b.id}
              bullet={b}
              sessionId={sessionId}
              onChange={onBulletChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
