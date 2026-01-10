'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Link href="/bazi" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
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
              <Link href="/bazi" className="text-[var(--sepia-600)] py-1" onClick={() => setMobileMenuOpen(false)}>
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

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-16">
        <div className="text-center mb-10 sm:mb-16 animate-fade-in">
          <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🍌</div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[var(--sepia-900)] mb-3 sm:mb-4">
            八字分析 · BaZi Analysis
          </h2>
          <p className="text-base sm:text-xl text-[var(--sepia-600)] max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            Discover your lucky colors based on the ancient wisdom of Five Elements.
            Let AI guide your daily outfit choices.
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 px-4 sm:px-0">
            <Link
              href="/bazi"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors text-base sm:text-lg font-medium"
            >
              Start Analysis · 开始分析
            </Link>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/outfit"
                className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-[var(--sepia-400)] text-[var(--sepia-700)] rounded-lg hover:bg-[var(--sepia-100)] transition-colors text-base sm:text-lg font-medium"
              >
                Check Outfit · 检查穿搭
              </Link>
              <Link
                href="/workspace"
                className="px-6 sm:px-8 py-3 sm:py-4 border-2 border-[var(--sepia-400)] text-[var(--sepia-700)] rounded-lg hover:bg-[var(--sepia-100)] transition-colors text-base sm:text-lg font-medium"
              >
                Check Workspace · 检查工作间
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 mb-10 sm:mb-16">
          <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.1s'}}>
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔮</div>
            <h3 className="text-lg sm:text-xl font-serif text-[var(--sepia-800)] mb-2">
              BaZi Chart · 八字命盘
            </h3>
            <p className="text-sm sm:text-base text-[var(--sepia-600)]">
              Input your birth date to generate your personal Four Pillars chart and discover your elemental balance.
            </p>
          </div>

          <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎨</div>
            <h3 className="text-lg sm:text-xl font-serif text-[var(--sepia-800)] mb-2">
              Lucky Colors · 幸运色彩
            </h3>
            <p className="text-sm sm:text-base text-[var(--sepia-600)]">
              Get personalized color recommendations based on the Five Elements to enhance your daily fortune.
            </p>
          </div>

          <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in sm:col-span-2 md:col-span-1" style={{animationDelay: '0.3s'}}>
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📸</div>
            <h3 className="text-lg sm:text-xl font-serif text-[var(--sepia-800)] mb-2">
              AI Analysis · 智能分析
            </h3>
            <p className="text-sm sm:text-base text-[var(--sepia-600)]">
              Upload your outfit or use live camera for instant AI feedback on how well your clothes align with your lucky colors.
            </p>
          </div>
        </div>

        {/* Five Elements */}
        <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] mb-10 sm:mb-16">
          <h3 className="text-xl sm:text-2xl font-serif text-[var(--sepia-800)] mb-4 sm:mb-6 text-center">
            The Five Elements · 五行
          </h3>
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-full bg-element-metal flex items-center justify-center text-lg sm:text-2xl mb-1 sm:mb-2">🪙</div>
              <div className="font-serif text-base sm:text-lg">金</div>
              <div className="text-xs sm:text-sm text-[var(--sepia-500)]">Metal</div>
            </div>
            <div className="text-center p-2 sm:p-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-full bg-element-wood flex items-center justify-center text-lg sm:text-2xl mb-1 sm:mb-2">🌳</div>
              <div className="font-serif text-base sm:text-lg">木</div>
              <div className="text-xs sm:text-sm text-[var(--sepia-500)]">Wood</div>
            </div>
            <div className="text-center p-2 sm:p-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-full bg-element-water flex items-center justify-center text-lg sm:text-2xl mb-1 sm:mb-2">💧</div>
              <div className="font-serif text-base sm:text-lg">水</div>
              <div className="text-xs sm:text-sm text-[var(--sepia-500)]">Water</div>
            </div>
            <div className="text-center p-2 sm:p-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-full bg-element-fire flex items-center justify-center text-lg sm:text-2xl mb-1 sm:mb-2">🔥</div>
              <div className="font-serif text-base sm:text-lg">火</div>
              <div className="text-xs sm:text-sm text-[var(--sepia-500)]">Fire</div>
            </div>
            <div className="text-center p-2 sm:p-4">
              <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-full bg-element-earth flex items-center justify-center text-lg sm:text-2xl mb-1 sm:mb-2">🌍</div>
              <div className="font-serif text-base sm:text-lg">土</div>
              <div className="text-xs sm:text-sm text-[var(--sepia-500)]">Earth</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--sepia-200)] bg-white/50 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--sepia-500)]">
          <p className="text-sm sm:text-base">Feng Shui Banana · Powered by Gemini AI</p>
          <p className="text-xs sm:text-sm mt-2">Ancient wisdom meets modern technology</p>
        </div>
      </footer>
    </div>
  );
}
