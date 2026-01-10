// BaZi calculation logic using lunar-javascript
// Reference: https://github.com/china-testing/bazi/blob/master/bazi.py
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

// Directional Analysis - Bagua Direction Mapping
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface DirectionInfo {
  direction: Direction;
  degrees: string;
  element: Element;
  chinese: string;
  pinyin: string;
  trigram: string;
  attributes: string[];
}

export const BAGUA_DIRECTIONS: Record<Direction, DirectionInfo> = {
  'N': { direction: 'N', degrees: '337.5° - 22.5°', element: 'water', chinese: '坎', pinyin: 'Kan', trigram: 'Water', attributes: ['Career', 'Life Path', 'Wisdom'] },
  'NE': { direction: 'NE', degrees: '22.5° - 67.5°', element: 'earth', chinese: '艮', pinyin: 'Gen', trigram: 'Mountain', attributes: ['Knowledge', 'Self-Cultivation', 'Spirituality'] },
  'E': { direction: 'E', degrees: '67.5° - 112.5°', element: 'wood', chinese: '震', pinyin: 'Zhen', trigram: 'Thunder', attributes: ['Health', 'Family', 'New Beginnings'] },
  'SE': { direction: 'SE', degrees: '112.5° - 157.5°', element: 'wood', chinese: '巽', pinyin: 'Xun', trigram: 'Wind', attributes: ['Wealth', 'Abundance', 'Prosperity'] },
  'S': { direction: 'S', degrees: '157.5° - 202.5°', element: 'fire', chinese: '离', pinyin: 'Li', trigram: 'Fire', attributes: ['Fame', 'Recognition', 'Passion'] },
  'SW': { direction: 'SW', degrees: '202.5° - 247.5°', element: 'earth', chinese: '坤', pinyin: 'Kun', trigram: 'Earth', attributes: ['Love', 'Relationships', 'Partnerships'] },
  'W': { direction: 'W', degrees: '247.5° - 292.5°', element: 'metal', chinese: '兑', pinyin: 'Dui', trigram: 'Lake', attributes: ['Children', 'Creativity', 'Completion'] },
  'NW': { direction: 'NW', degrees: '292.5° - 337.5°', element: 'metal', chinese: '乾', pinyin: 'Qian', trigram: 'Heaven', attributes: ['Helpful People', 'Travel', 'Leadership'] }
};

export interface DirectionalRecommendation {
  primaryDirection: Direction;
  alternateDirections: Direction[];
  element: Element;
  strength: 'excellent' | 'good' | 'moderate';
  reason: string;
}

export interface ColorPlacementZone {
  direction: Direction;
  colors: { color: string; code: string; element: Element }[];
  purpose: string;
  priority: 'high' | 'medium' | 'low';
}

export interface WealthCornerRecommendation {
  direction: Direction;
  element: Element;
  enhancementColors: { color: string; code: string; element: Element }[];
  items: string[];
  advice: string;
}

export interface DirectionalAnalysis {
  sittingDirection: DirectionalRecommendation;
  deskPosition: DirectionalRecommendation;
  colorZones: ColorPlacementZone[];
  wealthCorner: WealthCornerRecommendation;
}

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
  directionalAnalysis: DirectionalAnalysis;
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

// Helper mapping for generating cycle in directions
const DIRECTION_GENERATED_BY: Record<Element, Element> = {
  wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal'
};

// Calculate best sitting direction based on lucky elements
function calculateBestSittingDirection(
  luckyElements: Element[],
  unluckyElements: Element[]
): DirectionalRecommendation {
  const scoredDirections: { direction: Direction; score: number; element: Element }[] = [];

  Object.entries(BAGUA_DIRECTIONS).forEach(([dir, info]) => {
    const direction = dir as Direction;
    let score = 0;

    // Primary lucky element gets highest score
    if (info.element === luckyElements[0]) {
      score = 100;
    } else if (luckyElements.includes(info.element)) {
      score = 70;
    } else if (unluckyElements.includes(info.element)) {
      score = -50;
    } else {
      score = 30; // Neutral
    }

    // Boost score for career-related directions (N, SE)
    if (direction === 'N' || direction === 'SE') {
      score += 20;
    }

    scoredDirections.push({ direction, score, element: info.element });
  });

  // Sort by score
  scoredDirections.sort((a, b) => b.score - a.score);

  const best = scoredDirections[0];
  const alternates = scoredDirections.slice(1, 4).map(d => d.direction);

  let strength: 'excellent' | 'good' | 'moderate' = 'moderate';
  if (best.score >= 100) strength = 'excellent';
  else if (best.score >= 70) strength = 'good';

  const dirInfo = BAGUA_DIRECTIONS[best.direction];
  const reason = `This direction aligns with your lucky ${best.element} element, supporting ${dirInfo.attributes.join(', ').toLowerCase()}.`;

  return {
    primaryDirection: best.direction,
    alternateDirections: alternates,
    element: best.element,
    strength,
    reason
  };
}

