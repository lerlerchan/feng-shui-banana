'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function BaziPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    gender: 'male',
    birthDate: '',
    birthTime: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Store form data in sessionStorage and navigate to results
    sessionStorage.setItem('baziInput', JSON.stringify(formData));
    router.push('/bazi/result');
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
            <Link href="/bazi" className="text-[var(--sepia-800)] font-medium">
              BaZi Analysis
            </Link>
            <Link href="/outfit" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
              Outfit Check
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <div className="text-5xl mb-4">🔮</div>
          <h1 className="text-3xl font-serif text-[var(--sepia-900)] mb-2">
            BaZi Analysis · 八字分析
          </h1>
          <p className="text-[var(--sepia-600)]">
            Enter your birth details to discover your elemental destiny
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.1s'}}>
          {/* Gender */}
          <div className="mb-6">
            <label className="block text-[var(--sepia-700)] font-medium mb-3">
              Gender · 性别
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-4 h-4 accent-[var(--sepia-600)]"
                />
                <span className="text-[var(--sepia-700)]">Male · 男</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={formData.gender === 'female'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-4 h-4 accent-[var(--sepia-600)]"
                />
                <span className="text-[var(--sepia-700)]">Female · 女</span>
              </label>
            </div>
          </div>

          {/* Birth Date */}
          <div className="mb-6">
            <label className="block text-[var(--sepia-700)] font-medium mb-2">
              Birth Date · 出生日期 <span className="text-[var(--sepia-400)]">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--sepia-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sepia-400)] bg-white text-[var(--sepia-800)]"
            />
          </div>

          {/* Birth Time (Optional) */}
          <div className="mb-8">
            <label className="block text-[var(--sepia-700)] font-medium mb-2">
              Birth Time · 出生时间 <span className="text-[var(--sepia-400)] text-sm">(Optional)</span>
            </label>
            <input
              type="time"
              value={formData.birthTime}
              onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
              className="w-full px-4 py-3 border border-[var(--sepia-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sepia-400)] bg-white text-[var(--sepia-800)]"
            />
            <p className="text-sm text-[var(--sepia-500)] mt-2">
              Providing birth time allows for a more accurate Hour Pillar calculation
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.birthDate}
            className="w-full py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-pulse-gentle">Analyzing...</span>
              </span>
            ) : (
              'Analyze My BaZi · 分析我的八字'
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-[var(--sepia-100)] rounded-xl animate-fade-in" style={{animationDelay: '0.2s'}}>
          <h3 className="font-serif text-lg text-[var(--sepia-800)] mb-2">What is BaZi? · 什么是八字?</h3>
          <p className="text-[var(--sepia-600)] text-sm leading-relaxed">
            BaZi (八字), also known as Four Pillars of Destiny, is an ancient Chinese astrological system that uses your birth date and time to create a chart of eight characters. These characters represent the balance of Five Elements (五行) in your life, which can guide decisions including what colors to wear for better fortune.
          </p>
        </div>
      </main>
    </div>
  );
}
