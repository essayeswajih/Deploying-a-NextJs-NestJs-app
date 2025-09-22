// src/modules/auth/auth.service.ts
import { Injectable, HttpException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { StudentsService } from '../students/students.service';
import { ParentsService } from '../parents/parents.service';
import { RelationsService } from '../relations/relations.service';
import { User, UserRole } from '../users/entities/user.entity';
import { EmailVerificationService } from './email-verification.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  findUserByEmail(email: string) {
    throw new Error('Method not implemented.');
  }
  emailService: any;
  constructor(
    private usersService: UsersService,
    private studentsService: StudentsService,
    private parentsService: ParentsService,
    private relationsService: RelationsService,
    private emailVerificationService: EmailVerificationService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; userId: number }> {
    console.log('🔍 AuthService.register called with data:', registerDto);
    const { first_name, last_name, email, password, phone, userType } = registerDto;
    console.log('🔍 Extracted phone value:', phone);

    // Convertir le string userType en enum UserRole
    let role: UserRole;
    switch (userType) {
      case 'student':
        role = UserRole.STUDENT;
        break;
      case 'parent':
        role = UserRole.PARENT;
        break;
      case 'teacher':
        role = UserRole.TEACHER;
        break;
      case 'admin':
        role = UserRole.ADMIN;
        break;
      default:
        role = UserRole.STUDENT; // valeur par défaut
    }

    try {
      console.log('🔍 Creating user with data:', {
        email,
        password: '[HIDDEN]',
        firstName: first_name,
        lastName: last_name,
        phone: phone,
        role
      });
      
      const user = await this.usersService.createUser({
        email,
        password,
        firstName: first_name,
        lastName: last_name,
        phone: phone,
        role, // ✅ maintenant c'est un UserRole
      });
      
      console.log('🔍 User created successfully:', { id: user.id, email: user.email, phone: user.phone });

      // New users must be approved by admin
      await this.usersService.update(user.id, { is_approved: false, is_active: false } as any);

      if (role === UserRole.STUDENT) {
        try {
          const student = await this.studentsService.create({
            user_id: user.id,
            phone_number: phone,
            birth_date: registerDto.studentBirthDate ? new Date(registerDto.studentBirthDate) : undefined,
            class_level: registerDto.studentClass,
            parent_id: null, // Sera mis à jour après la création du parent
          });

          // Créer automatiquement un compte parent virtuel si l'étudiant n'a pas fourni les détails de ses parents
          let parentCreated = false;
          
          if (registerDto.parentFirstName && registerDto.parentLastName && registerDto.parentEmail) {
            // L'étudiant a fourni les détails de ses parents
            try {
              // Vérifier si un parent avec cet email existe déjà
              const existingParentUser = await this.usersService.findByEmail(registerDto.parentEmail);
              
              if (!existingParentUser) {
                // Créer un nouveau compte parent avec le mot de passe fourni
                const parentUser = await this.usersService.createUser({
                  email: registerDto.parentEmail,
                  password: registerDto.parentPassword || this.generateTemporaryPassword(),
                  firstName: registerDto.parentFirstName,
                  lastName: registerDto.parentLastName,
                  phone: registerDto.parentPhone,
                  role: UserRole.PARENT,
                  is_approved: false,
                  is_active: true,
                });

                // Créer l'entité parent
                const parent = await this.parentsService.create({
                  user_id: parentUser.id,
                  phone_number: registerDto.parentPhone,
                });

                // Mettre à jour le parent_id de l'étudiant
                await this.studentsService.update(student.id, { parent_id: parent.id });

                // Créer la relation parent-student
                await this.relationsService.createParentStudentRelation(parent.id, student.id);

                console.log(`Compte parent créé automatiquement pour l'étudiant ${user.email}`);
                parentCreated = true;
              } else {
                // Si le parent existe déjà, créer la relation
                const existingParent = await this.parentsService.findByUserId(existingParentUser.id);
                if (existingParent) {
                  // Mettre à jour le parent_id de l'étudiant
                  await this.studentsService.update(student.id, { parent_id: existingParent.id });
                  
                  await this.relationsService.createParentStudentRelation(existingParent.id, student.id);
                  console.log(`Relation créée entre l'étudiant ${user.email} et le parent existant ${registerDto.parentEmail}`);
                  parentCreated = true;
                }
              }
            } catch (parentCreationError) {
              console.error('Erreur lors de la création automatique du compte parent:', parentCreationError);
              // Ne pas faire échouer l'inscription de l'étudiant
            }
          }
          
          // Si aucun parent n'a été créé/linké, créer un compte parent virtuel temporaire
          if (!parentCreated) {
            try {
              // Vérifier que le téléphone parent est fourni
              if (!registerDto.parentPhone) {
                throw new Error('Le numéro de téléphone du parent est obligatoire pour les étudiants');
              }

              const virtualParentEmail = `parent.virtuel.${user.email}`;
              const virtualParentPassword = this.generateTemporaryPassword();
              
              // Créer un compte parent virtuel avec le téléphone fourni
              const virtualParentUser = await this.usersService.createUser({
                email: virtualParentEmail,
                password: virtualParentPassword,
                firstName: 'Parent',
                lastName: 'Temporaire',
                phone: registerDto.parentPhone, // Utiliser le téléphone parent fourni
                role: UserRole.PARENT,
                is_approved: false,
                is_active: true,
              });

              // Créer l'entité parent virtuelle
              const virtualParent = await this.parentsService.create({
                user_id: virtualParentUser.id,
                phone_number: registerDto.parentPhone,
              });

              // Mettre à jour le parent_id de l'étudiant
              await this.studentsService.update(student.id, { parent_id: virtualParent.id });

              // Créer la relation parent-student
              await this.relationsService.createParentStudentRelation(virtualParent.id, student.id);

              console.log(`Compte parent virtuel créé automatiquement pour l'étudiant ${user.email} avec l'email ${virtualParentEmail} et le téléphone ${registerDto.parentPhone}`);
            } catch (virtualParentCreationError) {
              console.error('Erreur lors de la création du compte parent virtuel:', virtualParentCreationError);
              throw virtualParentCreationError; // Faire échouer l'inscription si le téléphone parent n'est pas fourni
            }
          }
        } catch (studentError) {
          console.error('Erreur lors de la création de l\'étudiant:', studentError);
          // Continue with registration even if student creation fails
        }
      } else if (role === UserRole.PARENT) {
        try {
          const parent = await this.parentsService.create({
            user_id: user.id,
            phone_number: phone,
          });

          // Créer automatiquement un compte étudiant virtuel si le parent n'a pas fourni les détails de son enfant
          let childCreated = false;
          
          if (registerDto.childFirstName && registerDto.childLastName && registerDto.childPassword && registerDto.childEmail) {
            // Le parent a fourni les détails de son enfant
            try {
              // Créer un nouveau compte enfant avec l'email fourni par le parent
              const childUser = await this.usersService.createUser({
                email: registerDto.childEmail,
                password: registerDto.childPassword,
                firstName: registerDto.childFirstName,
                lastName: registerDto.childLastName,
                phone: registerDto.childPhone,
                role: UserRole.STUDENT,
                is_approved: false,
                is_active: true,
              });

              // Créer l'entité student
              const student = await this.studentsService.create({
                user_id: childUser.id,
                phone_number: registerDto.childPhone || '',
                birth_date: registerDto.childBirthDate ? new Date(registerDto.childBirthDate) : undefined,
                class_level: registerDto.childClass,
                parent_id: parent.id,
              });

              // Créer la relation parent-student
              await this.relationsService.createParentStudentRelation(parent.id, student.id);

              console.log(`Compte enfant créé automatiquement pour le parent ${user.email}`);
              childCreated = true;
            } catch (childCreationError) {
              console.error('Erreur lors de la création automatique du compte enfant:', childCreationError);
              // Ne pas faire échouer l'inscription du parent
            }
          }
          
          // Si aucun enfant n'a été créé, créer un compte étudiant virtuel temporaire
          if (!childCreated) {
            try {
              const virtualChildEmail = `enfant.virtuel.${user.email}`;
              const virtualChildPassword = this.generateTemporaryPassword();
              
              // Créer un compte étudiant virtuel
              const virtualChildUser = await this.usersService.createUser({
                email: virtualChildEmail,
                password: virtualChildPassword,
                firstName: 'Étudiant',
                lastName: 'Temporaire',
                phone: phone, // Utiliser le même téléphone que le parent
                role: UserRole.STUDENT,
                is_approved: false,
                is_active: true,
              });

              // Créer l'entité student virtuelle
              const virtualStudent = await this.studentsService.create({
                user_id: virtualChildUser.id,
                phone_number: phone,
                birth_date: undefined, // Date de naissance par défaut
                class_level: undefined, // Niveau de classe par défaut
                parent_id: parent.id,
              });

              // Créer la relation parent-student
              await this.relationsService.createParentStudentRelation(parent.id, virtualStudent.id);

              console.log(`Compte étudiant virtuel créé automatiquement pour le parent ${user.email} avec l'email ${virtualChildEmail}`);
            } catch (virtualChildCreationError) {
              console.error('Erreur lors de la création du compte étudiant virtuel:', virtualChildCreationError);
              // Ne pas faire échouer l'inscription du parent
            }
          }
        } catch (parentError) {
          console.error('Erreur lors de la création du parent:', parentError);
          // Continue with registration even if parent creation fails
        }
      }

      // Envoyer automatiquement le lien de vérification d'email
      try {
        await this.emailVerificationService.sendVerificationLink(email);
      } catch (error) {
        console.error('Erreur lors de l\'envoi du lien de vérification:', error);
        // Ne pas faire échouer l'inscription si l'email ne peut pas être envoyé
      }

      return { 
        message: 'Inscription réussie. Un lien de vérification a été envoyé à votre adresse email.', 
        userId: user.id 
      };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: { id: number; email: string; role: UserRole; firstName: string; lastName: string } }> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifier que l'email est vérifié (sauf pour les admins)
    if (user.role !== UserRole.ADMIN && !user.email_verified) {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

    // Vérifier que le compte est approuvé (sauf pour les admins)
    if (user.role !== UserRole.ADMIN && !user.is_approved) {
      throw new UnauthorizedException('ACCOUNT_NOT_APPROVED');
    }
    // Récupérer les informations supplémentaires selon le rôle
    let additionalInfo = {};
    if (user.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(user.id);
      if (student) {
        additionalInfo = { class_level: student.class_level };
      }
    }
    
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      ...additionalInfo
    };
    const accessToken = this.jwtService.sign(payload);

    let userDetails: any = {
      id: user.id,
      email: user.email,
      role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
    };

    if (user.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(user.id);
      if (student !== undefined && student !== null) {
        userDetails = { ...userDetails, studentDetails: student };
      }
    } else if (user.role === UserRole.PARENT) {
      const parent = await this.parentsService.findByUserId(user.id);
      if (parent !== undefined && parent !== null) {
        userDetails = { ...userDetails, parentDetails: parent };
      }
    } else if (user.role === UserRole.ADMIN) {
      // No specific admin details to fetch from a separate service, 
      // but you could add them here if needed.
    }

    return {
      accessToken,
      user: userDetails,
    };
  }

  async verifyEmailToken(token: string): Promise<boolean> {
    try {
      const { email } = await this.emailVerificationService.verifyToken(token);
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }
      user.email_verified = true;
      await this.userRepository.save(user);
      return true;
    } catch (error) {
      console.error('Erreur vérification email:', error);
      throw error;
    }
  }

  async forgotPassword(email: string) {
  // Vérifie si l'utilisateur existe
  const user = await this.userRepository.findOne({ where: { email } });
  if (!user) {
    throw new NotFoundException("User not found");
  }

  // Générer un token de reset
  const resetToken = uuidv4(); // nécessite import { v4 as uuidv4 } from 'uuid';
  user.verification_token = resetToken;
  user.verification_token_expiry = new Date(Date.now() + 1000 * 60 * 60); // expire dans 1h
  await this.userRepository.save(user);

  // Envoi email
  await this.emailService.sendPasswordReset(user.email, resetToken);

  return { message: 'Password reset link sent successfully' };
}


  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ 
      where: { password_reset_token: token } 
    });

    if (!user) {
      throw new HttpException('Token de réinitialisation invalide', HttpStatus.BAD_REQUEST);
    }

    if (!user.password_reset_token_expiry || new Date() > user.password_reset_token_expiry) {
      throw new HttpException('Token de réinitialisation expiré', HttpStatus.BAD_REQUEST);
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe et supprimer les tokens de réinitialisation
    user.password_hash = hashedPassword;
    user.password_reset_token = null;
    user.password_reset_token_expiry = null;
    user.password_reset_code = null;
    user.password_reset_code_expiry = null;
    await this.userRepository.save(user);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    // Récupérer l'utilisateur
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new HttpException('Mot de passe actuel incorrect', HttpStatus.BAD_REQUEST);
    }

    // Vérifier que le nouveau mot de passe est différent de l'actuel
    const isNewPasswordSame = await bcrypt.compare(newPassword, user.password_hash);
    if (isNewPasswordSame) {
      throw new HttpException('Le nouveau mot de passe doit être différent de l\'actuel', HttpStatus.BAD_REQUEST);
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    user.password_hash = hashedPassword;
    await this.userRepository.save(user);

    return { message: 'Mot de passe modifié avec succès' };
  }

  private generateTemporaryPassword(): string {
    // Générer un mot de passe temporaire aléatoire
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
