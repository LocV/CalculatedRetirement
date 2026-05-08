// ============================================================
// Tax Brackets
// ============================================================

export interface TaxBracket {
  min: number;
  max: number; // Infinity for top bracket
  rate: number;
}

export interface TaxBracketSet {
  MFJ: TaxBracket[];
  SINGLE: TaxBracket[];
}

export const TAX_BRACKETS: Record<number, TaxBracketSet> = {
  2024: {
    MFJ: [
      { min: 0, max: 23200, rate: 0.10 },
      { min: 23201, max: 94300, rate: 0.12 },
      { min: 94301, max: 201050, rate: 0.22 },
      { min: 201051, max: 383900, rate: 0.24 },
      { min: 383901, max: 487450, rate: 0.32 },
      { min: 487451, max: 731200, rate: 0.35 },
      { min: 731201, max: Infinity, rate: 0.37 },
    ],
    SINGLE: [
      { min: 0, max: 11600, rate: 0.10 },
      { min: 11601, max: 47150, rate: 0.12 },
      { min: 47151, max: 100525, rate: 0.22 },
      { min: 100526, max: 191950, rate: 0.24 },
      { min: 191951, max: 243725, rate: 0.32 },
      { min: 243726, max: 609350, rate: 0.35 },
      { min: 609351, max: Infinity, rate: 0.37 },
    ],
  },
  2025: {
    MFJ: [
      { min: 0, max: 23850, rate: 0.10 },
      { min: 23851, max: 96950, rate: 0.12 },
      { min: 96951, max: 206700, rate: 0.22 },
      { min: 206701, max: 394600, rate: 0.24 },
      { min: 394601, max: 501050, rate: 0.32 },
      { min: 501051, max: 751600, rate: 0.35 },
      { min: 751601, max: Infinity, rate: 0.37 },
    ],
    SINGLE: [
      { min: 0, max: 11925, rate: 0.10 },
      { min: 11926, max: 48475, rate: 0.12 },
      { min: 48476, max: 103350, rate: 0.22 },
      { min: 103351, max: 197300, rate: 0.24 },
      { min: 197301, max: 250525, rate: 0.32 },
      { min: 250526, max: 626350, rate: 0.35 },
      { min: 626351, max: Infinity, rate: 0.37 },
    ],
  },
  2026: {
    MFJ: [
      { min: 0, max: 23850, rate: 0.10 },
      { min: 23851, max: 96950, rate: 0.12 },
      { min: 96951, max: 206700, rate: 0.22 },
      { min: 206701, max: 394600, rate: 0.24 },
      { min: 394601, max: 501050, rate: 0.32 },
      { min: 501051, max: 751600, rate: 0.35 },
      { min: 751601, max: Infinity, rate: 0.37 },
    ],
    SINGLE: [
      { min: 0, max: 11925, rate: 0.10 },
      { min: 11926, max: 48475, rate: 0.12 },
      { min: 48476, max: 103350, rate: 0.22 },
      { min: 103351, max: 197300, rate: 0.24 },
      { min: 197301, max: 250525, rate: 0.32 },
      { min: 250526, max: 626350, rate: 0.35 },
      { min: 626351, max: Infinity, rate: 0.37 },
    ],
  },
  2027: {
    MFJ: [
      { min: 0, max: 24550, rate: 0.10 },
      { min: 24551, max: 99850, rate: 0.12 },
      { min: 99851, max: 212900, rate: 0.22 },
      { min: 212901, max: 406350, rate: 0.24 },
      { min: 406351, max: 516201, rate: 0.32 },
      { min: 516202, max: 773950, rate: 0.35 },
      { min: 773951, max: Infinity, rate: 0.37 },
    ],
    SINGLE: [
      { min: 0, max: 12275, rate: 0.10 },
      { min: 12276, max: 49925, rate: 0.12 },
      { min: 49926, max: 106450, rate: 0.22 },
      { min: 106451, max: 203200, rate: 0.24 },
      { min: 203201, max: 258100, rate: 0.32 },
      { min: 258101, max: 643950, rate: 0.35 },
      { min: 643951, max: Infinity, rate: 0.37 },
    ],
  },
};

// ============================================================
// Standard Deductions
// ============================================================

export interface StandardDeductionSet {
  MFJ: number;
  SINGLE: number;
}

export const STANDARD_DEDUCTION: Record<number, StandardDeductionSet> = {
  2024: { MFJ: 29200, SINGLE: 14600 },
  2025: { MFJ: 30000, SINGLE: 15000 },
  2026: { MFJ: 30000, SINGLE: 15000 },
  2027: { MFJ: 30800, SINGLE: 15400 },
};

