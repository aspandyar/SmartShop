import PropTypes from 'prop-types';
import { useState } from 'react';

export function SearchBar({ onSearch }) {
  const [term, setTerm] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(term);
  }

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search for products..."
      />
      <button type="submit">Search</button>
    </form>
  );
}

SearchBar.propTypes = {
  onSearch: PropTypes.func,
};

SearchBar.defaultProps = {
  onSearch: () => {},
};

