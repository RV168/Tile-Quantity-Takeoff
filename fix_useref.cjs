const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const debounceTimerRef = useRef(null);',
  'const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);'
);

content = content.replace(
  'const historyRef = useRef([currentState]);',
  'const historyRef = useRef<typeof currentState[]>([currentState]);'
);

fs.writeFileSync('src/App.tsx', content);
