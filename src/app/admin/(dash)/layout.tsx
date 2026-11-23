import { Shell } from "@/components/admin/Shell";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import { ensureSchema } from "@/lib/tracking/schema";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  // Adds new columns (and hides known link scanners) once per server instance.
  if (hasDb()) await ensureSchema();
  return <Shell>{children}</Shell>;
}
