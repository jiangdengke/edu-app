import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { Button, Card, Paragraph, ScrollView, Separator, SizableText, XStack, YStack } from 'tamagui';
import * as ImagePicker from 'expo-image-picker';

import {
  cacheUploads,
  encodeUploadsAsDataUrls,
  EncodedUploadPayload,
  removeUploadById,
  selectUploadList,
} from '@/features/uploads/uploadsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AppDispatch } from '@/store';
import { formatBytes } from '@/utils/formatBytes';

interface UploadPanelProps {
  onPreparePayload?: (payload: EncodedUploadPayload[]) => void;
}

async function preparePayload(dispatch: AppDispatch, ids?: string[]) {
  const result = await dispatch(encodeUploadsAsDataUrls({ ids })).unwrap();
  return result;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,
  quality: 1,
  base64: false,
};

const CAMERA_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 1,
  base64: false,
};

export default function UploadPanel({ onPreparePayload }: UploadPanelProps) {
  const dispatch = useAppDispatch();
  const uploads = useAppSelector(selectUploadList);
  const isProcessing = useAppSelector((state) => state.uploads.isProcessing);

  const totalSize = useMemo(() => {
    return uploads.reduce((acc, current) => acc + (current.size ?? 0), 0);
  }, [uploads]);

  const handlePickImages = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要权限', '请在系统设置中授予访问相册的权限。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;
    const toCache = result.assets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? 'image.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    dispatch(cacheUploads(toCache));
  }, [dispatch]);

  const handleOpenCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要权限', '请在系统设置中授予相机权限。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);
    if (result.canceled) return;
    const asset = result.assets[0];
    dispatch(
      cacheUploads([
        {
          uri: asset.uri,
          fileName: asset.fileName ?? 'camera.jpg',
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
      ]),
    );
  }, [dispatch]);

  const handleRemove = useCallback(
    (id: string) => {
      dispatch(removeUploadById(id));
    },
    [dispatch],
  );

  const handlePrepare = useCallback(async () => {
    if (uploads.length === 0) {
      Alert.alert('请先添加图片');
      return;
    }
    try {
      const payload = await preparePayload(dispatch);
      onPreparePayload?.(payload);
    } catch (error) {
      Alert.alert('处理失败', (error as Error).message);
    }
  }, [dispatch, onPreparePayload, uploads.length]);

  return (
    <YStack space="$4">
      <XStack space="$2">
        <Button flex={1} size="$5" onPress={handlePickImages} disabled={isProcessing}>
          选择图片
        </Button>
        <Button flex={1} size="$5" onPress={handleOpenCamera} disabled={isProcessing}>
          拍照
        </Button>
      </XStack>

      <YStack space="$2">
        <SizableText size="$5" fontWeight="700">
          已上传图片
        </SizableText>
        <Paragraph color="$color10">
          图片将复制到本地缓存目录，提交时转换为 Base64 data URL 发送给 Dify Workflow。
        </Paragraph>
      </YStack>

      <Card padded size="$true" bordered>
        <Card.Header padded>
          <XStack jc="space-between" ai="center">
            <SizableText size="$5">共 {uploads.length} 张</SizableText>
            <SizableText>{formatBytes(totalSize)}</SizableText>
          </XStack>
        </Card.Header>
        <Separator />
        <Card.Background>
          {uploads.length === 0 ? (
            <Paragraph p="$4" color="$color10">
              还没有图片，点击上方按钮添加。
            </Paragraph>
          ) : (
            <ScrollView style={{ maxHeight: 220 }}>
              <YStack space="$2" p="$3">
                {uploads.map((upload) => (
                  <XStack
                    key={upload.id}
                    bg="$color3"
                    br="$3"
                    ai="center"
                    jc="space-between"
                    p="$3"
                    space="$2"
                  >
                    <YStack flex={1} space="$1">
                      <SizableText size="$4" numberOfLines={2}>
                        {upload.fileName}
                      </SizableText>
                      <Paragraph size="$2" color="$color10">
                        {formatBytes(upload.size)} · {upload.mimeType}
                      </Paragraph>
                    </YStack>
                    <Button size="$3" theme="red" onPress={() => handleRemove(upload.id)}>
                      删除
                    </Button>
                  </XStack>
                ))}
              </YStack>
            </ScrollView>
          )}
        </Card.Background>
      </Card>

      <Button onPress={handlePrepare} size="$5" disabled={uploads.length === 0 || isProcessing}>
        生成 Dify 请求 Payload
      </Button>
    </YStack>
  );
}
