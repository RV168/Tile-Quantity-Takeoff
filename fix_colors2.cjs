const fs = require('fs');
let content = fs.readFileSync('src/components/LayoutCanvas.tsx', 'utf8');

content = content.replace(
  /fill="#1e293b"/g,
  'fill={isDarkMode ? "#f8fafc" : "#1e293b"}'
);

content = content.replace(
  /fill="#475569"/g,
  'fill={isDarkMode ? "#cbd5e1" : "#475569"}'
);

content = content.replace(
  /fill="#64748b"/g,
  'fill={isDarkMode ? "#94a3b8" : "#64748b"}'
);

content = content.replace(
  /stroke="#ffffff"/g,
  'stroke={isDarkMode ? "#0f172a" : "#ffffff"}'
);

content = content.replace(
  /fill="#fdf2f8"/g,
  'fill={isDarkMode ? "rgba(236, 72, 153, 0.1)" : "#fdf2f8"}'
);

content = content.replace(
  /fill="#ffffff"/g,
  'fill={isDarkMode ? "#1e293b" : "#ffffff"}'
);

fs.writeFileSync('src/components/LayoutCanvas.tsx', content);
