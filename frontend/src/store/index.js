import { configureStore, createSlice } from '@reduxjs/toolkit';

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: {
    likedProducts: [],
  },
  reducers: {
    toggleLike(state, action) {
      const productId = action.payload;
      if (state.likedProducts.includes(productId)) {
        state.likedProducts = state.likedProducts.filter((id) => id !== productId);
      } else {
        state.likedProducts.push(productId);
      }
    },
  },
});

export const { toggleLike } = preferencesSlice.actions;

export const store = configureStore({
  reducer: {
    preferences: preferencesSlice.reducer,
  },
});

