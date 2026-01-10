declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    getLunar(): Lunar;
  }

  export class Lunar {
    getEightChar(): EightChar;
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  }

  export class EightChar {
    getYear(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonth(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDay(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTime(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
  }
}
