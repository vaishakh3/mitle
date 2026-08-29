import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const source = await fs.readFile(path.join(root, 'brand/milte/generated/11-avatar-soft-character-sheet-source.png'));
const sourceUrl = `data:image/png;base64,${source.toString('base64')}`;
const ids = ['01', '02', '03', '04', '05', '06', '07', '08'];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<canvas id="output" width="512" height="512"></canvas>');
  const exports = await page.evaluate(async ({ sourceUrl, ids }) => {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const columns = 4;
    const rows = 2;
    const cellWidth = image.naturalWidth / columns;
    const cellHeight = image.naturalHeight / rows;
    if (!Number.isInteger(cellWidth) || !Number.isInteger(cellHeight)) throw new Error('Avatar sheet must divide into a 4 × 2 grid.');

    return ids.map((id, index) => {
      const cell = document.createElement('canvas');
      cell.width = cellWidth;
      cell.height = cellHeight;
      const context = cell.getContext('2d', { willReadFrequently: true });
      context.drawImage(
        image,
        (index % columns) * cellWidth,
        Math.floor(index / columns) * cellHeight,
        cellWidth,
        cellHeight,
        0,
        0,
        cellWidth,
        cellHeight,
      );

      const pixels = context.getImageData(0, 0, cellWidth, cellHeight);
      let left = cellWidth;
      let top = cellHeight;
      let right = 0;
      let bottom = 0;
      for (let pixel = 0; pixel < cellWidth * cellHeight; pixel++) {
        const alphaOffset = pixel * 4 + 3;
        // Remove faint export fringe without changing the illustrated figure.
        if (pixels.data[alphaOffset] < 28) pixels.data[alphaOffset] = 0;
        if (!pixels.data[alphaOffset]) continue;
        const x = pixel % cellWidth;
        const y = Math.floor(pixel / cellWidth);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
      context.putImageData(pixels, 0, 0);

      const output = document.getElementById('output');
      const outputContext = output.getContext('2d');
      outputContext.clearRect(0, 0, 512, 512);
      outputContext.imageSmoothingEnabled = true;
      outputContext.imageSmoothingQuality = 'high';
      const cropWidth = right - left + 1;
      const cropHeight = bottom - top + 1;
      const scale = Math.min(456 / cropWidth, 456 / cropHeight);
      const width = cropWidth * scale;
      const height = cropHeight * scale;
      outputContext.drawImage(cell, left, top, cropWidth, cropHeight, (512 - width) / 2, (512 - height) / 2, width, height);
      return { id, dataUrl: output.toDataURL('image/png') };
    });
  }, { sourceUrl, ids });

  for (const avatar of exports) {
    await fs.writeFile(
      path.join(root, 'apps/mobile/assets', `avatar-${avatar.id}.png`),
      Buffer.from(avatar.dataUrl.slice(avatar.dataUrl.indexOf(',') + 1), 'base64'),
    );
  }
} finally {
  await browser.close();
}

console.log('Generated eight transparent Milte character avatars.');
