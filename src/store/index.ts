import { configureStore } from '@reduxjs/toolkit';

import uploadsReducer from '@/features/uploads/uploadsSlice';

export const store = configureStore({
  reducer: {
    uploads: uploadsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
