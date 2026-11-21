import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { documentsAPI } from '../../api/documents';
import { formatBytes } from '../../utils/formatters';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '../../utils/constants';

export default function Dropzone({ onUploadSuccess, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState([]); // [{ id, file, status: 'queued'|'uploading'|'processing'|'ready'|'failed', progress: 0, error: '' }]
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef(null);

  const addFilesToQueue = (fileList) => {
    const newItems = [];
    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        onError?.(`"${file.name}" ignored: Only PDF documents are allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        onError?.(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB cap (${formatBytes(file.size)}).`);
        continue;
      }

      // Avoid exact duplicates in current queue
      if (queue.some((q) => q.file.name === file.name && q.file.size === file.size)) {
        continue;
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: 'queued',
        progress: 0,
        error: '',
      });
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const removeQueueItem = (id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isUploading) return;
    setQueue([]);
    setOverallProgress(0);
  };

  const processBatchUpload = async () => {
    const pendingItems = queue.filter((item) => item.status === 'queued' || item.status === 'failed');
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    const filesToUpload = pendingItems.map((item) => item.file);

    // Update statuses to uploading
    setQueue((prev) =>
      prev.map((item) =>
        pendingItems.some((p) => p.id === item.id)
          ? { ...item, status: 'uploading', progress: 10, error: '' }
          : item
      )
    );

    try {
      const res = await documentsAPI.uploadBatch(filesToUpload, (e) => {
        if (e.total) {
          const percent = Math.min(95, Math.round((e.loaded * 100) / e.total));
          setOverallProgress(percent);
          setQueue((prev) =>
            prev.map((item) =>
              item.status === 'uploading' ? { ...item, progress: percent } : item
            )
          );
        }
      });

      // Mark uploaded docs
      const uploadedNames = new Set((res.uploaded || []).map((d) => d.file_name));
      const failedMap = new Map((res.failed || []).map((f) => [f.file_name, f.error]));

      setQueue((prev) =>
        prev.map((item) => {
          if (uploadedNames.has(item.file.name)) {
            return { ...item, status: 'ready', progress: 100 };
          }
          if (failedMap.has(item.file.name)) {
            return {
              ...item,
              status: 'failed',
              progress: 0,
              error: failedMap.get(item.file.name) || 'Upload failed',
            };
          }
          return item;
        })
      );

      setOverallProgress(100);
      if (res.uploaded && res.uploaded.length > 0) {
        onUploadSuccess?.(res.uploaded);
      }
      if (res.failed && res.failed.length > 0) {
        onError?.(`${res.failed.length} file(s) could not be indexed.`);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Batch upload failed. Please try again.';
      setQueue((prev) =>
        prev.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'failed', error: msg } : item
        )
      );
      onError?.(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const queuedCount = queue.filter((i) => i.status === 'queued' || i.status === 'failed').length;
  const readyCount = queue.filter((i) => i.status === 'ready').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-7 md:p-9 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-brand-500 bg-brand-50/70 scale-[0.99]'
            : 'border-slate-300 hover:border-brand-400 bg-gradient-to-b from-white to-slate-50/50 hover:bg-slate-50/80 shadow-xs'
        } ${isUploading ? 'pointer-events-none opacity-85' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFilesToQueue(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
              isDragging
                ? 'bg-brand-600 text-white shadow-brand-500/20'
                : 'bg-brand-50 text-brand-600 border border-brand-100'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm md:text-base font-semibold text-slate-900">
              {isUploading ? (
                'Processing & Vectorizing Documents...'
              ) : (
                <>
                  Drop course syllabi & notes here, or{' '}
                  <span className="text-brand-600 hover:underline">browse files</span>
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supports <strong>multiple PDFs</strong> at once • Up to <strong>{MAX_FILE_SIZE_MB} MB per file</strong> •
              OCR & Multimodal Diagram parsing enabled
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-1 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              PDF / Scanned Notes
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Batch Queuing (1–10+ files)
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Gemini Vision OCR
            </span>
          </div>
        </div>
      </div>

      {/* Batch Staging & Queue Table */}
      {queue.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                Batch Upload Queue ({queue.length} file{queue.length > 1 ? 's' : ''})
              </h4>
              {readyCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {readyCount} indexed
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              {!isUploading && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearQueue}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent rounded-lg transition-colors"
                  >
                    <span>Clear</span>
                  </button>
                </>
              )}

              {queuedCount > 0 && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={processBatchUpload}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Vectorizing ({overallProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Batch Upload ({queuedCount})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Queue items */}
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate max-w-xs sm:max-w-md">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatBytes(item.file.size)}
                      {item.error && <span className="text-rose-600 ml-2 font-medium">• {item.error}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {item.status === 'queued' && (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Queued
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{item.progress}%</span>
                    </span>
                  )}
                  {item.status === 'ready' && (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Indexed</span>
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Failed</span>
                    </span>
                  )}

                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removeQueueItem(item.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}