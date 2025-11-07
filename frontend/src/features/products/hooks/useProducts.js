import { useEffect, useState } from 'react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { httpClient } from '../../../services/httpClient';

const FALLBACK_PRODUCTS = [
  {
    id: '1',
    name: 'Smart Fitness Tracker',
    description: 'Monitor health metrics with AI-driven insights.',
    price: 129.99,
  },
  {
    id: '2',
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Immersive sound with adaptive noise cancellation.',
    price: 249.99,
  },
];

function mapToViewModel(product) {
  return {
    ...product,
    priceLabel: formatCurrency(product.price),
  };
}

export function useProducts() {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS.map(mapToViewModel));

  useEffect(() => {
    async function load() {
      try {
        const response = await httpClient.get('/api/products');
        if (Array.isArray(response.products)) {
          setProducts(response.products.map(mapToViewModel));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Falling back to demo products', error);
      }
    }

    load();
  }, []);

  function likeProduct(productId) {
    // Placeholder for optimistic update or API call
    setProducts((previous) =>
      previous.map((product) =>
        product.id === productId
          ? { ...product, liked: !product.liked }
          : product,
      ),
    );
  }

  return { products, likeProduct };
}

