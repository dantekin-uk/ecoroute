import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const CollectorDoorGrid = ({ houses, onHouseClick, columns = 3, compact = false }) => {
  const gridClass =
    columns === 6
      ? 'grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3'
      : columns === 5
        ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3'
        : 'grid grid-cols-3 gap-3 sm:gap-4';

  return (
    <div className={gridClass}>
      {houses.map((house) => {
        const isPending = house.balance < 0;
        return (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            key={house.id}
            onClick={() => onHouseClick(house)}
            className={`
              ${compact ? 'aspect-[4/3] rounded-xl' : 'aspect-square rounded-2xl'}
              flex flex-col items-center justify-center relative overflow-hidden transition-all
              ${
                isPending
                  ? 'bg-rose-500/15 border-2 border-rose-500/40 hover:bg-rose-500/25 hover:border-rose-500/60'
                  : 'bg-emerald-500/10 border border-emerald-500/25 opacity-70 hover:opacity-100'
              }
            `}
          >
            <span
              className={`${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-black ${
                isPending ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-500'
              }`}
            >
              {house.id}
            </span>
            {!isPending && (
              <div className="absolute top-1.5 right-1.5 bg-emerald-500/20 p-0.5 rounded-full">
                <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CollectorDoorGrid;
