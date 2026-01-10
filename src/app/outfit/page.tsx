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

export default function OutfitPage() {
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

  // Live analysis states
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(null);
  const [liveAnalyzing, setLiveAnalyzing] = useState(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load BaZi colors from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('baziResult');
    if (stored) {
      const data = JSON.parse(stored);
      setBaziColors({ luckyColors: data.luckyColors || [], unluckyColors: data.unluckyColors || [] });
    }
  }, []);

  // Initialize camera when mode is 'camera'
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
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
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraReady(false);
    }
  }, [stream]);

  // Handle mode changes
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
      setIsLiveMode(false);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode]);

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

  // Live analysis function
  const performLiveAnalysis = useCallback(async () => {
    if (!cameraReady || liveAnalyzing) return;

    const imageData = capturePhoto();
    if (!imageData) return;

    setLiveAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziColors?.luckyColors || [],
          unluckyColors: baziColors?.unluckyColors || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLiveResult(data);
      }
    } catch (err) {
      console.error('Live analysis error:', err);
    } finally {
      setLiveAnalyzing(false);
    }
  }, [cameraReady, liveAnalyzing, capturePhoto, baziColors]);

  // Live mode interval effect
  useEffect(() => {
    if (isLiveMode && cameraReady && mode === 'camera') {
      // Perform initial analysis
      performLiveAnalysis();

      // Set up interval for continuous analysis (every 3 seconds)
      liveIntervalRef.current = setInterval(() => {
        performLiveAnalysis();
      }, 3000);
    } else {
      // Clear interval when live mode is off
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    }

    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    };
  }, [isLiveMode, cameraReady, mode, performLiveAnalysis]);

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

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Handle drag and drop
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
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Analyze outfit (manual)
  const analyzeOutfit = useCallback(async () => {
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
        setError('No image available. Please capture or upload an image first.');
        setAnalyzing(false);
        return;
      }

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziColors?.luckyColors || [],
          unluckyColors: baziColors?.unluckyColors || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze outfit');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze outfit. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [mode, capturePhoto, uploadedImage, baziColors]);

  // Get color match badge styles
  const getColorMatchStyles = (match: string) => {
    switch (match) {
      case 'excellent':
        return 'bg-green-500 text-white';
      case 'good':
        return 'bg-blue-500 text-white';
      case 'neutral':
        return 'bg-yellow-500 text-white';
      case 'poor':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getColorMatchLabel = (match: string) => {
    switch (match) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'neutral':
        return 'Neutral';
      case 'poor':
        return 'Poor';
      default:
        return match;
    }
  };

  const getColorMatchIcon = (match: string) => {
    switch (match) {
      case 'excellent':
        return '✨';
      case 'good':
        return '👍';
      case 'neutral':
        return '😐';
      case 'poor':
        return '⚠️';
      default:
        return '❓';
    }
  };

  // Toggle live mode
  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
      setLiveResult(null);
    } else {
      setIsLiveMode(true);
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sepia-50)]">
      {/* Header */}
      <header className="border-b border-[var(--sepia-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Feng Shui Banana" width={40} height={40} className="rounded-full" />
            <span className="text-2xl font-serif text-[var(--sepia-800)]"><span className="font-bold">Feng Shui</span> Banana</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/bazi" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
              BaZi Analysis
            </Link>
            <Link href="/outfit" className="text-[var(--sepia-800)] font-medium">
              Outfit Check
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-5xl mb-4">📸</div>
          <h1 className="text-3xl font-serif text-[var(--sepia-900)] mb-2">
            Live Outfit Analysis
          </h1>
          <p className="text-[var(--sepia-600)]">
            Get real-time AI feedback on your outfit alignment with lucky colors
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6 animate-fade-in" style={{animationDelay: '0.15s'}}>
          <div className="inline-flex rounded-lg border border-[var(--sepia-300)] bg-white p-1">
            <button
              onClick={() => {
                setMode('camera');
                setResult(null);
                setError(null);
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'camera'
                  ? 'bg-[var(--sepia-700)] text-white'
                  : 'text-[var(--sepia-600)] hover:text-[var(--sepia-800)]'
              }`}
            >
              Camera
            </button>
            <button
              onClick={() => {
                setMode('upload');
                setResult(null);
                setError(null);
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'upload'
                  ? 'bg-[var(--sepia-700)] text-white'
                  : 'text-[var(--sepia-600)] hover:text-[var(--sepia-800)]'
              }`}
            >
              Upload
            </button>
          </div>
        </div>

        {/* Camera / Upload Area */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] mb-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
          {mode === 'camera' ? (
            <div className="space-y-4">
              {/* Video Feed with Live Overlay */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Camera loading state */}
                {!cameraReady && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--sepia-900)]/80">
                    <div className="text-center text-white">
                      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                      <p>Starting camera...</p>
                    </div>
                  </div>
                )}

                {/* Live Analysis Overlay */}
                {isLiveMode && liveResult && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top status bar */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      {/* Live indicator */}
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium">LIVE</span>
                      </div>

                      {/* Match status badge */}
                      <div className={`px-4 py-2 rounded-full font-bold text-lg ${getColorMatchStyles(liveResult.colorMatch)}`}>
                        {getColorMatchIcon(liveResult.colorMatch)} {getColorMatchLabel(liveResult.colorMatch)}
                      </div>
                    </div>

                    {/* Bottom feedback panel */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 text-white">
                        <p className="text-sm leading-relaxed mb-2">{liveResult.analysis}</p>
                        {liveResult.detectedColors && liveResult.detectedColors.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {liveResult.detectedColors.slice(0, 4).map((color, i) => (
                              <span key={i} className="px-2 py-1 bg-white/20 rounded text-xs">
                                {color}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Analyzing indicator */}
                    {liveAnalyzing && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          <span className="text-white text-sm">Analyzing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Live mode inactive overlay hint */}
                {!isLiveMode && cameraReady && (
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white/80 text-sm bg-black/40 backdrop-blur-sm py-2 px-4 rounded-lg inline-block">
                      Enable Live Analysis for real-time feedback
                    </p>
                  </div>
                )}
              </div>

              {/* Hidden canvas for capturing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Control Buttons */}
              <div className="flex gap-3">
                {/* Live Mode Toggle */}
                <button
                  onClick={toggleLiveMode}
                  disabled={!cameraReady || !baziColors}
                  className={`flex-1 py-4 rounded-lg font-medium text-lg transition-all flex items-center justify-center gap-2 ${
                    isLiveMode
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLiveMode ? (
                    <>
                      <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      Stop Live Analysis
                    </>
                  ) : (
                    <>
                      <span>▶</span>
                      Start Live Analysis
                    </>
                  )}
                </button>

                {/* Manual Capture Button */}
                {!isLiveMode && (
                  <button
                    onClick={analyzeOutfit}
                    disabled={!cameraReady || analyzing}
                    className="flex-1 py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        Analyzing...
                      </>
                    ) : (
                      'Capture & Analyze'
                    )}
                  </button>
                )}
              </div>

              {/* Live mode info */}
              {isLiveMode && (
                <p className="text-center text-sm text-[var(--sepia-500)]">
                  Analysis updates every 3 seconds. Change your outfit to see instant feedback!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative aspect-video rounded-lg border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center ${
                  isDragging
                    ? 'border-[var(--sepia-500)] bg-[var(--sepia-100)]'
                    : 'border-[var(--sepia-300)] bg-[var(--sepia-50)] hover:border-[var(--sepia-400)] hover:bg-[var(--sepia-100)]'
                }`}
              >
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Uploaded outfit"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">📤</div>
                    <p className="text-[var(--sepia-700)] font-medium mb-2">
                      Click or drag to upload
                    </p>
                    <p className="text-sm text-[var(--sepia-500)]">
                      Supports JPG, PNG, GIF
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {/* Analyze Button */}
              <button
                onClick={analyzeOutfit}
                disabled={!uploadedImage || analyzing}
                className="w-full py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Outfit'
                )}
              </button>
              {uploadedImage && (
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setResult(null);
                    setError(null);
                  }}
                  className="w-full py-2 text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors text-sm"
                >
                  Clear image
                </button>
              )}
            </div>
          )}
        </div>

        {/* BaZi Colors Display */}
        {baziColors && (baziColors.luckyColors.length > 0 || baziColors.unluckyColors.length > 0) && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] mb-6 animate-fade-in" style={{animationDelay: '0.25s'}}>
            <h3 className="font-serif text-lg text-[var(--sepia-800)] mb-4">Your BaZi Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              {baziColors.luckyColors.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--sepia-600)] mb-2">Lucky Colors</p>
                  <div className="flex flex-wrap gap-2">
                    {baziColors.luckyColors.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--sepia-100)] border border-[var(--sepia-200)]"
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-[var(--sepia-300)]"
                          style={{ backgroundColor: c.code }}
                        />
                        <span className="text-sm text-[var(--sepia-700)]">{c.color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {baziColors.unluckyColors.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--sepia-600)] mb-2">Unlucky Colors</p>
                  <div className="flex flex-wrap gap-2">
                    {baziColors.unluckyColors.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--sepia-100)] border border-[var(--sepia-200)]"
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-[var(--sepia-300)]"
                          style={{ backgroundColor: c.code }}
                        />
                        <span className="text-sm text-[var(--sepia-700)]">{c.color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No BaZi Warning */}
        {!baziColors && (
          <div className="bg-[var(--sepia-100)] p-4 rounded-xl border border-[var(--sepia-300)] mb-6 animate-fade-in" style={{animationDelay: '0.25s'}}>
            <p className="text-[var(--sepia-700)] text-center">
              No BaZi analysis found.{' '}
              <Link href="/bazi" className="text-[var(--sepia-800)] font-medium underline hover:text-[var(--sepia-900)]">
                Get your BaZi analysis first
              </Link>{' '}
              for personalized color recommendations.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Manual Results Card (shown when not in live mode) */}
        {result && !isLiveMode && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in">
            <h2 className="text-xl font-serif text-[var(--sepia-900)] mb-4">Analysis Results</h2>

            {/* Color Match Badge */}
            <div className="mb-6">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getColorMatchStyles(
                  result.colorMatch
                )}`}
              >
                {getColorMatchIcon(result.colorMatch)} {getColorMatchLabel(result.colorMatch)} Match
              </span>
            </div>

            {/* Analysis Text */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-[var(--sepia-600)] mb-2">Analysis</h3>
              <p className="text-[var(--sepia-800)] leading-relaxed">{result.analysis}</p>
            </div>

            {/* Detected Colors */}
            {result.detectedColors && result.detectedColors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--sepia-600)] mb-2">Detected Colors</h3>
                <div className="flex flex-wrap gap-2">
                  {result.detectedColors.map((color, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-[var(--sepia-100)] text-[var(--sepia-700)] text-sm border border-[var(--sepia-200)]"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[var(--sepia-600)] mb-2">Suggestions</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--sepia-700)]">
                      <span className="text-[var(--sepia-400)]">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Live Analysis Details (expanded view when live mode is on) */}
        {isLiveMode && liveResult && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif text-[var(--sepia-900)]">Live Analysis Details</h2>
              <div className="flex items-center gap-2 text-sm text-[var(--sepia-500)]">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Auto-updating
              </div>
            </div>

            {/* Suggestions */}
            {liveResult.suggestions && liveResult.suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[var(--sepia-600)] mb-2">Suggestions</h3>
                <ul className="space-y-2">
                  {liveResult.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--sepia-700)]">
                      <span className="text-[var(--sepia-400)]">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8 p-6 bg-[var(--sepia-100)] rounded-xl animate-fade-in" style={{animationDelay: '0.3s'}}>
          <h3 className="font-serif text-lg text-[var(--sepia-800)] mb-2">Tips for Best Results</h3>
          <ul className="text-[var(--sepia-600)] text-sm leading-relaxed space-y-1">
            <li>• Ensure good lighting when using live analysis</li>
            <li>• Include your full outfit in the frame</li>
            <li>• Stand against a neutral background for better color detection</li>
            <li>• Try changing accessories to see instant feedback changes</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
