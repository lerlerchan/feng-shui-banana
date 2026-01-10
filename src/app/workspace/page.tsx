'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AnalysisResult {
  analysis: string;
  detectedColors: string[];
  colorMatch: 'excellent' | 'good' | 'neutral' | 'poor';
  reason: string;
  flyingStarNotes: string;
  suggestions: string[];
  elementAlignment: string;
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

type CardinalDirection = 'N' | 'E' | 'S' | 'W';

interface Combined360Result {
  overallScore: 'excellent' | 'good' | 'neutral' | 'poor';
  overallAnalysis: string;
  directionBreakdown: {
    direction: CardinalDirection;
    analysis: string;
    score: string;
    flyingStarNote: string;
    recommendations: string[];
  }[];
  elementBalance: {
    element: string;
    percentage: number;
    location: string;
  }[];
  prioritizedRecommendations: string[];
  flyingStarInsights: string;
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

  // Live analysis states
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(null);
  const [liveAnalyzing, setLiveAnalyzing] = useState(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousImageDataRef = useRef<ImageData | null>(null);
  const changeFrameCountRef = useRef(0);
  const REQUIRED_CHANGE_FRAMES = 2;

  // 360-degree mode states
  const [is360Mode, setIs360Mode] = useState(false);
  const [captures360, setCaptures360] = useState<Map<CardinalDirection, string>>(new Map());
  const [currentDirection, setCurrentDirection] = useState<CardinalDirection | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [isOrientationSupported, setIsOrientationSupported] = useState(false);
  const [combined360Result, setCombined360Result] = useState<Combined360Result | null>(null);
  const [analyzing360, setAnalyzing360] = useState(false);
  const stabilityCountRef = useRef(0);
  const lastCapturedDirectionRef = useRef<CardinalDirection | null>(null);
  const STABILITY_THRESHOLD = 10; // frames to wait before auto-capture

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

  // Compare two images by sampling pixels - returns true if images are significantly different
  const checkImageDifference = useCallback((currentImageData: ImageData): boolean => {
    const previousData = previousImageDataRef.current;
    if (!previousData) return true;

    const current = currentImageData.data;
    const previous = previousData.data;

    const sampleStep = 50;
    let diffCount = 0;
    let sampleCount = 0;
    const threshold = 50;

    for (let i = 0; i < current.length; i += sampleStep * 4) {
      const rDiff = Math.abs(current[i] - previous[i]);
      const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
      const bDiff = Math.abs(current[i + 2] - previous[i + 2]);

      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffCount++;
      }
      sampleCount++;
    }

    const diffRatio = diffCount / sampleCount;
    return diffRatio > 0.30;
  }, []);

  // Debounced image change detection
  const hasImageChanged = useCallback((currentImageData: ImageData): boolean => {
    const imageIsDifferent = checkImageDifference(currentImageData);

    if (imageIsDifferent) {
      changeFrameCountRef.current++;
      if (changeFrameCountRef.current >= REQUIRED_CHANGE_FRAMES) {
        changeFrameCountRef.current = 0;
        return true;
      }
    } else {
      changeFrameCountRef.current = 0;
    }

    return false;
  }, [checkImageDifference]);

  // Check if analysis result is meaningfully different
  const isResultDifferent = useCallback((newResult: AnalysisResult, oldResult: AnalysisResult | null): boolean => {
    if (!oldResult) return true;
    if (newResult.colorMatch !== oldResult.colorMatch) return true;

    const oldColors = new Set(oldResult.detectedColors || []);
    const newColors = newResult.detectedColors || [];

    if (newColors.length === 0 && oldColors.size === 0) return false;
    if (newColors.length === 0 || oldColors.size === 0) return true;

    const matchCount = newColors.filter(c => oldColors.has(c)).length;
    return matchCount < newColors.length * 0.5;
  }, []);

