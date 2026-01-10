'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  if (loading) return (<div className='min-h-screen bg-[var(--sepia-50)] flex items-center justify-center'><p>Analyzing...</p></div>);
  if (error || !result) return (<div className='min-h-screen bg-[var(--sepia-50)] flex items-center justify-center'><p>{error}</p><Link href='/bazi'>Go back</Link></div>);

  return (
    <div className='min-h-screen bg-[var(--sepia-50)]'>
      <header className='border-b border-[var(--sepia-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-50'>
        <div className='max-w-6xl mx-auto px-4 py-4'><Link href='/' className='text-2xl font-serif text-[var(--sepia-800)]'><span className='font-bold'>Feng Shui</span> Banana</Link></div>
      </header>
      <main className='max-w-4xl mx-auto px-4 py-12'>
        <h1 className='text-3xl font-serif text-[var(--sepia-900)] mb-8 text-center'>Your BaZi Chart</h1>
        <div className='bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)] mb-8'>
          <h2 className='text-xl font-serif text-[var(--sepia-800)] mb-4 text-center'>Four Pillars</h2>
          <div className='grid grid-cols-4 gap-4'>
            {(['year', 'month', 'day', 'hour'] as const).map((pillar) => {
              const p = result.chart[pillar];
              if (!p) return <div key={pillar} className='text-center p-4 bg-[var(--sepia-50)] rounded-lg opacity-50'><div className='text-sm'>Hour</div><div className='text-2xl'>--</div></div>;
              return <div key={pillar} className='text-center p-4 bg-[var(--sepia-50)] rounded-lg'><div className='text-sm capitalize'>{pillar}</div><div className='text-3xl font-serif text-[var(--sepia-800)]'>{p.stem}{p.branch}</div></div>;
            })}
          </div>
        </div>
        <div className='grid md:grid-cols-2 gap-6 mb-8'>
          <div className='bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)]'>
            <h2 className='text-xl font-serif text-[var(--sepia-800)] mb-4'>Lucky Colors</h2>
            <div className='grid grid-cols-2 gap-3'>{result.luckyColors.slice(0, 6).map((c, i) => <div key={i} className='flex items-center gap-2 p-2 rounded-lg bg-[var(--sepia-50)]'><div className='w-8 h-8 rounded-full' style={{ backgroundColor: c.code }} /><span className='text-sm'>{c.color}</span></div>)}</div>
          </div>
          <div className='bg-white p-6 rounded-xl shadow-sm border border-[var(--sepia-200)]'>
            <h2 className='text-xl font-serif text-[var(--sepia-800)] mb-4'>Colors to Avoid</h2>
            <div className='grid grid-cols-2 gap-3'>{result.unluckyColors.slice(0, 4).map((c, i) => <div key={i} className='flex items-center gap-2 p-2 rounded-lg bg-[var(--sepia-50)]'><div className='w-8 h-8 rounded-full' style={{ backgroundColor: c.code }} /><span className='text-sm'>{c.color}</span></div>)}</div>
          </div>
        </div>
        <div className='flex gap-4 justify-center'>
          <Link href='/outfit' className='px-8 py-4 bg-[var(--sepia-700)] text-white rounded-lg'>Check My Outfit</Link>
          <Link href='/bazi' className='px-8 py-4 border-2 border-[var(--sepia-400)] text-[var(--sepia-700)] rounded-lg'>New Analysis</Link>
        </div>
      </main>
    </div>
  );
}
