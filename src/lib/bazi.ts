// BaZi calculation logic using lunar-javascript
import { Solar } from 'lunar-javascript';
import { Element, ELEMENTS, getLuckyColors, getUnluckyColors } from './elements';

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
  const elementBalance: ElementBalance = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  
  const pillars = [yearPillar, monthPillar, dayPillar];
  if (hourPillar) pillars.push(hourPillar);
  
  pillars.forEach(pillar => {
    elementBalance[pillar.stemElement] += 1;
    elementBalance[pillar.branchElement] += 1;
  });
  
  const sortedElements = Object.entries(elementBalance).sort((a, b) => b[1] - a[1]) as [Element, number][];
  const strongestElement = sortedElements[0][0];
  const weakestElement = sortedElements[sortedElements.length - 1][0];
  
  const dayMaster = dayPillar.stem;
  const dayMasterElement = dayPillar.stemElement;
  
  const luckyElements: Element[] = [];
  const unluckyElements: Element[] = [];
  
  const generating: Record<Element, Element> = {
    wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal',
  };
  const controlling: Record<Element, Element> = {
    wood: 'metal', fire: 'water', earth: 'wood', metal: 'fire', water: 'earth',
  };
  
  luckyElements.push(generating[dayMasterElement]);
  luckyElements.push(dayMasterElement);
  unluckyElements.push(controlling[dayMasterElement]);
  
  const luckyColors = getLuckyColors(luckyElements);
  const unluckyColors = getUnluckyColors(strongestElement);
  
  return {
    chart, elementBalance, strongestElement, weakestElement,
    luckyElements, unluckyElements, luckyColors, unluckyColors,
    dayMaster, dayMasterElement,
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
