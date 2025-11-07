import PropTypes from 'prop-types';
import './MainLayout.css';

export function MainLayout({ header, children }) {
  return (
    <div className="main-layout">
      <header className="main-layout__header">{header}</header>
      <main className="main-layout__content">{children}</main>
    </div>
  );
}

MainLayout.propTypes = {
  header: PropTypes.node,
  children: PropTypes.node.isRequired,
};

MainLayout.defaultProps = {
  header: null,
};

