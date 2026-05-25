import { Router, Request, Response } from 'express';
import rcaService from '../services/rca.service';
import logger from '../utils/logger';
import { RCARequest } from '../types/rca.types';

const router = Router();

/**
 * POST /api/rca/analyze
 * Perform root cause analysis
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const request: RCARequest = req.body;
    
    if (!request.problemDescription) {
      return res.status(400).json({
        success: false,
        error: 'Problem description is required'
      });
    }

    const analysis = await rcaService.analyzeRootCause(request);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    logger.error('RCA failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Root cause analysis failed'
    });
  }
});

/**
 * GET /api/rca/history
 * Get RCA history
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const history = rcaService.getHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    logger.error('Failed to get RCA history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA history'
    });
  }
});

/**
 * GET /api/rca/:id
 * Get specific RCA by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rca = rcaService.getById(id);
    
    if (!rca) {
      return res.status(404).json({
        success: false,
        error: 'RCA not found'
      });
    }
    
    res.json({
      success: true,
      data: rca
    });
  } catch (error: any) {
    logger.error('Failed to get RCA', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA'
    });
  }
});

export default router;

// Made with Bob
