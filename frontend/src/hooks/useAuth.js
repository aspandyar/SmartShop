import { useAuthContext } from '../features/auth/AuthContext';

export function useAuth() {
  return useAuthContext();
}

