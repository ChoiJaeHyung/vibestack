import { getAuditLog } from "@/server/actions/admin";
import { AdminAuditTable } from "@/components/features/admin-audit-table";

export default async function AdminAuditLogPage() {
  const result = await getAuditLog(1);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-primary">
        Audit Log
      </h1>

      <AdminAuditTable
        initialItems={result.success && result.data ? result.data.items : []}
        initialTotal={result.success && result.data ? result.data.total : 0}
        initialPage={1}
        pageSize={20}
      />
    </div>
  );
}
