import { nanoid } from '@reduxjs/toolkit';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const UPLOAD_DIRECTORY = `${FileSystem.documentDirectory ?? ''}uploads/`;

if (!UPLOAD_DIRECTORY) {
  // Expo should always provide a document directory, but this guard prevents silent misuse when running in non-Expo tests.
  throw new Error('FileSystem.documentDirectory is unavailable. Expo FileSystem is required.');
}

export interface CacheExternalParams {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

export interface CacheExternalResult {
  id: string;
  fileName: string;
  mimeType: string;
  localUri: string;
}

const DEFAULT_MIME = 'application/octet-stream';

async function ensureUploadDirectory() {
  const dirInfo = await FileSystem.getInfoAsync(UPLOAD_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(UPLOAD_DIRECTORY, { intermediates: true });
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function guessExtension(input?: string) {
  if (!input) return '';
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(input);
  if (!match) return '';
  return `.${match[1].toLowerCase()}`;
}

function guessMimeType(ext: string) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.heic':
      return 'image/heic';
    default:
      return DEFAULT_MIME;
  }
}

export async function cacheExternalUri(params: CacheExternalParams): Promise<CacheExternalResult> {
  const { uri, fileName, mimeType } = params;
  await ensureUploadDirectory();

  const id = nanoid();
  const extension = guessExtension(fileName ?? uri);
  const safeName = sanitizeFileName(fileName ?? `${id}${extension}`);
  const finalName = `${id}-${safeName}`;
  const destination = `${UPLOAD_DIRECTORY}${finalName}`;

  // expo-file-system 15+ supports content:// URIs on Android. For older versions we fallback to reading/writing manually.
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
  } catch (error) {
    // Fallback to read/write for cases where copyAsync cannot resolve the URI (e.g. scoped storage content://)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(destination, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const info = await FileSystem.getInfoAsync(destination);
  if (!info.exists || info.size === undefined || info.size === 0) {
    throw new Error(`Failed to cache file from uri: ${uri}`);
  }

  const resolvedMime = mimeType ?? (extension ? guessMimeType(extension) : DEFAULT_MIME);

  return {
    id,
    fileName: finalName,
    mimeType: resolvedMime,
    localUri: destination,
  };
}

export interface PersistDataUrlParams {
  dataUrl: string;
  suggestedName?: string;
}

export async function persistDataUrl(params: PersistDataUrlParams): Promise<CacheExternalResult> {
  const { dataUrl, suggestedName } = params;
  await ensureUploadDirectory();

  const match = /^data:(?<mime>[^;]+);base64,(?<payload>.+)$/.exec(dataUrl);
  if (!match?.groups) {
    throw new Error('Unsupported data URL provided');
  }

  const { mime, payload } = match.groups as { mime: string; payload: string };
  const extension = guessExtension(suggestedName) || mimeToExtension(mime);
  const id = nanoid();
  const safeName = sanitizeFileName(suggestedName ?? `${id}${extension}`);
  const finalName = `${id}-${safeName}`;
  const destination = `${UPLOAD_DIRECTORY}${finalName}`;

  await FileSystem.writeAsStringAsync(destination, payload, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    id,
    fileName: finalName,
    mimeType: mime,
    localUri: destination,
  };
}

function mimeToExtension(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/heic':
      return '.heic';
    default:
      return '';
  }
}

export async function toDataUrl(localUri: string, mimeType?: string) {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const resolvedMime = mimeType ?? guessMimeType(guessExtension(localUri));
  return `data:${resolvedMime};base64,${base64}`;
}

export async function removeCachedFile(localUri: string) {
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
}

export async function clearUploadDirectory() {
  if (Platform.OS === 'android') {
    // On Android deleting the directory removes the folder as well. Re-create afterwards.
    await FileSystem.deleteAsync(UPLOAD_DIRECTORY, { idempotent: true });
    await ensureUploadDirectory();
    return;
  }
  const entries = await FileSystem.readDirectoryAsync(UPLOAD_DIRECTORY);
  await Promise.all(entries.map((entry) => FileSystem.deleteAsync(`${UPLOAD_DIRECTORY}${entry}`, { idempotent: true })));
}
