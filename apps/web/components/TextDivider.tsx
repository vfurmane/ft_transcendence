import styles from "styles/TextDivider.module.scss";
import type { ReactElement } from "react";

export interface TextDividerProps {
  children: string;
}

export function TextDivider(props: TextDividerProps): ReactElement {
  return (
    <div className={styles.container}>
      <hr className={styles.divider} />
      <span>{props.children}</span>
      <hr className={styles.divider} />
    </div>
  );
}
