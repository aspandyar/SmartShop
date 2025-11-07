import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders SmartShop heading', () => {
    render(<App />);
    expect(screen.getByText(/smartshop/i)).toBeInTheDocument();
  });
});

