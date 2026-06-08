import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const designsDir = '/home/team/shared/designs/batch2';
const mockupsDir = '/home/team/shared/mockups/batch2';
const basesDir = '/home/agent-web-developer/mockup-bases';

if (!fs.existsSync(mockupsDir)) {
  fs.mkdirSync(mockupsDir, { recursive: true });
}

const designs = fs.readdirSync(designsDir).filter(f => f.endsWith('.png'));

async function generateMockups() {
  for (const designFile of designs) {
    const designPath = path.join(designsDir, designFile);
    const mockupPath = path.join(mockupsDir, designFile.replace('.png', '-mockup.png'));

    if (designFile.startsWith('tshirt-')) {
      console.log(`Generating t-shirt mockup for ${designFile}...`);
      const baseSvg = path.join(basesDir, 'tshirt-base.svg');
      
      // Resize design to fit chest (approx 300x300)
      const resizedDesign = await sharp(designPath)
        .resize(300, 300, { fit: 'inside' })
        .toBuffer();

      await sharp(baseSvg)
        .composite([{ input: resizedDesign, top: 250, left: 350 }])
        .resize(1000, 1000)
        .toFile(mockupPath);

    } else if (designFile.startsWith('bumper-')) {
      console.log(`Generating sticker mockup for ${designFile}...`);
      const baseSvg = path.join(basesDir, 'sticker-base.svg');

      // Resize design to fit sticker (approx 500x150)
      const resizedDesign = await sharp(designPath)
        .resize(500, 150, { fit: 'inside' })
        .toBuffer();

      await sharp(baseSvg)
        .composite([{ input: resizedDesign, top: 25, left: 50 }])
        .resize(600, 200)
        .toFile(mockupPath);
    }
  }
  console.log('Batch 2 mockup generation complete.');
}

generateMockups().catch(err => {
  console.error(err);
  process.exit(1);
});
