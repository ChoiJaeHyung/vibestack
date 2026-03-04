/**
 * LLM prompts for refactoring challenge generation and evaluation.
 */

export function buildChallengeGenerationPrompt(
  originalCode: string,
  improvementDescription: string,
  improvementSuggestion: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  locale: "ko" | "en",
): string {
  const difficultyGuide = {
    beginner:
      "Keep the mission simple. Focus on one clear improvement. Provide very detailed hints.",
    intermediate:
      "The mission should require understanding of the codebase pattern. Provide moderate hints.",
    advanced:
      "The mission should require deep understanding and creative solution. Provide minimal hints.",
  };

  return `You are a coding mentor creating a refactoring challenge.

## Context
Original code:
\`\`\`
${originalCode}
\`\`\`

Problem identified: ${improvementDescription}
Suggested improvement: ${improvementSuggestion}
Difficulty: ${difficulty}
${difficultyGuide[difficulty]}

## Task
Create a refactoring challenge based on the above. Return a JSON object with:

{
  "mission_text_ko": "한국어로 된 미션 설명 (200자 이상, 해요체)",
  "mission_text_en": "English mission description (100+ chars)",
  "hints": [
    {
      "level": 1,
      "text_ko": "첫 번째 힌트 (가장 간단)",
      "text_en": "First hint (simplest)"
    },
    {
      "level": 2,
      "text_ko": "두 번째 힌트 (더 구체적)",
      "text_en": "Second hint (more specific)"
    },
    {
      "level": 3,
      "text_ko": "세 번째 힌트 (거의 답에 가까운)",
      "text_en": "Third hint (almost the answer)"
    }
  ],
  "reference_answer": "// The ideal refactored code here"
}

## Rules
- Mission must be specific and actionable
- Hints should progressively reveal the solution
- Reference answer must compile and be correct
- ${locale === "ko" ? "미션 설명은 해요체로 작성해주세요" : "Write mission in a friendly, encouraging tone"}
- Return ONLY valid JSON, no markdown fences`;
}

export function buildChallengeEvaluationPrompt(
  originalCode: string,
  missionText: string,
  userCode: string,
  referenceAnswer: string,
  locale: "ko" | "en",
): string {
  return `You are a coding mentor evaluating a student's refactoring attempt.

## Original Code
\`\`\`
${originalCode}
\`\`\`

## Mission
${missionText}

## Reference Answer
\`\`\`
${referenceAnswer}
\`\`\`

## Student's Submission
\`\`\`
${userCode}
\`\`\`

## Task
Compare the student's submission against the reference answer and original code.
Score from 0-100 and provide constructive feedback.

Return a JSON object:
{
  "score": 85,
  "feedback_ko": "한국어 피드백 (해요체, 200자 이상). 잘한 점과 개선할 점을 모두 포함",
  "feedback_en": "English feedback (100+ chars). Include what was done well and what could improve",
  "correct_parts": ["part1", "part2"],
  "missing_parts": ["part1"],
  "suggestions": ["suggestion1"]
}

## Scoring Guide
- 90-100: Excellent — meets or exceeds reference quality
- 70-89: Good — captures the core improvement with minor issues
- 50-69: Partial — addresses some aspects but misses key points
- 30-49: Attempt — shows understanding but incorrect approach
- 0-29: Off track — does not address the mission

## Rules
- Be encouraging and constructive
- ${locale === "ko" ? "피드백은 해요체로 작성해주세요" : "Write in a friendly, educational tone"}
- Return ONLY valid JSON, no markdown fences`;
}
