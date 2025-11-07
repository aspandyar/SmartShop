import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { recommendationsAPI, productsAPI, interactionsAPI } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const [recsRes, prodsRes] = await Promise.all([
        recommendationsAPI.get(user._id).catch(() => ({ data: { recommendations: null } })),
        productsAPI.getAll(),
      ]);

      if (recsRes.data.recommendations?.recommendations) {
        setRecommendations(recsRes.data.recommendations.recommendations);
      }

      setProducts(prodsRes.data.products || []);
    } catch (err) {
      setError('Failed to load data');
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
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.username}!</h1>
      {error && <div className="error-message">{error}</div>}

      {recommendations.length > 0 && (
        <section className="dashboard-section">
          <h2>Recommended For You</h2>
          <div className="products-grid">
            {recommendations.map((rec) => {
              const product = rec.productId;
              if (!product) return null;
              return (
                <ProductCard
                  key={product._id}
                  product={{
                    id: product._id,
                    name: product.name,
                    description: product.description,
                    priceLabel: `$${product.price?.toFixed(2) || '0.00'}`,
                  }}
                  onLike={() => handleInteraction(product._id, 'like')}
                  onView={() => handleInteraction(product._id, 'view')}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>All Products</h2>
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={{
                id: product._id,
                name: product.name,
                description: product.description,
                priceLabel: `$${product.price?.toFixed(2) || '0.00'}`,
              }}
              onLike={() => handleInteraction(product._id, 'like')}
              onView={() => handleInteraction(product._id, 'view')}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;