// ============================================================
// Long-Term Capital Gains Brackets
// ============================================================

export interface LTCGBracketSet {
  MFJ: TaxBracket[];
  SINGLE: TaxBracket[];
}

export const LTCG_BRACKETS: Record<number, LTCGBracketSet> = {
  2024: {
    MFJ: [
      { min: 0, max: 94050, rate: 0.0 },
      { min: 94051, max: 583750, rate: 0.15 },
      { min: 583751, max: Infinity, rate: 0.20 },
    ],
    SINGLE: [
      { min: 0, max: 47025, rate: 0.0 },
      { min: 47026, max: 518900, rate: 0.15 },
      { min: 518901, max: Infinity, rate: 0.20 },
    ],
  },
  2025: {
    MFJ: [
      { min: 0, max: 96700, rate: 0.0 },
      { min: 96701, max: 600050, rate: 0.15 },
      { min: 600051, max: Infinity, rate: 0.20 },
    ],
    SINGLE: [
      { min: 0, max: 48350, rate: 0.0 },
      { min: 48351, max: 533400, rate: 0.15 },
      { min: 533401, max: Infinity, rate: 0.20 },
    ],
  },
  2026: {
    MFJ: [
      { min: 0, max: 96700, rate: 0.0 },
      { min: 96701, max: 600050, rate: 0.15 },
      { min: 600051, max: Infinity, rate: 0.20 },
    ],
    SINGLE: [
      { min: 0, max: 48350, rate: 0.0 },
      { min: 48351, max: 533400, rate: 0.15 },
      { min: 533401, max: Infinity, rate: 0.20 },
    ],
  },
  2027: {
    MFJ: [
      { min: 0, max: 99600, rate: 0.0 },
      { min: 99601, max: 618000, rate: 0.15 },
      { min: 618001, max: Infinity, rate: 0.20 },
    ],
    SINGLE: [
      { min: 0, max: 49800, rate: 0.0 },
      { min: 49801, max: 549350, rate: 0.15 },
      { min: 549351, max: Infinity, rate: 0.20 },
    ],
  },
};

// ============================================================
// Age-65 Extra Standard Deduction (per-person)
// ============================================================

export const AGE_65_EXTRA_DEDUCTION: Record<number, { MFJ: number; SINGLE: number }> = {
  2024: { MFJ: 1550,  SINGLE: 1950 },
  2025: { MFJ: 1600,  SINGLE: 2000 },
  2026: { MFJ: 1600,  SINGLE: 2000 },
  2027: { MFJ: 1650,  SINGLE: 2050 },
};

// ============================================================
// Social Security Taxation Thresholds (filing-specific)
// ============================================================

export const SS_THRESHOLDS: Record<'MFJ' | 'SINGLE', { base: number; upper: number }> = {
  MFJ:    { base: 32000, upper: 44000 },
  SINGLE: { base: 25000, upper: 34000 },
};

// ============================================================
// IRMAA Tiers (2026, MFJ)
// ============================================================

export interface IRMAATier {
  magiMin: number;
  magiMax: number;
  partBMonthly: number;
  partDMonthly: number;
  annualTotal: number;
}

export const IRMAA_TIERS: IRMAATier[] = [
  { magiMin: 0, magiMax: 212000, partBMonthly: 0, partDMonthly: 0, annualTotal: 0 },
  { magiMin: 212001, magiMax: 266000, partBMonthly: 74.00, partDMonthly: 12.70, annualTotal: 2600 },
  { magiMin: 266001, magiMax: 334000, partBMonthly: 184.90, partDMonthly: 32.80, annualTotal: 6452 },
  { magiMin: 334001, magiMax: 402000, partBMonthly: 295.90, partDMonthly: 52.90, annualTotal: 10174 },
  { magiMin: 402001, magiMax: 750000, partBMonthly: 406.90, partDMonthly: 73.00, annualTotal: 13918 },
  { magiMin: 750001, magiMax: Infinity, partBMonthly: 443.90, partDMonthly: 81.00, annualTotal: 15178 },
];

// ============================================================
// RMD Uniform Lifetime Table (IRS Publication 590-B)
// ============================================================

export const RMD_TABLE: Record<number, number> = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

// ============================================================
// Gift and Estate Constants
// ============================================================

export const ANNUAL_GIFT_EXCLUSION: Record<number, number> = {
  2024: 18000,
  2025: 19000,
  2026: 19000,
};

export const FEDERAL_ESTATE_EXEMPTION: Record<number, number> = {
  2026: 13990000,
};

export const WA_ESTATE_TAX_THRESHOLD = 2193000;

// ============================================================
// RMD Start Age
// ============================================================

export const RMD_START_AGE = 73;
