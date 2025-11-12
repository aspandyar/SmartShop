import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import './Layout.css';

export function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-content">
          <Link to="/dashboard" className="logo">
            <h1>SmartShop Recommender</h1>
          </Link>
          <nav className="nav">
            {user && (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/products">Products</Link>
                <Link to="/recommendations">Recommendations</Link>
                <Link to="/create-product">Create Product</Link>
                {isAdmin && (
                  <>
                    <Link to="/admin/products">Manage Products</Link>
                    <Link to="/admin/users">Manage Users</Link>
                    <Link to="/admin/interaction-types">Interaction Types</Link>
                  </>
                )}
                <div className="user-menu">
                  <Link to="/profile" className="user-profile-link">
                    <span className="user-icon">👤</span>
                    <span className="user-name">{user.username}</span>
                  </Link>
                  <span className="user-role">({user.role})</span>
                  <button onClick={handleLogout} className="btn-logout">
                    Logout
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
