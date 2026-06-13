import { Router } from 'express';
import { leantimeAuthController } from './controllers/leantime-auth.controller';
import { leantimeProjectsController } from './controllers/leantime-projects.controller';
import { leantimeTasksController } from './controllers/leantime-tasks.controller';

const router = Router();

// Auth Routes
router.post('/auth/login', leantimeAuthController.login);
router.get('/auth/status', leantimeAuthController.getStatus);

// Projects Routes
router.get('/projects', leantimeProjectsController.getAllProjects.bind(leantimeProjectsController));
router.get('/projects/:id', leantimeProjectsController.getProject.bind(leantimeProjectsController));

// Tasks Routes
router.get('/tasks', leantimeTasksController.getAllTasks.bind(leantimeTasksController));
router.post('/tasks', leantimeTasksController.createTask.bind(leantimeTasksController));
router.get('/tasks/:id', leantimeTasksController.getTask.bind(leantimeTasksController));

export default router;
