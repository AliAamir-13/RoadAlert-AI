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
  FileCode,
  Globe2,
  Navigation,
  Info,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_PRESETS, svgToFile } from './sampleImages.ts';

interface AnalysisResult {
  issue_identified: string;
  danger_level: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  danger_reason: string;
  problem_description: string;
  complaint_body: string;
  department: string;
  location: string;
  language: string;
  docx_base64: string;
  timestamp?: string;
}

export default function App() {
  const [location, setLocation] = useState('AB Road, Indore');
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [backendEndpoint, setBackendEndpoint] = useState<string>('/analyze');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing vision inspection...');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Loading step cycling animation
  useEffect(() => {
    if (!isLoading) return;
    const steps = [
      'RoadAlert AI is analysing the issue...',
      'Scanning surface pavement defects and visual geometry...',
      'Assessing risk severity level and public pedestrian hazards...',
      'Identifying jurisdictional municipal department...',
      'Synthesizing formal complaint text and formatting .docx petition...',
    ];
    let idx = 0;
    setLoadingStep(steps[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setLoadingStep(steps[idx]);
    }, 2400);
    return () => clearInterval(timer);
  }, [isLoading]);

  // Handle file selection
  const handleFile = (file: File) => {
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
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

  // Load sample preset
  const handleLoadSample = async (preset: typeof SAMPLE_PRESETS[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      setLocation(preset.location);
      setLanguage(preset.language as 'English' | 'Hindi');
      const file = await svgToFile(preset.svgData, preset.filename);
      handleFile(file);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load sample image.');
    } finally {
      setIsLoading(false);
    }
  };

  // Detect GPS
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
        setLocation(`Lat: ${lat}, Long: ${lng} (Coordinates Detected)`);
      },
      (err) => {
        setIsDetectingGps(false);
        setError(`GPS error: ${err.message}. Using default location.`);
      },
      { timeout: 8000 }
    );
  };

  // Submit analysis
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('Please upload or select an image of the civic issue before submitting.');
      return;
    }
    if (!location.trim()) {
      setError('Please specify the location of the civic issue.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('location', location.trim());
    formData.append('language', language);

    try {
      // Primary attempt
      let res: Response | null = null;
      let primaryUrl = backendEndpoint;

      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          body: formData,
        });
      } catch (networkErr: any) {
        // If user attempted localhost:8000 but it's down, fallback automatically to /analyze
        if (primaryUrl.includes(':8000')) {
          console.warn('FastAPI on port 8000 unreachable, falling back to /analyze');
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
        throw new Error(errorData.detail || errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err?.message || 'Failed to complete analysis. Please verify server connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download .docx file from base64
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
      setError('Failed to trigger document download.');
    }
  };

  // Copy formal letter text to clipboard
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

  // Danger badge styles
  const getDangerBadgeStyle = (level: string) => {
    const l = (level || '').toLowerCase();
    if (l.includes('critical')) {
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
        iconColor: 'text-red-600',
        dot: 'bg-red-600 animate-pulse',
        label: 'CRITICAL',
      };
    }
    if (l.includes('high')) {
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-300',
        iconColor: 'text-orange-600',
        dot: 'bg-orange-500',
        label: 'HIGH',
      };
    }
    if (l.includes('medium')) {
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        iconColor: 'text-yellow-600',
        dot: 'bg-yellow-500',
        label: 'MEDIUM',
      };
    }
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      iconColor: 'text-emerald-600',
      dot: 'bg-emerald-500',
      label: 'LOW',
    };
  };

  const dangerStyle = result ? getDangerBadgeStyle(result.danger_level) : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Government-Style Strip */}
      <div className="bg-[#B31D1D] text-white px-4 py-1.5 text-xs font-medium flex justify-between items-center shadow-inner">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>CITIZEN INFRASTRUCTURE SAFETY & GRIEVANCE REDRESSAL SYSTEM</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-slate-200 text-[11px]">
          <span>MUNICIPAL & HIGHWAY JURISDICTION MONITOR</span>
          <span className="opacity-75">PORTAL VERSION 2.0</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#D62B2B] text-white flex items-center justify-center text-2xl shadow-sm border border-red-700">
              <span>🚧</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  RoadAlert <span className="text-[#D62B2B]">AI</span>
                </h1>
                <span className="bg-red-100 text-[#D62B2B] text-[11px] font-semibold px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider">
                  Vision Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                AI-Powered Civic Issue Reporting
              </p>
            </div>
          </div>

          {/* Quick Info & Backend Selector */}
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700">Service:</span>
              <select
                aria-label="Select backend service"
                value={backendEndpoint}
                onChange={(e) => setBackendEndpoint(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="/analyze">AI Studio Full-Stack (/analyze)</option>
                <option value="http://localhost:8000/analyze">Local FastAPI (port 8000)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-[#D62B2B] p-4 rounded-r-lg shadow-sm flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D62B2B] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">Operational Notice</h4>
                <p className="text-xs sm:text-sm text-red-700 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-700 transition-colors p-1"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* INPUT SECTION CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D62B2B] text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h2 className="text-base font-bold text-slate-800">
                Register Civic Incident & Upload Photographic Evidence
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Accepts Potholes, Streetlights, Open Manholes, Waterlogging
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
            {/* Quick Sample Presets Bar */}
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D62B2B]" />
                  Need a quick demonstration? Load an authentic civic hazard sample:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleLoadSample(p)}
                    className="text-left bg-white hover:bg-red-50/40 border border-slate-200 hover:border-red-300 px-3 py-2 rounded-md transition-all text-xs flex items-center justify-between group shadow-2xs"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-[#D62B2B] truncate">
                      {p.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#D62B2B] shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Location & Language */}
              <div className="space-y-5">
                {/* Location Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D62B2B]" />
                      Location of Hazard <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={isDetectingGps}
                      className="text-xs text-[#D62B2B] hover:text-red-800 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Navigation className={`w-3 h-3 ${isDetectingGps ? 'animate-spin' : ''}`} />
                      {isDetectingGps ? 'Detecting GPS...' : 'Use Current GPS'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. AB Road, Indore"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/20 focus:border-[#D62B2B] transition-all"
                    />
                    {location && (
                      <button
                        type="button"
                        onClick={() => setLocation('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Include street name, landmark, intersection, or city for jurisdictional accuracy.
                  </p>
                </div>

                {/* Language Dropdown */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-[#D62B2B]" />
                    Complaint Letter Language <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'English' | 'Hindi')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D62B2B]/20 focus:border-[#D62B2B] transition-all cursor-pointer"
                  >
                    <option value="English">English (Official Government Petition Format)</option>
                    <option value="Hindi">हिंदी / Hindi (राजभाषा औपचारिक प्रारूप)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    The complaint letter body will be drafted strictly in this chosen administrative language.
                  </p>
                </div>

                {/* Statutory Disclaimer Box */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    RoadAlert AI conducts non-destructive AI visual inspection. The resulting petition is formatted in accordance with standard municipal complaint filing codes.
                  </p>
                </div>
              </div>

              {/* Right Column: Image Upload Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#D62B2B]" />
                    Photograph of Hazard <span className="text-red-500">*</span>
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Clear Photo
                    </button>
                  )}
                </div>

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
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                      isDragging
                        ? 'border-[#D62B2B] bg-red-50/50 scale-[1.01]'
                        : 'border-slate-300 hover:border-[#D62B2B] hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-red-50 text-[#D62B2B] flex items-center justify-center mb-3 shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload photo or drag & drop here
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      JPG, PNG, or WEBP (Max 25 MB)
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#D62B2B] bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                      High clarity photos produce most accurate risk assessment
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-900 group">
                    <img
                      src={previewUrl}
                      alt="Uploaded hazard preview"
                      className="w-full h-56 object-cover object-center"
                    />

                    {/* Scan line effect if loading */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-red-500/10 pointer-events-none">
                        <div className="w-full h-1 bg-[#D62B2B] shadow-[0_0_12px_#D62B2B] animate-pulse"></div>
                      </div>
                    )}

                    <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/85 via-black/50 to-transparent p-3 text-white flex items-center justify-between text-xs">
                      <div className="truncate pr-2">
                        <p className="font-semibold truncate">{imageFile?.name || 'Hazard Photograph'}</p>
                        <p className="text-[10px] text-slate-300">
                          {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : 'Visual Document'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Generates instant AI technical triage + downloadable official <strong>.docx</strong> complaint letter.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !imageFile}
                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2.5 ${
                  isLoading || !imageFile
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#D62B2B] hover:bg-[#b82222] active:scale-[0.99] hover:shadow-lg'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>RoadAlert AI is analysing the issue...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-white" />
                    <span>Analyse & Generate Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* LOADING STATE CARD (Visible while loading) */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center text-[#D62B2B] border-4 border-red-100 animate-pulse">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              RoadAlert AI is analysing the issue...
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              {loadingStep}
            </p>
            <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto mt-4 overflow-hidden">
              <div className="w-full h-full bg-[#D62B2B] animate-pulse"></div>
            </div>
          </div>
        )}

        {/* RESULTS SECTION (Shown after analysis) */}
        {result && (
          <div
            ref={resultsRef}
            className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fadeIn"
          >
            {/* Results Header */}
            <div className="border-b border-slate-200 bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#D62B2B] flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Analysis Report & Official Complaint Dossier
                  </h3>
                  <p className="text-xs text-slate-300">
                    Processed via Google Gemini Vision • Generated on{' '}
                    {new Date().toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Download Quick Button in Header */}
              <button
                onClick={handleDownloadDocx}
                className="bg-[#D62B2B] hover:bg-[#b82222] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download .docx Letter</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-7">
              {/* LARGE DANGER LEVEL BADGE & REASON */}
              <div
                className={`p-5 rounded-xl border ${
                  dangerStyle?.border || 'border-slate-200'
                } ${dangerStyle?.bg || 'bg-slate-50'} transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Severity Risk Level:
                    </span>
                    <div
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-black text-sm tracking-wide ${
                        dangerStyle?.bg
                      } ${dangerStyle?.text} ${dangerStyle?.border}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${dangerStyle?.dot}`}></span>
                      <span>{result.danger_level.toUpperCase()} HAZARD</span>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Immediate Public Safety Metric
                  </span>
                </div>

                {/* Danger Reason text below badge */}
                <div className="mt-3.5 pt-3 border-t border-slate-200/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Danger Reason / Immediate Risk:
                  </p>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                    {result.danger_reason}
                  </p>
                </div>
              </div>

              {/* TWO COLUMN CARD LAYOUT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Issue Identified, Location */}
                <div className="space-y-4">
                  {/* Issue Identified Card */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#D62B2B]" />
                      <span>Issue Identified</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {result.issue_identified}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Classified via multimodal structural hazard inspection.
                    </p>
                  </div>

                  {/* Location Card */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <MapPin className="w-4 h-4 text-[#D62B2B]" />
                      <span>Reported Location</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {result.location}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Geo-referenced for territorial jurisdiction assignment.
                    </p>
                  </div>
                </div>

                {/* Right Column: Department, Description */}
                <div className="space-y-4">
                  {/* Responsible Department Card */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <Building2 className="w-4 h-4 text-[#D62B2B]" />
                      <span>Responsible Department</span>
                    </div>
                    <p className="text-base font-bold text-slate-900">
                      {result.department}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Authorized authority holding statutory maintenance duty.
                    </p>
                  </div>

                  {/* Problem Description Card */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <FileText className="w-4 h-4 text-[#D62B2B]" />
                      <span>Problem Description</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                      {result.problem_description}
                    </p>
                  </div>
                </div>
              </div>

              {/* DIVIDER LINE */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                    Official Grievance Document Preview
                  </span>
                </div>
              </div>

              {/* DOCUMENT PETITION LETTER PREVIEW */}
              <div className="border border-slate-300 rounded-xl bg-slate-50/50 p-5 sm:p-7 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D62B2B]" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Formal Complaint Letter Preview ({result.language})
                    </span>
                  </div>

                  <button
                    onClick={handleCopyLetter}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded transition-colors shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Formatted Letter Simulation */}
                <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-lg shadow-inner font-serif text-slate-900 leading-relaxed space-y-4 text-xs sm:text-sm">
                  {/* Letterhead in Red */}
                  <div className="text-center pb-3 border-b border-red-200">
                    <h4 className="text-xl sm:text-2xl font-black text-[#D62B2B] tracking-wide font-sans">
                      ROADALERT AI
                    </h4>
                    <p className="text-[11px] font-sans font-bold text-slate-600 tracking-wider">
                      CIVIC INFRASTRUCTURE SURVEILLANCE & CITIZEN GRIEVANCE PORTAL
                    </p>
                    <p className="text-[10px] font-sans text-slate-500 italic">
                      Official Public Hazard Notice & Administrative Petition
                    </p>
                  </div>

                  {/* Date */}
                  <div className="text-right text-xs font-sans font-bold text-slate-600">
                    Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>

                  {/* To Block */}
                  <div className="font-sans text-xs sm:text-sm space-y-0.5">
                    <p className="font-bold">To,</p>
                    <p className="font-semibold text-slate-800">The Executive Engineer / Competent Officer,</p>
                    <p className="font-bold text-[#D62B2B]">{result.department},</p>
                    <p className="text-slate-600">Jurisdiction / Ward: {result.location}</p>
                    <p className="text-slate-600">Municipal Corporation & Public Works Authority</p>
                  </div>

                  {/* Subject */}
                  <div className="font-sans font-bold text-slate-900 pt-2 pb-1 border-b border-slate-100">
                    <span className="text-[#D62B2B] underline">SUBJECT:</span>{' '}
                    <span className="underline">
                      URGENT CITIZEN REPORT & STATUTORY REPAIR REQUISITION -{' '}
                      {result.issue_identified.toUpperCase()} AT {result.location.toUpperCase()}
                    </span>
                  </div>

                  {/* Salutation */}
                  <div className="font-sans font-semibold text-slate-800">
                    {result.language === 'Hindi' ? 'महोदय / महोदया,' : 'Respected Sir / Madam,'}
                  </div>

                  {/* Danger Assessment Line */}
                  <div className="font-sans text-xs bg-slate-50 border-l-4 border-[#D62B2B] p-2.5 rounded-r">
                    <span className="font-bold">DANGER ASSESSMENT: </span>
                    <span className={`font-black ${dangerStyle?.text || 'text-red-700'}`}>
                      [{result.danger_level.toUpperCase()}]
                    </span>{' '}
                    <span className="font-medium text-slate-700">— {result.danger_reason}</span>
                  </div>

                  {/* Condition Overview */}
                  <div className="text-justify font-sans text-slate-700">
                    <strong>Technical Condition Overview: </strong>
                    {result.problem_description}
                  </div>

                  {/* Complaint Body */}
                  <div className="text-justify whitespace-pre-line text-slate-800 space-y-3 font-sans">
                    {result.complaint_body}
                  </div>

                  {/* Closing Appeal */}
                  <div className="text-justify text-slate-700 font-sans pt-2">
                    {result.language === 'Hindi'
                      ? 'अतः आपसे सादर अनुरोध है कि जनहित एवं सार्वजनिक सड़क सुरक्षा की रक्षा हेतु इस मामले पर त्वरित संज्ञान लेते हुए प्राथमिकता के आधार पर मरम्मत व निवारण कार्य पूर्ण कराने की कृपा करें।'
                      : 'Therefore, in the interest of pedestrian safety, vehicular stability, and public hazard mitigation, you are requested to arrange an on-site inspection immediately and direct the designated engineering wing to execute permanent repair without delay.'}
                  </div>

                  {/* Signature */}
                  <div className="pt-4 font-sans text-xs space-y-1">
                    <p>{result.language === 'Hindi' ? 'सधन्यवाद,\nभवदीय,' : 'Yours faithfully,'}</p>
                    <p className="font-bold text-slate-800">[Concerned Resident / Vigilant Citizen]</p>
                    <p className="text-[11px] text-slate-500">
                      Dispatched via RoadAlert AI System | Location: {result.location}
                    </p>
                    <p className="text-[10px] text-slate-400 italic">
                      Enclosure: Photographic visual evidence attached
                    </p>
                  </div>
                </div>
              </div>

              {/* DOWNLOAD BUTTON */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    The generated file is an editable <strong>.docx (Microsoft Word)</strong> document ready for direct submission, printing, or email.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#D62B2B] hover:bg-[#b82222] active:scale-[0.99] text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Official Complaint Letter (.docx)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span>🚧</span>
            <span>RoadAlert AI — AI-Powered Civic Issue Reporting</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Designed for municipal transparency, citizen empowerment, and rapid infrastructure grievance redressal.
          </p>
        </div>
      </footer>
    </div>
  );
}
