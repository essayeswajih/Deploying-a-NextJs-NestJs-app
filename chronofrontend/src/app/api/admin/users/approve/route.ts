import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const body = await request.json();
    const { approve } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    // Simuler l'approbation de l'utilisateur
    const mockResponse = {
      success: true,
      message: `Utilisateur ${approve ? 'approuvé' : 'désapprouvé'} avec succès`,
      data: {
        id: parseInt(userId),
        isApproved: approve,
        isActive: approve,
        updatedAt: new Date().toISOString()
      }
    };

    console.log(`✅ Utilisateur ${userId} ${approve ? 'approuvé' : 'désapprouvé'} (simulation)`);
    
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Erreur approbation utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation de l\'utilisateur' },
      { status: 500 }
    );
  }
}
