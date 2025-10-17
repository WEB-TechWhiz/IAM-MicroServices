  import express from 'express';
import {
  createIdentityProvider,
  getIdentityProviders,
  getIdentityProviderById,
  updateIdentityProvider,
  deleteIdentityProvider
} from '../controllers/identityProviderController.js';
import { authMiddleware } from '../middlewares/auth.js';   // Your authentication middleware
import { roleMiddleware } from '../middlewares/role.js';     // Your role-based access control middleware

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .get(roleMiddleware('admin', 'superadmin'), getIdentityProviders)
  .post(roleMiddleware('admin', 'superadmin'), createIdentityProvider);

router.route('/:id')
  .get(roleMiddleware('admin', 'superadmin'), getIdentityProviderById)
  .put(roleMiddleware('admin', 'superadmin'), updateIdentityProvider)
  .delete(roleMiddleware('admin', 'superadmin'), deleteIdentityProvider);

export default router;
