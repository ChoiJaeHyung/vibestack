import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { detectFileType } from "@/lib/analysis/file-parser";
import { generateDigest, digestToMarkdown } from "@/lib/analysis/digest-generator";
import type { FileUploadRequest } from "@/types/api";
import type { Database } from "@/types/database";

type ProjectFileInsert = Database["public"]["Tables"]["project_files"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export async function POST(
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

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, status, name")
      .eq("id", projectId)
      .eq("user_id", authResult.userId)
      .single();

    if (projectError || !project) {
      return errorResponse("Project not found", 404);
    }

    const body = (await request.json()) as Partial<FileUploadRequest>;

    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return errorResponse("files array is required and must not be empty", 400);
    }

    const existingHashes = new Set<string>();
    if (body.files.some((f) => f.content_hash)) {
      const { data: existingFiles } = await supabase
        .from("project_files")
        .select("content_hash")
        .eq("project_id", projectId)
        .not("content_hash", "is", null);

      if (existingFiles) {
        for (const f of existingFiles) {
          if (f.content_hash) existingHashes.add(f.content_hash);
        }
      }
    }

    const toInsert: ProjectFileInsert[] = [];
    let skippedCount = 0;

    for (const file of body.files) {
      if (!file.file_name || !file.content) {
        continue;
      }

      if (file.content_hash && existingHashes.has(file.content_hash)) {
        skippedCount++;
        continue;
      }

      const fileType = file.file_type || detectFileType(file.file_name);

      toInsert.push({
        project_id: projectId,
        file_name: file.file_name,
        file_type: fileType,
        file_path: file.file_path ?? null,
        raw_content: file.content,
        file_size: Buffer.byteLength(file.content, "utf-8"),
        content_hash: file.content_hash ?? null,
      });
    }

    if (toInsert.length === 0 && skippedCount > 0) {
      return successResponse({
        uploaded: 0,
        skipped: skippedCount,
        message: "All files already exist (matching content hash)",
      });
    }

    if (toInsert.length === 0) {
      return errorResponse("No valid files to upload", 400);
    }

    const { error: insertError } = await supabase
      .from("project_files")
      .insert(toInsert);

    if (insertError) {
      return errorResponse("Failed to upload files", 500);
    }

    // Auto-generate project digest from all files
    const { data: allFiles } = await supabase
      .from("project_files")
      .select("file_name, file_path, file_type, raw_content")
      .eq("project_id", projectId)
      .neq("file_name", "_project_digest.md");

    if (allFiles && allFiles.length > 0) {
      const digest = generateDigest(project.name, allFiles);
      const digestMarkdown = digestToMarkdown(digest);

      // Upsert _project_digest.md — delete existing then insert
      await supabase
        .from("project_files")
        .delete()
        .eq("project_id", projectId)
        .eq("file_name", "_project_digest.md")
        .eq("file_name", "_project_digest.md");

      const digestInsert: ProjectFileInsert = {
        project_id: projectId,
        file_name: "_project_digest.md",
        file_type: "other",
        file_path: "_project_digest.md",
        raw_content: digestMarkdown,
        file_size: Buffer.byteLength(digestMarkdown, "utf-8"),
      };
      await supabase.from("project_files").insert(digestInsert);
    }

    if (project.status === "created") {
      const statusUpdate: ProjectUpdate = {
        status: "uploaded",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase
        .from("projects")
        .update(statusUpdate)
        .eq("id", projectId);
    }

    return successResponse(
      {
        uploaded: toInsert.length,
        skipped: skippedCount,
        files: toInsert.map((f) => ({
          file_name: f.file_name,
          file_type: f.file_type,
          file_size: f.file_size,
        })),
      },
      201,
    );
  } catch {
    return errorResponse("Invalid request body", 400);
  }
}
