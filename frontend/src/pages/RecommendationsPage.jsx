import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { recommendationsAPI, interactionsAPI } from '../services/api';
import { ProductCard } from '../components/ProductCard';

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

      // Refresh recommendations after interaction
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
    <div className="recommendations-page" style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Your Personalized Recommendations</h1>
        <button
          onClick={handleRegenerateRecommendations}
          disabled={regenerating}
          style={styles.regenerateButton}
        >
          {regenerating ? '🔄 Regenerating...' : '🔄 Refresh Recommendations'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {recommendations.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎯</div>
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

      <div style={styles.infoBox}>
        <h3>💡 How recommendations work</h3>
        <p>Our recommendation system uses collaborative filtering to suggest products based on:</p>
        <ul style={styles.list}>
          <li>Your interaction history (views, likes, purchases)</li>
          <li>Similar users' preferences</li>
          <li>Product categories you're interested in</li>
          <li>Your profile preferences</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '2.5rem',
    background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  regenerateButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'white',
    borderRadius: '1rem',
    border: '2px dashed #e5e7eb',
    marginBottom: '2rem',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  infoBox: {
    marginTop: '3rem',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    borderRadius: '1rem',
    border: '1px solid #bfdbfe',
  },
  list: {
    textAlign: 'left',
    marginTop: '1rem',
    paddingLeft: '1.5rem',
  },
};

export default RecommendationsPage;
