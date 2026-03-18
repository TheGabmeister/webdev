import styles from './ClearCompletedButton.module.css';

interface Props {
  hasCompleted: boolean;
  onClear: () => void;
}

export default function ClearCompletedButton({ hasCompleted, onClear }: Props) {
  if (!hasCompleted) return null;

  return (
    <button className={styles.button} onClick={onClear}>
      Clear completed
    </button>
  );
}
