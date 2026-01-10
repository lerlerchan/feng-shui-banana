# Feng Shui Banana

A Next.js application for BaZi (八字) analysis that provides personalized clothing color recommendations based on the Five Elements, with AI-powered outfit analysis via Google Gemini API.

## Features

### BaZi Analysis (八字分析)
- Input your gender and birth date (birth time optional)
- Calculate your Four Pillars (四柱): Year, Month, Day, and Hour pillars
- Analyze your Five Elements (五行) balance: Metal, Wood, Water, Fire, Earth
- Get personalized lucky and unlucky color recommendations

### Outfit Analysis
- **Photo Upload**: Upload an outfit photo for AI analysis
- **Live Camera**: Real-time camera feed with instant AI feedback
- Gemini AI compares your outfit colors against your lucky colors
- Get personalized suggestions to improve your outfit alignment

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (custom sepia theme)
- **BaZi Logic**: lunar-javascript library
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd feng-shui-banana
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your Gemini API key:
```
GEMINI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── bazi/
│   │   ├── page.tsx          # BaZi input form
│   │   └── result/page.tsx   # BaZi results display
│   ├── outfit/page.tsx       # Outfit analysis (camera/upload)
│   └── api/
│       ├── bazi/route.ts     # BaZi calculation endpoint
│       └── gemini/analyze/route.ts  # Gemini analysis endpoint
├── lib/
│   ├── bazi.ts               # BaZi calculation logic
│   └── elements.ts           # Five Elements definitions
└── types/
    └── lunar-javascript.d.ts # Type declarations
```

## Five Elements Color Mapping

| Element | Chinese | Colors |
|---------|---------|--------|
| Metal | 金 | White, Gold, Silver, Gray |
| Wood | 木 | Green, Teal, Emerald |
| Water | 水 | Blue, Black, Navy |
| Fire | 火 | Red, Orange, Pink, Purple |
| Earth | 土 | Yellow, Brown, Beige, Tan |

## Deployment

Deploy on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add `GEMINI_API_KEY` to environment variables
4. Deploy

## License

MIT
