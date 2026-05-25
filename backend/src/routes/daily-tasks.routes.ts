import { Router, Request, Response } from 'express';
import dailyTasksService from '../services/daily-tasks.service';
import logger from '../utils/logger';

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
router.get('/run/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const run = dailyTasksService.getRunById(runId);
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Run not found'
      });
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
