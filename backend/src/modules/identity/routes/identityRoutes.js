import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { createUser, demoEnter, listUsers, login, logout, me, personas, staffDirectory } from '../controller/identityController.js';

const router = Router();

router.post('/login', ...login);
router.get('/personas', personas);
router.get('/staff-directory', staffDirectory);
router.post('/demo-enter', demoEnter);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.get('/users', requireAuth, requireRole(ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE), listUsers);
router.post('/users', requireAuth, requireRole(ROLES.SYSTEM_ADMIN), createUser);

export default router;
