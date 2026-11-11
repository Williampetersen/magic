import { LuDatabase } from "react-icons/lu";
import { Empty, PageHeader } from "./ui";

/** Shown instead of a page when DATABASE_URL is missing. */
export function SetupNotice({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Empty icon={<LuDatabase aria-hidden />} title="The database is not connected">
        Add the Neon database to this project in Vercel (Storage → Create Database → Neon), then run{" "}
        <code>npm run db:migrate</code> and redeploy.
      </Empty>
    </>
  );
}
