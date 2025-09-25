import { NextRequest, NextResponse } from 'next/server';

// URL de l'API backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.chronocarto.tn/api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;
    const body = await request.json();

    console.log(`🔄 Mise à jour paiement ${paymentId}:`, body);

    // Appeler l'API backend
    const response = await fetch(`${API_BASE_URL}/admin/payments/${paymentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erreur API backend: ${response.status} - ${errorData.message || 'Erreur inconnue'}`);
    }

    const data = await response.json();
    console.log('✅ Paiement mis à jour:', data);

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du paiement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du paiement' },
      { status: 500 }
    );
  }
}