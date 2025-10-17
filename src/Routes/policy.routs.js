 import express from 'express';
import {
  createPolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy
} from '../controllers/policyController.js';
import { authMiddleware } from '../middlewares/auth.js'; // User authentication middleware
import { roleMiddleware } from '../middlewares/role.js';   // Role-based access control middleware

const router = express.Router();

// Protect routes and restrict access by roles
router.use(authMiddleware);

router.route('/policy')
  .get(roleMiddleware('admin', 'superadmin'), getPolicies)
  .post(roleMiddleware('admin', 'superadmin'), createPolicy);

router.route('/:id')
  .get(roleMiddleware('admin', 'superadmin'), getPolicyById)
  .put(roleMiddleware('admin', 'superadmin'), updatePolicy)
  .delete(roleMiddleware('admin', 'superadmin'), deletePolicy);

export default router;
