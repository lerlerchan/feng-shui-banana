'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AnalysisResult {
  analysis: string;
  detectedColors: string[];
  colorMatch: 'excellent' | 'good' | 'neutral' | 'poor';
  reason?: string;
  suggestions: string[];
}

interface BaziColors {
  luckyColors: { color: string; code: string; element: string }[];
  unluckyColors: { color: string; code: string; element: string }[];
}

interface BaziData extends BaziColors {
  dayMaster?: string;
  dayMasterElement?: string;
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
  const [baziData, setBaziData] = useState<BaziData | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const lastCapturedImageRef = useRef<string | null>(null);

  // Voice/speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechScript, setSpeechScript] = useState<string | null>(null);
  const [speechAudio, setSpeechAudio] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Live analysis states
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(null);
  const [liveAnalyzing, setLiveAnalyzing] = useState(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousImageDataRef = useRef<ImageData | null>(null);
  const changeFrameCountRef = useRef(0); // For debouncing - count consecutive "changed" frames
  const REQUIRED_CHANGE_FRAMES = 2; // Require 2 consecutive frames showing change

  // Compare two images by sampling pixels - returns true if images are significantly different
  const checkImageDifference = useCallback((currentImageData: ImageData): boolean => {
    const previousData = previousImageDataRef.current;
    if (!previousData) return true; // First frame, always analyze

    const current = currentImageData.data;
    const previous = previousData.data;

    // Sample every 50th pixel for performance (checking ~2% of pixels)
    const sampleStep = 50;
    let diffCount = 0;
    let sampleCount = 0;
    const threshold = 50; // Increased threshold to account for camera noise

    for (let i = 0; i < current.length; i += sampleStep * 4) {
      const rDiff = Math.abs(current[i] - previous[i]);
      const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
      const bDiff = Math.abs(current[i + 2] - previous[i + 2]);

      // If any channel differs significantly, count as different pixel
      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffCount++;
      }
      sampleCount++;
    }

    // Require 30% of sampled pixels to be different (up from 15%)
    const diffRatio = diffCount / sampleCount;
    return diffRatio > 0.30;
  }, []);

  // Debounced image change detection - requires multiple consecutive "changed" frames
  const hasImageChanged = useCallback((currentImageData: ImageData): boolean => {
    const imageIsDifferent = checkImageDifference(currentImageData);

    if (imageIsDifferent) {
      changeFrameCountRef.current++;
      // Only trigger analysis after REQUIRED_CHANGE_FRAMES consecutive changed frames
      if (changeFrameCountRef.current >= REQUIRED_CHANGE_FRAMES) {
        changeFrameCountRef.current = 0;
        return true;
      }
    } else {
      // Reset counter if image is stable
      changeFrameCountRef.current = 0;
    }

    return false;
  }, [checkImageDifference]);

  // Check if analysis result is meaningfully different (prevents UI flashing)
  const isResultDifferent = useCallback((newResult: AnalysisResult, oldResult: AnalysisResult | null): boolean => {
    if (!oldResult) return true; // No previous result, always update

    // If colorMatch rating changed, definitely update
    if (newResult.colorMatch !== oldResult.colorMatch) return true;

    // Check if detected colors are mostly different
    const oldColors = new Set(oldResult.detectedColors || []);
    const newColors = newResult.detectedColors || [];

    if (newColors.length === 0 && oldColors.size === 0) return false;
    if (newColors.length === 0 || oldColors.size === 0) return true;

    const matchCount = newColors.filter(c => oldColors.has(c)).length;
    // Only update if more than 50% of colors are different
    return matchCount < newColors.length * 0.5;
  }, []);

