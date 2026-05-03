/** Preset tag chip backgrounds (cycle for new tags). */
export const TAG_COLOR_PALETTE = [
    '#DCFCE7',
    '#FFEDD5',
    '#FCE7C5',
    '#FEF9C3',
    '#DBEAFE',
    '#EDE9FE',
    '#FCE7F3',
    '#FEE2E2',
    '#ECECED',
];

export const tagColorAtIndex = (index) =>
    TAG_COLOR_PALETTE[Math.abs(index) % TAG_COLOR_PALETTE.length];