// Calculate best desk position in room
function calculateBestDeskPosition(luckyElements: Element[]): DirectionalRecommendation {
  const scoredPositions: { direction: Direction; score: number; element: Element }[] = [];

  Object.entries(BAGUA_DIRECTIONS).forEach(([dir, info]) => {
    const direction = dir as Direction;
    let score = 0;

    if (info.element === luckyElements[0]) {
      score = 100;
    } else if (luckyElements.includes(info.element)) {
      score = 70;
    } else {
      score = 30;
    }

    // Prefer command position directions (back to wall, view of door)
    if (['NE', 'E', 'SE', 'S'].includes(direction)) {
      score += 15;
    }

    scoredPositions.push({ direction, score, element: info.element });
  });

  scoredPositions.sort((a, b) => b.score - a.score);

  const best = scoredPositions[0];
  const alternates = scoredPositions.slice(1, 3).map(d => d.direction);

  let strength: 'excellent' | 'good' | 'moderate' = 'moderate';
  if (best.score >= 100) strength = 'excellent';
  else if (best.score >= 70) strength = 'good';

  const dirInfo = BAGUA_DIRECTIONS[best.direction];
  const reason = `Place your desk in the ${best.direction} sector of your room to harness ${best.element} energy for ${dirInfo.attributes[0].toLowerCase()}.`;

  return {
    primaryDirection: best.direction,
    alternateDirections: alternates,
    element: best.element,
    strength,
    reason
  };
}

// Calculate color placement zones for all 8 directions
function calculateColorPlacementZones(
  luckyElements: Element[],
  unluckyElements: Element[],
  baziAnalysis: BaziAnalysis
): ColorPlacementZone[] {
  const zones: ColorPlacementZone[] = [];

  Object.entries(BAGUA_DIRECTIONS).forEach(([dir, info]) => {
    const direction = dir as Direction;
    const dirElement = info.element;

    let colors: { color: string; code: string; element: Element }[] = [];
    let priority: 'high' | 'medium' | 'low' = 'low';
    let purpose = '';

    if (luckyElements.includes(dirElement)) {
      colors = baziAnalysis.luckyColors.filter(c => c.element === dirElement);
      priority = dirElement === luckyElements[0] ? 'high' : 'medium';
      purpose = `Enhance your ${dirElement} element to boost ${info.attributes[0].toLowerCase()}`;
    } else if (dirElement === luckyElements[0]) {
      colors = baziAnalysis.luckyColors.filter(c => c.element === luckyElements[0]);
      priority = 'high';
      purpose = `Activate your primary lucky element (${luckyElements[0]}) in the ${info.attributes[0].toLowerCase()} sector`;
    } else {
      const supportingElement = DIRECTION_GENERATED_BY[dirElement];
      colors = baziAnalysis.luckyColors.filter(c => c.element === supportingElement).slice(0, 2);
      priority = 'low';
      purpose = `Support the ${dirElement} energy with ${supportingElement} colors`;
    }

    zones.push({
      direction,
      colors,
      purpose,
      priority
    });
  });

  zones.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return zones;
}

// Calculate wealth corner recommendation
function calculateWealthCorner(
  luckyElements: Element[],
  baziAnalysis: BaziAnalysis
): WealthCornerRecommendation {
  const direction: Direction = 'SE';
  const element: Element = 'wood';

  let enhancementColors: { color: string; code: string; element: Element }[] = [];
  let items: string[] = [];
  let advice = '';

  if (luckyElements.includes('wood')) {
    enhancementColors = baziAnalysis.luckyColors.filter(c => c.element === 'wood');
    advice = 'Your wood element is lucky! Maximize your wealth corner with green plants, wooden furniture, and vertical elements.';
    items = ['Live plants', 'Wooden desk organizer', 'Green/teal accessories', 'Bamboo items'];
  } else if (luckyElements.includes('water')) {
    enhancementColors = [
      ...baziAnalysis.luckyColors.filter(c => c.element === 'water'),
      ...baziAnalysis.luckyColors.filter(c => c.element === 'wood').slice(0, 2)
    ];
    advice = 'Your lucky water element nourishes the wealth corner! Combine blue/black with green for prosperity.';
    items = ['Small water fountain', 'Blue & green items', 'Fish imagery', 'Flowing shapes'];
  } else if (luckyElements.includes('fire')) {
    enhancementColors = baziAnalysis.luckyColors.filter(c => c.element === 'wood');
    advice = 'Balance your fire element luck with wood. Add plants and green tones to activate wealth without draining energy.';
    items = ['Green plants', 'Wood + red accents', 'Candles near plants', 'Upward-growing plants'];
  } else {
    enhancementColors = getLuckyColors(['wood']);
    advice = 'Activate the traditional wealth corner with wood element colors and items for prosperity.';
    items = ['Healthy plants', 'Wooden items', 'Green color accents', 'Growth symbols'];
  }

  return {
    direction,
    element,
    enhancementColors,
    items,
    advice
  };
}

// Calculate all directional recommendations
function calculateDirectionalAnalysis(baziAnalysis: BaziAnalysis): DirectionalAnalysis {
  const luckyElements = baziAnalysis.luckyElements;
  const unluckyElements = baziAnalysis.unluckyElements;

  return {
    sittingDirection: calculateBestSittingDirection(luckyElements, unluckyElements),
    deskPosition: calculateBestDeskPosition(luckyElements),
    colorZones: calculateColorPlacementZones(luckyElements, unluckyElements, baziAnalysis),
    wealthCorner: calculateWealthCorner(luckyElements, baziAnalysis)
  };
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
  const unluckyColors = getUnluckyColors(strongestElement);

  // Create a temporary BaziAnalysis object for directional calculation
  const tempAnalysis: BaziAnalysis = {
    chart, elementBalance, strongestElement, weakestElement,
    dayMasterStrength, luckyElements, unluckyElements,
    luckyColors, unluckyColors, dayMaster, dayMasterElement,
    directionalAnalysis: null as any // Placeholder, will be set below
  };

  // Calculate directional analysis
  const directionalAnalysis = calculateDirectionalAnalysis(tempAnalysis);

  return {
    chart, elementBalance, strongestElement, weakestElement,
    dayMasterStrength, luckyElements, unluckyElements,
    luckyColors, unluckyColors, dayMaster, dayMasterElement,
    directionalAnalysis,
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
