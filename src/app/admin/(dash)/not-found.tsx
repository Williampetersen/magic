import { Empty } from "@/components/admin/ui";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import styles from "../admin.module.scss";

export default function AdminNotFound() {
  return (
    <Empty
      icon={<LuSearch aria-hidden />}
      title="Nothing here"
      action={
        <Link href="/admin/visitors" className={styles.btn}>
          Back to visitors
        </Link>
      }
    >
      This visitor does not exist. Their data may have been deleted after the retention period.
    </Empty>
  );
}
