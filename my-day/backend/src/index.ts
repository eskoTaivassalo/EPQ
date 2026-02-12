import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db/index.js';
import { tasks } from './db/schema.js';
import { eq } from 'drizzle-orm';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all tasks
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const allTasks = await db.select().from(tasks);
    res.json(allTasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task
app.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const task = await db.select().from(tasks).where(eq(tasks.id, parseInt(req.params.id)));
    if (task.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const newTask = await db.insert(tasks).values({
      title,
      description,
      completed: false,
    }).returning();
    res.status(201).json(newTask[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, completed } = req.body;
    const updatedTask = await db.update(tasks)
      .set({
        title,
        description,
        completed,
      })
      .where(eq(tasks.id, parseInt(req.params.id)))
      .returning();
    
    if (updatedTask.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(updatedTask[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await db.delete(tasks)
      .where(eq(tasks.id, parseInt(req.params.id)))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on http://localhost:${port}`);
});
