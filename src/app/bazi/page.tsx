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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Feng Shui Banana" width={32} height={32} className="rounded-full sm:w-10 sm:h-10" />
            <span className="text-xl sm:text-2xl font-serif text-[var(--sepia-800)]">
              <span className="font-bold">Feng Shui</span> <span className="hidden xs:inline">Banana</span>
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

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-16">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔮</div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[var(--sepia-900)] mb-2">
            BaZi Analysis · 八字分析
          </h1>
          <p className="text-sm sm:text-base text-[var(--sepia-600)]">
            Enter your birth details to discover your elemental destiny
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.1s'}}>
          {/* Gender */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-[var(--sepia-700)] font-medium mb-2 sm:mb-3 text-sm sm:text-base">
              Gender · 性别
            </label>
            <div className="flex gap-4 sm:gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={formData.gender === 'male'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-4 h-4 accent-[var(--sepia-600)]"
                />
                <span className="text-sm sm:text-base text-[var(--sepia-700)]">Male · 男</span>
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
                <span className="text-sm sm:text-base text-[var(--sepia-700)]">Female · 女</span>
              </label>
            </div>
          </div>

          {/* Birth Date */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-[var(--sepia-700)] font-medium mb-2 text-sm sm:text-base">
              Birth Date · 出生日期 <span className="text-[var(--sepia-400)]">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-[var(--sepia-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sepia-400)] bg-white text-[var(--sepia-800)] text-sm sm:text-base"
            />
          </div>

          {/* Birth Time (Optional) */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-[var(--sepia-700)] font-medium mb-2 text-sm sm:text-base">
              Birth Time · 出生时间 <span className="text-[var(--sepia-400)] text-xs sm:text-sm">(Optional)</span>
            </label>
            <input
              type="time"
              value={formData.birthTime}
              onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-[var(--sepia-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sepia-400)] bg-white text-[var(--sepia-800)] text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-[var(--sepia-500)] mt-2">
              Providing birth time allows for a more accurate Hour Pillar calculation
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.birthDate}
            className="w-full py-3 sm:py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors font-medium text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-[var(--sepia-100)] rounded-xl animate-fade-in" style={{animationDelay: '0.2s'}}>
          <h3 className="font-serif text-base sm:text-lg text-[var(--sepia-800)] mb-2">What is BaZi? · 什么是八字?</h3>
          <p className="text-[var(--sepia-600)] text-xs sm:text-sm leading-relaxed">
            BaZi (八字), also known as Four Pillars of Destiny, is an ancient Chinese astrological system that uses your birth date and time to create a chart of eight characters. These characters represent the balance of Five Elements (五行) in your life, which can guide decisions including what colors to wear for better fortune.
          </p>
        </div>
      </main>
    </div>
  );
}
