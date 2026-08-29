import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const assetDir = path.join(root, 'apps/mobile/assets');
const archivoPath = path.join(root, 'apps/mobile/node_modules/@expo-google-fonts/archivo/700Bold/Archivo_700Bold.ttf');
const dmSansPath = path.join(root, 'apps/mobile/node_modules/@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf');

const [archivo, dmSans] = await Promise.all([fs.readFile(archivoPath), fs.readFile(dmSansPath)]);
const fontCss = `
  @font-face { font-family: ArchivoLocal; src: url(data:font/ttf;base64,${archivo.toString('base64')}) format('truetype'); font-weight: 700; }
  @font-face { font-family: DMSansLocal; src: url(data:font/ttf;base64,${dmSans.toString('base64')}) format('truetype'); font-weight: 500; }
`;

const colors = {
  canvas: '#F6F7F8',
  ink: '#161719',
  blue: '#2347D8',
  red: '#C73A2C',
  marigold: '#F0B83E',
  white: '#FFFFFF',
};

function mark({ m = colors.white, question = colors.marigold, fontSize = 410, tracking = -28 } = {}) {
  return `<div class="mark" style="font-size:${fontSize}px;letter-spacing:${tracking}px;color:${m}">m<span style="color:${question}">?</span></div>`;
}

function wordmark({ ink = colors.ink, question = colors.red } = {}) {
  return `<div class="wordmark" style="color:${ink}">milte<span style="color:${question}">?</span></div>`;
}

async function render(page, { file, size, background = 'transparent', content }) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><style>
    ${fontCss}
    * { box-sizing: border-box; }
    html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: ${background}; }
    body { display: flex; align-items: center; justify-content: center; }
    .mark, .wordmark { font-family: ArchivoLocal, Arial, sans-serif; font-weight: 700; line-height: .9; white-space: nowrap; }
    .wordmark { font-size: 190px; letter-spacing: -12px; }
  </style>${content}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(assetDir, file), omitBackground: background === 'transparent' });
}

async function renderSvgFile(page, input, output, width, height) {
  const svg = await fs.readFile(path.join(root, input), 'utf8');
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>${fontCss}*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, output) });
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  // Transparent utility marks used only on controlled in-product surfaces.
  await render(page, { file: 'milte-symbol.png', size: 512, content: mark({ m: colors.blue, question: colors.red, fontSize: 250, tracking: -18 }) });
  await render(page, { file: 'milte-symbol-reversed.png', size: 512, content: mark({ fontSize: 250, tracking: -18 }) });

  // The launcher icon is full bleed. The m? sits inside a 44% optical safe zone
  // so circle, squircle, rounded-square, and Android adaptive masks cannot crop it.
  await render(page, { file: 'icon.png', size: 1024, background: colors.blue, content: mark() });
  await render(page, { file: 'favicon.png', size: 1024, background: colors.blue, content: mark() });
  await render(page, { file: 'android-icon-foreground.png', size: 1024, content: mark({ fontSize: 330, tracking: -24 }) });
  await render(page, { file: 'android-icon-background.png', size: 1024, background: colors.blue, content: '' });
  await render(page, { file: 'android-icon-monochrome.png', size: 512, content: mark({ m: colors.ink, question: colors.ink, fontSize: 190, tracking: -14 }) });

  // A full wordmark belongs on the splash; unlike the compact mark, it never
  // asks a new user to decode an unexplained symbol.
  await render(page, { file: 'splash-icon.png', size: 1024, content: wordmark() });
  await renderSvgFile(page, 'store/feature-graphic.svg', 'store/feature-graphic.png', 1024, 500);
} finally {
  await browser.close();
}

console.log('Generated Milte question-wordmark assets.');
