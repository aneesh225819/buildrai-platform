import Anthropic from '@anthropic-ai/sdk';

// Cached Anthropic client instance
let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client (lazy initialization)
 */
function getAnthropicClient(): Anthropic {
  if (anthropicClient) {
    return anthropicClient;
  }

  // Check for API key at runtime, not at module load time
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'Please define the ANTHROPIC_API_KEY environment variable inside .env.local'
    );
  }

  anthropicClient = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  return anthropicClient;
}

// Model configuration
export const MODELS = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-3-haiku-20240307',
  OPUS: 'claude-3-opus-20240229',
} as const;

export const DEFAULT_MODEL = MODELS.SONNET;
export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_TEMPERATURE = 0.7;

/**
 * Create a chat completion
 */
export async function createChatCompletion(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  }
) {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: options?.model || DEFAULT_MODEL,
    max_tokens: options?.maxTokens || DEFAULT_MAX_TOKENS,
    temperature: options?.temperature || DEFAULT_TEMPERATURE,
    system: options?.system,
    messages,
  });

  return response;
}

/**
 * Create a streaming chat completion
 */
export async function* createStreamingChatCompletion(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  }
) {
  const anthropic = getAnthropicClient();
  const stream = await anthropic.messages.stream({
    model: options?.model || DEFAULT_MODEL,
    max_tokens: options?.maxTokens || DEFAULT_MAX_TOKENS,
    temperature: options?.temperature || DEFAULT_TEMPERATURE,
    system: options?.system,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

/**
 * Count tokens (approximate)
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<
    string,
    { input: number; output: number }
  > = {
    [MODELS.SONNET]: {
      input: 0.003 / 1000, // $3 per MTok
      output: 0.015 / 1000, // $15 per MTok
    },
    [MODELS.HAIKU]: {
      input: 0.00025 / 1000, // $0.25 per MTok
      output: 0.00125 / 1000, // $1.25 per MTok
    },
    [MODELS.OPUS]: {
      input: 0.015 / 1000, // $15 per MTok
      output: 0.075 / 1000, // $75 per MTok
    },
  };

  const modelPricing = pricing[model] || pricing[MODELS.SONNET];

  return (
    inputTokens * modelPricing.input + outputTokens * modelPricing.output
  );
}

/**
 * Select optimal model based on task complexity
 */
export function selectModel(taskType: string): string {
  const fastTasks = ['lint', 'format', 'simple-fix', 'validation'];
  const complexTasks = [
    'architecture',
    'security-review',
    'deployment-planning',
  ];

  if (fastTasks.includes(taskType)) {
    return MODELS.HAIKU;
  } else if (complexTasks.includes(taskType)) {
    return MODELS.OPUS;
  }

  return MODELS.SONNET; // Default
}

// Export the lazy client getter as default
export default getAnthropicClient;
