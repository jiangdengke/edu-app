export interface WorkflowImagePayload {
  fileName: string;
  dataUrl: string;
  mimeType: string;
}

export interface WorkflowInput {
  studentId: string;
  subject: string;
  images: WorkflowImagePayload[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowResult {
  correctionSummary: string;
  explanations: string[];
  followUpQuestions: string[];
  raw?: unknown;
}

const API_URL = process.env.EXPO_PUBLIC_DIFY_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_DIFY_API_KEY;
const WORKFLOW_ID = process.env.EXPO_PUBLIC_DIFY_WORKFLOW_ID;

function invariant(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

export async function runWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  invariant(API_URL, 'Missing EXPO_PUBLIC_DIFY_API_URL.');
  invariant(API_KEY, 'Missing EXPO_PUBLIC_DIFY_API_KEY.');
  invariant(WORKFLOW_ID, 'Missing EXPO_PUBLIC_DIFY_WORKFLOW_ID.');

  const response = await fetch(`${API_URL}/v1/workflows/${WORKFLOW_ID}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      inputs: {
        student_id: input.studentId,
        subject: input.subject,
        images: input.images,
        metadata: input.metadata ?? {},
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Workflow failed: ${response.status} ${detail}`);
  }

  const payload = await response.json();
  return {
    correctionSummary: payload.data?.correction_summary ?? '未返回批改结果',
    explanations: payload.data?.explanations ?? [],
    followUpQuestions: payload.data?.follow_up_questions ?? [],
    raw: payload,
  };
}
