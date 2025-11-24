import styles from "@/components/KeybindsInfo.module.css"

export default function KeybindsInfo() {
    return (
        <div className={styles.keybindsInfo}>
            <div className={[styles.key, styles.numLock].join(" ")}>num lock</div>
            <div className={[styles.key, styles.multiple].join(" ")}>*</div>
            <div className={[styles.key, styles.divide].join(" ")}>/</div>
            <div className={[styles.key, styles.minus].join(" ")}>上頁</div>
            <div className={[styles.key, styles.plus].join(" ")}>下頁</div>
            <div className={[styles.key, styles.key1].join(" ")}>1</div>
            <div className={[styles.key, styles.key2].join(" ")}>2</div>
            <div className={[styles.key, styles.key3].join(" ")}>3</div>
            <div className={[styles.key, styles.key4].join(" ")}>丶</div>
            <div className={[styles.key, styles.key5].join(" ")}>フ</div>
            <div className={[styles.key, styles.key6].join(" ")}>＊</div>
            <div className={[styles.key, styles.key7].join(" ")}>一</div>
            <div className={[styles.key, styles.key8].join(" ")}>丨</div>
            <div className={[styles.key, styles.key9].join(" ")}>丿</div>
            <div className={[styles.key, styles.key0].join(" ")}>選擇字</div>
            <div className={[styles.key, styles.dot].join(" ")}>.</div>
            <div className={[styles.key, styles.enter].join(" ")}>輸入</div>
        </div>
    );
}