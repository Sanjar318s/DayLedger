const pool = require('../src/db');

const frames = [
  { name: 'Серая', css: 'border: 3px solid #aaa; box-shadow: 0 0 12px rgba(170,170,170,0.7);' },
  { name: 'Зелёная', css: 'border: 3px solid #4caf50; box-shadow: 0 0 12px rgba(76,175,80,0.8);' },
  { name: 'Синяя', css: 'border: 3px solid #2196f3; box-shadow: 0 0 12px rgba(33,150,243,0.8);' },
  { name: 'Фиолетовая', css: 'border: 3px solid #9c27b0; box-shadow: 0 0 15px rgba(156,39,176,0.9);' },
  { name: 'Золотая', css: 'border: 3px solid #ffd700; box-shadow: 0 0 20px rgba(255,215,0,1);' },
];

async function updateFrames() {
  for (const f of frames) {
    await pool.query('UPDATE avatar_frames SET css_style = $1 WHERE name = $2', [f.css, f.name]);
    console.log(`Updated frame: ${f.name}`);
  }
  process.exit();
}

updateFrames();
