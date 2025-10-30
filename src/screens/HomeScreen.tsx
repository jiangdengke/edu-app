import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Card, Input, Paragraph, Separator, SizableText, Spinner, XStack, YStack } from 'tamagui';

import UploadPanel from '@/features/uploads/components/UploadPanel';
import type { EncodedUploadPayload } from '@/features/uploads/uploadsSlice';
import type { WorkflowResult } from '@/features/workflow/difyClient';
import { runWorkflow } from '@/features/workflow/difyClient';

export default function HomeScreen() {
  const [payloadPreview, setPayloadPreview] = useState<EncodedUploadPayload[]>([]);
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('数学');
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePreparePayload = useCallback((payload: EncodedUploadPayload[]) => {
    setPayloadPreview(payload);
    setWorkflowResult(null);
  }, []);

  const handleSendToWorkflow = useCallback(async () => {
    if (!studentId.trim()) {
      Alert.alert('请填写学生 ID');
      return;
    }
    if (payloadPreview.length === 0) {
      Alert.alert('没有可提交的图片');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const result = await runWorkflow({
        studentId,
        subject,
        images: payloadPreview.map(({ fileName, dataUrl, mimeType }) => ({
          fileName,
          dataUrl,
          mimeType,
        })),
        metadata: {
          source: 'expo-demo',
          uploadCount: payloadPreview.length,
        },
      });
      setWorkflowResult(result);
    } catch (error) {
      const message = (error as Error).message;
      setSubmitError(message);
      Alert.alert('提交失败', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [payloadPreview, studentId, subject]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <YStack f={1} bg="$color2" p="$4" space="$5">
        <YStack space="$2">
          <SizableText size="$8" fontWeight="700">
            学习批改助手
          </SizableText>
          <Paragraph color="$color10">
            上传作业图片，生成批改结论、错题讲解以及举一反三练习题，同时沉淀学生学习档案。
          </Paragraph>
        </YStack>

        <UploadPanel onPreparePayload={handlePreparePayload} />

        <Card bordered padded>
          <YStack space="$3">
            <SizableText size="$6" fontWeight="600">
              作业信息
            </SizableText>
            <YStack space="$2">
              <Input
                value={studentId}
                onChangeText={setStudentId}
                placeholder="学生 ID / 学籍号"
              />
              <Input value={subject} onChangeText={setSubject} placeholder="学科" />
            </YStack>
          </YStack>
        </Card>

        <Card bordered padded>
          <YStack space="$3">
            <SizableText size="$6" fontWeight="600">
              请求预览
            </SizableText>
            {payloadPreview.length === 0 ? (
              <Paragraph color="$color10">暂无数据，先添加图片并点击“生成 Dify 请求 Payload”。</Paragraph>
            ) : (
              <YStack space="$2">
                <Paragraph color="$color10">
                  这些 data URL 会作为 workflow 输入的一部分，可在发送前根据业务拼装额外的题目信息。
                </Paragraph>
                <Card themeInverse padded>
                  <ScrollView style={{ maxHeight: 200 }}>
                    <Paragraph size="$2" fontFamily="monospace">
                      {JSON.stringify(payloadPreview, null, 2)}
                    </Paragraph>
                  </ScrollView>
                </Card>
              </YStack>
            )}
            <XStack space="$2">
              <Button
                flex={1}
                size="$5"
                onPress={handleSendToWorkflow}
                disabled={payloadPreview.length === 0 || isSubmitting}
              >
                {isSubmitting ? <Spinner /> : '提交给 Dify Workflow'}
              </Button>
            </XStack>
            {submitError ? (
              <Paragraph color="$red10">{submitError}</Paragraph>
            ) : null}
          </YStack>
        </Card>

        {workflowResult ? (
          <Card bordered padded bg="$green2">
            <YStack space="$2">
              <SizableText size="$6" fontWeight="600">
                Workflow 返回
              </SizableText>
              <Paragraph>{workflowResult.correctionSummary}</Paragraph>
              <Separator />
              <SizableText size="$5" fontWeight="600">
                错题讲解
              </SizableText>
              {workflowResult.explanations.length === 0 ? (
                <Paragraph color="$color10">暂无讲解</Paragraph>
              ) : (
                workflowResult.explanations.map((item, index) => (
                  <Paragraph key={index}>
                    {index + 1}. {item}
                  </Paragraph>
                ))
              )}
              <Separator />
              <SizableText size="$5" fontWeight="600">
                举一反三
              </SizableText>
              {workflowResult.followUpQuestions.length === 0 ? (
                <Paragraph color="$color10">暂无练习题</Paragraph>
              ) : (
                workflowResult.followUpQuestions.map((item, index) => (
                  <Paragraph key={index}>
                    {index + 1}. {item}
                  </Paragraph>
                ))
              )}
            </YStack>
          </Card>
        ) : null}
      </YStack>
    </ScrollView>
  );
}
