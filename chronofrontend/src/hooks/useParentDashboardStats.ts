import { useState, useEffect } from 'react';

interface ParentDashboardStats {
  completedQuizzes: number;
  averageScore: number;
  totalMessages: number;
  unreadMessages: number;
  totalMeetings: number;
  pendingMeetings: number;
}

export const useParentDashboardStats = () => {
  const [stats, setStats] = useState<ParentDashboardStats>({
    completedQuizzes: 0,
    averageScore: 0,
    totalMessages: 0,
    unreadMessages: 0,
    totalMeetings: 0,
    pendingMeetings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParentDashboardStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const userDetails = localStorage.getItem('userDetails');
      const currentUser = userDetails ? JSON.parse(userDetails) : null;
      const currentUserId = currentUser?.id;
      const userRole = currentUser?.role;
      const token = localStorage.getItem('token');

      if (!currentUserId || !token) {
        console.log('❌ Pas d\'utilisateur connecté ou token manquant');
        setLoading(false);
        return;
      }

      let completedQuizzes = 0;
      let totalScore = 0; // Somme de tous les scores
      let totalValidResults = 0; // Nombre total de résultats valides
      let totalMessages = 0;
      let unreadMessages = 0;
      let totalMeetings = 0;
      let pendingMeetings = 0;

      // 1. Récupérer les enfants du parent d'abord via l'API frontend
      try {
        console.log('🔍 Tentative de récupération des enfants pour parentId:', currentUserId);
        const childrenResponse = await fetch(`/api/parent/children?parentId=${currentUserId}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('📡 Réponse API enfants:', childrenResponse.status, childrenResponse.ok);
        
        if (childrenResponse.ok) {
          const parentData = await childrenResponse.json();
          const children = parentData.children || [];
          console.log('👶 Enfants trouvés via API frontend:', children);
          console.log('📊 Nombre d\'enfants:', children.length);
          
          if (children && children.length > 0) {
            // Pour chaque enfant, récupérer ses résultats via l'API frontend
            for (const child of children) {
              try {
                const resultsResponse = await fetch(`/api/quiz-results?studentId=${child.id}`, {
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (resultsResponse.ok) {
                  const resultsData = await resultsResponse.json();
                  const quizResults = resultsData.quizResults || [];
                  console.log(`📊 Résultats pour enfant ${child.id}:`, quizResults);
                  console.log(`📊 Nombre de résultats pour enfant ${child.id}:`, quizResults.length);
                  
                  if (quizResults && quizResults.length > 0) {
                    completedQuizzes += quizResults.length;
                    
                    // Ajouter tous les scores valides à la somme totale
                    const validResults = quizResults.filter((result: any) => result.percentage !== null && result.percentage !== undefined);
                    console.log(`📊 Résultats valides pour enfant ${child.id}:`, validResults.length);
                    if (validResults.length > 0) {
                      validResults.forEach((result: any) => {
                        totalScore += (result.percentage || 0);
                        totalValidResults += 1;
                      });
                    }
                  }
                } else {
                  console.log(`❌ Erreur API quiz-results pour enfant ${child.id}:`, resultsResponse.status);
                }
              } catch (error) {
                console.log(`❌ Erreur récupération résultats enfant ${child.id}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.log('❌ Erreur récupération enfants parent:', error);
      }

      // Calculer la moyenne globale
      const averageScore = totalValidResults > 0 ? Math.round(totalScore / totalValidResults) : 0;
      
      console.log('📊 Statistiques calculées:', {
        completedQuizzes,
        totalScore,
        totalValidResults,
        averageScore
      });

      // 2. Récupérer les messages reçus non répondus
      try {
        const conversationsResponse = await fetch(`${API_BASE}/messaging/conversations?userId=${currentUserId}&userRole=${userRole}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        
        if (conversationsResponse.ok) {
          const conversations = await conversationsResponse.json();
          console.log('💬 Conversations récupérées:', conversations);
          
          if (conversations && conversations.length > 0) {
            // Récupérer tous les messages de toutes les conversations
            for (const conversation of conversations) {
              try {
                const messagesResponse = await fetch(`${API_BASE}/messaging/conversations/${conversation.id}/messages`, {
                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                
                if (messagesResponse.ok) {
                  const messages = await messagesResponse.json();
                  
                  // Compter les messages reçus (pas envoyés par l'utilisateur actuel)
                  const receivedMessages = messages.filter((msg: any) => msg.sender_id !== currentUserId);
                  totalMessages += receivedMessages.length;
                  
                  // Compter les messages non lus
                  const unreadCount = messages.filter((msg: any) => 
                    !msg.is_read && msg.sender_id !== currentUserId
                  ).length;
                  unreadMessages += unreadCount;
                }
              } catch (error) {
                console.log('❌ Erreur récupération messages conversation:', error);
              }
            }
          }
        }
      } catch (error) {
        console.log('❌ Erreur récupération conversations:', error);
      }

      // 3. Récupérer l'ID du parent depuis l'utilisateur
      let parentId = null;
      try {
        const parentResponse = await fetch(`${API_BASE}/parents/by-user/${currentUserId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        
        if (parentResponse.ok) {
          const parentData = await parentResponse.json();
          parentId = parentData.id;
          console.log('📋 ID du parent récupéré:', parentId);
        }
      } catch (error) {
        console.log('❌ Erreur récupération ID parent:', error);
      }

      // 4. Récupérer les rendez-vous (comme dans MeetingsTab)
      if (parentId) {
        try {
          const rendezVousResponse = await fetch(`${API_BASE}/api/rendez-vous?parentId=${parentId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
        
          if (rendezVousResponse.ok) {
            const rendezVous = await rendezVousResponse.json();
            console.log('📅 Rendez-vous récupérés:', rendezVous);
            
            if (rendezVous && rendezVous.length > 0) {
              totalMeetings = rendezVous.length;
              // Compter les rendez-vous avec statut 'pending' comme "en attente"
              pendingMeetings = rendezVous.filter((rdv: any) => rdv.status === 'pending').length;
            }
          }
        } catch (error) {
          console.log('❌ Erreur récupération rendez-vous:', error);
        }
      }

      const finalStats: ParentDashboardStats = {
        completedQuizzes,
        averageScore,
        totalMessages,
        unreadMessages,
        totalMeetings,
        pendingMeetings
      };
      
      console.log('✅ Statistiques dashboard parent finales:', finalStats);
      setStats(finalStats);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques dashboard parent:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParentDashboardStats();
  }, []);

  return { 
    stats, 
    loading, 
    error, 
    refreshStats: loadParentDashboardStats 
  };
};

