import { Router } from 'express';
import { requireAuth } from '../../../security/auth.js';
import { changePassword, login, logout, me, mfaConfirm, mfaSetup } from '../controller/identityController.js';

const router = Router();
router.post('/login', ...login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changePassword);
router.post('/mfa/setup', requireAuth, mfaSetup);
router.post('/mfa/confirm', requireAuth, mfaConfirm);
export default router;
