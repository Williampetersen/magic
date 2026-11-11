import styles from "../admin.module.scss";

/** Shown while a dashboard page loads for the first time. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className={styles.pageHead}>
        <div>
          <div className={`${styles.skeleton} ${styles.skLine}`} style={{ width: 160 }} />
          <div
            className={`${styles.skeleton} ${styles.skLine}`}
            style={{ width: 260, height: 14, marginTop: 10 }}
          />
        </div>
      </div>
      <div className={styles.stats3}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton} style={{ height: 112 }} />
        ))}
      </div>
      <div className={styles.grid} style={{ marginTop: 16 }}>
        <div className={`${styles.skeleton} ${styles.col8}`} style={{ height: 340 }} />
        <div className={`${styles.skeleton} ${styles.col4}`} style={{ height: 340 }} />
        <div className={`${styles.skeleton} ${styles.col6}`} style={{ height: 240 }} />
        <div className={`${styles.skeleton} ${styles.col6}`} style={{ height: 240 }} />
      </div>
    </div>
  );
}
