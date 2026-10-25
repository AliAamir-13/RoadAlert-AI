import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Upload,
  FileText,
  Download,
  MapPin,
  Building2,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  X,
  Globe2,
  Navigation,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [location, setLocation] = useState('AB Road, Indore');
  const [language, setLanguage] = useState('English');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000/analyze');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Image file size exceeds the 25MB limit.');
      return;
    }
    setError(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        setLocation(`Lat: ${lat}, Long: ${lng} (GPS Auto-Detected)`);
      },
      (err) => {
        setIsDetectingGps(false);
        setError(`GPS error: ${err.message}.`);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please upload an image of the civic issue.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter the location of the civic issue.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('location', location.trim());
    formData.append('language', language);

    try {
      let res = null;
      try {
        res = await fetch(backendUrl, {
          method: 'POST',
          body: formData,
        });
      } catch (networkErr) {
        // Fallback to relative /analyze if localhost:8000 fails
        if (backendUrl.includes(':8000')) {
          res = await fetch('/analyze', {
            method: 'POST',
            body: formData,
          });
        } else {
          throw networkErr;
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Server returned error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to analyze road hazard photograph. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDocx = () => {
    if (!result?.docx_base64) return;
    try {
      const byteCharacters = atob(result.docx_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const safeIssue = (result.issue_identified || 'Civic_Issue')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
      const today = new Date().toISOString().split('T')[0];
      const filename = `RoadAlert_Complaint_${safeIssue}_${today}.docx`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download complaint document.');
    }
  };

  const handleCopyLetter = () => {
    if (!result) return;
    const fullLetter = `To,
The Executive / Chief Engineer,
${result.department},
Location: ${result.location}

SUBJECT: URGENT CITIZEN GRIEVANCE - ${result.issue_identified.toUpperCase()} AT ${result.location.toUpperCase()}

${result.language === 'Hindi' ? 'महोदय / महोदया,' : 'Respected Sir / Madam,'}

[DANGER ASSESSMENT: ${result.danger_level.toUpperCase()} - ${result.danger_reason}]

Technical Condition:
${result.problem_description}

Official Petition:
${result.complaint_body}

Yours faithfully,
Concerned Resident / RoadAlert AI Citizen Grievance Portal`;

    navigator.clipboard.writeText(fullLetter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getDangerBadgeStyle = (level) => {
    const l = (level || '').toLowerCase();
    if (l.includes('critical')) {
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
        dot: 'bg-red-600 animate-pulse',
        label: 'CRITICAL',
      };
    }
    if (l.includes('high')) {
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-300',
        dot: 'bg-orange-500',
        label: 'HIGH',
      };
    }
    if (l.includes('medium')) {
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        dot: 'bg-yellow-500',
        label: 'MEDIUM',
      };
    }
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
      label: 'LOW',
    };
  };

  const dangerStyle = result ? getDangerBadgeStyle(result.danger_level) : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* 1. HEADER */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#D62B2B] text-white flex items-center justify-center text-2xl shadow-sm">
              <span>🚧</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                RoadAlert <span className="text-[#D62B2B]">AI</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                AI-Powered Civic Issue Reporting
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Target Endpoint:</span>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 w-44"
              title="FastAPI backend address"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        {/* 5. ERROR STATE */}
        {error && (
          <div className="bg-red-50 border-l-4 border-[#D62B2B] p-4 rounded-r-lg shadow-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D62B2B] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">Notice</h4>
                <p className="text-xs sm:text-sm text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. INPUT SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location & Language */}
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D62B2B]" />
                      Location
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={isDetectingGps}
                      className="text-xs text-[#D62B2B] hover:text-red-800 font-semibold flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      {isDetectingGps ? 'Detecting...' : 'Detect GPS'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. AB Road, Indore"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/20 focus:border-[#D62B2B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-[#D62B2B]" />
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/20 focus:border-[#D62B2B]"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                  </select>
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#D62B2B]" />
                  Photo of Civic Issue
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                {!previewUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                      isDragging
                        ? 'border-[#D62B2B] bg-red-50/50'
                        : 'border-slate-300 hover:border-[#D62B2B] hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-[#D62B2B] mb-2" />
                    <p className="text-sm font-bold text-slate-800">
                      Drag and drop image here or click to upload
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Pothole, broken streetlight, open manhole, etc.
                    </p>
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-900">
                    <img
                      src={previewUrl}
                      alt="Uploaded civic hazard preview"
                      className="w-full h-48 object-cover object-center"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 p-2.5 text-white flex items-center justify-between text-xs">
                      <span className="truncate pr-2 font-medium">{imageFile?.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-red-400 hover:text-red-200 text-xs font-semibold shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !imageFile}
                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                  isLoading || !imageFile
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#D62B2B] hover:bg-[#b82222]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>RoadAlert AI is analysing the issue...</span>
                  </>
                ) : (
                  <span>Analyse & Generate Complaint</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 4. LOADING STATE */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <RefreshCw className="w-8 h-8 text-[#D62B2B] animate-spin mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              RoadAlert AI is analysing the issue...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspecting hazard dimensions, assessing public danger level, and formatting complaint letter...
            </p>
          </div>
        )}

        {/* 3. RESULTS SECTION */}
        {result && (
          <div
            ref={resultsRef}
            className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6"
          >
            {/* Danger Level Badge & Reason */}
            <div className={`p-4 rounded-xl border ${dangerStyle?.border} ${dangerStyle?.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase">Danger Level:</span>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider ${dangerStyle?.bg} ${dangerStyle?.text} border ${dangerStyle?.border}`}
                >
                  {result.danger_level}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {result.danger_reason}
              </p>
            </div>

            {/* Two column card layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Issue Identified, Location */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Issue Identified
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {result.issue_identified}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Location
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {result.location}
                  </p>
                </div>
              </div>

              {/* Right Column: Department, Description */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Department
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {result.department}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </span>
                  <p className="text-sm font-medium text-slate-800 mt-1 leading-relaxed">
                    {result.problem_description}
                  </p>
                </div>
              </div>
            </div>

            {/* Complaint Body Letter Preview */}
            <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Official Complaint Letter Body ({result.language})
                </span>
                <button
                  onClick={handleCopyLetter}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-serif bg-white p-4 rounded border border-slate-200">
                {result.complaint_body}
              </div>
            </div>

            {/* Divider line */}
            <hr className="border-slate-200" />

            {/* Download Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Official letter includes letterhead, date, To block, justified paragraphs, colored danger indicator, and signature.
              </span>
              <button
                type="button"
                onClick={handleDownloadDocx}
                className="w-full sm:w-auto px-6 py-3 bg-[#D62B2B] hover:bg-[#b82222] text-white rounded-lg font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Complaint Letter (.docx)</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
