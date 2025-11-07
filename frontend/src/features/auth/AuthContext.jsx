import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext({ user: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState({ id: 'demo-user', name: 'Demo User' });

  const value = useMemo(
    () => ({
      user,
      signIn: (payload) => setUser(payload),
      signOut: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}

AuthProvider.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  children: require('prop-types').node.isRequired,
};

