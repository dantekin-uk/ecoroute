import fs from 'fs';

let s = fs.readFileSync('src/pages/TeamAndSecurity.jsx', 'utf8');

s = s.replace('Staff Directory & Access Control', 'Staff Directory');

const mobile = `        <div className="p-4 lg:hidden border-b border-gray-200/60 dark:border-white/10 space-y-3">
          {isLoading ? (
            <motion.div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></motion.div>
          ) : filteredCollectors.map((c) => (
            <motion.div key={c.id} className="rounded-xl border border-gray-200/60 dark:border-slate-700/50 bg-gray-50/80 dark:bg-slate-800/30 p-4 space-y-2 mb-3">
              <motion.div className="flex justify-between items-start"><p className="font-bold">{c.name}</p><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{c.status}</span></motion.div>
              <motion.p className="text-xs text-gray-500">{c.route}</motion.p>
              <motion.div className="flex gap-2">
                <button type="button" onClick={() => handleResetPin(c)} className="flex-1 text-xs font-bold text-blue-600 py-2 border rounded-lg">Reset PIN</button>
                <button type="button" onClick={async () => { if (window.confirm('Delete '+c.name+'?')) { const { error } = await supabase.from('collectors').delete().eq('id', c.id); if (error) alert(error.message); } }} className="flex-1 text-xs font-bold text-rose-600 py-2 border rounded-lg">Delete</button>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
        <div className="hidden lg:block overflow-x-auto">`;

const openOverflow = '        <' + 'div className="overflow-x-auto">';
s = s.replace(openOverflow + '\n          <table', mobile + '\n          <table');

s = s.replace(/\n    <\/motion.div>\n  \);\n};\n\nexport default TeamAndSecurity;\s*$/, '\n    </motion.div>\n  );\n};\n\nexport default TeamAndSecurity;');

fs.writeFileSync('src/pages/TeamAndSecurity.jsx', s);

// Second pass: fix any motion/div mismatches in mobile block
let t = fs.readFileSync('src/pages/TeamAndSecurity.jsx', 'utf8');
t = t.replace('<motion.div className="flex justify-center py-8"><Loader2', '<motion.div className="flex justify-center py-8"><Loader2');
t = t.replace('</motion.div>\n          ) : filteredCollectors', '</motion.div>\n          ) : filteredCollectors');
t = t.replace('<motion.div className="flex justify-between', '<motion.div className="flex justify-between');
t = t.replace('</motion.div>\n              <motion.p', '</motion.div>\n              <p');
t = t.replace('<motion.p className="text-xs', '<motion.p className="text-xs');
t = t.replace('</motion.div>\n            </motion.div>', '</motion.div>\n            </motion.div>');

fs.writeFileSync('src/pages/TeamAndSecurity.jsx', t);
console.log('done');
