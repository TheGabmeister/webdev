import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '../types';
import styles from './TodoItem.module.css';

interface Props {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.item}>
      <button className={styles.dragHandle} {...attributes} {...listeners} aria-label="Drag to reorder">
        ⠿
      </button>
      <label className={styles.label}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={todo.completed}
          onChange={() => onToggle(todo.id, !todo.completed)}
        />
        <span className={`${styles.title} ${todo.completed ? styles.completed : ''}`}>
          {todo.title}
        </span>
      </label>
      <button className={styles.deleteBtn} onClick={() => onDelete(todo.id)} aria-label="Delete todo">
        ×
      </button>
    </div>
  );
}
