const express=require('express');
const router=express.Router();
const roleController=require('../controllers/role.Controller');
const authenticateToken=require('../midelwars/auth');
const roleMiddleware =require('../midelwars/rbac');

router.post('/create_Role', authenticateToken,roleMiddleware('Admin'),roleController.createRole);
router.post('/assignRole',authenticateToken,roleMiddleware('Admin'),roleController.assignRoleToUser);
router.get('/Roles',authenticateToken,roleMiddleware('Admin'),roleController.getAllRoles);
router.delete('/delete_Role/:id',authenticateToken,roleMiddleware('Admin'),roleController.deleteRole);
router.put('/update_Role/:id',authenticateToken,roleMiddleware('Admin'),roleController.updateRole);


module.exports=router;