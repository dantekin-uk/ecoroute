import fs from 'fs';
let s = fs.readFileSync('src/components/CollectorLeaderboard.jsx', 'utf8');
s = s.replaceAll('</motion.div>', '</div>');
s = s.replaceAll('<motion.div', '<div');
s = s.replace(
  '<div\n      initial={{ opacity: 0, y: 12 }}',
  '<motion.div\n      initial={{ opacity: 0, y: 12 }}'
);
s = s.replace(
  /<div\n                    key=/g,
  '<motion.div\n                    key='
);
s = s.replace(
  '<div\n                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"\n                            initial={{ width: 0 }}',
  '<motion.div\n                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"\n                            initial={{ width: 0 }}'
);
fs.writeFileSync('src/components/CollectorLeaderboard.jsx', s);
console.log('ok');