  // Capture low-res image data for comparison
  const captureCompareData = useCallback((): ImageData | null => {
    if (!videoRef.current || !cameraReady) return null;

    // Create or reuse comparison canvas (small size for fast comparison)
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

  // Load BaZi data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('baziResult');
    if (stored) {
      const data = JSON.parse(stored);
      setBaziData({
        luckyColors: data.luckyColors || [],
        unluckyColors: data.unluckyColors || [],
        dayMaster: data.dayMaster,
        dayMasterElement: data.dayMasterElement,
      });
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

  // Live analysis function - only calls API if outfit changed
  const performLiveAnalysis = useCallback(async () => {
    if (!cameraReady || liveAnalyzing) return;

    // First, check if the image has changed
    const currentCompareData = captureCompareData();
    if (!currentCompareData) return;

    // If outfit hasn't changed and we have a result, skip API call
    if (!hasImageChanged(currentCompareData) && liveResult) {
      return; // Keep showing previous result
    }

    // Outfit changed - capture full image and call API
    const imageData = capturePhoto();
    if (!imageData) return;

    // Store current frame for next comparison
    previousImageDataRef.current = currentCompareData;

    setLiveAnalyzing(true);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziData?.luckyColors || [],
          unluckyColors: baziData?.unluckyColors || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Only update UI if result is meaningfully different (prevents flashing)
        if (isResultDifferent(data, liveResult)) {
          setLiveResult(data);
        }
      }
    } catch (err) {
      console.error('Live analysis error:', err);
    } finally {
      setLiveAnalyzing(false);
    }
  }, [cameraReady, liveAnalyzing, capturePhoto, captureCompareData, hasImageChanged, isResultDifferent, liveResult, baziData]);

  // Live mode interval effect (4 second checks - balanced for stability)
  useEffect(() => {
    if (isLiveMode && cameraReady && mode === 'camera') {
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
        setError('No image available.');
        setAnalyzing(false);
        return;
      }

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziData?.luckyColors || [],
          unluckyColors: baziData?.unluckyColors || [],
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze outfit');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze outfit. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [mode, capturePhoto, uploadedImage, baziData]);

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

  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
      setLiveResult(null);
      previousImageDataRef.current = null; // Reset image comparison
      changeFrameCountRef.current = 0; // Reset debounce counter
    } else {
      setIsLiveMode(true);
      setResult(null);
      previousImageDataRef.current = null; // Start fresh
      changeFrameCountRef.current = 0; // Reset debounce counter
    }
  };

  // Generate detailed report
  const generateReport = useCallback(async () => {
    setGeneratingReport(true);
    setShowReportModal(true);
    setReportContent(null);

    try {
      // Get current image
      let imageData: string | null = null;
      if (mode === 'camera') {
        imageData = capturePhoto();
      } else {
        imageData = uploadedImage;
      }

      if (!imageData) {
        setReportContent('Unable to capture image for report.');
        setGeneratingReport(false);
        return;
      }

      lastCapturedImageRef.current = imageData;

      const response = await fetch('/api/gemini/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          luckyColors: baziData?.luckyColors || [],
          unluckyColors: baziData?.unluckyColors || [],
          dayMaster: baziData?.dayMaster,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');
      const data = await response.json();
      setReportContent(data.report);
    } catch (err) {
      console.error('Report generation error:', err);
      setReportContent('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  }, [mode, capturePhoto, uploadedImage, baziData]);

  // Generate speech script and play it
  const generateAndPlaySpeech = useCallback(async () => {
    if (!reportContent) return;

    // If already speaking, stop
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsGeneratingSpeech(true);

    try {
      // Generate conversational script if we don't have one
      if (!speechScript) {
        const response = await fetch('/api/gemini/speech-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report: reportContent,
            type: 'outfit',
          }),
        });

        if (!response.ok) throw new Error('Failed to generate speech script');
        const data = await response.json();
        setSpeechScript(data.script);

        // If we have audio from Google Cloud TTS, use it
        if (data.audioBase64) {
          setSpeechAudio(data.audioBase64);
          const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
          audioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          audio.play();
          setIsSpeaking(true);
        } else {
          // Fallback to Web Speech API
          const utterance = new SpeechSynthesisUtterance(data.script);
          utterance.rate = 1.0;
          utterance.pitch = 1.1;

          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v =>
            v.lang.includes('en-SG') ||
            v.lang.includes('en-GB') ||
            v.name.includes('Google') ||
            v.lang.startsWith('en')
          );
          if (preferredVoice) utterance.voice = preferredVoice;

          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          speechSynthRef.current = utterance;
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
        }
      } else {
        // Reuse existing audio/script
        if (speechAudio) {
          const audio = new Audio(`data:audio/mp3;base64,${speechAudio}`);
          audioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          audio.play();
          setIsSpeaking(true);
        } else {
          const utterance = new SpeechSynthesisUtterance(speechScript);
          utterance.rate = 1.0;
          utterance.pitch = 1.1;

          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v =>
            v.lang.includes('en-SG') ||
            v.lang.includes('en-GB') ||
            v.name.includes('Google') ||
            v.lang.startsWith('en')
          );
          if (preferredVoice) utterance.voice = preferredVoice;

          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          speechSynthRef.current = utterance;
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
        }
      }
    } catch (err) {
      console.error('Speech generation error:', err);
    } finally {
      setIsGeneratingSpeech(false);
    }
  }, [reportContent, speechScript, speechAudio, isSpeaking]);

  // Stop speech when modal closes
  useEffect(() => {
    if (!showReportModal && isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [showReportModal, isSpeaking]);

  // Reset speech script when report changes
  useEffect(() => {
    setSpeechScript(null);
    setSpeechAudio(null);
  }, [reportContent]);

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
              <Link href="/outfit" className="text-sm text-[var(--sepia-800)] font-medium">Outfit</Link>
              <Link href="/workspace" className="text-sm text-[var(--sepia-600)] hover:text-[var(--sepia-800)]">Workspace</Link>
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
              <Link href="/outfit" className="text-sm text-[var(--sepia-800)] font-medium py-1">Outfit Check</Link>
              <Link href="/workspace" className="text-sm text-[var(--sepia-600)] py-1">Workspace</Link>
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

                    {!cameraReady && !error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--sepia-900)]/80">
                        <div className="text-center text-white">
                          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}

                    {/* Live Analysis Overlay - with smooth transitions */}
                    {isLiveMode && liveResult && (
                      <div className="absolute inset-0 pointer-events-none transition-opacity duration-300">
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex justify-between items-start">
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
                            {liveResult.detectedColors?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                                {liveResult.detectedColors.slice(0, 4).map((color, i) => (
                                  <span key={i} className="px-1.5 sm:px-2 py-0.5 bg-white/20 rounded text-xs">{color}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Only show analyzing spinner on first analysis, not subsequent ones */}
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
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Control Bar */}
                  <div className="flex-shrink-0 p-2 sm:p-3 border-t border-[var(--sepia-200)] bg-[var(--sepia-50)]">
                    <div className="flex gap-2">
                      <button
                        onClick={toggleLiveMode}
                        disabled={!cameraReady || !baziData}
                        className={`flex-1 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                          isLiveMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLiveMode ? (
                          <><span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Stop Live</>
                        ) : (
                          <><span>▶</span> <span className="hidden sm:inline">Start </span>Live</>
                        )}
                      </button>
                      {!isLiveMode && (
                        <button
                          onClick={analyzeOutfit}
                          disabled={!cameraReady || analyzing}
                          className="flex-1 py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                        >
                          {analyzing ? (
                            <><span className="animate-spin w-3 sm:w-4 h-3 sm:h-4 border-2 border-white border-t-transparent rounded-full" /> <span className="hidden sm:inline">Analyzing...</span></>
                          ) : 'Capture'}
                        </button>
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
                      <img src={uploadedImage} alt="Uploaded outfit" className="absolute inset-0 w-full h-full object-contain p-4" />
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
                        onClick={analyzeOutfit}
                        disabled={!uploadedImage || analyzing}
                        className="flex-1 py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {analyzing ? (
                          <><span className="animate-spin w-3 sm:w-4 h-3 sm:h-4 border-2 border-white border-t-transparent rounded-full" /> Analyzing...</>
                        ) : 'Analyze Outfit'}
                      </button>
                      {uploadedImage && (
                        <button
                          onClick={() => { setUploadedImage(null); setResult(null); setError(null); }}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--sepia-600)] hover:text-[var(--sepia-800)] border border-[var(--sepia-300)] rounded-lg text-xs sm:text-sm"
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

          {/* Right Column - BaZi Colors + Analysis */}
          <div className="lg:w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            {/* BaZi Colors */}
            {baziData && (baziData.luckyColors.length > 0 || baziData.unluckyColors.length > 0) ? (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)]">
                <h3 className="font-serif text-sm text-[var(--sepia-800)] mb-2 sm:mb-3">Your BaZi Colors</h3>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                  {baziData.luckyColors.length > 0 && (
                    <div className="flex-1">
                      <p className="text-xs text-[var(--sepia-600)] mb-1.5">Lucky</p>
                      <div className="flex flex-wrap gap-1.5">
                        {baziData.luckyColors.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.code }} />
                            <span className="text-xs text-[var(--sepia-700)]">{c.color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {baziData.unluckyColors.length > 0 && (
                    <div className="flex-1">
                      <p className="text-xs text-[var(--sepia-600)] mb-1.5">Avoid</p>
                      <div className="flex flex-wrap gap-1.5">
                        {baziData.unluckyColors.map((c, i) => (
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
            {currentResult && (
              <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-serif text-sm text-[var(--sepia-800)]">Analysis</h3>
                  {isLiveMode && (
                    <div className="flex items-center gap-1 text-xs text-[var(--sepia-500)]">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Live
                    </div>
                  )}
                </div>

                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getColorMatchStyles(currentResult.colorMatch)}`}>
                  {getColorMatchIcon(currentResult.colorMatch)} {getColorMatchLabel(currentResult.colorMatch)}
                </span>

                {currentResult.reason && (
                  <p className="text-[var(--sepia-600)] text-xs mt-1.5 mb-2 sm:mb-3">{currentResult.reason}</p>
                )}

                {!isLiveMode && !currentResult.reason && (
                  <p className="text-[var(--sepia-700)] text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3">{currentResult.analysis}</p>
                )}

                {currentResult.detectedColors?.length > 0 && !isLiveMode && (
                  <div className="mb-2 sm:mb-3">
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Detected</p>
                    <div className="flex flex-wrap gap-1">
                      {currentResult.detectedColors.map((color, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--sepia-100)] text-[var(--sepia-700)] text-xs">{color}</span>
                      ))}
                    </div>
                  </div>
                )}

                {currentResult.suggestions?.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--sepia-600)] mb-1.5">Suggestions</p>
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

                {/* Generate Report Button */}
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="w-full mt-3 py-2 px-3 bg-gradient-to-r from-[var(--sepia-600)] to-[var(--sepia-700)] text-white rounded-lg hover:from-[var(--sepia-700)] hover:to-[var(--sepia-800)] font-medium text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>📜</span>
                  {generatingReport ? 'Generating...' : 'Generate Full Report'}
                </button>
              </div>
            )}

