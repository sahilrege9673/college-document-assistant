import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { documentsAPI } from '../../api/documents';
import { formatBytes } from '../../utils/formatters';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '../../utils/constants';

export default function Dropzone({ onUploadSuccess, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(''); // 'uploading' | 'processing'
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      onError('Only PDF documents are allowed (.pdf).');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError(`File exceeds ${MAX_FILE_SIZE_MB} MB limit (${formatBytes(file.size)}).`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setStage('uploading');

    try {
      const doc = await documentsAPI.upload(file, (e) => {
        if (e.total) {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
          if (percent >= 100) {
            setStage('processing');
          }
        }
      });

      onUploadSuccess(doc);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload document.';
      onError(msg);
    } finally {
      setUploading(false);
      setProgress(0);
      setStage('');
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-brand-500 bg-brand-50/60'
          : 'border-slate-300 hover:border-slate-400 bg-white/60'
      } ${uploading ? 'pointer-events-none opacity-90' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="flex flex-col items-center justify-center space-y-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
            uploading ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {uploading
              ? stage === 'uploading'
                ? `Uploading PDF (${progress}%)`
                : 'Receiving file & scheduling background AI indexing...'
              : 'Click to upload or drag & drop study materials'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Syllabi, lecture notes, textbook chapters, or scanned exam papers (Max {MAX_FILE_SIZE_MB} MB)
          </p>
        </div>

        {uploading && (
          <div className="w-full max-w-xs mt-2">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
