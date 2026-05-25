import { createChatCompletion } from '../anthropic';

/**
 * Requirements Gathering Agent
 * Extracts and structures project requirements from user conversations
 */

export interface RequirementsOutput {
  understanding: string;
  questions: string[];
  confidence: number;
  readyToProceed: boolean;
  extractedRequirements?: {
    features: string[];
    techStack: string[];
    constraints: string[];
    userStories: Array<{
      title: string;
      description: string;
      acceptanceCriteria: string[];
    }>;
  };
}

const REQUIREMENTS_SYSTEM_PROMPT = `You are a requirements gathering agent for Buildr AI, a platform that helps developers build applications faster.

Your role is to:
1. Understand what the user wants to build through conversation
2. Ask clarifying questions about:
   - Core features and functionality
   - Target users and use cases
   - Technical constraints (performance, scalability, etc.)
   - Security and compliance needs
   - Integration requirements
3. Extract and structure requirements clearly

Guidelines:
- Be conversational and friendly
- Ask 1-2 focused questions at a time (don't overwhelm)
- Build on previous answers
- Validate your understanding
- When you have enough information, summarize the requirements

Output Format:
When responding, think about:
- What you understand so far
- What questions you still need to ask
- How confident you are (0-1 scale)
- Whether you're ready to proceed with code generation

Be concise but thorough. Help users articulate their vision clearly.`;

export async function gatherRequirements(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: userMessage },
  ];

  const response = await createChatCompletion(messages, {
    system: REQUIREMENTS_SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 2048,
  });

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

export async function analyzeRequirements(
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<RequirementsOutput> {
  const analysisPrompt = `Based on the following conversation, analyze and extract the project requirements.

Conversation:
${conversation.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n')}

Please provide a JSON response with:
1. understanding: A clear summary of what the user wants to build
2. questions: Array of remaining questions (empty if you have enough info)
3. confidence: Your confidence level (0-1) that you understand the requirements
4. readyToProceed: Boolean - true if you have enough info to start coding
5. extractedRequirements: If ready, extract:
   - features: Array of main features
   - techStack: Recommended technologies
   - constraints: Any technical constraints
   - userStories: Array of user stories with acceptance criteria

Format as valid JSON.`;

  const response = await createChatCompletion(
    [{ role: 'user', content: analysisPrompt }],
    {
      temperature: 0.3,
      maxTokens: 2048,
    }
  );

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse requirements analysis:', error);

    // Fallback response
    return {
      understanding: 'Unable to parse requirements. Please provide more details.',
      questions: ['Could you describe your project in more detail?'],
      confidence: 0.1,
      readyToProceed: false,
    };
  }
}

export async function generateRequirementsSummary(
  requirements: RequirementsOutput['extractedRequirements']
): Promise<string> {
  if (!requirements) {
    return 'No requirements extracted yet.';
  }

  const summaryPrompt = `Create a clear, professional requirements document from:

Features: ${requirements.features.join(', ')}
Tech Stack: ${requirements.techStack.join(', ')}
Constraints: ${requirements.constraints.join(', ')}

User Stories:
${requirements.userStories.map((story, i) => `
${i + 1}. ${story.title}
   ${story.description}
   Acceptance Criteria:
   ${story.acceptanceCriteria.map((c) => `   - ${c}`).join('\n')}
`).join('\n')}

Format this as a professional requirements document in markdown.`;

  const response = await createChatCompletion(
    [{ role: 'user', content: summaryPrompt }],
    {
      temperature: 0.5,
      maxTokens: 2048,
    }
  );

  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}