            {/* Placeholder when no results */}
            {!currentResult && !error && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 flex items-center justify-center min-h-[120px]">
                <div className="text-center text-[var(--sepia-500)]">
                  <div className="text-2xl sm:text-3xl mb-2">📸</div>
                  <p className="text-xs sm:text-sm">Start live analysis or capture to see results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--sepia-50)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[var(--sepia-200)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--sepia-200)] bg-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <h2 className="font-serif text-lg text-[var(--sepia-800)]">BaZi Outfit Report</h2>
                  <p className="text-xs text-[var(--sepia-500)]">Your personalized Feng Shui analysis</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-[var(--sepia-100)] rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--sepia-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {generatingReport ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-[var(--sepia-200)] rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-[var(--sepia-600)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-4 text-[var(--sepia-700)] font-medium">Consulting the Five Elements...</p>
                  <p className="text-sm text-[var(--sepia-500)] mt-1">Generating your personalized report</p>
                </div>
              ) : reportContent ? (
                <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-[var(--sepia-800)] prose-p:text-[var(--sepia-700)] prose-li:text-[var(--sepia-700)] prose-strong:text-[var(--sepia-800)]">
                  <div
                    className="report-content"
                    dangerouslySetInnerHTML={{
                      __html: reportContent
                        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-serif text-[var(--sepia-800)] mt-4 mb-2">$1</h3>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-serif text-[var(--sepia-800)] mt-5 mb-3">$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-serif text-[var(--sepia-900)] mt-6 mb-4">$1</h1>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--sepia-800)]">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^- (.*$)/gim, '<li class="ml-4 text-[var(--sepia-700)]">$1</li>')
                        .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 text-[var(--sepia-700)]"><span class="font-medium">$1.</span> $2</li>')
                        .replace(/\n\n/g, '</p><p class="text-[var(--sepia-700)] leading-relaxed mb-3">')
                        .replace(/\n/g, '<br/>')
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--sepia-500)]">
                  No report content available.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--sepia-200)] bg-white flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="py-2.5 px-4 border border-[var(--sepia-300)] text-[var(--sepia-700)] rounded-lg hover:bg-[var(--sepia-50)] font-medium text-sm transition-colors"
              >
                Close
              </button>
              {reportContent && !generatingReport && (
                <>
                  <button
                    onClick={generateAndPlaySpeech}
                    disabled={isGeneratingSpeech}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                      isSpeaking
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {isGeneratingSpeech ? (
                      <>
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Preparing...
                      </>
                    ) : isSpeaking ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Listen
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(reportContent);
                      alert('Report copied to clipboard!');
                    }}
                    className="py-2.5 px-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
