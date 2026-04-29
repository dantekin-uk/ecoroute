import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export const useGlobalFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useGlobalFilter must be used within a FilterProvider');
  }
  return context;
};

export const FilterProvider = ({ children }) => {
  const [timeRange, setTimeRange] = useState('thisMonth');

  const timeRanges = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year (YTD)' }
  ];

  return (
    <FilterContext.Provider value={{ timeRange, setTimeRange, timeRanges }}>
      {children}
    </FilterContext.Provider>
  );
};

export default FilterProvider;
