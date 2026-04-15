'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import UploadForm from '@/components/UploadForm';

export default function DashboardPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Upload files → get session ID
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const { error: msg } = await uploadRes.json();
        throw new Error(msg || 'Upload failed');
      }

      const { session_id } = await uploadRes.json();

      // Step 2: Kick off generation
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id }),
      });

      if (!genRes.ok) {
        const { error: msg } = await genRes.json();
        throw new Error(msg || 'Generation failed');
      }

      // Step 3: Navigate to review page
      router.push(`/review/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate LP Bullets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload quarterly reports and interim emails to generate AI-drafted newsletter bullets.
          </p>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Security note:</strong> All uploaded files are encrypted at rest in S3 and automatically deleted after 24 hours. Anthropic does not train on API data.
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Upload form card */}
      <div className="card p-6">
        <UploadForm onSubmit={handleSubmit} isProcessing={isProcessing} />
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
            <p className="text-sm font-medium text-gray-700">
              Uploading files and generating bullets…
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This usually takes 30–90 seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
