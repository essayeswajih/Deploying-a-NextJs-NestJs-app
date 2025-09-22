// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { StudentsService } from '../students/students.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly studentsService: StudentsService,
  ) {}

  async createUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    is_approved?: boolean;
    is_active?: boolean;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = this.usersRepository.create({
      email: data.email,
      password_hash: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role ?? UserRole.STUDENT,
      is_active: data.is_active ?? true,
      is_approved: data.is_approved ?? false,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { id }
      // Temporairement désactivé les relations pour éviter les erreurs
      // relations: ['student', 'parent']
    });
    console.log('🔍 findById result for user', id, ':', user);
    return user;
  }

  async findByRole(role: string): Promise<User[]> {
    return this.usersRepository.find({ 
      where: { role: role as UserRole },
      select: ['id', 'firstName', 'lastName', 'email', 'role']
    });
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    console.log('🔍 UsersService.update called with id:', id, 'and data:', data);
    
    try {
      // Debug: Lister tous les utilisateurs pour voir les IDs disponibles
      const allUsers = await this.usersRepository.find({ select: ['id', 'firstName', 'lastName', 'email'] });
      console.log('🔍 All users in database:', allUsers);
      
      // Vérifier que l'ID est valide
      if (!id || isNaN(id)) {
        throw new Error(`ID utilisateur invalide: ${id}`);
      }
      
      // Essayer de trouver l'utilisateur par ID d'abord
      let existingUser = await this.usersRepository.findOne({ where: { id } });
      
      if (!existingUser) {
        console.error('🔍 User not found with id:', id);
        console.error('🔍 Available user IDs:', allUsers.map(u => u.id));
        console.error('🔍 Available users:', allUsers.map(u => ({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}` })));
        
        // Retourner une erreur plus informative
        const availableUsers = allUsers.map(u => `ID: ${u.id} - ${u.email} (${u.firstName} ${u.lastName})`).join('\n');
        throw new Error(`Utilisateur avec l'ID ${id} non trouvé.\n\nUtilisateurs disponibles:\n${availableUsers}`);
      }
      console.log('🔍 Existing user found:', existingUser);
      
      // Vérifier l'unicité de l'email si l'email est modifié
      if (data.email && data.email !== existingUser.email) {
        console.log('🔍 Email is being changed, checking uniqueness...');
        const emailExists = await this.usersRepository.findOne({ 
          where: { email: data.email } 
        });
        if (emailExists && emailExists.id !== id) {
          throw new Error(`L'email "${data.email}" est déjà utilisé par un autre utilisateur.`);
        }
        console.log('🔍 Email is unique, proceeding with update...');
      }
      
      // Séparer les données User des données Student/Parent
      const userData: any = {};
      const studentData: any = {};
      const parentData: any = {};
      
      // Mapper TOUS les champs User
      if (data.firstName !== undefined) userData.firstName = data.firstName;
      if (data.lastName !== undefined) userData.lastName = data.lastName;
      if (data.email !== undefined) userData.email = data.email;
      if (data.phone !== undefined) {
        userData.phone = data.phone;
        console.log('🔍 Phone field mapped:', data.phone);
      }
      if (data.is_active !== undefined) userData.is_active = data.is_active;
      if (data.is_approved !== undefined) userData.is_approved = data.is_approved;
      if ((data as any).email_verified !== undefined) userData.email_verified = (data as any).email_verified;
      if ((data as any).last_login !== undefined) userData.last_login = (data as any).last_login;
      
      // Note: Les champs parent/enfant ne sont pas stockés dans l'entité User
      // Ils seront gérés via les entités Student et Parent séparément
      // Pour l'instant, on les ignore dans la mise à jour de l'entité User
      
      // Mapper les champs Student essentiels
      if ((data as any).classLevel !== undefined) studentData.class_level = (data as any).classLevel;
      if ((data as any).birthDate !== undefined) {
        studentData.birth_date = new Date((data as any).birthDate);
        console.log('🔍 Birth date mapped:', (data as any).birthDate);
      }
      
      // Mapper TOUS les champs Parent
      if ((data as any).phone_number !== undefined) parentData.phone_number = (data as any).phone_number;
      if ((data as any).address !== undefined) parentData.address = (data as any).address;
      if ((data as any).occupation !== undefined) parentData.occupation = (data as any).occupation;
      
      // Debug: vérifier si les données sont bien mappées
      console.log('🔍 Original data keys:', Object.keys(data));
      console.log('🔍 Mapped userData keys:', Object.keys(userData));
      console.log('🔍 Mapped studentData keys:', Object.keys(studentData));
      console.log('🔍 Mapped parentData keys:', Object.keys(parentData));
      
      console.log('🔍 User data to update:', userData);
      console.log('🔍 Student data to update:', studentData);
      console.log('🔍 Parent data to update:', parentData);
      
      // Mettre à jour l'entité User
      if (Object.keys(userData).length > 0) {
        console.log('🔍 Updating User entity with data:', userData);
        const userUpdateResult = await this.usersRepository.update(id, userData);
        console.log('🔍 User update result:', userUpdateResult);
      } else {
        console.log('🔍 No User data to update');
      }
      
      // Mettre à jour l'entité Student si c'est un étudiant et qu'il y a des données à mettre à jour
      if (Object.keys(studentData).length > 0) {
        console.log('🔍 Updating Student entity with data:', studentData);
        try {
          // Récupérer l'étudiant par user_id
          const student = await this.studentsService.findByUserId(id);
          if (student) {
            await this.studentsService.update(student.id, studentData);
            console.log('🔍 Student updated successfully');
          } else {
            console.log('🔍 No student found for user ID:', id);
          }
        } catch (error) {
          console.error('🔍 Error updating student:', error);
          // Ne pas faire échouer la mise à jour de l'utilisateur si la mise à jour de l'étudiant échoue
        }
      }
      
      // Mettre à jour l'entité Parent si c'est un parent et qu'il y a des données à mettre à jour
      if (Object.keys(parentData).length > 0) {
        console.log('🔍 Parent entity update not implemented yet');
        // TODO: Implémenter la mise à jour de l'entité Parent
      }
      
      const updatedUser = await this.findById(id);
      console.log('🔍 Final updated user:', updatedUser);
      return updatedUser;
      
    } catch (error) {
      console.error('🔍 Error in UsersService.update:', error);
      console.error('🔍 Error stack:', error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.usersRepository.delete(id);
    return { success: true };
  }
}