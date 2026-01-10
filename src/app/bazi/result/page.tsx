'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface BaziResult {
  chart: {
    year: { stem: string; branch: string; stemElement: string; branchElement: string };
    month: { stem: string; branch: string; stemElement: string; branchElement: string };
    day: { stem: string; branch: string; stemElement: string; branchElement: string };
    hour: { stem: string; branch: string; stemElement: string; branchElement: string } | null;
  };
  elementBalance: { metal: number; wood: number; water: number; fire: number; earth: number };
  luckyColors: { color: string; code: string; element: string }[];
  unluckyColors: { color: string; code: string; element: string }[];
  dayMaster: string;
  dayMasterElement: string;
}

export default function BaziResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<BaziResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      const stored = sessionStorage.getItem('baziInput');
      if (!stored) { router.push('/bazi'); return; }
      try {
        const input = JSON.parse(stored);
        const response = await fetch('/api/bazi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        setResult(data);
        sessionStorage.setItem('baziResult', JSON.stringify(data));
      } catch { setError('Failed to analyze. Please try again.'); }
      finally { setLoading(false); }
    };
    fetchResult();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-[var(--sepia-50)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--sepia-600)] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-[var(--sepia-600)]">Analyzing...</p>
      </div>
    </div>
  );

  if (error || !result) return (
    <div className="min-h-screen bg-[var(--sepia-50)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[var(--sepia-700)] mb-4">{error}</p>
        <Link href="/bazi" className="text-[var(--sepia-600)] underline">Go back</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--sepia-50)]">
      {/* Header */}
      <header className="border-b border-[var(--sepia-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Feng Shui Banana" width={32} height={32} className="rounded-full sm:w-10 sm:h-10" />
            <span className="text-xl sm:text-2xl font-serif text-[var(--sepia-800)]">
              <span className="font-bold">Feng Shui</span> Banana
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6">
            <Link href="/bazi" className="text-[var(--sepia-800)] font-medium">
              BaZi Analysis
            </Link>
            <Link href="/outfit" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
              Outfit Check
            </Link>
            <Link href="/workspace" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
              Workspace
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--sepia-600)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--sepia-200)] bg-white px-4 py-3">
            <nav className="flex flex-col gap-3">
              <Link href="/bazi" className="text-[var(--sepia-800)] font-medium py-1" onClick={() => setMobileMenuOpen(false)}>
                BaZi Analysis
              </Link>
              <Link href="/outfit" className="text-[var(--sepia-600)] py-1" onClick={() => setMobileMenuOpen(false)}>
                Outfit Check
              </Link>
              <Link href="/workspace" className="text-[var(--sepia-600)] py-1" onClick={() => setMobileMenuOpen(false)}>
                Workspace
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-serif text-[var(--sepia-900)] mb-6 sm:mb-8 text-center">Your BaZi Chart</h1>

        {/* Four Pillars */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-serif text-[var(--sepia-800)] mb-3 sm:mb-4 text-center">Four Pillars</h2>
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {(['year', 'month', 'day', 'hour'] as const).map((pillar) => {
              const p = result.chart[pillar];
              if (!p) return (
                <div key={pillar} className="text-center p-2 sm:p-4 bg-[var(--sepia-50)] rounded-lg opacity-50">
                  <div className="text-xs sm:text-sm">Hour</div>
                  <div className="text-xl sm:text-2xl">--</div>
                </div>
              );
              return (
                <div key={pillar} className="text-center p-2 sm:p-4 bg-[var(--sepia-50)] rounded-lg">
                  <div className="text-xs sm:text-sm capitalize text-[var(--sepia-600)]">{pillar}</div>
                  <div className="text-2xl sm:text-3xl font-serif text-[var(--sepia-800)]">{p.stem}{p.branch}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lucky / Unlucky Colors */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--sepia-200)]">
            <h2 className="text-lg sm:text-xl font-serif text-[var(--sepia-800)] mb-3 sm:mb-4">Lucky Colors</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {result.luckyColors.slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--sepia-50)]">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: c.code }} />
                  <span className="text-xs sm:text-sm text-[var(--sepia-700)] truncate">{c.color}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-[var(--sepia-200)]">
            <h2 className="text-lg sm:text-xl font-serif text-[var(--sepia-800)] mb-3 sm:mb-4">Colors to Avoid</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {result.unluckyColors.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--sepia-50)]">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: c.code }} />
                  <span className="text-xs sm:text-sm text-[var(--sepia-700)] truncate">{c.color}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link href="/outfit" className="px-6 sm:px-8 py-3 sm:py-4 bg-[var(--sepia-700)] text-white rounded-lg text-center text-sm sm:text-base font-medium">
            Check My Outfit
          </Link>
          <Link href="/bazi" className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-[var(--sepia-400)] text-[var(--sepia-700)] rounded-lg text-center text-sm sm:text-base font-medium">
            New Analysis
          </Link>
        </div>
      </main>
    </div>
  );
}
