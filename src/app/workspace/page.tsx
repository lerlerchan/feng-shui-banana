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
  overallAnalysis: string | string[];
  directionBreakdown: {
    direction: CardinalDirection;
    analysis?: string;
    observations?: string[];
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
  flyingStarInsights: string | string[];
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
  const [orientationPermission, setOrientationPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [combined360Result, setCombined360Result] = useState<Combined360Result | null>(null);
  const [analyzing360, setAnalyzing360] = useState(false);
  const [isInSweetSpot, setIsInSweetSpot] = useState(false);
  const lastCapturedDirectionRef = useRef<CardinalDirection | null>(null);
  const orientationListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const SWEET_SPOT_THRESHOLD = 10; // degrees from exact cardinal for instant capture

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

  // Check if device orientation is available
  const checkOrientationSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return 'DeviceOrientationEvent' in window;
  }, []);

  // Handle orientation event
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Get compass heading
    let heading: number | null = null;

    // iOS provides webkitCompassHeading for true north
    if ('webkitCompassHeading' in event && (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading !== undefined) {
      heading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading as number;
    }
    // For Android/others, use alpha (but note: alpha is relative to starting position, not true north)
    // When absolute is true, alpha is compass heading
    else if (event.absolute && event.alpha !== null) {
      // On Android with absolute orientation, alpha 0 = North
      // But the phone's back camera faces opposite direction, so we may need to adjust
      heading = event.alpha;
    }
    // Fallback to alpha even if not absolute (will be relative, not compass)
    else if (event.alpha !== null) {
      heading = event.alpha;
    }

    if (heading === null) return;

    setDeviceHeading(heading);

    // Map heading to cardinal direction
    // Heading: 0 = North, 90 = East, 180 = South, 270 = West
    let direction: CardinalDirection;
    let inSweetSpot = false;

    // Check if in sweet spot (within ±10° of exact cardinal)
    // N: 350-360 or 0-10, E: 80-100, S: 170-190, W: 260-280
    if (heading >= 350 || heading < 10) {
      direction = 'N';
      inSweetSpot = true;
    } else if (heading >= 80 && heading < 100) {
      direction = 'E';
      inSweetSpot = true;
    } else if (heading >= 170 && heading < 190) {
      direction = 'S';
      inSweetSpot = true;
    } else if (heading >= 260 && heading < 280) {
      direction = 'W';
      inSweetSpot = true;
    } else if (heading >= 315 || heading < 45) {
      direction = 'N';
    } else if (heading >= 45 && heading < 135) {
      direction = 'E';
    } else if (heading >= 135 && heading < 225) {
      direction = 'S';
    } else {
      direction = 'W';
    }

    setCurrentDirection(direction);
    setIsInSweetSpot(inSweetSpot);
  }, []);

  // Request orientation permission (must be called from user gesture on iOS)
  const requestOrientationPermission = useCallback(async () => {
    if (!checkOrientationSupport()) {
      setOrientationPermission('unsupported');
      setIsOrientationSupported(false);
      return false;
    }

    // Check if iOS 13+ which requires permission
    const deviceOrientationEvent = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
    };

    if (typeof deviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ - must be called from user gesture
      try {
        const permission = await deviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setOrientationPermission('granted');
          setIsOrientationSupported(true);
          return true;
        } else {
          setOrientationPermission('denied');
          setIsOrientationSupported(false);
          return false;
        }
      } catch (err) {
        console.error('Orientation permission error:', err);
        setOrientationPermission('denied');
        setIsOrientationSupported(false);
        return false;
      }
    } else {
      // Android and other browsers - no permission needed
      // Test if events are actually firing
      setOrientationPermission('granted');
      setIsOrientationSupported(true);
      return true;
    }
  }, [checkOrientationSupport]);

  // Handle permission button click
  const handlePermissionRequest = useCallback(async () => {
    const granted = await requestOrientationPermission();
    setShowPermissionPrompt(false);
    if (granted) {
      // Permission granted, 360 mode will start listening
      setIs360Mode(true);
    }
  }, [requestOrientationPermission]);

  // Auto-capture effect - instant capture when in sweet spot (±10° of exact cardinal)
  useEffect(() => {
    if (!is360Mode || orientationPermission !== 'granted') {
      return;
    }

    // Instant capture when in sweet spot
    if (isInSweetSpot && currentDirection && !captures360.has(currentDirection) && currentDirection !== lastCapturedDirectionRef.current) {
      const imageData = capturePhoto();
      if (imageData) {
        setCaptures360(prev => new Map(prev).set(currentDirection, imageData));
        lastCapturedDirectionRef.current = currentDirection;
      }
    }
  }, [is360Mode, orientationPermission, isInSweetSpot, currentDirection, captures360, capturePhoto]);

  // Set up orientation listener when 360 mode is active and permission granted
  useEffect(() => {
    if (!is360Mode || orientationPermission !== 'granted') {
      // Clean up listener if exists
      if (orientationListenerRef.current) {
        window.removeEventListener('deviceorientation', orientationListenerRef.current);
        window.removeEventListener('deviceorientationabsolute', orientationListenerRef.current as EventListener);
        orientationListenerRef.current = null;
      }
      return;
    }

    // Store the handler reference for cleanup
    orientationListenerRef.current = handleOrientation;

    // Try to use absolute orientation first (Android)
    // Using type assertion for deviceorientationabsolute which is not in standard typings
    const win = window as Window & { ondeviceorientationabsolute?: unknown };
    if ('ondeviceorientationabsolute' in win) {
      window.addEventListener('deviceorientationabsolute' as keyof WindowEventMap, handleOrientation as EventListener);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (orientationListenerRef.current) {
        window.removeEventListener('deviceorientation', orientationListenerRef.current);
        window.removeEventListener('deviceorientationabsolute' as keyof WindowEventMap, orientationListenerRef.current as EventListener);
        orientationListenerRef.current = null;
      }
    };
  }, [is360Mode, orientationPermission, handleOrientation]);

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

  const toggle360Mode = async () => {
    if (is360Mode) {
      setIs360Mode(false);
      setCaptures360(new Map());
      setCombined360Result(null);
      lastCapturedDirectionRef.current = null;
      setCurrentDirection(null);
      setDeviceHeading(null);
      setIsInSweetSpot(false);
    } else {
      // Check if we need to request permission (iOS)
      const deviceOrientationEvent = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
      };

      if (typeof deviceOrientationEvent.requestPermission === 'function' && orientationPermission === 'prompt') {
        // iOS - show permission prompt first
        setShowPermissionPrompt(true);
        return;
      }

      // If permission was already denied, show message
      if (orientationPermission === 'denied') {
        setError('Compass access was denied. Please enable it in your device settings to use 360° mode.');
        return;
      }

      // For Android/others or if already granted, just enable
      if (orientationPermission === 'prompt') {
        // Android - request permission (will auto-grant)
        await requestOrientationPermission();
      }

      setIs360Mode(true);
      setIsLiveMode(false);
      setResult(null);
      setLiveResult(null);
      setCaptures360(new Map());
      setCombined360Result(null);
      lastCapturedDirectionRef.current = null;
      setIsInSweetSpot(false);
    }
  };

  const reset360 = () => {
    setCaptures360(new Map());
    setCombined360Result(null);
    lastCapturedDirectionRef.current = null;
    setIsInSweetSpot(false);
  };

  // Generate detailed workspace report
  const generateReport = useCallback(async () => {
    setGeneratingReport(true);
    setShowReportModal(true);
    setReportContent(null);

    try {
      if (is360Mode && captures360.size === 4) {
        // 360 mode - send all 4 images
        const images = Array.from(captures360.entries()).map(([direction, image]) => ({
          direction,
          image,
        }));

        const response = await fetch('/api/gemini/workspace-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images,
            is360Mode: true,
            luckyColors: baziColors?.luckyColors || [],
            unluckyColors: baziColors?.unluckyColors || [],
            directionalAnalysis,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate report');
        const data = await response.json();
        setReportContent(data.report);
      } else {
        // Single image mode
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

        const response = await fetch('/api/gemini/workspace-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            singleImage: imageData,
            is360Mode: false,
            luckyColors: baziColors?.luckyColors || [],
            unluckyColors: baziColors?.unluckyColors || [],
            directionalAnalysis,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate report');
        const data = await response.json();
        setReportContent(data.report);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setReportContent('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  }, [is360Mode, captures360, mode, capturePhoto, uploadedImage, baziColors, directionalAnalysis]);

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
            type: 'workspace',
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
                              <div className="flex items-center gap-2">
                                <span className="text-white text-xs font-medium">360° Scan</span>
                                {deviceHeading !== null && (
                                  <span className="text-green-400 text-xs">
                                    {Math.round(deviceHeading)}°
                                  </span>
                                )}
                              </div>
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
                            {/* Status messages */}
                            {orientationPermission === 'granted' && deviceHeading !== null && currentDirection && !captures360.has(currentDirection) && (
                              <p className={`text-center text-xs mt-2 ${isInSweetSpot ? 'text-green-400 font-medium' : 'text-white'}`}>
                                {isInSweetSpot
                                  ? `📸 Capturing ${getDirectionName(currentDirection)}...`
                                  : `Facing ${getDirectionName(currentDirection)} - aim closer to center`
                                }
                              </p>
                            )}
                            {orientationPermission === 'granted' && deviceHeading !== null && currentDirection && captures360.has(currentDirection) && (
                              <p className="text-center text-green-400 text-xs mt-2">
                                {getDirectionName(currentDirection)} captured! Turn to next direction
                              </p>
                            )}
                            {orientationPermission === 'granted' && deviceHeading === null && (
                              <p className="text-center text-amber-300 text-xs mt-2">
                                <span className="inline-block animate-spin mr-1">⟳</span>
                                Waiting for compass signal...
                              </p>
                            )}
                            {orientationPermission !== 'granted' && (
                              <p className="text-center text-amber-300 text-xs mt-2">
                                Compass not available - use manual capture below
                              </p>
                            )}
                            {captures360.size === 4 && (
                              <p className="text-center text-green-400 text-xs mt-2 font-medium">
                                All directions captured! Tap &quot;Analyze All&quot; below
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
                          {/* Manual direction buttons when compass not available */}
                          {(orientationPermission !== 'granted' || deviceHeading === null) && captures360.size < 4 && (
                            <div className="flex gap-1">
                              {(['N', 'E', 'S', 'W'] as CardinalDirection[]).map((dir) => (
                                <button
                                  key={dir}
                                  onClick={() => {
                                    if (!captures360.has(dir)) {
                                      const imageData = capturePhoto();
                                      if (imageData) {
                                        setCaptures360(prev => new Map(prev).set(dir, imageData));
                                      }
                                    }
                                  }}
                                  disabled={captures360.has(dir)}
                                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                                    captures360.has(dir)
                                      ? 'bg-green-500 text-white'
                                      : 'bg-[var(--sepia-700)] text-white hover:bg-[var(--sepia-800)]'
                                  } disabled:opacity-70`}
                                >
                                  {captures360.has(dir) ? '✓' : dir}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Auto-capture button when compass is working */}
                          {orientationPermission === 'granted' && deviceHeading !== null && captures360.size < 4 && (
                            <button
                              onClick={capture360Direction}
                              disabled={!currentDirection || captures360.has(currentDirection)}
                              className="flex-1 py-2 sm:py-2.5 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] font-medium text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              📸 Capture {currentDirection || ''}
                            </button>
                          )}
                          {captures360.size === 4 && (
                            <>
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
                              <button
                                onClick={reset360}
                                className="px-3 py-2 text-[var(--sepia-600)] hover:text-[var(--sepia-800)] border border-[var(--sepia-300)] rounded-lg text-xs"
                              >
                                Reset
                              </button>
                            </>
                          )}
                          {captures360.size > 0 && captures360.size < 4 && (
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
              <div className="bg-white rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <h3 className="font-serif text-sm text-[var(--sepia-800)] mb-2 sm:mb-3">360° Feng Shui Analysis</h3>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getColorMatchStyles(combined360Result.overallScore)}`}>
                      {getColorMatchIcon(combined360Result.overallScore)} {getColorMatchLabel(combined360Result.overallScore)}
                    </span>
                  </div>

                  {/* Overall Analysis as bullets */}
                  <div className="mb-3">
                    {Array.isArray(combined360Result.overallAnalysis) ? (
                      <ul className="space-y-1">
                        {combined360Result.overallAnalysis.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-[var(--sepia-700)] text-xs sm:text-sm">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[var(--sepia-700)] text-xs sm:text-sm leading-relaxed">{combined360Result.overallAnalysis}</p>
                    )}
                  </div>

                  {combined360Result.flyingStarInsights && (
                    <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-800 font-medium mb-1">2026 Flying Stars</p>
                      {Array.isArray(combined360Result.flyingStarInsights) ? (
                        <ul className="space-y-0.5">
                          {combined360Result.flyingStarInsights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                              <span>•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-amber-800">{combined360Result.flyingStarInsights}</p>
                      )}
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
                            {/* Observations as bullets */}
                            {db.observations ? (
                              <ul className="space-y-0.5 mb-1">
                                {db.observations.map((obs, j) => (
                                  <li key={j} className="flex items-start gap-1.5 text-xs text-[var(--sepia-600)]">
                                    <span className="text-[var(--sepia-400)]">•</span>
                                    <span>{obs}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : db.analysis ? (
                              <p className="text-xs text-[var(--sepia-600)] mb-1">{db.analysis}</p>
                            ) : null}
                            {/* Flying Star Note */}
                            {db.flyingStarNote && (
                              <p className="text-xs text-amber-700 italic mb-1">⭐ {db.flyingStarNote}</p>
                            )}
                            {/* Recommendations */}
                            {db.recommendations?.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-[var(--sepia-200)]">
                                {db.recommendations.map((rec, j) => (
                                  <p key={j} className="text-xs text-green-700">→ {rec}</p>
                                ))}
                              </div>
                            )}
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

                {/* Sticky Report Button for 360 */}
                <div className="p-3 sm:p-4 pt-0 border-t border-[var(--sepia-100)] bg-white">
                  <button
                    onClick={generateReport}
                    disabled={generatingReport}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-[var(--sepia-600)] to-[var(--sepia-700)] text-white rounded-lg hover:from-[var(--sepia-700)] hover:to-[var(--sepia-800)] font-medium text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>📜</span>
                    {generatingReport ? 'Generating...' : 'Generate Full Report'}
                  </button>
                </div>
              </div>
            )}

            {/* Single Analysis Results */}
            {currentResult && !combined360Result && (
              <div className="bg-white rounded-xl shadow-sm border border-[var(--sepia-200)] lg:flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
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

                {/* Sticky Report Button */}
                <div className="p-3 sm:p-4 pt-0 border-t border-[var(--sepia-100)] bg-white">
                  <button
                    onClick={generateReport}
                    disabled={generatingReport}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-[var(--sepia-600)] to-[var(--sepia-700)] text-white rounded-lg hover:from-[var(--sepia-700)] hover:to-[var(--sepia-800)] font-medium text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>📜</span>
                    {generatingReport ? 'Generating...' : 'Generate Full Report'}
                  </button>
                </div>
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

      {/* Compass Permission Modal */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-[var(--sepia-200)]">
            {/* Modal Header */}
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
                <span className="text-3xl">🧭</span>
              </div>
              <h2 className="font-serif text-xl text-[var(--sepia-800)] mb-2">Enable Compass</h2>
              <p className="text-sm text-[var(--sepia-600)] leading-relaxed">
                360° mode needs access to your device&apos;s compass to detect which direction you&apos;re facing.
              </p>
            </div>

            {/* Features List */}
            <div className="px-6 pb-4">
              <div className="bg-[var(--sepia-50)] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--sepia-700)]">
                  <span className="text-green-500">✓</span>
                  <span>Auto-detect North, East, South, West</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--sepia-700)]">
                  <span className="text-green-500">✓</span>
                  <span>Instant capture when aimed at N/E/S/W</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--sepia-700)]">
                  <span className="text-green-500">✓</span>
                  <span>Complete 360° Feng Shui analysis</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--sepia-200)] flex gap-3">
              <button
                onClick={() => setShowPermissionPrompt(false)}
                className="flex-1 py-2.5 border border-[var(--sepia-300)] text-[var(--sepia-700)] rounded-lg hover:bg-[var(--sepia-50)] font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePermissionRequest}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>🧭</span>
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--sepia-50)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[var(--sepia-200)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--sepia-200)] bg-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <h2 className="font-serif text-lg text-[var(--sepia-800)]">Workspace Feng Shui Report</h2>
                  <p className="text-xs text-[var(--sepia-500)]">
                    {is360Mode ? '360° comprehensive analysis' : 'Your personalized space analysis'}
                  </p>
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
                  <p className="mt-4 text-[var(--sepia-700)] font-medium">Consulting the Flying Stars...</p>
                  <p className="text-sm text-[var(--sepia-500)] mt-1">Generating your comprehensive report</p>
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
