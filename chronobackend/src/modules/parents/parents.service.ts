// src/modules/parents/parents.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from './entities/parent.entity';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentsService {
  async findByUserId(userId: number): Promise<Parent | null> {
    return this.parentsRepository.findOne({ where: { user_id: userId } });
  }

  async findByUserIdWithUser(userId: number) {
    const parent = await this.parentsRepository.findOne({ 
      where: { user_id: userId },
      relations: ['user']
    });

    if (!parent) {
      return null;
    }

    // Transform data to match frontend expectations
    return {
      id: parent.id,
      firstName: parent.user?.firstName || '',
      lastName: parent.user?.lastName || '',
      email: parent.user?.email || '',
      phone: parent.phone_number || '',
      address: parent.address || '',
      occupation: parent.occupation || '',
      role: parent.user?.role || 'parent',
      isActive: parent.user?.is_active || false,
      isApproved: parent.user?.is_approved || false,
      createdAt: parent.user?.created_at ? new Date(parent.user.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async getChildrenByUserId(userId: number) {
    // D'abord, récupérer l'ID du parent à partir de l'ID utilisateur
    const parent = await this.parentsRepository.findOne({
      where: { user_id: userId },
    });

    if (!parent) {
      console.log(`No parent found for user ${userId}`);
      return [];
    }

    console.log(`Found parent ${parent.id} for user ${userId}`);
    return this.getChildren(parent.id);
  }

  async debugRelations() {
    // Récupérer toutes les relations parent-student
    const relations = await this.parentsRepository.query(`
      SELECT 
        ps.id as relation_id,
        ps.parent_id,
        ps.student_id,
        p.user_id as parent_user_id,
        pu.first_name as parent_first_name,
        pu.last_name as parent_last_name,
        pu.email as parent_email,
        s.user_id as student_user_id,
        su.first_name as student_first_name,
        su.last_name as student_last_name,
        su.email as student_email
      FROM parent_student ps
      LEFT JOIN parents p ON ps.parent_id = p.id
      LEFT JOIN users pu ON p.user_id = pu.id
      LEFT JOIN students s ON ps.student_id = s.id
      LEFT JOIN users su ON s.user_id = su.id
      ORDER BY ps.id
    `);

    console.log('All parent-student relations:', relations);
    return relations;
  }

  async fixRelations() {
    console.log('🔧 Fixing parent-student relations...');
    
    // Récupérer tous les étudiants qui ont un parent_id mais pas de relation dans parent_student
    const studentsWithParentId = await this.parentsRepository.query(`
      SELECT 
        s.id as student_id,
        s.parent_id,
        s.user_id as student_user_id,
        su.first_name as student_first_name,
        su.last_name as student_last_name,
        su.email as student_email,
        p.id as parent_table_id,
        p.user_id as parent_user_id,
        pu.first_name as parent_first_name,
        pu.last_name as parent_last_name,
        pu.email as parent_email
      FROM students s
      JOIN users su ON s.user_id = su.id
      LEFT JOIN parents p ON s.parent_id = p.id
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE s.parent_id IS NOT NULL
      ORDER BY s.id
    `);

    console.log(`Found ${studentsWithParentId.length} students with parent_id`);

    let fixedCount = 0;
    for (const student of studentsWithParentId) {
      // Vérifier si la relation existe déjà
      const existingRelation = await this.parentsRepository.query(`
        SELECT id FROM parent_student 
        WHERE parent_id = ? AND student_id = ?
      `, [student.parent_table_id, student.student_id]);

      if (existingRelation.length === 0 && student.parent_table_id) {
        // Créer la relation manquante
        await this.parentsRepository.query(`
          INSERT INTO parent_student (parent_id, student_id, created_at)
          VALUES (?, ?, NOW())
        `, [student.parent_table_id, student.student_id]);
        
        console.log(`✅ Created relation: Parent ${student.parent_email} -> Student ${student.student_email}`);
        fixedCount++;
      }
    }

    console.log(`🔧 Fixed ${fixedCount} relations`);
    return { fixedCount, totalStudents: studentsWithParentId.length };
  }

  async checkUserRelations(userId: number) {
    console.log(`🔍 Checking relations for user ${userId}`);
    
    // Vérifier si l'utilisateur est un parent
    const parent = await this.parentsRepository.findOne({
      where: { user_id: userId },
    });

    if (!parent) {
      console.log(`❌ User ${userId} is not a parent`);
      return { isParent: false, message: 'User is not a parent' };
    }

    console.log(`✅ User ${userId} is parent with ID ${parent.id}`);

    // Récupérer les enfants via la relation parent_student
    const children = await this.getChildren(parent.id);
    
    console.log(`👶 Found ${children.length} children for parent ${parent.id}`);
    
    return {
      isParent: true,
      parentId: parent.id,
      childrenCount: children.length,
      children: children
    };
  }
  constructor(
    @InjectRepository(Parent)
    private parentsRepository: Repository<Parent>,
  ) {}

  async createParent(userId: number, phone?: string): Promise<Parent> {
    const parent = this.parentsRepository.create({
      user_id: userId,
      phone_number: phone,
    });
    return this.parentsRepository.save(parent);
  }

  async findAll({ page = 1, limit = 50 }: { page?: number; limit?: number }) {
    const [items, total] = await this.parentsRepository.findAndCount({
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });

    console.log(`Found ${items.length} parents with relations`);

    // Transform data to match frontend expectations
    const transformedItems = items.map(parent => {
      console.log(`Processing parent ${parent.id} with user:`, parent.user);
      return {
        id: parent.user?.id || parent.id, // Utiliser l'ID de l'utilisateur pour la cohérence
        parentId: parent.id, // Garder l'ID du parent pour référence
        firstName: parent.user?.firstName || '',
        lastName: parent.user?.lastName || '',
        email: parent.user?.email || '',
        phone_number: parent.phone_number || '',
        address: parent.address || '',
        occupation: parent.occupation || '',
        role: parent.user?.role || 'parent',
        isActive: parent.user?.is_active || false,
        isApproved: parent.user?.is_approved || false,
        createdAt: parent.user?.created_at ? new Date(parent.user.created_at).toISOString() : new Date().toISOString(),
        notes: '',
      };
    });

    console.log(`Transformed ${transformedItems.length} parents`);

    return { items: transformedItems, total, page, limit };
  }

  async findOne(id: number) {
    return this.parentsRepository.findOne({ where: { id } });
  }

  async create(dto: CreateParentDto) {
    // Check if parent already exists for this user
    const existingParent = await this.parentsRepository.findOne({
      where: { user_id: dto.user_id },
    });

    if (existingParent) {
      // Update existing parent with new data
      existingParent.phone_number = dto.phone_number ?? existingParent.phone_number;
      existingParent.address = dto.address ?? existingParent.address;
      existingParent.occupation = dto.occupation ?? existingParent.occupation;
      return this.parentsRepository.save(existingParent);
    }

    // Create new parent
    const entity = this.parentsRepository.create({
      user_id: dto.user_id,
      phone_number: dto.phone_number,
      address: dto.address,
      occupation: dto.occupation,
    });
    return this.parentsRepository.save(entity);
  }

  async update(id: number, dto: UpdateParentDto) {
    await this.parentsRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.parentsRepository.delete(id);
    return { success: true };
  }

  async getChildren(parentId: number) {
    // Récupérer tous les enfants via la relation parent_student
    const childrenData = await this.parentsRepository.query(`
      SELECT 
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        s.phone_number as phone,
        s.birth_date as dateOfBirth,
        s.class_level as classLevel,
        s.progress_percentage,
        s.total_quiz_attempts,
        s.average_score,
        s.last_activity
      FROM parent_student ps
      JOIN students s ON ps.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ps.parent_id = ?
      ORDER BY u.first_name, u.last_name
    `, [parentId]);

    // Formater les données des enfants
    const children = childrenData.map(child => {
      // Formater la date de naissance pour éviter les problèmes de timezone
      if (child.dateOfBirth) {
        const date = new Date(child.dateOfBirth);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        child.dateOfBirth = `${year}-${month}-${day}T00:00:00.000Z`;
      }
      
      return {
        ...child,
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        email: child.email,
        phone: child.phone,
        dateOfBirth: child.dateOfBirth,
        classLevel: child.classLevel,
        progress: child.progress_percentage || 0,
        quizAttempts: child.total_quiz_attempts || 0,
        averageScore: child.average_score || 0,
        lastActivity: child.last_activity
      };
    });

    console.log(`Found ${children.length} children for parent ${parentId}`);
    return children;
  }

  async getChild(parentId: number) {
    // Récupérer l'enfant via la relation parent_student
    const childData = await this.parentsRepository.query(`
      SELECT 
        u.id,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        s.phone_number as phone,
        s.birth_date as dateOfBirth,
        s.class_level as classLevel
      FROM parent_student ps
      JOIN students s ON ps.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ps.parent_id = ?
    `, [parentId]);

    if (childData.length > 0) {
      const child = childData[0];
      // Formater la date de naissance pour éviter les problèmes de timezone
      if (child.dateOfBirth) {
        const date = new Date(child.dateOfBirth);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        child.dateOfBirth = `${year}-${month}-${day}T00:00:00.000Z`;
      }
      return child;
    }

    return null;
  }
}