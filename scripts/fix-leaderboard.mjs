import fs from 'fs';
let s = fs.readFileSync('src/components/CollectorLeaderboard.jsx', 'utf8');
s = s.replaceAll('</motion.div>', '</motion.div>');
s = s.replaceAll('<motion.div', '<motion.div');
s = s.replace(
  '<div initial={{ opacity: 0, y: 12 }}',
  '<motion.div initial={{ opacity: 0, y: 12 }}'
);
// fix outer - find opening motion.div with initial
s = s.replace(
  '<motion.div\n      initial={{ opacity: 0, y: 12 }}',
  '<motion.div\n      initial={{ opacity: 0, y: 12 }}'
);
fs.writeFileSync('src/components/CollectorLeaderboard.jsx', s);
