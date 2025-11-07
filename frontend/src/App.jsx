import { useState } from 'react';
import './styles/variables.css';
import './App.css';
import './pages/HomePage.css';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { SearchBar } from './features/search/SearchBar';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  function handleSearch(term) {
    setQuery(term);
  }

  const header = (
    <div className="app-header">
      <div>
        <h1>SmartShop Recommender</h1>
        <p className="app-header__subtitle">
          Discover products you&apos;ll love with personalized recommendations.
        </p>
      </div>
      <div className="app-header__actions">
        <SearchBar onSearch={handleSearch} />
        <span className="app-header__user">Signed in as {user?.name || 'Guest'}</span>
      </div>
    </div>
  );

  return (
    <MainLayout header={header}>
      <HomePage query={query} />
    </MainLayout>
  );
}

export default App;
