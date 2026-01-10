'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AnalysisResult {
  analysis: string;
  detectedColors: string[];
  colorMatch: 'excellent' | 'good' | 'neutral' | 'poor';
  suggestions: string[];
}

interface BaziColors {
  luckyColors: { color: string; code: string; element: string }[];
  unluckyColors: { color: string; code: string; element: string }[];
}

interface DirectionalRecommendation {
  primaryDirection: string;
  alternateDirections: string[];
  element: string;
  strength: 'excellent' | 'good' | 'moderate';
  reason: string;
}

interface WealthCornerRecommendation {
  direction: string;
  element: string;
  enhancementColors: { color: string; code: string; element: string }[];
  items: string[];
  advice: string;
}

interface DirectionalAnalysisData {
  sittingDirection: DirectionalRecommendation;
  deskPosition: DirectionalRecommendation;
  wealthCorner: WealthCornerRecommendation;
}

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baziColors, setBaziColors] = useState<BaziColors | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [directionalAnalysis, setDirectionalAnalysis] = useState<DirectionalAnalysisData | null>(null);

  // Load BaZi colors and directional analysis from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('baziResult');
    if (stored) {
      const data = JSON.parse(stored);
      setBaziColors({ luckyColors: data.luckyColors || [], unluckyColors: data.unluckyColors || [] });
      setDirectionalAnalysis(data.directionalAnalysis || null);
    }
  }, []);

  // Track if camera is initializing to prevent duplicate calls
  const cameraInitializingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when mode is 'camera'
  const startCamera = useCallback(async () => {
    if (cameraInitializingRef.current) return;
    if (streamRef.current) return;

    cameraInitializingRef.current = true;

    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions or try uploading an image instead.');
      setCameraReady(false);
    } finally {
      cameraInitializingRef.current = false;
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
      setCameraReady(false);
    }
  }, []);

  // Flip camera between selfie and environment
  const flipCamera = useCallback(async () => {
    stopCamera();
    setFacingMode((prev) => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  // Handle mode changes
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [mode, facingMode, startCamera, stopCamera]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [cameraReady]);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setError(null);
      setResult(null);
    };
    reader.onerror = () => {
      setError('Failed to read the image file.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // Analyze workspace
  const analyzeWorkspace = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let imageData: string | null = null;
      if (mode === 'camera') {
        imageData = capturePhoto();
      } else {
        imageData = uploadedImage;
      }

      if (!imageData) {
        setError('No image available.');
        setAnalyzing(false);
        return;
      }

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziColors?.luckyColors || [],
          unluckyColors: baziColors?.unluckyColors || [],
          context: 'workspace',
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze workspace');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze workspace. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [mode, capturePhoto, uploadedImage, baziColors]);

  const getColorMatchStyles = (match: string) => {
    switch (match) {
      case 'excellent': return 'bg-green-500 text-white';
      case 'good': return 'bg-blue-500 text-white';
      case 'neutral': return 'bg-yellow-500 text-white';
      case 'poor': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getColorMatchLabel = (match: string) => {
    switch (match) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'neutral': return 'Neutral';
      case 'poor': return 'Poor';
      default: return match;
    }
  };

  const getColorMatchIcon = (match: string) => {
    switch (match) {
      case 'excellent': return '✨';
      case 'good': return '👍';
      case 'neutral': return '😐';
      case 'poor': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden bg-[var(--sepia-50)]">
      {/* Header - Responsive */}
      <header className="flex-shrink-0 border-b border-[var(--sepia-200)] bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Feng Shui Banana" width={28} height={28} className="rounded-full sm:w-8 sm:h-8" />
            <span className="text-lg sm:text-xl font-serif text-[var(--sepia-800)]">
              <span className="font-bold">Feng Shui</span> Banana
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mode Toggle */}
            <div className="inline-flex rounded-lg border border-[var(--sepia-300)] bg-white p-0.5">
              <button
                onClick={() => { setMode('camera'); setResult(null); setError(null); }}
                className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  mode === 'camera' ? 'bg-[var(--sepia-700)] text-white' : 'text-[var(--sepia-600)]'
                }`}
              >
                Camera
              </button>
              <button
                onClick={() => { setMode('upload'); setResult(null); setError(null); }}
                className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  mode === 'upload' ? 'bg-[var(--sepia-700)] text-white' : 'text-[var(--sepia-600)]'
                }`}
              >
                Upload
              </button>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex gap-4">
              <Link href="/bazi" className="text-sm text-[var(--sepia-600)] hover:text-[var(--sepia-800)]">BaZi</Link>
              <Link href="/outfit" className="text-sm text-[var(--sepia-600)] hover:text-[var(--sepia-800)]">Outfit</Link>
              <Link href="/workspace" className="text-sm text-[var(--sepia-800)] font-medium">Workspace</Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[var(--sepia-600)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--sepia-200)] bg-white px-4 py-2">
            <nav className="flex flex-col gap-2">
              <Link href="/bazi" className="text-sm text-[var(--sepia-600)] py-1">BaZi Analysis</Link>
              <Link href="/outfit" className="text-sm text-[var(--sepia-600)] py-1">Outfit Check</Link>
              <Link href="/workspace" className="text-sm text-[var(--sepia-800)] font-medium py-1">Workspace</Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content - Responsive Layout */}
      <main className="flex-1 overflow-auto lg:overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Left Column - Video/Upload */}
          <div className="flex-1 flex flex-col min-w-0 min-h-[50vh] lg:min-h-0">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-[var(--sepia-200)] overflow-hidden flex flex-col">
              {mode === 'camera' ? (
                <>
                  {/* Video Container */}
                  <div className="flex-1 relative bg-black min-h-[40vh] lg:min-h-0">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

                    {/* Camera Flip Button */}
                    <button
                      onClick={flipCamera}
                      disabled={!cameraReady}
                      className="absolute top-2 sm:top-3 right-2 sm:right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all disabled:opacity-50"
                      title="Flip camera"
                    >
                      <svg className="w-5 h-5 text-[var(--sepia-700)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>

                    {!cameraReady && !error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--sepia-900)]/80">
                        <div className="text-center text-white">
                          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Control Bar */}
                  <div className="flex-shrink-0 p-2 sm:p-3 border-t border-[var(--sepia-200)] bg-[var(--sepia-50)]">
                    <button
                      onClick={analyzeWorkspace}
                      disabled={!cameraReady || analyzing}
                      className="w-full py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {analyzing ? (
                        <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Analyzing...</>
                      ) : (
                        <><span>📸</span> Capture & Analyze</>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Upload Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex-1 relative cursor-pointer flex items-center justify-center min-h-[40vh] lg:min-h-0 ${
                      isDragging ? 'bg-[var(--sepia-100)]' : 'bg-[var(--sepia-50)]'
                    }`}
                  >
                    {uploadedImage ? (
                      <img src={uploadedImage} alt="Uploaded workspace" className="absolute inset-0 w-full h-full object-contain p-4" />
                    ) : (
                      <div className="text-center p-6 sm:p-8">
                        <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📤</div>
                        <p className="text-[var(--sepia-700)] font-medium mb-1 text-sm sm:text-base">Click or drag to upload</p>
                        <p className="text-xs sm:text-sm text-[var(--sepia-500)]">JPG, PNG, GIF</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" />

                  {/* Upload Control Bar */}
                  <div className="flex-shrink-0 p-2 sm:p-3 border-t border-[var(--sepia-200)] bg-[var(--sepia-50)]">
                    <div className="flex gap-2">
                      <button
                        onClick={analyzeWorkspace}
                        disabled={!uploadedImage || analyzing}
                        className="flex-1 py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {analyzing ? (
                          <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Analyzing...</>
                        ) : 'Analyze Workspace'}
                      </button>
                      {uploadedImage && (
                        <button
                          onClick={() => { setUploadedImage(null); setResult(null); setError(null); }}
                          className="px-3 sm:px-4 py-2 text-[var(--sepia-600)] hover:text-[var(--sepia-800)] border border-[var(--sepia-300)] rounded-lg text-xs sm:text-sm"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - BaZi Colors + Directions + Analysis */}
          <div className="lg:w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            {/* BaZi Colors */}
            {baziColors && (baziColors.luckyColors.length > 0 || baziColors.unluckyColors.length > 0) ? (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)]">
                <h3 className="font-serif text-sm text-[var(--sepia-800)] mb-2 sm:mb-3">Your BaZi Colors</h3>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                  {baziColors.luckyColors.length > 0 && (
                    <div className="flex-1">
                      <p className="text-xs text-[var(--sepia-600)] mb-1.5">Lucky</p>
                      <div className="flex flex-wrap gap-1.5">
                        {baziColors.luckyColors.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.code }} />
                            <span className="text-xs text-[var(--sepia-700)]">{c.color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {baziColors.unluckyColors.length > 0 && (
                    <div className="flex-1">
                      <p className="text-xs text-[var(--sepia-600)] mb-1.5">Avoid</p>
                      <div className="flex flex-wrap gap-1.5">
                        {baziColors.unluckyColors.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-200">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.code }} />
                            <span className="text-xs text-[var(--sepia-700)]">{c.color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--sepia-100)] p-3 sm:p-4 rounded-xl border border-[var(--sepia-300)]">
                <p className="text-[var(--sepia-700)] text-sm text-center">
                  No BaZi analysis found.{' '}
                  <Link href="/bazi" className="text-[var(--sepia-800)] font-medium underline">Get yours</Link>
                </p>
              </div>
            )}

            {/* Directional Recommendations - Compact */}
            {directionalAnalysis && (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)]">
                <h3 className="font-serif text-sm text-[var(--sepia-800)] mb-2 sm:mb-3">Directions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-[var(--sepia-50)] rounded-lg">
                    <span className="text-lg">🧭</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--sepia-600)]">Face</p>
                      <p className="text-sm font-medium text-[var(--sepia-800)] truncate">{directionalAnalysis.sittingDirection.primaryDirection}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-[var(--sepia-50)] rounded-lg">
                    <span className="text-lg">🪑</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--sepia-600)]">Desk</p>
                      <p className="text-sm font-medium text-[var(--sepia-800)] truncate">{directionalAnalysis.deskPosition.primaryDirection} Sector</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-[var(--sepia-50)] rounded-lg">
                    <span className="text-lg">💰</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--sepia-600)]">Wealth Corner</p>
                      <p className="text-sm font-medium text-[var(--sepia-800)] truncate">{directionalAnalysis.wealthCorner.direction}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                <div className="flex items-start gap-2">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {result && (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1">
                <h3 className="font-serif text-sm text-[var(--sepia-800)] mb-2 sm:mb-3">Analysis</h3>

                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getColorMatchStyles(result.colorMatch)}`}>
                  {getColorMatchIcon(result.colorMatch)} {getColorMatchLabel(result.colorMatch)}
                </span>

                <p className="text-[var(--sepia-700)] text-xs sm:text-sm leading-relaxed mt-2 mb-3">{result.analysis}</p>

                {result.detectedColors?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Detected</p>
                    <div className="flex flex-wrap gap-1">
                      {result.detectedColors.map((color, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--sepia-100)] text-[var(--sepia-700)] text-xs">{color}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.suggestions?.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Suggestions</p>
                    <ul className="space-y-1">
                      {result.suggestions.slice(0, 4).map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[var(--sepia-700)] text-xs">
                          <span className="text-[var(--sepia-400)]">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder when no results */}
            {!result && !error && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 flex items-center justify-center min-h-[120px]">
                <div className="text-center text-[var(--sepia-500)]">
                  <div className="text-2xl sm:text-3xl mb-2">🖥️</div>
                  <p className="text-xs sm:text-sm">Capture your workspace to see analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
