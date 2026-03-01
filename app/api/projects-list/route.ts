import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

// ─── Types (exported for client components) ─────────────────────────

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  status: "created" | "uploaded" | "analyzing" | "analyzed" | "error";
  tech_summary: unknown;
  updated_at: string;
}

export interface ProjectsListData {
  projects: ProjectListItem[];
}

// ─── GET handler ────────────────────────────────────────────────────

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, status, tech_summary, updated_at")
      .eq("user_id", authUser.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const projects: ProjectListItem[] = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status as ProjectListItem["status"],
      tech_summary: p.tech_summary,
      updated_at: p.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: { projects } as ProjectsListData,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
