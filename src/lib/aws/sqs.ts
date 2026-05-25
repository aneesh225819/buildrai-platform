import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import { Job } from '@/types';

// Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL!;

if (!QUEUE_URL) {
  console.warn('⚠️  AWS_SQS_QUEUE_URL is not set in environment variables');
}

/**
 * Send a job to the queue
 */
export async function sendJob(job: Partial<Job>): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const jobData = {
    id: jobId,
    ...job,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(jobData),
    MessageAttributes: {
      JobType: {
        DataType: 'String',
        StringValue: job.type || 'unknown',
      },
      UserId: {
        DataType: 'String',
        StringValue: job.userId || 'unknown',
      },
    },
  });

  await sqsClient.send(command);

  return jobId;
}

/**
 * Receive jobs from the queue
 */
export async function receiveJobs(maxMessages: number = 1): Promise<any[]> {
  const command = new ReceiveMessageCommand({
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 10, // Long polling
    MessageAttributeNames: ['All'],
  });

  const response = await sqsClient.send(command);

  if (!response.Messages || response.Messages.length === 0) {
    return [];
  }

  return response.Messages.map((message) => ({
    receiptHandle: message.ReceiptHandle,
    body: JSON.parse(message.Body || '{}'),
    attributes: message.MessageAttributes,
  }));
}

/**
 * Delete a job from the queue (after processing)
 */
export async function deleteJob(receiptHandle: string): Promise<void> {
  const command = new DeleteMessageCommand({
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle,
  });

  await sqsClient.send(command);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  approximateNumberOfMessages: number;
  approximateNumberOfMessagesNotVisible: number;
}> {
  const command = new GetQueueAttributesCommand({
    QueueUrl: QUEUE_URL,
    AttributeNames: [
      'ApproximateNumberOfMessages',
      'ApproximateNumberOfMessagesNotVisible',
    ],
  });

  const response = await sqsClient.send(command);

  return {
    approximateNumberOfMessages: parseInt(
      response.Attributes?.ApproximateNumberOfMessages || '0'
    ),
    approximateNumberOfMessagesNotVisible: parseInt(
      response.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'
    ),
  };
}

/**
 * Send code generation job
 */
export async function sendCodeGenerationJob(
  userId: string,
  projectId: string,
  requirements: string,
  context?: Record<string, any>
): Promise<string> {
  return sendJob({
    userId,
    projectId,
    type: 'code_generation',
    data: {
      requirements,
      context,
    },
  });
}

/**
 * Send quality check job
 */
export async function sendQualityCheckJob(
  userId: string,
  projectId: string,
  checks: string[]
): Promise<string> {
  return sendJob({
    userId,
    projectId,
    type: 'quality_check',
    data: {
      checks,
    },
  });
}

/**
 * Send security scan job
 */
export async function sendSecurityScanJob(
  userId: string,
  projectId: string,
  scanTypes: string[]
): Promise<string> {
  return sendJob({
    userId,
    projectId,
    type: 'security_scan',
    data: {
      scanTypes,
    },
  });
}

/**
 * Send deployment job
 */
export async function sendDeploymentJob(
  userId: string,
  projectId: string,
  environment: 'staging' | 'production',
  cloudAccountId: string
): Promise<string> {
  return sendJob({
    userId,
    projectId,
    type: 'deployment',
    data: {
      environment,
      cloudAccountId,
    },
  });
}

export default sqsClient;
