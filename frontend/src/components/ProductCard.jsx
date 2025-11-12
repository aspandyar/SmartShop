import { useEffect } from 'react';
import PropTypes from 'prop-types';
import './ProductCard.css';

export function ProductCard({ product, onLike, onView }) {
  useEffect(() => {
    if (onView) {
      onView(product.id);
    }
  }, []);

  return (
    <article className="product-card">
      <header>
        <h3>{product.name}</h3>
        <span className="product-card__price">{product.priceLabel}</span>
      </header>
      <p>{product.description}</p>
      {product.category && <p className="product-card__category">{product.category}</p>}
      {product.tags && product.tags.length > 0 && (
        <div className="product-card__tags">
          {product.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      <footer>
        {onLike && (
          <button type="button" onClick={() => onLike(product.id)}>
            ❤️ Like
          </button>
        )}
      </footer>
    </article>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    priceLabel: PropTypes.string.isRequired,
    category: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onLike: PropTypes.func,
  onView: PropTypes.func,
};

ProductCard.defaultProps = {
  onLike: null,
  onView: null,
};

