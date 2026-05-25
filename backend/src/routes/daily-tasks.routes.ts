import { Router, Request, Response } from 'express';
import dailyTasksService from '../services/daily-tasks.service';
import logger from '../utils/logger';
import { TaskExecutionEvent } from '../types/daily-tasks.types';

const router = Router();

/**
 * GET /api/daily-tasks
 * Get all available daily tasks
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tasks = dailyTasksService.getTasks();
    res.json({
      success: true,
      data: tasks
    });
  } catch (error: any) {
    logger.error('Failed to get daily tasks', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get daily tasks'
    });
  }
});

/**
 * POST /api/daily-tasks/run
 * Run all daily tasks
 */
router.post('/run', async (_req: Request, res: Response) => {
  try {
    const summary = await dailyTasksService.runAllTasks();
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    logger.error('Failed to run daily tasks', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to run daily tasks'
    });
  }
});

/**
 * GET /api/daily-tasks/stream
 * Stream task execution with Server-Sent Events (SSE)
 */
router.get('/stream', async (req: Request, res: Response) => {
  try {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    logger.info('Starting SSE stream for daily tasks');

    // Helper function to send SSE event
    const sendEvent = (event: TaskExecutionEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Get all tasks
    const tasks = dailyTasksService.getTasks();

    // Send initial event with task list
    sendEvent({
      type: 'init',
      tasks: tasks.map(t => ({ id: t.id, name: t.name }))
    });

    // Execute tasks one by one with progress updates
    const results: any[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const progress = Math.round((i / tasks.length) * 100);

      // Send task start event
      sendEvent({
        type: 'task-start',
        taskId: task.id,
        taskName: task.name,
        progress
      });

      try {
        // Execute task (using private method via service)
        const startTime = Date.now();
        const result = await (dailyTasksService as any).runTask(task);
        results.push(result);

        // Send task complete event
        sendEvent({
          type: 'task-complete',
          taskId: task.id,
          result,
          progress: Math.round(((i + 1) / tasks.length) * 100)
        });

      } catch (error: any) {
        logger.error('Task execution failed in stream', {
          taskId: task.id,
          error: error.message
        });

        // Send error event
        sendEvent({
          type: 'error',
          taskId: task.id,
          error: error.message
        });
      }
    }

    // Calculate summary
    const summary = {
      totalTasks: tasks.length,
      passed: results.filter(r => r.status === 'pass').length,
      warnings: results.filter(r => r.status === 'warning').length,
      failed: results.filter(r => r.status === 'fail').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    };

    // Send completion event
    sendEvent({
      type: 'complete',
      summary: summary as any
    });

    // Close the connection
    res.end();

    logger.info('SSE stream completed', {
      passed: summary.passed,
      warnings: summary.warnings,
      failed: summary.failed,
      errors: summary.errors
    });

  } catch (error: any) {
    logger.error('SSE stream failed', { error: error.message });
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/daily-tasks/current
 * Get current run status
 */
router.get('/current', async (_req: Request, res: Response) => {
  try {
    const currentRun = dailyTasksService.getCurrentRun();
    res.json({
      success: true,
      data: currentRun
    });
  } catch (error: any) {
    logger.error('Failed to get current run', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get current run'
    });
  }
});

/**
 * GET /api/daily-tasks/history
 * Get task run history
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const history = dailyTasksService.getHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    logger.error('Failed to get task history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get task history'
    });
  }
});

/**
 * GET /api/daily-tasks/run/:runId
 * Get specific run by ID
 */
router.get('/run/:runId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { runId } = req.params;
    const run = dailyTasksService.getRunById(runId);
    
    if (!run) {
      res.status(404).json({
        success: false,
        error: 'Run not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: run
    });
  } catch (error: any) {
    logger.error('Failed to get run', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get run'
    });
  }
});

export default router;

// Made with Bob
