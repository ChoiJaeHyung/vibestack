export const APP_NAME = "VibeUniv";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION =
  "AI로 만든 프로젝트의 기술 스택을 이해하고 학습하는 플랫폼";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_CONTENT_SIZE = 100 * 1024; // 100KB per file content (API upload)
export const MAX_FILES_PER_UPLOAD = 100; // max files per upload request
export const MAX_FILES_PER_PROJECT = 500;
export const MAX_PROJECTS_FREE = 3;
export const MAX_AI_CHATS_FREE = 20;

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    maxProjects: MAX_PROJECTS_FREE,
    maxAiChats: MAX_AI_CHATS_FREE,
  },
  pro: {
    name: "Pro",
    price: 19,
    maxProjects: Infinity,
    maxAiChats: Infinity,
  },
  team: {
    name: "Team",
    price: 49,
    maxProjects: Infinity,
    maxAiChats: Infinity,
  },
} as const;
