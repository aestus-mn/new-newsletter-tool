'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FundName } from '@/types';

const FUNDS: FundName[] = ['Aestus I', 'Aestus II', 'Aestus III'];

interface Props {
  onSubmit: (formData: FormData) => void;
  isProcessing: boolean;
}

export default function UploadForm({ onSubmit, isProcessing }: Props) {
  const [fund, setFund] = useState<FundName | ''>('');
  const [prevFile, setPrevFile] = useState<File | null>(null);
  const [currFile, setCurrFile] = useState<File | null>(null);
  const [interimFiles, setInterimFiles] = useState<File[]>([]);

  function makeDropzone(onDrop: (files: File[]) => void) {
    return useDropzone({
      onDrop: (accepted) => { if (accepted[0]) onDrop(accepted); },
      accept: { 'application/pdf': ['.pdf'] },
      maxFiles: 1,
      disabled: isProcessing,
    });
  }

  const prevDz = makeDropzone((files) => setPrevFile(files[0]));
  const currDz = makeDropzone((files) => setCurrFile(files[0]));

  const interimDz = useDropzone({
    onDrop: (accepted) => setInterimFiles((prev) => [...prev, ...accepted]),
    accept: { 'application/pdf': ['.pdf'] },
    disabled: isProcessing,
  });

  function removeInterim(idx: number) {
    setInterimFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fund || !prevFile || !currFile) return;

    const fd = new FormData();
    fd.append('fund_name', fund);
    fd.append('prev_quarter', prevFile);
    fd.append('curr_quarter', currFile);
    interimFiles.forEach((f, i) => fd.append(`interim_${i}`, f));

    onSubmit(fd);
  }

  const canSubmit = !!fund && !!prevFile && !!currFile && !isProcessing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Fund selector */}
      <div>
        <label className="label">Fund *</label>
        <select
          value={fund}
          onChange={(e) => setFund(e.target.value as FundName)}
          disabled={isProcessing}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        >
          <option value="">Select a fund…</option>
          {FUNDS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Previous quarter */}
      <DropZone
        label="Previous Quarter LP Report *"
        file={prevFile}
        dzProps={prevDz}
        onClear={() => setPrevFile(null)}
      />

      {/* Current quarter */}
      <DropZone
        label="Current Quarter LP Report *"
        file={currFile}
        dzProps={currDz}
        onClear={() => setCurrFile(null)}
      />

      {/* Interim GP emails */}
      <div>
        <label className="label">Interim GP Email Updates (optional, multiple allowed)</label>
        <div
          {...interimDz.getRootProps()}
          className={`drop-zone ${interimDz.isDragActive ? 'drop-zone-active' : ''}`}
        >
          <input {...interimDz.getInputProps()} />
          <UploadIcon />
          <p className="mt-2 text-sm text-gray-500">
            {interimDz.isDragActive
              ? 'Drop PDFs here…'
              : 'Drag & drop PDFs, or click to browse'}
          </p>
        </div>

        {interimFiles.length > 0 && (
          <ul className="mt-2 space-y-1">
            {interimFiles.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm">
                <span className="truncate text-gray-700">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeInterim(i)}
                  className="ml-2 text-gray-400 hover:text-red-500"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          PDFs are encrypted in S3 and auto-deleted after 24 h.
        </p>
        <button type="submit" disabled={!canSubmit} className="btn-primary">
          {isProcessing ? 'Processing…' : '✨ Generate Bullets'}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  file: File | null;
  dzProps: ReturnType<typeof useDropzone>;
  onClear: () => void;
}

function DropZone({ label, file, dzProps, onClear }: DropZoneProps) {
  return (
    <div>
      <label className="label">{label}</label>
      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <span>📄</span>
            <span className="font-medium truncate max-w-xs">{file.name}</span>
            <span className="text-green-600">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="ml-2 text-gray-400 hover:text-red-500 text-xs"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          {...dzProps.getRootProps()}
          className={`drop-zone ${dzProps.isDragActive ? 'drop-zone-active' : ''}`}
        >
          <input {...dzProps.getInputProps()} />
          <UploadIcon />
          <p className="mt-2 text-sm text-gray-500">
            {dzProps.isDragActive
              ? 'Drop PDF here…'
              : 'Drag & drop PDF, or click to browse'}
          </p>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
