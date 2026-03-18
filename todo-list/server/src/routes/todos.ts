import { Router, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getTodosByUserId, createTodo, updateTodo, deleteTodo, deleteCompletedTodos, reorderTodos } from '../db/queries/todos';
import { AuthRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// GET /api/todos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const todos = await getTodosByUserId(req.userId!);
    res.json(todos);
  } catch (err) {
    console.error('Get todos error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/todos
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const todo = await createTodo(req.userId!, title.trim());
    res.status(201).json(todo);
  } catch (err) {
    console.error('Create todo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/todos/reorder (before /:id)
router.put('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.some((id: unknown) => typeof id !== 'number')) {
      res.status(400).json({ error: 'ids must be an array of numbers' });
      return;
    }

    await reorderTodos(req.userId!, ids);
    res.json({ message: 'Reordered' });
  } catch (err) {
    console.error('Reorder todos error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/todos/completed (before /:id)
router.delete('/completed', async (req: AuthRequest, res: Response) => {
  try {
    await deleteCompletedTodos(req.userId!);
    res.json({ message: 'Completed todos deleted' });
  } catch (err) {
    console.error('Clear completed error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/todos/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid todo ID' });
      return;
    }

    const { title, completed } = req.body;
    const todo = await updateTodo(id, req.userId!, { title, completed });

    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    res.json(todo);
  } catch (err) {
    console.error('Update todo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid todo ID' });
      return;
    }

    const deleted = await deleteTodo(id, req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Delete todo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
