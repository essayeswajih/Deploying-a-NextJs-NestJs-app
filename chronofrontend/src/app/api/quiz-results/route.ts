import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configuration de la base de données MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chrono_carto',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Fonction pour créer une connexion à la base de données
async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Erreur de connexion MySQL:', error);
    throw error;
  }
}

// GET - Récupérer les résultats de quiz pour un parent ou un enfant spécifique
export async function GET(request: NextRequest) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const parentUserId = searchParams.get('parentUserId');
    const studentId = searchParams.get('studentId');

    console.log('🔍 API quiz-results appelée avec:', { parentUserId, studentId });

    connection = await getConnection();

    let finalStudentIds: number[] = [];

    if (studentId) {
      // Récupérer les résultats pour un étudiant spécifique
      finalStudentIds = [parseInt(studentId)];
    } else if (parentUserId) {
      // Récupérer tous les enfants de ce parent
      const [parentChildren] = await connection.execute(`
        SELECT ps.student_id
        FROM parent_student ps
        JOIN parents p ON ps.parent_id = p.id
        WHERE p.user_id = ?
      `, [parentUserId]);

      finalStudentIds = (parentChildren as any).map((row: any) => row.student_id);
    } else {
      await connection.end();
      
      // Retourner des données de test si aucun paramètre fourni
      console.log('⚠️  Aucun paramètre fourni, retour de données de test');
      const testData = {
        quizResults: [
          {
            id: '1',
            quiz_id: 1,
            student_id: 1,
            student_name: 'Lucas Dupont',
            quiz_title: 'Mathématiques - Fractions',
            subject: 'math',
            level: '4ème',
            score: 8,
            total_points: 10,
            percentage: 80,
            time_spent: 1200,
            completed_at: '2024-01-15T14:30:00Z',
            answers: '{"1": "A", "2": "B", "3": "C"}',
            questions_total: 10,
            questions_correct: 8
          },
          {
            id: '2',
            quiz_id: 2,
            student_id: 1,
            student_name: 'Lucas Dupont',
            quiz_title: 'Français - Grammaire',
            subject: 'francais',
            level: '4ème',
            score: 7,
            total_points: 10,
            percentage: 70,
            time_spent: 900,
            completed_at: '2024-01-14T10:15:00Z',
            answers: '{"1": "A", "2": "C", "3": "B"}',
            questions_total: 10,
            questions_correct: 7
          }
        ],
        stats: {
          totalQuizzes: 2,
          averageScore: 75,
          bestScore: 80,
          totalTimeSpent: 2100
        },
        studentIds: [1]
      };
      
      return NextResponse.json(testData);
    }

    if (finalStudentIds.length === 0) {
      await connection.end();
      return NextResponse.json({
        quizResults: [],
        stats: {
          totalQuizzes: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0
        }
      });
    }

    // Récupérer les résultats de quiz de manière simplifiée
    const placeholders = finalStudentIds.map(() => '?').join(',');
    const [quizResults] = await connection.execute(`
      SELECT qa.*, 
             q.title as quiz_title,
             q.subject,
             q.level,
             s_user.first_name as student_first_name,
             s_user.last_name as student_last_name,
             s.id as correct_student_id
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      LEFT JOIN students s ON s.id IN (${placeholders})
      LEFT JOIN users s_user ON s.user_id = s_user.id
      WHERE qa.student_id IN (${placeholders})
      ORDER BY qa.completed_at DESC
    `, [...finalStudentIds, ...finalStudentIds]);

    // Transformer les données pour le frontend
    const transformedResults = (quizResults as any).map((result: any) => {
      // Utiliser total_points comme nombre de questions et calculer les bonnes réponses
      const questionsTotal = result.total_points || 2;
      const questionsCorrect = Math.round((result.percentage / 100) * questionsTotal);
      
      return {
        id: result.id.toString(),
        quiz_id: result.quiz_id,
        student_id: result.correct_student_id || result.student_id,
        student_name: `${result.student_first_name || ''} ${result.student_last_name || ''}`.trim() || result.student_name,
        quiz_title: result.quiz_title || 'Quiz sans titre',
        subject: result.subject || 'general',
        level: result.level || 'Seconde',
        score: result.score || 0,
        total_points: result.total_points || 0,
        percentage: result.percentage || 0,
        time_spent: result.time_spent || 0,
        completed_at: result.completed_at,
        answers: result.answers,
        questions_total: questionsTotal,
        questions_correct: questionsCorrect
      };
    });

    // Calculer les statistiques
    const stats = {
      totalQuizzes: transformedResults.length,
      averageScore: transformedResults.length > 0 
        ? Math.round(transformedResults.reduce((sum: number, r: any) => sum + r.percentage, 0) / transformedResults.length)
        : 0,
      bestScore: transformedResults.length > 0 
        ? Math.max(...transformedResults.map((r: any) => r.percentage))
        : 0,
      totalTimeSpent: transformedResults.reduce((sum: number, r: any) => sum + r.time_spent, 0)
    };

    await connection.end();

    return NextResponse.json({
      quizResults: transformedResults,
      stats,
      studentIds: finalStudentIds
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des résultats de quiz:', error);
    if (connection) {
      await connection.end();
    }
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des résultats de quiz', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

