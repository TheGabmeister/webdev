import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Todo } from '../types';
import * as todosApi from '../api/todos';
import AddTodoForm from '../components/AddTodoForm';
import TodoList from '../components/TodoList';
import ClearCompletedButton from '../components/ClearCompletedButton';
import styles from './AppPage.module.css';

export default function AppPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    todosApi.fetchTodos()
      .then(setTodos)
      .catch(() => showToast('Failed to load todos', 'error'));
  }, [showToast]);

  const handleAdd = useCallback(async (title: string) => {
    const todo = await todosApi.createTodo(title);
    setTodos(prev => [...prev, todo]);
  }, []);

  const handleToggle = useCallback((id: number, completed: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    todosApi.updateTodo(id, { completed }).catch(() => {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
      showToast('Failed to update todo', 'error');
    });
  }, [showToast]);

  const handleDelete = useCallback((id: number) => {
    const prev = todos;
    setTodos(t => t.filter(todo => todo.id !== id));
    todosApi.deleteTodo(id).catch(() => {
      setTodos(prev);
      showToast('Failed to delete todo', 'error');
    });
  }, [todos, showToast]);

  const handleReorder = useCallback((reordered: Todo[]) => {
    setTodos(reordered);
    todosApi.reorderTodos(reordered.map(t => t.id)).catch(() => {
      showToast('Failed to reorder', 'error');
    });
  }, [showToast]);

  const handleClearCompleted = useCallback(async () => {
    const prev = todos;
    setTodos(t => t.filter(todo => !todo.completed));
    todosApi.clearCompleted().catch(() => {
      setTodos(prev);
      showToast('Failed to clear completed', 'error');
    });
  }, [todos, showToast]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Todos</h1>
        <div className={styles.headerRight}>
          <span className={styles.email}>{user?.email}</span>
          <Link to="/settings" className={styles.settingsLink}>Settings</Link>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </header>
      <main className={styles.main}>
        <AddTodoForm onAdd={handleAdd} />
        <TodoList
          todos={todos}
          onReorder={handleReorder}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
        <ClearCompletedButton
          hasCompleted={todos.some(t => t.completed)}
          onClear={handleClearCompleted}
        />
      </main>
    </div>
  );
}
