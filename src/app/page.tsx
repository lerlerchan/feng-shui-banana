'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        poster="/hero-poster.jpg"
      >
        {/* Video source will be added later */}
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Navigation */}
        <header className="w-full">
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            {/* Left Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/bazi"
                className="text-white/90 hover:text-white text-sm tracking-widest uppercase transition-colors"
              >
                BaZi Analysis
              </Link>
              <Link
                href="/outfit"
                className="text-white/90 hover:text-white text-sm tracking-widest uppercase transition-colors"
              >
                Outfit Check
              </Link>
            </nav>

            {/* Center Logo */}
            <Link href="/" className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
              <Image
                src="/logo.png"
                alt="Feng Shui Banana"
                width={48}
                height={48}
                className="rounded-full border-2 border-white/30"
              />
            </Link>

            {/* Right Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/workspace"
                className="text-white/90 hover:text-white text-sm tracking-widest uppercase transition-colors"
              >
                Workspace
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white ml-auto"
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

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-black/80 backdrop-blur-sm px-6 py-4">
              <nav className="flex flex-col gap-4">
                <Link
                  href="/bazi"
                  className="text-white/90 text-sm tracking-widest uppercase"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  BaZi Analysis
                </Link>
                <Link
                  href="/outfit"
                  className="text-white/90 text-sm tracking-widest uppercase"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Outfit Check
                </Link>
                <Link
                  href="/workspace"
                  className="text-white/90 text-sm tracking-widest uppercase"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Workspace
                </Link>
              </nav>
            </div>
          )}
        </header>

        {/* Hero Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-serif text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
            Dress with<br />
            <span className="italic">Destiny</span>
          </h1>

          <p className="text-white/80 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-8">
            Ancient BaZi wisdom meets modern AI.<br />
            Discover your lucky colors and align your style with the Five Elements.
          </p>

          <Link
            href="/bazi"
            className="px-8 py-3 border border-white/60 text-white text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-all duration-300"
          >
            Begin Your Journey
          </Link>
        </main>

        {/* Bottom Indicator */}
        <div className="pb-8 flex justify-center">
          <div className="animate-bounce">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
