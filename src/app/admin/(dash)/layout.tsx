import { Shell } from "@/components/admin/Shell";
import { requireAdmin } from "@/lib/tracking/adminAuth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <Shell>{children}</Shell>;
}
