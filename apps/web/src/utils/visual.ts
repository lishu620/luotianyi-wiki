const GRADIENTS = [
  'linear-gradient(135deg, #66ccff 0%, #a78bfa 100%)',
  'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
  'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
  'linear-gradient(135deg, #34d399 0%, #66ccff 100%)',
  'linear-gradient(135deg, #fbbf24 0%, #fb7185 100%)',
  'linear-gradient(135deg, #818cf8 0%, #66ccff 100%)',
];

/** 用文本哈希生成稳定的渐变色，用于封面占位。 */
export function gradientFromText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }

  return GRADIENTS[hash % GRADIENTS.length];
}

/** 取文本首字（中文取 1 个，英文取首字母）。 */
export function initialFromText(text: string): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '♪';
  return /[\u4e00-\u9fa5]/.test(trimmed[0]) ? trimmed.slice(0, 1) : trimmed.slice(0, 2).toUpperCase();
}
