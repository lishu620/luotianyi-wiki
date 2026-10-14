import {
  CN_CONTACT_LABELS,
  CN_GENDER_LABELS,
  CN_PURPOSE_LABELS,
  type CnContactKey,
  type CnProfile,
} from '@luotianyi/shared';

import { cnCardTheme } from './cnCardThemes';

/** 与页面上「个人介绍卡」视觉一致的固定尺寸导出（1080 宽，适合手机保存 / 分享） */
const WIDTH = 1080;
const PADDING = 64;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';

  for (const char of text) {
    if (char === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  return lines;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    // B 站图片 CDN 会校验 Referer（带本站 Referer 返回 403），导出时必须显式不带 Referer
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** 画一组标签，返回占用高度 */
function drawTags(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  x: number,
  y: number,
  maxWidth: number,
  colors: { soft: string; ink: string },
): number {
  if (tags.length === 0) return 0;

  ctx.font = '28px system-ui, sans-serif';
  let cursorX = x;
  let cursorY = y;
  const lineHeight = 52;

  for (const tag of tags) {
    const textWidth = ctx.measureText(tag).width;
    const boxWidth = textWidth + 36;

    if (cursorX + boxWidth > x + maxWidth) {
      cursorX = x;
      cursorY += lineHeight + 12;
    }

    ctx.fillStyle = colors.soft;
    roundRect(ctx, cursorX, cursorY, boxWidth, 44, 22);
    ctx.fill();

    ctx.fillStyle = colors.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cursorX + 18, cursorY + 23);

    cursorX += boxWidth + 12;
  }

  return cursorY - y + lineHeight;
}

export async function exportCnCard(profile: CnProfile): Promise<void> {
  // 先量高度：用一个临时画布测量文案行数
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return;

  const theme = cnCardTheme(profile.cardStyle);
  const tagColors = { soft: theme.accentSoft, ink: theme.accentInk };

  const contentWidth = WIDTH - PADDING * 2;
  measure.font = '30px system-ui, sans-serif';
  const declarationLines = profile.declaration ? wrapText(measure, profile.declaration, contentWidth) : [];

  let height = 420; // 头部 + 基本信息
  if (profile.personality) height += 52;
  if (profile.interests.length) height += 60 + (Math.ceil(profile.interests.length / 6) + 1) * 64;
  if (profile.lookingFor.length) height += 60 + (Math.ceil(profile.lookingFor.length / 6) + 1) * 64;
  if (declarationLines.length) height += 60 + declarationLines.length * 42;
  height += 140; // 联系方式 + 页脚

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  // 背景
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, WIDTH, height);

  // 顶部款式渐变区
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, 300);
  gradient.addColorStop(0, theme.headerFrom);
  gradient.addColorStop(1, theme.headerTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, 300);

  // 头像
  const avatarSize = 150;
  const avatarX = PADDING;
  const avatarY = 70;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const image = profile.avatarUrl ? await loadImage(profile.avatarUrl) : null;
  if (image) {
    ctx.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(profile.cn.slice(0, 1), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
  ctx.stroke();

  // 圈名
  ctx.fillStyle = theme.ink;
  ctx.font = 'bold 62px system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(profile.cn, avatarX + avatarSize + 40, avatarY + 70);

  // 基本信息行
  ctx.font = '30px system-ui, sans-serif';
  ctx.fillStyle = theme.muted;
  const basics = [
    CN_GENDER_LABELS[profile.gender],
    profile.age ? `${profile.age} 岁` : null,
    profile.region || null,
    CN_PURPOSE_LABELS[profile.purpose],
  ].filter(Boolean) as string[];
  ctx.fillText(basics.join(' · '), avatarX + avatarSize + 40, avatarY + 120);

  if (profile.authorUsername) {
    ctx.fillStyle = theme.muted;
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(`@${profile.authorUsername}`, avatarX + avatarSize + 40, avatarY + 158);
  }

  let cursorY = 300;

  // 性格
  if (profile.personality) {
    ctx.fillStyle = theme.muted;
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('性格', PADDING, cursorY);
    ctx.fillStyle = theme.ink;
    ctx.font = '30px system-ui, sans-serif';
    ctx.fillText(profile.personality, PADDING + 120, cursorY);
    cursorY += 62;
  }

  // 兴趣
  if (profile.interests.length) {
    ctx.fillStyle = theme.muted;
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('兴趣', PADDING, cursorY);
    const used = drawTags(ctx, profile.interests, PADDING + 120, cursorY - 32, contentWidth - 120, tagColors);
    cursorY += Math.max(48, used) + 16;
  }

  // 想找的搭子
  if (profile.lookingFor.length) {
    ctx.fillStyle = theme.muted;
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('想找', PADDING, cursorY);
    const used = drawTags(ctx, profile.lookingFor, PADDING + 120, cursorY - 32, contentWidth - 120, tagColors);
    cursorY += Math.max(48, used) + 16;
  }

  // 个人宣言
  if (declarationLines.length) {
    ctx.fillStyle = theme.muted;
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText('宣言', PADDING, cursorY);
    ctx.fillStyle = theme.ink;
    ctx.font = '30px system-ui, sans-serif';
    let declY = cursorY;
    for (const line of declarationLines) {
      ctx.fillText(line, PADDING + 120, declY);
      declY += 42;
    }
    cursorY = declY + 20;
  }

  // 联系方式
  ctx.fillStyle = theme.panel;
  roundRect(ctx, PADDING, cursorY, contentWidth, 86, 20);
  ctx.fill();

  ctx.fillStyle = theme.muted;
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('联系方式', PADDING + 28, cursorY + 54);

  ctx.font = '30px system-ui, sans-serif';
  if (profile.contactsVisible) {
    const contacts = Object.entries(profile.contacts ?? {})
      .map(([key, value]) => `${CN_CONTACT_LABELS[key as CnContactKey] ?? key}: ${value}`)
      .join('  ');
    ctx.fillStyle = theme.ink;
    ctx.fillText(contacts || '—', PADDING + 216, cursorY + 54);
  } else {
    ctx.fillStyle = '#d97706';
    ctx.fillText('需互相心动后解锁 🔒', PADDING + 216, cursorY + 54);
  }

  cursorY += 130;

  // 页脚
  ctx.fillStyle = theme.muted;
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('洛天依 Wiki · 个人介绍卡', PADDING, cursorY);
  ctx.textAlign = 'right';
  ctx.fillText('luotianyi.wiki', PADDING + contentWidth, cursorY);
  ctx.textAlign = 'left';

  // 下载
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `个人介绍卡-${profile.cn}.png`;
  link.click();
}
