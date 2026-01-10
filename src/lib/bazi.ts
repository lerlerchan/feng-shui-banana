// BaZi calculation logic using lunar-javascript
// Reference: https://github.com/china-testing/bazi/blob/master/bazi.py
import { Solar } from 'lunar-javascript';
import { Element, ELEMENTS, getLuckyColors } from './elements';

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const HEAVENLY_STEMS_PINYIN = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const EARTHLY_BRANCHES_PINYIN = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];

const STEM_ELEMENTS: Record<string, Element> = {
  '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water',
};

const BRANCH_ELEMENTS: Record<string, Element> = {
  '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
  '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
  '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
};

// Hidden stems in each Earthly Branch (藏干) with weights
const BRANCH_HIDDEN_STEMS: Record<string, Record<string, number>> = {
  '子': { '癸': 10 },
  '丑': { '己': 6, '癸': 3, '辛': 1 },
  '寅': { '甲': 6, '丙': 3, '戊': 1 },
  '卯': { '乙': 10 },
  '辰': { '戊': 6, '乙': 3, '癸': 1 },
  '巳': { '丙': 6, '庚': 3, '戊': 1 },
  '午': { '丁': 6, '己': 4 },
  '未': { '己': 6, '丁': 3, '乙': 1 },
  '申': { '庚': 6, '壬': 3, '戊': 1 },
  '酉': { '辛': 10 },
  '戌': { '戊': 6, '辛': 3, '丁': 1 },
  '亥': { '壬': 6, '甲': 4 },
};

// Season strength for each element (month branch)
const SEASON_STRENGTH: Record<string, Element> = {
  '寅': 'wood', '卯': 'wood', '辰': 'wood',  // Spring - Wood strong
  '巳': 'fire', '午': 'fire', '未': 'fire',  // Summer - Fire strong
  '申': 'metal', '酉': 'metal', '戌': 'metal', // Autumn - Metal strong
  '亥': 'water', '子': 'water', '丑': 'water', // Winter - Water strong
};

// Five Element cycles
const GENERATES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};
const GENERATED_BY: Record<Element, Element> = {
  wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal',
};
const CONTROLS: Record<Element, Element> = {
  wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
};
const CONTROLLED_BY: Record<Element, Element> = {
  wood: 'metal', fire: 'water', earth: 'wood', metal: 'fire', water: 'earth',
};

export interface Pillar {
  stem: string;
  stemPinyin: string;
  branch: string;
  branchPinyin: string;
  stemElement: Element;
  branchElement: Element;
}

export interface BaziChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
}

export interface ElementBalance {
  metal: number;
  wood: number;
  water: number;
  fire: number;
  earth: number;
}

export interface BaziAnalysis {
  chart: BaziChart;
  elementBalance: ElementBalance;
  strongestElement: Element;
  weakestElement: Element;
  dayMasterStrength: 'strong' | 'weak';
  luckyElements: Element[];
  unluckyElements: Element[];
  luckyColors: { color: string; code: string; element: Element }[];
  unluckyColors: { color: string; code: string; element: Element }[];
  dayMaster: string;
  dayMasterElement: Element;
}

function createPillar(stem: string, branch: string): Pillar {
  const stemIndex = HEAVENLY_STEMS.indexOf(stem);
  const branchIndex = EARTHLY_BRANCHES.indexOf(branch);
  return {
    stem,
    stemPinyin: HEAVENLY_STEMS_PINYIN[stemIndex] || stem,
    branch,
    branchPinyin: EARTHLY_BRANCHES_PINYIN[branchIndex] || branch,
    stemElement: STEM_ELEMENTS[stem] || 'earth',
    branchElement: BRANCH_ELEMENTS[branch] || 'earth',
  };
}

// Calculate element scores using hidden stems (藏干)
function calculateElementScores(chart: BaziChart): ElementBalance {
  const scores: ElementBalance = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };

  // Heavenly stems contribute 5 points each
  const stems = [chart.year.stem, chart.month.stem, chart.day.stem];
  if (chart.hour) stems.push(chart.hour.stem);

  stems.forEach(stem => {
    const element = STEM_ELEMENTS[stem];
    if (element) scores[element] += 5;
  });

  // Earthly branches contribute through hidden stems
  const branches = [chart.year.branch, chart.month.branch, chart.day.branch];
  if (chart.hour) branches.push(chart.hour.branch);

  branches.forEach(branch => {
    const hiddenStems = BRANCH_HIDDEN_STEMS[branch];
    if (hiddenStems) {
      Object.entries(hiddenStems).forEach(([stem, weight]) => {
        const element = STEM_ELEMENTS[stem];
        if (element) scores[element] += weight;
      });
    }
  });

  return scores;
}

