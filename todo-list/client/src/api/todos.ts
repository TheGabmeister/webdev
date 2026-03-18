import { apiFetch } from './client';
import type { Todo } from '../types';

export function fetchTodos() {
  return apiFetch<Todo[]>('/api/todos');
}

export function createTodo(title: string) {
  return apiFetch<Todo>('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function updateTodo(id: number, fields: { title?: string; completed?: boolean }) {
  return apiFetch<Todo>(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export function deleteTodo(id: number) {
  return apiFetch<void>(`/api/todos/${id}`, { method: 'DELETE' });
}

export function reorderTodos(ids: number[]) {
  return apiFetch<{ message: string }>('/api/todos/reorder', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}

export function clearCompleted() {
  return apiFetch<{ message: string }>('/api/todos/completed', { method: 'DELETE' });
}
