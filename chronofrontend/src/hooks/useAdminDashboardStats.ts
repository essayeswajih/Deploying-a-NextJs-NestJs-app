import { useState, useEffect } from 'react';

interface AdminDashboardStats {
  unreadMessages: number;
  pendingMeetings: number;
}

export const useAdminDashboardStats = () => {
  const [stats, setStats] = useState<AdminDashboardStats>({
    unreadMessages: 0,
    pendingMeetings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminDashboardStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      const userDetails = localStorage.getItem('userDetails');
      const currentUser = userDetails ? JSON.parse(userDetails) : null;
      const currentUserId = currentUser?.id;
      const userRole = currentUser?.role;

      if (!token || !currentUserId || userRole !== 'admin') {
        console.log('❌ Pas d\'authentification ou pas admin');
        setStats({ unreadMessages: 0, pendingMeetings: 0 });
        return;
      }

      let unreadMessages = 0;
      let pendingMeetings = 0;

      // 1. Récupérer les messages non lus (messages reçus par l'admin non lus)
      try {
        const conversationsResponse = await fetch(`${API_BASE}/messaging/conversations?userId=${currentUserId}&userRole=${userRole}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (conversationsResponse.ok) {
          const conversations = await conversationsResponse.json();
          console.log('📧 Conversations récupérées pour admin:', conversations.length);

          for (const conversation of conversations) {
            const messagesResponse = await fetch(`${API_BASE}/messaging/conversations/${conversation.id}/messages`, {
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            if (messagesResponse.ok) {
              const messages = await messagesResponse.json();
              // Compter les messages reçus par l'admin qui ne sont pas lus
              const unreadCount = messages.filter((msg: any) => 
                msg.sender_id !== currentUserId && !msg.is_read
              ).length;
              unreadMessages += unreadCount;
            }
          }
        }
      } catch (error) {
        console.log('❌ Erreur récupération messages admin:', error);
      }

      // 2. Récupérer les rendez-vous en attente (utiliser le même endpoint que la section Rendez-vous)
      try {
        const rendezVousResponse = await fetch(`${API_BASE}/api/rendez-vous`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (rendezVousResponse.ok) {
          const rendezVous = await rendezVousResponse.json();
          // Compter seulement les rendez-vous avec le statut 'pending'
          pendingMeetings = rendezVous.filter((rdv: any) => rdv.status === 'pending').length;
          console.log('📅 Rendez-vous en attente:', pendingMeetings);
        }
      } catch (error) {
        console.log('❌ Erreur récupération rendez-vous:', error);
      }

      const finalStats: AdminDashboardStats = {
        unreadMessages,
        pendingMeetings
      };

      console.log('📊 Statistiques admin finales:', finalStats);
      setStats(finalStats);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques admin:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminDashboardStats();
  }, []);

  return { stats, loading, error, refreshStats: loadAdminDashboardStats };
};

