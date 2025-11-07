import { createContext, useContext, useMemo, useState } from 'react';

const RecommendationsContext = createContext({ items: [] });

export function RecommendationsProvider({ children }) {
  const [items, setItems] = useState([]);

  const value = useMemo(
    () => ({
      items,
      update: setItems,
    }),
    [items],
  );

  return (
    <RecommendationsContext.Provider value={value}>
      {children}
    </RecommendationsContext.Provider>
  );
}

export function useRecommendationsContext() {
  return useContext(RecommendationsContext);
}

RecommendationsProvider.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  children: require('prop-types').node.isRequired,
};

