import { useState } from 'react';
import styles from './AddTodoForm.module.css';

interface Props {
  onAdd: (title: string) => Promise<void>;
}

export default function AddTodoForm({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="Add a new todo..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        disabled={submitting}
      />
      <button className={styles.button} type="submit" disabled={!title.trim() || submitting}>
        Add
      </button>
    </form>
  );
}
