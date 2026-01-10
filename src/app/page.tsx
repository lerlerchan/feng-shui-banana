'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--sepia-50)]">
      {/* Header */}
      <header className="border-b border-[var(--sepia-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-serif text-[var(--sepia-800)]">
            <span className="font-bold">Feng Shui</span> Banana
          </h1>
          <nav className="flex gap-6">
            <Link href="/bazi" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
              BaZi Analysis
            </Link>
            <Link href="/outfit" className="text-[var(--sepia-600)] hover:text-[var(--sepia-800)] transition-colors">
              Outfit Check
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <div className="text-6xl mb-6">🍌</div>
          <h2 className="text-4xl md:text-5xl font-serif text-[var(--sepia-900)] mb-4">
            八字分析 · BaZi Analysis
          </h2>
          <p className="text-xl text-[var(--sepia-600)] max-w-2xl mx-auto mb-8">
            Discover your lucky colors based on the ancient wisdom of Five Elements.
            Let AI guide your daily outfit choices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/bazi"
              className="px-8 py-4 bg-[var(--sepia-700)] text-white rounded-lg hover:bg-[var(--sepia-800)] transition-colors text-lg font-medium"
            >
              Start Analysis · 开始分析
            </Link>
            <Link
              href="/outfit"
              className="px-8 py-4 border-2 border-[var(--sepia-400)] text-[var(--sepia-700)] rounded-lg hover:bg-[var(--sepia-100)] transition-colors text-lg font-medium"
            >
              Check Outfit · 检查穿搭
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.1s'}}>
            <div className="text-4xl mb-4">🔮</div>
            <h3 className="text-xl font-serif text-[var(--sepia-800)] mb-2">
              BaZi Chart · 八字命盘
            </h3>
            <p className="text-[var(--sepia-600)]">
              Input your birth date to generate your personal Four Pillars chart and discover your elemental balance.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-serif text-[var(--sepia-800)] mb-2">
              Lucky Colors · 幸运色彩
            </h3>
            <p className="text-[var(--sepia-600)]">
              Get personalized color recommendations based on the Five Elements to enhance your daily fortune.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] animate-fade-in" style={{animationDelay: '0.3s'}}>
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-serif text-[var(--sepia-800)] mb-2">
              AI Analysis · 智能分析
            </h3>
            <p className="text-[var(--sepia-600)]">
              Upload your outfit or use live camera for instant AI feedback on how well your clothes align with your lucky colors.
            </p>
          </div>
        </div>

        {/* Five Elements */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-[var(--sepia-200)] mb-16">
          <h3 className="text-2xl font-serif text-[var(--sepia-800)] mb-6 text-center">
            The Five Elements · 五行
          </h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-element-metal flex items-center justify-center text-2xl mb-2">🪙</div>
              <div className="font-serif text-lg">金</div>
              <div className="text-sm text-[var(--sepia-500)]">Metal</div>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-element-wood flex items-center justify-center text-2xl mb-2">🌳</div>
              <div className="font-serif text-lg">木</div>
              <div className="text-sm text-[var(--sepia-500)]">Wood</div>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-element-water flex items-center justify-center text-2xl mb-2">💧</div>
              <div className="font-serif text-lg">水</div>
              <div className="text-sm text-[var(--sepia-500)]">Water</div>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-element-fire flex items-center justify-center text-2xl mb-2">🔥</div>
              <div className="font-serif text-lg">火</div>
              <div className="text-sm text-[var(--sepia-500)]">Fire</div>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-element-earth flex items-center justify-center text-2xl mb-2">🌍</div>
              <div className="font-serif text-lg">土</div>
              <div className="text-sm text-[var(--sepia-500)]">Earth</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--sepia-200)] bg-white/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--sepia-500)]">
          <p>Feng Shui Banana · Powered by Gemini AI</p>
          <p className="text-sm mt-2">Ancient wisdom meets modern technology</p>
        </div>
      </footer>
    </div>
  );
}
