import { Router } from 'express';
import { attendanceController } from './controllers/attendance.controller';
import { requireCredentials } from '../../core/middlewares/auth.middleware';

const router = Router();

/**
 * Attendance Routes
 * 
 * /api/attendance
 */

// Clock in (requires credentials)
router.post('/clock-in', requireCredentials, attendanceController.clockIn.bind(attendanceController));

// Clock out (requires credentials)
router.post('/clock-out', requireCredentials, attendanceController.clockOut.bind(attendanceController));

// Get status (requires credentials)
router.get('/status', requireCredentials, attendanceController.getStatus.bind(attendanceController));

// Get today's logs
router.get('/today', attendanceController.getTodayLogs.bind(attendanceController));

// Get logs with filters
router.get('/logs', attendanceController.getLogs.bind(attendanceController));

export default router;
