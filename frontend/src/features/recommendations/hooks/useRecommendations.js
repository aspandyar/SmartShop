import { useEffect, useState } from 'react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { httpClient } from '../../../services/httpClient';

export function useRecommendations(userId) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await httpClient.get(`/api/products/${userId}/recommendations`);
        const items = Array.isArray(response.recommendations)
          ? response.recommendations
          : [];
        setRecommendations(
          items.map((item) => ({
            ...item,
            id: item._id || item.id,
            priceLabel: formatCurrency(item.price || 0),
          })),
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load recommendations', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      load();
    }
  }, [userId]);

  return { recommendations, loading };
}

