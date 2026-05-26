import React from 'react';

const COLUMN_CLASSES = {
  2: 'grid grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6',
  4: 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
};

/** Responsive stat row: 2-across on mobile, expands on larger screens */
const PageStatGrid = ({ children, columns = 3, className = '' }) => (
  <div className={`${COLUMN_CLASSES[columns] || COLUMN_CLASSES[3]} ${className}`}>{children}</div>
);

export default PageStatGrid;
