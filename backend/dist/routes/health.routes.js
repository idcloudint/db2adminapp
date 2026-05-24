"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_service_1 = __importDefault(require("../services/health.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * GET /api/health/summary
 * Get overall health summary
 */
router.get('/summary', async (_req, res) => {
    try {
        logger_1.default.debug('GET /api/health/summary');
        const summary = await health_service_1.default.getHealthSummary();
        const response = {
            success: true,
            data: summary,
            timestamp: new Date()
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/health/summary', { error });
        const response = {
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
router.get('/pod', async (_req, res) => {
    try {
        logger_1.default.debug('GET /api/health/pod');
        const summary = await health_service_1.default.getHealthSummary();
        const response = {
            success: true,
            data: summary.pod,
            timestamp: new Date()
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/health/pod', { error });
        const response = {
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
router.get('/db2', async (_req, res) => {
    try {
        logger_1.default.debug('GET /api/health/db2');
        const summary = await health_service_1.default.getHealthSummary();
        const response = {
            success: true,
            data: summary.db2,
            timestamp: new Date()
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/health/db2', { error });
        const response = {
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
router.get('/storage', async (_req, res) => {
    try {
        logger_1.default.debug('GET /api/health/storage');
        const summary = await health_service_1.default.getHealthSummary();
        const response = {
            success: true,
            data: summary.storage,
            timestamp: new Date()
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/health/storage', { error });
        const response = {
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
router.get('/backup', async (_req, res) => {
    try {
        logger_1.default.debug('GET /api/health/backup');
        const summary = await health_service_1.default.getHealthSummary();
        const response = {
            success: true,
            data: summary.backup,
            timestamp: new Date()
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error in GET /api/health/backup', { error });
        const response = {
            success: false,
            error: 'Failed to get backup health',
            timestamp: new Date()
        };
        res.status(500).json(response);
    }
});
exports.default = router;
// Made with Bob
//# sourceMappingURL=health.routes.js.map