  // Capture low-res image data for comparison
  const captureCompareData = useCallback((): ImageData | null => {
    if (!videoRef.current || !cameraReady) return null;

    if (!compareCanvasRef.current) {
      compareCanvasRef.current = document.createElement('canvas');
      compareCanvasRef.current.width = 160;
      compareCanvasRef.current.height = 120;
    }

    const canvas = compareCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0, 160, 120);
    return ctx.getImageData(0, 0, 160, 120);
  }, [cameraReady]);

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
      setIsLiveMode(false);
      setIs360Mode(false);
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

  // Live analysis function
  const performLiveAnalysis = useCallback(async () => {
    if (!cameraReady || liveAnalyzing) return;

    const currentCompareData = captureCompareData();
    if (!currentCompareData) return;

    if (!hasImageChanged(currentCompareData) && liveResult) {
      return;
    }

    const imageData = capturePhoto();
    if (!imageData) return;

    previousImageDataRef.current = currentCompareData;

    setLiveAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/workspace-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziColors?.luckyColors || [],
          unluckyColors: baziColors?.unluckyColors || [],
          directionalAnalysis: directionalAnalysis,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (isResultDifferent(data, liveResult)) {
          setLiveResult(data);
        }
      }
    } catch (err) {
      console.error('Live analysis error:', err);
    } finally {
      setLiveAnalyzing(false);
    }
  }, [cameraReady, liveAnalyzing, capturePhoto, captureCompareData, hasImageChanged, isResultDifferent, liveResult, baziColors, directionalAnalysis]);

  // Live mode interval effect
  useEffect(() => {
    if (isLiveMode && cameraReady && mode === 'camera' && !is360Mode) {
      performLiveAnalysis();
      liveIntervalRef.current = setInterval(() => {
        performLiveAnalysis();
      }, 4000);
    } else {
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
  }, [isLiveMode, cameraReady, mode, is360Mode, performLiveAnalysis]);

  // Device orientation for 360 mode
  useEffect(() => {
    if (!is360Mode) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Get compass heading (alpha is 0-360, where 0 is North)
      let heading = event.alpha;
      if (heading === null) return;

      // On iOS, webkitCompassHeading gives true north
      if ('webkitCompassHeading' in event) {
        heading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading || heading;
      }

      setDeviceHeading(heading);

      // Map heading to cardinal direction
      let direction: CardinalDirection;
      if (heading >= 315 || heading < 45) {
        direction = 'N';
      } else if (heading >= 45 && heading < 135) {
        direction = 'E';
      } else if (heading >= 135 && heading < 225) {
        direction = 'S';
      } else {
        direction = 'W';
      }

      setCurrentDirection(direction);

      // Auto-capture when stable at a direction not yet captured
      if (direction === currentDirection && !captures360.has(direction) && direction !== lastCapturedDirectionRef.current) {
        stabilityCountRef.current++;
        if (stabilityCountRef.current >= STABILITY_THRESHOLD) {
          // Auto capture this direction
          const imageData = capturePhoto();
          if (imageData) {
            setCaptures360(prev => new Map(prev).set(direction, imageData));
            lastCapturedDirectionRef.current = direction;
            stabilityCountRef.current = 0;
          }
        }
      } else if (direction !== currentDirection) {
        stabilityCountRef.current = 0;
      }
    };

    // Request permission on iOS
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
          if (permission === 'granted') {
            setIsOrientationSupported(true);
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (err) {
          console.error('Orientation permission error:', err);
          setIsOrientationSupported(false);
        }
      } else {
        // Non-iOS, just add listener
        setIsOrientationSupported(true);
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [is360Mode, currentDirection, captures360, capturePhoto]);

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

  // Analyze workspace (single capture)
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

      const response = await fetch('/api/gemini/workspace-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziColors?.luckyColors || [],
          unluckyColors: baziColors?.unluckyColors || [],
          directionalAnalysis: directionalAnalysis,
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
  }, [mode, capturePhoto, uploadedImage, baziColors, directionalAnalysis]);

  // Analyze 360 workspace (all 4 directions)
  const analyze360Workspace = useCallback(async () => {
    if (captures360.size < 4) return;

    setAnalyzing360(true);
    setError(null);

    try {
      const images = Array.from(captures360.entries()).map(([direction, image]) => ({
        direction,
        image,
      }));

      const response = await fetch('/api/gemini/workspace-360-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          luckyColors: baziColors?.luckyColors || [],
          unluckyColors: baziColors?.unluckyColors || [],
          directionalAnalysis: directionalAnalysis,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze 360 workspace');
      const data = await response.json();
      setCombined360Result(data);
    } catch (err) {
      console.error('360 Analysis error:', err);
      setError('Failed to analyze 360 workspace. Please try again.');
    } finally {
      setAnalyzing360(false);
    }
  }, [captures360, baziColors, directionalAnalysis]);

  // Manual capture for 360 mode
  const capture360Direction = useCallback(() => {
    if (!currentDirection || captures360.has(currentDirection)) return;

    const imageData = capturePhoto();
    if (imageData) {
      setCaptures360(prev => new Map(prev).set(currentDirection, imageData));
      lastCapturedDirectionRef.current = currentDirection;
    }
  }, [currentDirection, captures360, capturePhoto]);

  // Toggle functions
  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
      setLiveResult(null);
      previousImageDataRef.current = null;
      changeFrameCountRef.current = 0;
    } else {
      setIsLiveMode(true);
      setIs360Mode(false);
      setResult(null);
      previousImageDataRef.current = null;
      changeFrameCountRef.current = 0;
    }
  };

  const toggle360Mode = () => {
    if (is360Mode) {
      setIs360Mode(false);
      setCaptures360(new Map());
      setCombined360Result(null);
      lastCapturedDirectionRef.current = null;
      stabilityCountRef.current = 0;
    } else {
      setIs360Mode(true);
      setIsLiveMode(false);
      setResult(null);
      setLiveResult(null);
      setCaptures360(new Map());
      setCombined360Result(null);
      lastCapturedDirectionRef.current = null;
      stabilityCountRef.current = 0;
    }
  };

  const reset360 = () => {
    setCaptures360(new Map());
    setCombined360Result(null);
    lastCapturedDirectionRef.current = null;
    stabilityCountRef.current = 0;
  };

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

  const getDirectionName = (dir: CardinalDirection) => {
    switch (dir) {
      case 'N': return 'North';
      case 'E': return 'East';
      case 'S': return 'South';
      case 'W': return 'West';
    }
  };

  const currentResult = isLiveMode ? liveResult : result;

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
                      className="absolute top-2 sm:top-3 right-2 sm:right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all disabled:opacity-50 z-10"
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

                    {/* Live Analysis Overlay */}
                    {isLiveMode && liveResult && !is360Mode && (
                      <div className="absolute inset-0 pointer-events-none transition-opacity duration-300">
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-12 sm:right-14 flex justify-between items-start">
                          <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white text-xs font-medium">LIVE</span>
                          </div>
                          <div className={`px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${getColorMatchStyles(liveResult.colorMatch)}`}>
                            {getColorMatchIcon(liveResult.colorMatch)} {getColorMatchLabel(liveResult.colorMatch)}
                          </div>
                        </div>

                        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3">
                          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-white transition-all duration-300">
                            <p className="text-xs leading-relaxed line-clamp-2">{liveResult.analysis}</p>
                            {liveResult.flyingStarNotes && (
                              <p className="text-xs text-amber-300 mt-1 line-clamp-1">⭐ {liveResult.flyingStarNotes}</p>
                            )}
                          </div>
                        </div>

                        {liveAnalyzing && !liveResult && (
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                              <span className="text-white text-xs">Analyzing...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 360 Mode Overlay */}
                    {is360Mode && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Compass Indicator */}
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-12 sm:right-14">
                          <div className="bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white text-xs font-medium">360° Scan</span>
                              <span className="text-amber-400 text-xs">{captures360.size}/4 captured</span>
                            </div>
                            <div className="flex justify-center gap-3">
                              {(['N', 'E', 'S', 'W'] as CardinalDirection[]).map((dir) => (
                                <div
                                  key={dir}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    captures360.has(dir)
                                      ? 'bg-green-500 text-white'
                                      : currentDirection === dir
                                      ? 'bg-amber-500 text-white animate-pulse'
                                      : 'bg-white/20 text-white/60'
                                  }`}
                                >
                                  {captures360.has(dir) ? '✓' : dir}
                                </div>
                              ))}
                            </div>
                            {currentDirection && !captures360.has(currentDirection) && (
                              <p className="text-center text-white text-xs mt-2">
                                Facing {getDirectionName(currentDirection)} - Hold steady to capture
                              </p>
                            )}
                            {!isOrientationSupported && (
                              <p className="text-center text-amber-300 text-xs mt-2">
                                Compass not available - use manual capture
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Captured Thumbnails */}
                        {captures360.size > 0 && (
                          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3">
                            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 flex gap-2 overflow-x-auto">
                              {Array.from(captures360.entries()).map(([dir, img]) => (
                                <div key={dir} className="flex-shrink-0">
                                  <div className="relative w-16 h-12 rounded overflow-hidden">
                                    <img src={img} alt={dir} className="w-full h-full object-cover" />
                                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                                      {dir}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Control Bar */}
                  <div className="flex-shrink-0 p-2 sm:p-3 border-t border-[var(--sepia-200)] bg-[var(--sepia-50)]">
                    <div className="flex gap-2">
                      {/* Live Mode Toggle */}
                      <button
                        onClick={toggleLiveMode}
                        disabled={!cameraReady || !baziColors}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                          isLiveMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLiveMode ? (
                          <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Stop</>
                        ) : (
                          <><span>▶</span> Live</>
                        )}
                      </button>

                      {/* 360 Mode Toggle */}
                      <button
                        onClick={toggle360Mode}
                        disabled={!cameraReady || !baziColors}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                          is360Mode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {is360Mode ? '✕ Exit 360' : '🧭 360°'}
                      </button>

                      {/* Capture/Analyze Button */}
                      {!isLiveMode && !is360Mode && (
                        <button
                          onClick={analyzeWorkspace}
                          disabled={!cameraReady || analyzing}
                          className="flex-1 py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {analyzing ? (
                            <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /></>
                          ) : (
                            <><span>📸</span> Capture</>
                          )}
                        </button>
                      )}

                      {/* 360 Mode Controls */}
                      {is360Mode && (
                        <>
                          <button
                            onClick={capture360Direction}
                            disabled={!currentDirection || captures360.has(currentDirection)}
                            className="flex-1 py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            📸 Capture {currentDirection || ''}
                          </button>
                          {captures360.size === 4 && (
                            <button
                              onClick={analyze360Workspace}
                              disabled={analyzing360}
                              className="flex-1 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-xs sm:text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {analyzing360 ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                              ) : (
                                '✨ Analyze All'
                              )}
                            </button>
                          )}
                          {captures360.size > 0 && (
                            <button
                              onClick={reset360}
                              className="px-3 py-2 text-[var(--sepia-600)] hover:text-[var(--sepia-800)] border border-[var(--sepia-300)] rounded-lg text-xs"
                            >
                              Reset
                            </button>
                          )}
                        </>
                      )}
                    </div>
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

            {/* 360 Combined Results */}
            {combined360Result && (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 overflow-y-auto">
                <h3 className="font-serif text-sm text-[var(--sepia-800)] mb-2 sm:mb-3">360° Feng Shui Analysis</h3>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getColorMatchStyles(combined360Result.overallScore)}`}>
                    {getColorMatchIcon(combined360Result.overallScore)} {getColorMatchLabel(combined360Result.overallScore)}
                  </span>
                </div>

                <p className="text-[var(--sepia-700)] text-xs sm:text-sm leading-relaxed mb-3">{combined360Result.overallAnalysis}</p>

                {combined360Result.flyingStarInsights && (
                  <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">2026 Flying Stars:</span> {combined360Result.flyingStarInsights}
                    </p>
                  </div>
                )}

                {/* Direction Breakdown */}
                {combined360Result.directionBreakdown?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">By Direction</p>
                    <div className="space-y-2">
                      {combined360Result.directionBreakdown.map((db, i) => (
                        <div key={i} className="p-2 bg-[var(--sepia-50)] rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[var(--sepia-800)]">{getDirectionName(db.direction)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getColorMatchStyles(db.score)}`}>{db.score}</span>
                          </div>
                          <p className="text-xs text-[var(--sepia-600)] line-clamp-2">{db.analysis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prioritized Recommendations */}
                {combined360Result.prioritizedRecommendations?.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Top Recommendations</p>
                    <ul className="space-y-1">
                      {combined360Result.prioritizedRecommendations.slice(0, 5).map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[var(--sepia-700)] text-xs">
                          <span className="text-amber-500 font-bold">{i + 1}.</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Single Analysis Results */}
            {currentResult && !combined360Result && (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-serif text-sm text-[var(--sepia-800)]">Feng Shui Analysis</h3>
                  {isLiveMode && (
                    <div className="flex items-center gap-1 text-xs text-[var(--sepia-500)]">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Live
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getColorMatchStyles(currentResult.colorMatch)}`}>
                    {getColorMatchIcon(currentResult.colorMatch)} {getColorMatchLabel(currentResult.colorMatch)}
                  </span>
                  {currentResult.reason && (
                    <span className="text-xs text-[var(--sepia-600)]">{currentResult.reason}</span>
                  )}
                </div>

                <p className="text-[var(--sepia-700)] text-xs sm:text-sm leading-relaxed mb-3">{currentResult.analysis}</p>

                {currentResult.flyingStarNotes && (
                  <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">2026 Flying Stars:</span> {currentResult.flyingStarNotes}
                    </p>
                  </div>
                )}

                {currentResult.elementAlignment && (
                  <div className="mb-3">
                    <p className="text-xs text-[var(--sepia-600)] mb-1">Dominant Elements</p>
                    <p className="text-xs text-[var(--sepia-700)]">{currentResult.elementAlignment}</p>
                  </div>
                )}

                {currentResult.detectedColors?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Detected Colors</p>
                    <div className="flex flex-wrap gap-1">
                      {currentResult.detectedColors.map((color, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--sepia-100)] text-[var(--sepia-700)] text-xs">{color}</span>
                      ))}
                    </div>
                  </div>
                )}

                {currentResult.suggestions?.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Feng Shui Recommendations</p>
                    <ul className="space-y-1">
                      {currentResult.suggestions.slice(0, 4).map((suggestion, i) => (
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
            {!currentResult && !error && !combined360Result && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 flex items-center justify-center min-h-[120px]">
                <div className="text-center text-[var(--sepia-500)]">
                  <div className="text-2xl sm:text-3xl mb-2">🖥️</div>
                  <p className="text-xs sm:text-sm">
                    {is360Mode ? 'Capture all 4 directions for 360° analysis' : 'Start live analysis or capture to see results'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
