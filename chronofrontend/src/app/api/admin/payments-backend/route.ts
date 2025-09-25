import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class');
    const statusFilter = searchParams.get('status');
    const searchQuery = searchParams.get('search');

    // Simuler les données de paiements
    const mockPayments = [
      {
        id: 1,
        student_id: 1,
        parent_id: 1,
        student_name: 'Lucas Dupont',
        parent_name: 'Marie Dupont',
        class_level: '4ème A',
        seances_total: 20,
        seances_payees: 15,
        seances_non_payees: 5,
        montant_total: 800.00,
        montant_paye: 600.00,
        montant_restant: 200.00,
        statut: 'en_attente',
        date_creation: '2024-01-01T00:00:00Z',
        date_modification: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        student_id: 2,
        parent_id: 1,
        student_name: 'Emma Dupont',
        parent_name: 'Marie Dupont',
        class_level: '6ème B',
        seances_total: 18,
        seances_payees: 18,
        seances_non_payees: 0,
        montant_total: 720.00,
        montant_paye: 720.00,
        montant_restant: 0.00,
        statut: 'paye',
        date_creation: '2024-01-01T00:00:00Z',
        date_modification: '2024-01-20T14:15:00Z'
      },
      {
        id: 3,
        student_id: 3,
        parent_id: 2,
        student_name: 'Alex Martin',
        parent_name: 'Pierre Martin',
        class_level: '5ème C',
        seances_total: 16,
        seances_payees: 8,
        seances_non_payees: 8,
        montant_total: 640.00,
        montant_paye: 320.00,
        montant_restant: 320.00,
        statut: 'en_attente',
        date_creation: '2024-01-05T00:00:00Z',
        date_modification: '2024-01-18T09:45:00Z'
      }
    ];

    // Filtrer les données selon les paramètres
    let filteredPayments = mockPayments;

    if (classFilter && classFilter !== 'Total') {
      filteredPayments = filteredPayments.filter(p => p.class_level === classFilter);
    }

    if (statusFilter && statusFilter !== 'Tous') {
      const statusMap = {
        'Payé': 'paye',
        'En attente': 'en_attente',
        'En retard': 'en_retard'
      };
      const statusValue = statusMap[statusFilter] || statusFilter.toLowerCase();
      filteredPayments = filteredPayments.filter(p => p.statut === statusValue);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredPayments = filteredPayments.filter(p => 
        p.student_name.toLowerCase().includes(query) ||
        p.parent_name.toLowerCase().includes(query) ||
        p.class_level.toLowerCase().includes(query)
      );
    }

    const response = {
      payments: filteredPayments,
      total: filteredPayments.length,
      summary: {
        totalAmount: filteredPayments.reduce((sum, p) => sum + p.montant_total, 0),
        paidAmount: filteredPayments.reduce((sum, p) => sum + p.montant_paye, 0),
        remainingAmount: filteredPayments.reduce((sum, p) => sum + p.montant_restant, 0)
      }
    };

    console.log('✅ Données de paiements simulées retournées:', response.total, 'paiements');
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Erreur API paiements backend:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des paiements' },
      { status: 500 }
    );
  }
}
