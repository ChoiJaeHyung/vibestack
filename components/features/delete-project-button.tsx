"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/server/actions/projects";

interface DeleteProjectButtonProps {
  projectId: string;
}

export function DeleteProjectButton({ projectId }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "정말 이 프로젝트를 삭제하시겠습니까? 모든 파일, 분석 결과, 학습 데이터가 함께 삭제됩니다.",
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const result = await deleteProject(projectId);

      if (result.success) {
        router.push("/projects");
      } else {
        alert(result.error ?? "삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {isDeleting ? "삭제 중..." : "삭제"}
    </Button>
  );
}
