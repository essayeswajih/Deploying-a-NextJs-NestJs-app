import { useState, useEffect } from 'react';

interface RealStats {
  totalUsers: number;
  totalStudents: number;
  totalParents: number;
  totalQuizzes: number;
  totalMessages: number;
  unreadMessages: number;
  completedQuizzes: number;
  averageScore: number;
  userConversations: number;
  userUnreadMessages: number;
}

export const useRealStats = () => {
  const [stats, setStats] = useState<RealStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalParents: 0,
    totalQuizzes: 0,
    totalMessages: 0,
    unreadMessages: 0,
    completedQuizzes: 0,
    averageScore: 0,
    userConversations: 0,
    userUnreadMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRealStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Récupérer l'utilisateur connecté
      const userDetails = localStorage.getItem('userDetails');
      const currentUser = userDetails ? JSON.parse(userDetails) : null;
      const currentUserId = currentUser?.id;
      const userRole = currentUser?.role;
      
      let totalStudents = 0;
      let totalParents = 0;
      let totalUsers = 0;
      
      // Récupérer les statistiques selon le rôle de l'utilisateur
      if (userRole === 'admin') {
        // Pour les admins, récupérer toutes les données avec authentification
        const token = localStorage.getItem('token');
        
        try {
          const studentsResponse = await fetch(`${API_BASE}/admin/students`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            const students = studentsData.items || [];
            totalStudents = students.length;
            console.log('👨‍🎓 Étudiants trouvés:', totalStudents);
          } else {
            console.log('❌ Erreur récupération étudiants:', studentsResponse.status);
          }
        } catch (error) {
          console.log('Erreur récupération étudiants:', error);
        }

        try {
          const parentsResponse = await fetch(`${API_BASE}/admin/parents`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (parentsResponse.ok) {
            const parentsData = await parentsResponse.json();
            const parents = parentsData.items || [];
            totalParents = parents.length;
            console.log('👨‍👩‍👧‍👦 Parents trouvés:', totalParents);
          } else {
            console.log('❌ Erreur récupération parents:', parentsResponse.status);
          }
        } catch (error) {
          console.log('Erreur récupération parents:', error);
        }
        
        totalUsers = totalStudents + totalParents;
      } else {
        // Pour les étudiants et parents, utiliser des valeurs par défaut ou des estimations
        totalUsers = 1; // Au minimum l'utilisateur connecté
        totalStudents = userRole === 'student' ? 1 : 0;
        totalParents = userRole === 'parent' ? 1 : 0;
      }

      // 2. Récupérer tous les quiz
      const quizzesResponse = await fetch(`${API_BASE}/quizzes`);
      let totalQuizzes = 0;
      let quizzes: any[] = [];
      
      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        quizzes = quizzesData.items || [];
        totalQuizzes = quizzes.length;
      }

      // 3. Récupérer les conversations de l'utilisateur connecté
      let userConversations = 0;
      let userUnreadMessages = 0;
      let totalMessages = 0;
      
      if (currentUserId) {
        try {
          // Récupérer les conversations de l'utilisateur avec authentification
          const token = localStorage.getItem('token');
          const conversationsResponse = await fetch(`${API_BASE}/messaging/conversations?userId=${currentUserId}&userRole=${userRole}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (conversationsResponse.ok) {
            const conversations = await conversationsResponse.json();
            userConversations = conversations.length;
            
            // Pour chaque conversation, récupérer les messages non lus
            for (const conversation of conversations) {
              try {
                const messagesResponse = await fetch(`${API_BASE}/messaging/conversations/${conversation.id}/messages`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (messagesResponse.ok) {
                  const messages = await messagesResponse.json();
                  totalMessages += messages.length;
                  
                  // Compter les messages non lus (pas envoyés par l'utilisateur actuel)
                  const unreadCount = messages.filter((m: any) => 
                    !m.is_read && m.sender_id !== currentUserId
                  ).length;
                  userUnreadMessages += unreadCount;
                }
              } catch (error) {
                console.error('Erreur lors de la récupération des messages:', error);
              }
            }
          } else {
            console.log('❌ Erreur récupération conversations:', conversationsResponse.status);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des conversations:', error);
        }
      }

      // 4. Récupérer les tentatives de quiz
      let totalAttempts = 0;
      let averageScore = 0;
      
      if (currentUserId) {
        try {
          // Récupérer les tentatives de l'utilisateur connecté avec authentification
          const token = localStorage.getItem('token');
          const attemptsResponse = await fetch(`${API_BASE}/quizzes/attempts?student_id=${currentUserId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (attemptsResponse.ok) {
            const attempts = await attemptsResponse.json();
            totalAttempts = attempts.length;
            
            if (attempts.length > 0) {
              const totalScore = attempts.reduce((sum: number, attempt: any) => {
                return sum + (attempt.percentage || 0);
              }, 0);
              averageScore = totalScore / attempts.length;
            }
          } else {
            console.log('❌ Erreur récupération tentatives:', attemptsResponse.status);
          }
        } catch (error) {
          console.log('Erreur récupération tentatives:', error);
        }
      }

      const finalStats = {
        totalUsers,
        totalStudents,
        totalParents,
        totalQuizzes,
        totalMessages,
        unreadMessages: userUnreadMessages, // Messages non lus de l'utilisateur connecté
        completedQuizzes: totalAttempts,
        averageScore,
        userConversations,
        userUnreadMessages
      };
      
      console.log('📊 Statistiques réelles chargées:', finalStats);
      console.log('👤 Utilisateur connecté:', { id: currentUserId, role: userRole });
      console.log('🔄 Mise à jour de l\'interface avec les nouvelles données');
      
      setStats(finalStats);
      
    } catch (error) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refreshStats: loadRealStats
  };
};

