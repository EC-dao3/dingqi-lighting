const fs = require('fs');
const crypto = require('crypto');
const vm = require('vm');

function uuid() {
  return crypto.randomUUID();
}

const code = fs.readFileSync('./js/product-data.js', 'utf8').replace('const productData =', 'var productData =');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);

const gradients = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b2e 0%, #1a1a2e 50%, #162447 100%)',
  'linear-gradient(135deg, #1a2a1a 0%, #162d16 50%, #0f340f 100%)',
  'linear-gradient(135deg, #2a1a1a 0%, #2d1616 50%, #340f0f 100%)'
];

let sql = '';
sql += `TRUNCATE TABLE products, series, categories RESTART IDENTITY CASCADE;\n`;

const catIds = [];
const serIds = [];

ctx.productData.forEach((cat, ci) => {
  const catId = uuid();
  catIds.push(catId);
  sql += `INSERT INTO categories (id, name, sort_order, gradient) VALUES ('${catId}', '${cat.categoryName.replace(/'/g, "''")}', ${ci}, '${gradients[ci] || ''}');\n`;

  cat.series.forEach((ser, si) => {
    const serId = uuid();
    serIds.push(serId);
    const cover = ser.models[0]?.realImg || '';
    sql += `INSERT INTO series (id, category_id, name, description, cover_image, sort_order) VALUES ('${serId}', '${catId}', '${ser.name.replace(/'/g, "''")}', '${ser.desc.replace(/'/g, "''")}', '${cover.replace(/'/g, "''")}', ${si});\n`;

    ser.models.forEach((model, mi) => {
      const prodId = uuid();
      const paramsJson = JSON.stringify(model.params).replace(/'/g, "''");
      const colorsJson = JSON.stringify(model.colors).replace(/'/g, "''");
      const accJson = JSON.stringify(model.accessories).replace(/'/g, "''");
      const mountType = model.params.find(p => p.label.toLowerCase().includes('mounting'))?.value || '';
      const optionsVal = model.params.find(p => p.label.toLowerCase().includes('options'))?.value || '';

      sql += `INSERT INTO products (id, series_id, product_id, name, real_image, line_image, params, colors, accessories, installation_method, options_text, sort_order) VALUES ('${prodId}', '${serId}', '${model.id.replace(/'/g, "''")}', '${model.name.replace(/'/g, "''")}', '${model.realImg.replace(/'/g, "''")}', '${model.lineImg.replace(/'/g, "''")}', '${paramsJson}'::jsonb, '${colorsJson}'::jsonb, '${accJson}'::jsonb, '${mountType.replace(/'/g, "''")}', '${optionsVal.replace(/'/g, "''")}', ${mi});\n`;
    });
  });
});

fs.writeFileSync('./supabase/migrations/003_seed_data.sql', sql);
console.log('Generated supabase/migrations/003_seed_data.sql');
console.log(`Categories: ${catIds.length}, Series: ${serIds.length}`);
