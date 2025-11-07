import PropTypes from 'prop-types';
import './ProductCard.css';

export function ProductCard({ product, onLike }) {
  return (
    <article className="product-card">
      <header>
        <h3>{product.name}</h3>
        <span className="product-card__price">{product.priceLabel}</span>
      </header>
      <p>{product.description}</p>
      <footer>
        <button type="button" onClick={() => onLike(product.id)}>
          ❤️ Like
        </button>
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
  }).isRequired,
  onLike: PropTypes.func,
};

ProductCard.defaultProps = {
  onLike: () => {},
};

