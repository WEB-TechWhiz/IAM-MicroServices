import { Router } from "express";
import {  
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignRoleToUser,
  getUsersByRole,
  addPermissionToRole,
  removePermissionFromRole
} from "../Controllers/Role.Controllers.js";
import { verifyJWT } from "../middlewares/auth.js";
import { roleMiddleware } from "../middlewares/role.js";

const router = Router();

// Public route to get all roles
router.route("/roles")
  .get(getAllRoles)
  .post( verifyJWT, roleMiddleware('admin', 'superadmin'), createRole); // protected creation

// Role specific routes with :roleId param and auth
router.route("/roles/:roleId")
  .get(getRoleById)
  .put(verifyJWT, roleMiddleware, updateRole)
  .delete(verifyJWT, roleMiddleware, deleteRole);

// Assign a role to user (protected)
router.route("/roles/assign")
  .post(verifyJWT, roleMiddleware, assignRoleToUser);

// Get users by role (protected)
router.route("/roles/:roleId/users")
  .get(verifyJWT, roleMiddleware, getUsersByRole);

// Manage permissions on a role
router.route("/roles/:roleId/permissions")
  .post(verifyJWT, roleMiddleware, addPermissionToRole)
  .delete(verifyJWT, roleMiddleware, removePermissionFromRole);

export default router;
