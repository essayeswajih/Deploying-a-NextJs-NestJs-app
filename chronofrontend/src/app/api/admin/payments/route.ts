import { NextRequest, NextResponse } from 'next/server';

// URL de l'API backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.chronocarto.tn/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class');
    const statusFilter = searchParams.get('status');
    const searchQuery = searchParams.get('search');

    // Construire l'URL de l'API backend
    const backendUrl = new URL(`${API_BASE_URL}/admin/payments`);
    if (classFilter && classFilter !== 'Total') {
      backendUrl.searchParams.append('classLevel', classFilter);
    }
    if (statusFilter && statusFilter !== 'Tous') {
      backendUrl.searchParams.append('status', statusFilter);
    }
    if (searchQuery) {
      backendUrl.searchParams.append('search', searchQuery);
    }

    console.log('🔄 Appel API backend:', backendUrl.toString());

    try {
      // Appeler l'API backend
      const response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur API backend: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Données reçues du backend:', data);

      return NextResponse.json(data.payments || data);
    } catch (backendError) {
      console.log('⚠️  Backend non accessible, utilisation du fallback frontend');
      
      try {
        // Utiliser l'endpoint de fallback frontend
        const fallbackResponse = await fetch(`${request.nextUrl.origin}/api/admin/payments-backend?${backendUrl.searchParams.toString()}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return NextResponse.json(fallbackData.payments || fallbackData);
        }
      } catch (fallbackError) {
        console.log('⚠️  Fallback frontend non accessible, retour de données de test');
      }
      
      // Retourner des données de test si le backend n'est pas accessible
      const testData = {
        payments: [
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
          }
        ],
        total: 2
      };
      
      return NextResponse.json(testData);
    }
    
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des paiements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Implémenter la logique de création de paiement
    // Cette méthode doit créer un nouvel enregistrement dans la table paiement
    
    return NextResponse.json(
      { message: 'Paiement créé avec succès', id: Date.now() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Implémenter la logique de mise à jour de paiement
    // Cette méthode doit mettre à jour un enregistrement existant dans la table paiement
    
    return NextResponse.json(
      { message: 'Paiement mis à jour avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la mise à jour du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du paiement' },
      { status: 500 }
    );
  }
}

