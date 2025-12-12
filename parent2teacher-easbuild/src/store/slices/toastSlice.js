import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  visible: false,
  message: '',
  type: 'success', // 'success', 'error', 'info'
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (state, action) => {
      state.visible = true;
      state.message = action.payload.message;
      state.type = action.payload.type || 'success';
    },
    hideToast: (state) => {
      state.visible = false;
      state.message = '';
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
