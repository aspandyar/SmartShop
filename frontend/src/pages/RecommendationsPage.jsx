import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { recommendationsAPI, interactionsAPI } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import './RecommendationsPage.css';

export function RecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const response = await recommendationsAPI.get(user._id);
      if (response.data.recommendations?.recommendations) {
        setRecommendations(response.data.recommendations.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setError('Failed to load recommendations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecommendations = async () => {
    if (!user?._id) return;

    try {
      setRegenerating(true);
      setError('');
      await recommendationsAPI.regenerate(user._id);
      await loadRecommendations();
    } catch (err) {
      setError('Failed to regenerate recommendations');
      console.error(err);
    } finally {
      setRegenerating(false);
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

      if (type === 'like' || type === 'purchase') {
        setTimeout(loadRecommendations, 1000);
      }
    } catch (err) {
      console.error('Failed to log interaction', err);
    }
  };

  if (loading) {
    return (
      <div className="recommendations-page">
        <div className="loading">Loading your personalized recommendations...</div>
      </div>
    );
  }

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h1 className="recommendations-title">Your Personalized Recommendations</h1>
        <button
          onClick={handleRegenerateRecommendations}
          disabled={regenerating}
          className="recommendations-button"
        >
          {regenerating ? '🔄 Regenerating...' : '🔄 Refresh Recommendations'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {recommendations.length === 0 ? (
        <div className="recommendations-empty">
          <div className="recommendations-empty-icon">🎯</div>
          <h2>No recommendations yet</h2>
          <p>Start interacting with products to get personalized recommendations!</p>
          <p>Browse products, like items, and make purchases to help us understand your preferences.</p>
        </div>
      ) : (
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
                  category: product.category,
                  tags: product.tags,
                }}
                onLike={() => handleInteraction(product._id, 'like')}
                onView={() => handleInteraction(product._id, 'view')}
              />
            );
          })}
        </div>
      )}

      <div className="recommendations-info">
        <h3>💡 How recommendations work</h3>
        <p>Our recommendation system uses collaborative filtering to suggest products based on:</p>
        <ul className="recommendations-list">
          <li>Your interaction history (views, likes, purchases)</li>
          <li>Similar users' preferences</li>
          <li>Product categories you're interested in</li>
          <li>Your profile preferences</li>
        </ul>
      </div>
    </div>
  );
}

export default RecommendationsPage;
