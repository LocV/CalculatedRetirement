/**
 * Design token palette — semantic names, exact values from Claude Design.
 * Use these everywhere instead of raw hex strings so the design stays consistent.
 */
export const palette = {
  // Accounts — greens (money you have)
  account401k:  '#3FA76B',
  accountTax:   '#5FBF8F',
  accountRoth:  '#86D6AC',
  accountCash:  '#B8E5C9',

  // Spending — yellow/amber
  spend:        '#F2C94C',
  spendDim:     'rgba(242, 201, 76, 0.5)',
  spendBump:    '#F2A93C',

  // Income — cool/neutral
  wages:        '#7AB8D4',
  other:        '#A89BD4',
  ss:           '#6FB5A8',
  pension:      '#B89BD4',

  // Tax — red
  tax:          '#E0584C',
  taxDim:       'rgba(224, 88, 76, 0.6)',

  // UI
  ink:          '#F2F1EC',
  inkSoft:      'rgba(242, 241, 236, 0.6)',
  inkSofter:    'rgba(242, 241, 236, 0.4)',
  bgDeep:       '#0A1410',
  bgMid:        '#0F1C18',
  bgLift:       'rgba(20, 34, 28, 0.7)',
  borderSoft:   'rgba(255, 255, 255, 0.06)',
  borderAccent: 'rgba(63, 167, 107, 0.22)',

  // States
  good:         '#7CD4A8',
  danger:       '#E0584C',
} as const;

export type PaletteKey = keyof typeof palette;
