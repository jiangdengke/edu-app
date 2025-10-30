import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as FileSystem from 'expo-file-system';

import {
  cacheExternalUri,
  CacheExternalParams,
  CacheExternalResult,
  clearUploadDirectory,
  persistDataUrl,
  removeCachedFile,
  toDataUrl,
} from '@/utils/uploadCache';

export interface UploadRequest extends CacheExternalParams {
  id?: string;
}

export type UploadStatus = 'processing' | 'ready' | 'error';

export interface UploadItem {
  id: string;
  originalUri: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  size?: number;
  status: UploadStatus;
  error?: string;
  createdAt: string;
}

interface UploadState {
  byId: Record<string, UploadItem>;
  order: string[];
  isProcessing: boolean;
  lastError?: string;
}

const initialState: UploadState = {
  byId: {},
  order: [],
  isProcessing: false,
  lastError: undefined,
};

const buildUploadItem = (
  result: CacheExternalResult,
  originalUri: string,
  extra?: Partial<UploadItem>,
): UploadItem => ({
  id: result.id,
  originalUri,
  localUri: result.localUri,
  fileName: result.fileName,
  mimeType: result.mimeType,
  status: 'ready',
  createdAt: new Date().toISOString(),
  ...extra,
});

export const cacheUploads = createAsyncThunk<UploadItem[], UploadRequest[]>(
  'uploads/cacheUploads',
  async (requests) => {
    const results = await Promise.all(
      requests.map(async (request) => {
        const cached = await cacheExternalUri(request);
        const info = await FileSystem.getInfoAsync(cached.localUri);
        return buildUploadItem(cached, request.uri, {
          size: info.exists ? info.size ?? undefined : undefined,
        });
      }),
    );
    return results;
  },
);

export const ingestDataUrl = createAsyncThunk<UploadItem, { dataUrl: string; suggestedName?: string }>(
  'uploads/ingestDataUrl',
  async ({ dataUrl, suggestedName }) => {
    const cached = await persistDataUrl({ dataUrl, suggestedName });
    const info = await FileSystem.getInfoAsync(cached.localUri);
    return buildUploadItem(cached, dataUrl, {
      size: info.exists ? info.size ?? undefined : undefined,
    });
  },
);

export interface EncodedUploadPayload {
  id: string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
}

export const encodeUploadsAsDataUrls = createAsyncThunk<
  EncodedUploadPayload[],
  { ids?: string[] },
  { state: { uploads: UploadState } }
>('uploads/encodeUploads', async ({ ids }, { getState }) => {
  const state = getState().uploads;
  const targetIds = ids ?? state.order;
  const outputs = await Promise.all(
    targetIds.map(async (id) => {
      const upload = state.byId[id];
      if (!upload) throw new Error(`Upload ${id} not found`);
      const dataUrl = await toDataUrl(upload.localUri, upload.mimeType);
      return {
        id,
        dataUrl,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
      };
    }),
  );
  return outputs;
});

export const removeUploadById = createAsyncThunk<string, string, { state: { uploads: UploadState } }>(
  'uploads/removeUpload',
  async (id, { getState }) => {
    const upload = getState().uploads.byId[id];
    if (upload) {
      await removeCachedFile(upload.localUri);
    }
    return id;
  },
);

export const clearAllUploads = createAsyncThunk(
  'uploads/clearAll',
  async () => {
    await clearUploadDirectory();
    return true;
  },
);

const uploadsSlice = createSlice({
  name: 'uploads',
  initialState,
  reducers: {
    markUploadError(state, action: PayloadAction<{ id: string; error: string }>) {
      const { id, error } = action.payload;
      const upload = state.byId[id];
      if (upload) {
        upload.status = 'error';
        upload.error = error;
      }
      state.lastError = error;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(cacheUploads.pending, (state) => {
        state.isProcessing = true;
        state.lastError = undefined;
      })
      .addCase(cacheUploads.fulfilled, (state, action) => {
        action.payload.forEach((item) => {
          state.byId[item.id] = item;
          if (!state.order.includes(item.id)) {
            state.order.unshift(item.id);
          }
        });
        state.isProcessing = false;
      })
      .addCase(cacheUploads.rejected, (state, action) => {
        state.isProcessing = false;
        state.lastError = action.error.message;
      })
      .addCase(ingestDataUrl.fulfilled, (state, action) => {
        const item = action.payload;
        state.byId[item.id] = item;
        if (!state.order.includes(item.id)) {
          state.order.unshift(item.id);
        }
      })
      .addCase(encodeUploadsAsDataUrls.rejected, (state, action) => {
        state.lastError = action.error.message;
      })
      .addCase(removeUploadById.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.byId[id];
        state.order = state.order.filter((existingId) => existingId !== id);
      })
      .addCase(clearAllUploads.fulfilled, () => ({ ...initialState }));
  },
});

export const { markUploadError } = uploadsSlice.actions;

export const selectUploadsState = (state: { uploads: UploadState }) => state.uploads;
export const selectUploadList = (state: { uploads: UploadState }) =>
  state.uploads.order.map((id) => state.uploads.byId[id]);
export const selectUploadById = (state: { uploads: UploadState }, id: string) =>
  state.uploads.byId[id];

export default uploadsSlice.reducer;
