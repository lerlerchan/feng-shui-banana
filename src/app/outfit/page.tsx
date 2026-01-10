'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

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

  // Analyze outfit
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
        return 'bg-green-100 text-green-800 border-green-300';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getColorMatchLabel = (match: string) => {
    switch (match) {
      case 'excellent':
        return 'Excellent Match';
      case 'good':
        return 'Good Match';
      case 'neutral':
        return 'Neutral';
      case 'poor':
        return 'Poor Match';
      default:
        return match;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sepia-50)]">
      {/* Header */}
      <header className="border-b border-[var(--sepia-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-serif text-[var(--sepia-800)]">
            <span className="font-bold">Feng Shui</span> Banana
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
            Outfit Analysis
          </h1>
          <p className="text-[var(--sepia-600)]">
            Capture or upload your outfit to see how it aligns with your lucky colors
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
              {/* Video Feed */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraReady && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--sepia-900)]/80">
                    <div className="text-center text-white">
                      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                      <p>Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Hidden canvas for capturing */}
              <canvas ref={canvasRef} className="hidden" />
              {/* Capture Button */}
              <button
                onClick={analyzeOutfit}
                disabled={!cameraReady || analyzing}
                className="w-full py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Results Card */}
        {result && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in">
            <h2 className="text-xl font-serif text-[var(--sepia-900)] mb-4">Analysis Results</h2>

            {/* Color Match Badge */}
            <div className="mb-6">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getColorMatchStyles(
                  result.colorMatch
                )}`}
              >
                {getColorMatchLabel(result.colorMatch)}
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

        {/* Tips Section */}
        <div className="mt-8 p-6 bg-[var(--sepia-100)] rounded-xl animate-fade-in" style={{animationDelay: '0.3s'}}>
          <h3 className="font-serif text-lg text-[var(--sepia-800)] mb-2">Tips for Best Results</h3>
          <ul className="text-[var(--sepia-600)] text-sm leading-relaxed space-y-1">
            <li>• Ensure good lighting when capturing your outfit</li>
            <li>• Include your full outfit in the frame</li>
            <li>• Stand against a neutral background for better color detection</li>
            <li>• Remove filters from uploaded images for accurate analysis</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
