const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Fetching products from team-db...');
  const output = execSync('team-db "SELECT * FROM products"', { encoding: 'utf8' });
  const products = JSON.parse(output);
  
  const dataDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(dataDir, 'products.json'),
    JSON.stringify(products, null, 2)
  );
  
  console.log(`Successfully fetched ${products.length} products.`);
} catch (error) {
  console.error('Error fetching products:', error.message);
  process.exit(1);
}
