"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/server/actions/projects";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName?: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteProject(projectId);

      if (result.success) {
        invalidateCache("/api/dashboard");
        invalidateCache("/api/projects");
        router.push("/projects");
      } else {
        setShowModal(false);
        setIsDeleting(false);
      }
    } catch {
      setShowModal(false);
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowModal(true)}
        disabled={isDeleting}
        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        삭제
      </Button>

      {/* Custom Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setShowModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-bg-elevated p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">프로젝트 삭제</h3>
              <p className="mt-2 text-sm text-text-muted">
                {projectName ? (
                  <>
                    <span className="font-medium text-text-secondary">{projectName}</span>을(를) 삭제하시겠습니까?
                  </>
                ) : (
                  "이 프로젝트를 삭제하시겠습니까?"
                )}
                <br />
                모든 파일, 분석 결과, 학습 데이터가 영구 삭제됩니다.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
