"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { invalidateCache } from "@/lib/hooks/use-cached-fetch";

interface PaymentConfirmProps {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export function PaymentConfirm({ paymentKey, orderId, amount }: PaymentConfirmProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"confirming" | "success" | "error">("confirming");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function confirm() {
      try {
        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          invalidateCache();
          // 쿼리 파라미터 정리 후 성공 상태로 리다이렉트
          setTimeout(() => {
            router.replace("/settings/billing?success=true");
          }, 1500);
        } else {
          setStatus("error");
          setErrorMessage(data.error ?? "결제 승인에 실패했습니다");
        }
      } catch {
        setStatus("error");
        setErrorMessage("결제 승인 중 오류가 발생했습니다");
      }
    }

    confirm();
  }, [paymentKey, orderId, amount, router]);

  if (status === "confirming") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        <p className="text-sm font-medium text-violet-300">
          결제를 승인하고 있습니다...
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
        <div>
          <p className="font-medium text-green-300">
            결제가 완료되었습니다!
          </p>
          <p className="mt-0.5 text-sm text-green-400">
            잠시 후 페이지가 새로고침됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
      <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
      <div>
        <p className="font-medium text-red-300">
          결제 승인에 실패했습니다
        </p>
        {errorMessage && (
          <p className="mt-0.5 text-sm text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
