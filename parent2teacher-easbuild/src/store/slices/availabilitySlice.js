import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateAvailabilitySlots } from '../../services/availabilityService';

// Async thunk for generating availability slots in background
export const generateSlotsAsync = createAsyncThunk(
  'availability/generateSlotsAsync',
  async (payload, { rejectWithValue }) => {
    try {
      const { teacherId, template, fromDate, toDate, options } = payload;
      const result = await generateAvailabilitySlots(
        teacherId,
        template,
        fromDate,
        toDate,
        options
      );
      return result; // { createdCount, skippedCount }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  isGenerating: false,
  lastGenerationResult: null,
  error: null,
};

const availabilitySlice = createSlice({
  name: 'availability',
  initialState,
  reducers: {
    clearGenerationResult: (state) => {
      state.lastGenerationResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateSlotsAsync.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateSlotsAsync.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.lastGenerationResult = action.payload;
        state.error = null;
      })
      .addCase(generateSlotsAsync.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload;
      });
  },
});

export const { clearGenerationResult } = availabilitySlice.actions;
export default availabilitySlice.reducer;
