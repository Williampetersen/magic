import { isAdmin } from "@/lib/tracking/adminAuth";
import { adminConfigured, safeNextPath } from "@/lib/tracking/adminToken";
import { redirect } from "next/navigation";
import { LuInstagram } from "react-icons/lu";
import styles from "../admin.module.scss";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await isAdmin()) redirect(next);

  return (
    <div className={`${styles.root} ${styles.login}`}>
      <div className={styles.loginCard}>
        <div className={styles.loginHead}>
          <span className={styles.brandMark}>
            <LuInstagram size={16} aria-hidden />
          </span>
          <div>
            <h1 className={styles.loginTitle}>Visitor Insights</h1>
            <p className={styles.sub}>Log in to see who visits your site from Instagram.</p>
          </div>
        </div>
        <LoginForm next={next} configured={adminConfigured()} />
      </div>
    </div>
  );
}
