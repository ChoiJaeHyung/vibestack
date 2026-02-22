import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

interface TechStackItem {
  id: string;
  technology_name: string;
  version: string | null;
  confidence_score: number;
  importance: string;
  description: string | null;
  relationships: unknown;
}

interface GroupedTechStack {
  category: string;
  technologies: TechStackItem[];
}

interface StackResponse {
  project_id: string;
  total_technologies: number;
  categories: GroupedTechStack[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const { id: projectId } = await params;

  try {
    const supabase = createServiceClient();

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, status")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    // Fetch all tech stacks for this project
    const { data: techStacks, error: stackError } = await supabase
      .from("tech_stacks")
      .select(
        "id, technology_name, category, version, confidence_score, importance, description, relationships",
      )
      .eq("project_id", projectId)
      .order("confidence_score", { ascending: false });

    if (stackError) {
      return errorResponse("Failed to fetch tech stacks", 500);
    }

    const stacks = techStacks ?? [];

    // Group by category
    const categoryMap = new Map<string, TechStackItem[]>();

    for (const stack of stacks) {
      const category = stack.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      const items = categoryMap.get(category);
      if (items) {
        items.push({
          id: stack.id,
          technology_name: stack.technology_name,
          version: stack.version,
          confidence_score: stack.confidence_score,
          importance: stack.importance,
          description: stack.description,
          relationships: stack.relationships,
        });
      }
    }

    // Define category display order
    const categoryOrder = [
      "framework",
      "language",
      "database",
      "auth",
      "styling",
      "testing",
      "build_tool",
      "deploy",
      "library",
      "other",
    ];

    const categories: GroupedTechStack[] = [];
    for (const cat of categoryOrder) {
      const items = categoryMap.get(cat);
      if (items && items.length > 0) {
        categories.push({ category: cat, technologies: items });
      }
    }

    // Add any remaining categories not in the predefined order
    for (const [cat, items] of categoryMap) {
      if (!categoryOrder.includes(cat) && items.length > 0) {
        categories.push({ category: cat, technologies: items });
      }
    }

    return successResponse<StackResponse>({
      project_id: projectId,
      total_technologies: stacks.length,
      categories,
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
