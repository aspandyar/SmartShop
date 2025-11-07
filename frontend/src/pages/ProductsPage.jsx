import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { productsAPI, interactionsAPI } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import './ProductsPage.css';

export function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      setProducts(response.data.products || []);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadProducts();
      return;
    }

    try {
      setLoading(true);
      const response = await productsAPI.search(searchQuery);
      setProducts(response.data.products || []);
    } catch (err) {
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (productId, type) => {
    if (!user?._id) return;

    try {
      await interactionsAPI.create({
        userId: user._id,
        productId,
        type,
      });
    } catch (err) {
      console.error('Failed to log interaction', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="products-page">
      <h1>Products</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="btn-primary">Search</button>
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); loadProducts(); }} className="btn-secondary">
            Clear
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={{
              id: product._id,
              name: product.name,
              description: product.description,
              priceLabel: `$${product.price?.toFixed(2) || '0.00'}`,
              category: product.category,
              tags: product.tags,
            }}
            onLike={() => handleInteraction(product._id, 'like')}
            onView={() => handleInteraction(product._id, 'view')}
          />
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="empty-state">No products found</div>
      )}
    </div>
  );
}

export default ProductsPage;

