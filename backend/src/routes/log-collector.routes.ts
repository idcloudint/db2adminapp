import { Router, Request, Response } from 'express';
import logCollectorService from '../services/log-collector.service';
import logger from '../utils/logger';
import { LogCollectionRequest } from '../types/log-collector.types';

const router = Router();

/**
 * POST /api/logs/collect
 * Start log collection
 */
router.post('/collect', async (req: Request, res: Response) => {
  try {
    const request: LogCollectionRequest = req.body;
    
    if (!request.includeComponents || request.includeComponents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one component must be selected'
      });
    }

    const job = await logCollectorService.startCollection(request);
    
    res.json({
      success: true,
      data: job
    });
  } catch (error: any) {
    logger.error('Log collection failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Log collection failed'
    });
  }
});

/**
 * GET /api/logs/job/:jobId
 * Get job status
 */
router.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = logCollectorService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error: any) {
    logger.error('Failed to get job status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get job status'
    });
  }
});

/**
 * GET /api/logs/history
 * Get collection history
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const history = logCollectorService.getHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    logger.error('Failed to get collection history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get collection history'
    });
  }
});

/**
 * GET /api/logs/nfs-config
 * Get NFS configuration
 */
router.get('/nfs-config', async (_req: Request, res: Response) => {
  try {
    const config = logCollectorService.getNFSConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('Failed to get NFS config', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get NFS config'
    });
  }
});

/**
 * PUT /api/logs/nfs-config
 * Update NFS configuration
 */
router.put('/nfs-config', async (req: Request, res: Response) => {
  try {
    logCollectorService.updateNFSConfig(req.body);
    const config = logCollectorService.getNFSConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('Failed to update NFS config', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update NFS config'
    });
  }
});

/**
 * GET /api/logs/download/:filename
 * Download collected logs
 */
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = `/tmp/db2-logs/${filename}`;
    
    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error('File download failed', { error: err.message });
        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: 'File not found'
          });
        }
      }
    });
  } catch (error: any) {
    logger.error('Download failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Download failed'
    });
  }
});

export default router;

// Made with Bob
