import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async findAll(filters: { classLevel?: string; status?: string } = {}) {
    const query = this.paymentRepository.createQueryBuilder('paiement')
      .leftJoin('students', 'student', 'paiement.student_id = student.id')
      .leftJoin('users', 'student_user', 'student.user_id = student_user.id')
      .leftJoin('parents', 'parent', 'paiement.parent_id = parent.id')
      .leftJoin('users', 'parent_user', 'parent.user_id = parent_user.id')
      .select([
        'paiement.*',
        'student_user.first_name as student_first_name',
        'student_user.last_name as student_last_name',
        'student.class_level as class_level',
        'parent_user.first_name as parent_first_name',
        'parent_user.last_name as parent_last_name'
      ]);

    if (filters.classLevel && filters.classLevel !== 'Total') {
      query.andWhere('student.class_level = :classLevel', { classLevel: filters.classLevel });
    }

    if (filters.status && filters.status !== 'Tous') {
      query.andWhere('paiement.statut = :status', { status: filters.status });
    }

    return await query.getRawMany();
  }

  async findOne(id: number) {
    return await this.paymentRepository.findOne({
      where: { id },
      relations: ['student', 'parent']
    });
  }

  async update(id: number, updateData: Partial<Payment>) {
    // Si on met à jour les séances, recalculer les montants
    if (updateData.seances_payees !== undefined || updateData.seances_non_payees !== undefined) {
      const payment = await this.paymentRepository.findOne({ where: { id } });
      if (payment) {
        const prixSeance = payment.prix_seance || 40;
        const seancesTotal = updateData.seances_payees + updateData.seances_non_payees;
        const montantTotal = seancesTotal * prixSeance;
        const montantPaye = updateData.seances_payees * prixSeance;
        const montantRestant = montantTotal - montantPaye;
        
        updateData = {
          ...updateData,
          seances_total: seancesTotal,
          montant_total: montantTotal,
          montant_paye: montantPaye,
          montant_restant: montantRestant,
          statut: montantRestant === 0 ? 'paye' : (montantPaye > 0 ? 'partiel' : 'en_attente')
        };
      }
    }
    
    await this.paymentRepository.update(id, updateData);
    return await this.findOne(id);
  }

  async create(paymentData: Partial<Payment>) {
    const payment = this.paymentRepository.create(paymentData);
    return await this.paymentRepository.save(payment);
  }

  async remove(id: number) {
    return await this.paymentRepository.delete(id);
  }
}
