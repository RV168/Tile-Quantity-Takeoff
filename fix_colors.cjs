const fs = require('fs');

let content = fs.readFileSync('src/components/LayoutCanvas.tsx', 'utf8');

content = content.replace(
  'stroke="#e2e8f0"',
  'stroke={isDarkMode ? "#1e293b" : "#e2e8f0"}'
);

content = content.replace(
  /const tileFill =[\s\S]*?;\s*\/\/\s*Standard full tile/m,
  `const tileFill =
              tile.isCut && tile.id === highlightedTile
                ? (isDarkMode ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.2)")
                : tile.isCut
                ? (isDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.05)")
                : tile.id === highlightedTile
                ? (isDarkMode ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.15)")
                : (isDarkMode ? "rgba(99, 102, 241, 0.05)" : "rgba(99, 102, 241, 0.015)"); // Standard full tile`
);

content = content.replace(
  /let strokeColor = "rgba\(99, 102, 241, 0\.35\)";/g,
  'let strokeColor = isDarkMode ? "rgba(99, 102, 241, 0.6)" : "rgba(99, 102, 241, 0.35)";'
);

content = content.replace(
  /strokeColor = "rgba\(16, 185, 129, 0\.5\)";/g,
  'strokeColor = isDarkMode ? "rgba(16, 185, 129, 0.7)" : "rgba(16, 185, 129, 0.5)";'
);

content = content.replace(
  /strokeColor = "rgba\(245, 158, 11, 0\.5\)";/g,
  'strokeColor = isDarkMode ? "rgba(245, 158, 11, 0.7)" : "rgba(245, 158, 11, 0.5)";'
);

// also replace the big black background blocks for isometric views etc if they exist
content = content.replace(
  /stroke="#1e293b"/g,
  'stroke={isDarkMode ? "#94a3b8" : "#1e293b"}'
);

// and axis lines
content = content.replace(
  /stroke="#64748b"/g,
  'stroke={isDarkMode ? "#475569" : "#64748b"}'
);

content = content.replace(
  /stroke="#475569"/g,
  'stroke={isDarkMode ? "#94a3b8" : "#475569"}'
);

fs.writeFileSync('src/components/LayoutCanvas.tsx', content);
