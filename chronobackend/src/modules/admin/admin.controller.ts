import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Students management endpoints compatible with dashboard forms
  @Get('students')
  listStudents(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.listStudents({ page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 });
  }

  @Post('students')
  createStudent(@Body() body: any) {
    return this.adminService.createStudentWithUser(body);
  }

  @Patch('students/:id')
  updateStudent(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateStudentWithUser(parseInt(id), body);
  }

  @Delete('students/:id')
  deleteStudent(@Param('id') id: string) {
    return this.adminService.deleteStudent(parseInt(id));
  }

  // Parents management endpoints compatible with dashboard forms
  @Get('parents')
  listParents(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.listParents({ page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 });
  }

  @Post('parents')
  createParent(@Body() body: any) {
    return this.adminService.createParentWithUser(body);
  }

  @Patch('parents/:id')
  updateParent(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateParentWithUser(parseInt(id), body);
  }

  @Delete('parents/:id')
  deleteParent(@Param('id') id: string) {
    return this.adminService.deleteParent(parseInt(id));
  }

  // User approval
  @Patch('users/:id/approve')
  approveUser(@Param('id') id: string, @Body() body: { approve: boolean }) {
    return this.adminService.setUserApproval(parseInt(id), !!body?.approve);
  }

  // Generic user deletion
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(parseInt(id));
  }

  // Clean test users
  @Delete('clean-test-users')
  cleanTestUsers() {
    return this.adminService.cleanTestUsers();
  }

  // Payments management
  @Get('payments')
  getPayments(@Query('class') classLevel?: string, @Query('status') status?: string) {
    return this.adminService.getPayments({ classLevel, status });
  }

  @Patch('payments/:id')
  updatePayment(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updatePayment(parseInt(id), body);
  }
}