// Determine Day Master strength (强弱判断)
function isDayMasterStrong(
  dayMasterElement: Element,
  monthBranch: string,
  elementScores: ElementBalance
): boolean {
  let supportScore = 0;
  let drainScore = 0;

  // 1. Check seasonal strength (月令)
  const seasonElement = SEASON_STRENGTH[monthBranch];
  if (seasonElement === dayMasterElement) {
    supportScore += 30; // Day Master is in season (得令)
  } else if (seasonElement === GENERATED_BY[dayMasterElement]) {
    supportScore += 20; // Resource element is in season
  } else if (seasonElement === CONTROLLED_BY[dayMasterElement]) {
    drainScore += 20; // Controller is in season
  }

  // 2. Calculate support from same element (比劫) and resource element (印)
  const sameElement = dayMasterElement;
  const resourceElement = GENERATED_BY[dayMasterElement];
  supportScore += elementScores[sameElement] * 2;
  supportScore += elementScores[resourceElement] * 1.5;

  // 3. Calculate drain from wealth (財), officer (官), and output (食伤)
  const wealthElement = CONTROLS[dayMasterElement]; // Element Day Master controls
  const officerElement = CONTROLLED_BY[dayMasterElement]; // Element that controls Day Master
  const outputElement = GENERATES[dayMasterElement]; // Element Day Master generates

  drainScore += elementScores[wealthElement] * 1.5;
  drainScore += elementScores[officerElement] * 2;
  drainScore += elementScores[outputElement] * 1;

  return supportScore >= drainScore;
}

export function calculateBazi(birthDate: string, birthTime?: string): BaziAnalysis {
  const [year, month, day] = birthDate.split('-').map(Number);
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yearPillar = createPillar(eightChar.getYearGan(), eightChar.getYearZhi());
  const monthPillar = createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi());
  const dayPillar = createPillar(eightChar.getDayGan(), eightChar.getDayZhi());

  let hourPillar: Pillar | null = null;
  if (birthTime) {
    const [hours] = birthTime.split(':').map(Number);
    const solarTime = Solar.fromYmdHms(year, month, day, hours, 0, 0);
    const lunarTime = solarTime.getLunar();
    const eightCharTime = lunarTime.getEightChar();
    hourPillar = createPillar(eightCharTime.getTimeGan(), eightCharTime.getTimeZhi());
  }

  const chart: BaziChart = { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };

  // Calculate element scores using hidden stems
  const elementBalance = calculateElementScores(chart);

  const sortedElements = Object.entries(elementBalance).sort((a, b) => b[1] - a[1]) as [Element, number][];
  const strongestElement = sortedElements[0][0];
  const weakestElement = sortedElements[sortedElements.length - 1][0];

  const dayMaster = dayPillar.stem;
  const dayMasterElement = dayPillar.stemElement;

  // Determine Day Master strength
  const isStrong = isDayMasterStrong(dayMasterElement, monthPillar.branch, elementBalance);
  const dayMasterStrength: 'strong' | 'weak' = isStrong ? 'strong' : 'weak';

  const luckyElements: Element[] = [];
  const unluckyElements: Element[] = [];

  if (isStrong) {
    // Strong Day Master needs to be drained/controlled
    // Lucky: Wealth (財), Officer (官), Output (食伤)
    luckyElements.push(CONTROLS[dayMasterElement]);      // Wealth - element Day Master controls
    luckyElements.push(CONTROLLED_BY[dayMasterElement]); // Officer - element that controls Day Master
    luckyElements.push(GENERATES[dayMasterElement]);     // Output - element Day Master generates
    // Unlucky: Resource (印), Siblings (比劫)
    unluckyElements.push(GENERATED_BY[dayMasterElement]); // Resource
    unluckyElements.push(dayMasterElement);               // Same element
  } else {
    // Weak Day Master needs support
    // Lucky: Resource (印), Siblings (比劫)
    luckyElements.push(GENERATED_BY[dayMasterElement]); // Resource - element that generates Day Master
    luckyElements.push(dayMasterElement);               // Same element - siblings
    // Unlucky: Wealth (財), Officer (官)
    unluckyElements.push(CONTROLS[dayMasterElement]);      // Wealth
    unluckyElements.push(CONTROLLED_BY[dayMasterElement]); // Officer
  }

  // Get colors for lucky and unlucky elements
  const luckyColors = getLuckyColors(luckyElements);
  const unluckyColors = getLuckyColors(unluckyElements);

  return {
    chart, elementBalance, strongestElement, weakestElement,
    dayMasterStrength, luckyElements, unluckyElements,
    luckyColors, unluckyColors, dayMaster, dayMasterElement,
  };
}

export function getDailyRecommendation(userBazi: BaziAnalysis, targetDate?: string) {
  const date = targetDate || new Date().toISOString().split('T')[0];
  const [year, month, day] = date.split('-').map(Number);
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  
  const dayElement = STEM_ELEMENTS[eightChar.getDayGan()];
  const isExtraLucky = userBazi.luckyElements.includes(dayElement);
  
  let recommendation = '';
  if (isExtraLucky) {
    recommendation = 'Today aligns with your chart! Great day for ' + ELEMENTS[dayElement].colors[0] + '.';
  } else if (userBazi.unluckyElements.includes(dayElement)) {
    recommendation = 'Balance today with ' + ELEMENTS[userBazi.luckyElements[0]].colors[0] + ' colors.';
  } else {
    recommendation = 'Balanced day. Enhance with ' + ELEMENTS[userBazi.luckyElements[0]].colors[0] + '.';
  }
  
  return {
    date, dayElement, recommendation,
    luckyColors: userBazi.luckyColors,
    unluckyColors: userBazi.unluckyColors,
  };
}
