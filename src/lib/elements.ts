// Five Elements (五行) definitions and color mappings

export type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export interface ElementInfo {
  name: Element;
  chinese: string;
  symbol: string;
  colors: string[];
  colorCodes: string[];
  description: {
    en: string;
    zh: string;
  };
}

export const ELEMENTS: Record<Element, ElementInfo> = {
  metal: {
    name: 'metal',
    chinese: '金',
    symbol: '🪙',
    colors: ['White', 'Gold', 'Silver', 'Gray'],
    colorCodes: ['#FFFFFF', '#FFD700', '#C0C0C0', '#808080'],
    description: {
      en: 'Metal represents strength, determination, and clarity',
      zh: '金代表坚强、决断和清明',
    },
  },
  wood: {
    name: 'wood',
    chinese: '木',
    symbol: '🌳',
    colors: ['Green', 'Teal', 'Emerald', 'Forest Green'],
    colorCodes: ['#228B22', '#008080', '#50C878', '#228B22'],
    description: {
      en: 'Wood represents growth, vitality, and creativity',
      zh: '木代表成长、活力和创造力',
    },
  },
  water: {
    name: 'water',
    chinese: '水',
    symbol: '💧',
    colors: ['Blue', 'Black', 'Navy', 'Dark Blue'],
    colorCodes: ['#0000FF', '#000000', '#000080', '#00008B'],
    description: {
      en: 'Water represents wisdom, flexibility, and intuition',
      zh: '水代表智慧、灵活和直觉',
    },
  },
  fire: {
    name: 'fire',
    chinese: '火',
    symbol: '🔥',
    colors: ['Red', 'Orange', 'Pink', 'Purple'],
    colorCodes: ['#FF0000', '#FFA500', '#FFC0CB', '#800080'],
    description: {
      en: 'Fire represents passion, energy, and transformation',
      zh: '火代表热情、能量和变化',
    },
  },
  earth: {
    name: 'earth',
    chinese: '土',
    symbol: '🌍',
    colors: ['Yellow', 'Brown', 'Beige', 'Tan'],
    colorCodes: ['#FFFF00', '#8B4513', '#F5F5DC', '#D2B48C'],
    description: {
      en: 'Earth represents stability, nourishment, and balance',
      zh: '土代表稳定、滋养和平衡',
    },
  },
};

// Element relationships
export const ELEMENT_GENERATES: Record<Element, Element> = {
  wood: 'fire',    // Wood feeds Fire
  fire: 'earth',   // Fire creates Earth (ash)
  earth: 'metal',  // Earth bears Metal
  metal: 'water',  // Metal collects Water
  water: 'wood',   // Water nourishes Wood
};

export const ELEMENT_CONTROLS: Record<Element, Element> = {
  wood: 'earth',   // Wood controls Earth (roots)
  earth: 'water',  // Earth controls Water (dam)
  water: 'fire',   // Water controls Fire
  fire: 'metal',   // Fire controls Metal (melting)
  metal: 'wood',   // Metal controls Wood (cutting)
};

// Get lucky element based on weak element
export function getLuckyElement(weakElement: Element): Element {
  // The element that generates the weak element is lucky
  const generators: Record<Element, Element> = {
    wood: 'water',
    fire: 'wood',
    earth: 'fire',
    metal: 'earth',
    water: 'metal',
  };
  return generators[weakElement];
}

// Get colors to wear based on lucky elements
export function getLuckyColors(luckyElements: Element[]): { color: string; code: string; element: Element }[] {
  const colors: { color: string; code: string; element: Element }[] = [];
  
  luckyElements.forEach(element => {
    const info = ELEMENTS[element];
    info.colors.forEach((color, index) => {
      colors.push({
        color,
        code: info.colorCodes[index],
        element,
      });
    });
  });
  
  return colors;
}

// Get colors to avoid based on controlling element
export function getUnluckyColors(strongElement: Element): { color: string; code: string; element: Element }[] {
  const controlledBy = Object.entries(ELEMENT_CONTROLS).find(
    ([, controlled]) => controlled === strongElement
  )?.[0] as Element | undefined;
  
  if (!controlledBy) return [];
  
  const info = ELEMENTS[controlledBy];
  return info.colors.map((color, index) => ({
    color,
    code: info.colorCodes[index],
    element: controlledBy,
  }));
}
