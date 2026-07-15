const fs = require('fs');
const path = require('path');

const dir = './src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = {
  'bg-white': 'bg-white dark:bg-slate-900',
  'text-slate-800': 'text-slate-800 dark:text-slate-200',
  'text-slate-900': 'text-slate-900 dark:text-white',
  'border-slate-200': 'border-slate-200 dark:border-slate-700',
  'border-slate-100': 'border-slate-100 dark:border-slate-800',
  'bg-slate-50': 'bg-slate-50 dark:bg-slate-800',
  'bg-slate-100': 'bg-slate-100 dark:bg-slate-800',
  'text-slate-400': 'text-slate-400 dark:text-slate-500',
  'text-slate-500': 'text-slate-500 dark:text-slate-400',
  'text-slate-600': 'text-slate-600 dark:text-slate-300',
  'text-slate-700': 'text-slate-700 dark:text-slate-200',
  'bg-indigo-50': 'bg-indigo-50 dark:bg-indigo-900/30',
  'border-indigo-100': 'border-indigo-100 dark:border-indigo-800',
  'border-indigo-200': 'border-indigo-200 dark:border-indigo-700',
  'text-indigo-600': 'text-indigo-600 dark:text-indigo-400',
  'text-indigo-700': 'text-indigo-700 dark:text-indigo-300',
  'bg-[#F8FAFC]': 'bg-[#F8FAFC] dark:bg-slate-950',
};

const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  keys.forEach(k => {
    // Basic regex: match word boundary or space, negative lookahead for dark:
    const regex = new RegExp(`(?<=[\\s"'\\\`])${k.replace(/[\/\\[\\]]/g, '\\$&')}(?=[\\s"'\\\`])(?![\\s]*dark:)`, 'g');
    content = content.replace(regex, replacements[k]);
  });

  fs.writeFileSync(filePath, content);
});
console.log("Done");
