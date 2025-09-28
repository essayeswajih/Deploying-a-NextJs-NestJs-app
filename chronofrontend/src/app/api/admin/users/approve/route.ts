import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.chronocarto.tn/api';

export async function PATCH(request: NextRequest) {
  try {
    const { userId, approve } = await request.json();
    
    if (!userId || typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'userId et approve (boolean) sont requis' },
        { status: 400 }
      );
    }

const response = await fetch(`/api/admin/users/${userId}/approve`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ approve: true })
});

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Erreur lors de l\'approbation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur API approbation utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
