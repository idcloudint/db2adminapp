import { Router, Request, Response } from 'express';
import investigationService from '../services/investigation.service';
import logger from '../utils/logger';
import { InvestigationRequest } from '../types/investigation.types';

const router = Router();

/**
 * POST /api/investigation/search
 * Perform complex investigation
 */
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: InvestigationRequest = req.body;
    
    if (!request.query) {
      res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
      return;
    }

    const investigation = await investigationService.investigate(request);
    
    res.json({
      success: true,
      data: investigation
    });
  } catch (error: any) {
    logger.error('Investigation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Investigation failed'
    });
  }
});

/**
 * POST /api/investigation/execute-command
 * Execute a recommended command
 */
router.post('/execute-command', async (req: Request, res: Response): Promise<void> => {
  try {
    const { commandId, command } = req.body;
    
    if (!command) {
      res.status(400).json({
        success: false,
        error: 'Command is required'
      });
      return;
    }

    const result = await investigationService.executeCommand(commandId, command);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Command execution failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Command execution failed'
    });
  }
});

/**
 * GET /api/investigation/history
 * Get investigation history
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const history = investigationService.getHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    logger.error('Failed to get investigation history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get investigation history'
    });
  }
});

/**
 * GET /api/investigation/:id
 * Get specific investigation by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const investigation = investigationService.getById(id);
    
    if (!investigation) {
      res.status(404).json({
        success: false,
        error: 'Investigation not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: investigation
    });
  } catch (error: any) {
    logger.error('Failed to get investigation', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get investigation'
    });
  }
});

export default router;

// Made with Bob
