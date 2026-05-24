import { Router, Request, Response } from 'express';
import healthService from '../services/health.service';
import logger from '../utils/logger';
import { ApiResponse } from '../types';

const router = Router();

/**
 * GET /api/health/summary
 * Get overall health summary
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    logger.debug('GET /api/health/summary');
    const summary = await healthService.getHealthSummary();
    
    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
      timestamp: new Date()
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error in GET /api/health/summary', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to get health summary',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/health/pod
 * Get pod health only
 */
router.get('/pod', async (_req: Request, res: Response) => {
  try {
    logger.debug('GET /api/health/pod');
    const summary = await healthService.getHealthSummary();
    
    const response: ApiResponse<typeof summary.pod> = {
      success: true,
      data: summary.pod,
      timestamp: new Date()
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error in GET /api/health/pod', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to get pod health',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/health/db2
 * Get DB2 health only
 */
router.get('/db2', async (_req: Request, res: Response) => {
  try {
    logger.debug('GET /api/health/db2');
    const summary = await healthService.getHealthSummary();
    
    const response: ApiResponse<typeof summary.db2> = {
      success: true,
      data: summary.db2,
      timestamp: new Date()
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error in GET /api/health/db2', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to get DB2 health',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/health/storage
 * Get storage health only
 */
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    logger.debug('GET /api/health/storage');
    const summary = await healthService.getHealthSummary();
    
    const response: ApiResponse<typeof summary.storage> = {
      success: true,
      data: summary.storage,
      timestamp: new Date()
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error in GET /api/health/storage', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to get storage health',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/health/backup
 * Get backup health only
 */
router.get('/backup', async (_req: Request, res: Response) => {
  try {
    logger.debug('GET /api/health/backup');
    const summary = await healthService.getHealthSummary();
    
    const response: ApiResponse<typeof summary.backup> = {
      success: true,
      data: summary.backup,
      timestamp: new Date()
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error in GET /api/health/backup', { error });
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to get backup health',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

export default router;

// Made with Bob
