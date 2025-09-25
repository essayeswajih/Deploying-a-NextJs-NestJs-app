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

// Fonction pour synchroniser l'enregistrement de paiement (séances non payées)
async function synchronizePaymentRecord(connection: mysql.Connection, studentId: number) {
  try {
    // Vérifier si un enregistrement de paiement existe déjà
    const [existingRows] = await connection.execute(
      'SELECT id, seances_non_payees, seances_payees, montant_total, montant_restant, montant_paye FROM paiement WHERE student_id = ?',
      [studentId]
    );
    
    if ((existingRows as any[]).length > 0) {
      // Mettre à jour l'enregistrement existant
      const existing = (existingRows as any[])[0];
      const newUnpaidSessions = (existing.seances_non_payees || 0) + 1;
      const prixSeance = 40; // Prix par défaut
      const newTotalAmount = (newUnpaidSessions + (existing.seances_payees || 0)) * prixSeance;
      
      await connection.execute(`
        UPDATE paiement 
        SET 
          seances_non_payees = ?,
          seances_total = ?,
          montant_total = ?,
          montant_restant = ?,
          statut = CASE 
            WHEN ? = 0 THEN 'paye'
            WHEN ? < ? THEN 'partiel'
            ELSE 'en_attente'
          END
        WHERE student_id = ?
      `, [
        newUnpaidSessions,
        newUnpaidSessions + (existing.seances_payees || 0),
        newTotalAmount,
        newTotalAmount - (existing.montant_paye || 0),
        newUnpaidSessions,
        existing.montant_paye || 0,
        newTotalAmount,
        studentId
      ]);
    } else {
      // Créer un nouvel enregistrement de paiement
      const prixSeance = 40; // Prix par défaut
      const totalAmount = prixSeance; // 1 séance non payée
      
      await connection.execute(`
        INSERT INTO paiement (
          student_id, 
          seances_total, 
          seances_non_payees, 
          seances_payees,
          montant_total, 
          montant_paye, 
          montant_restant, 
          prix_seance, 
          statut,
          date_creation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        studentId,
        1, // seances_total
        1, // seances_non_payees
        0, // seances_payees
        totalAmount, // montant_total
        0, // montant_paye
        totalAmount, // montant_restant
        prixSeance, // prix_seance
        'en_attente' // statut
      ]);
    }
    
    // Maintenant, synchroniser la table students avec les données de paiement
    await connection.execute(`
      UPDATE students 
      SET unpaid_sessions = (
        SELECT seances_non_payees FROM paiement WHERE student_id = ?
      )
      WHERE id = ?
    `, [studentId, studentId]);
    
    console.log(`✅ Enregistrement de paiement synchronisé pour l'étudiant ${studentId}`);
    
  } catch (error) {
    console.error('Erreur lors de la synchronisation du paiement:', error);
    // Ne pas faire échouer la fonction principale si la synchronisation échoue
  }
}

// Fonction pour synchroniser l'enregistrement de paiement (séances payées)
async function synchronizePaidSessions(connection: mysql.Connection, studentId: number, newPaidSessions: number) {
  try {
    // Vérifier si un enregistrement de paiement existe déjà
    const [existingRows] = await connection.execute(
      'SELECT id, seances_non_payees, seances_payees, montant_total, montant_restant, montant_paye FROM paiement WHERE student_id = ?',
      [studentId]
    );
    
    if ((existingRows as any[]).length > 0) {
      // Mettre à jour l'enregistrement existant
      const existing = (existingRows as any[])[0];
      const prixSeance = 40; // Prix par défaut
      const newTotalAmount = (newPaidSessions + (existing.seances_non_payees || 0)) * prixSeance;
      const newPaidAmount = newPaidSessions * prixSeance;

      await connection.execute(`
        UPDATE paiement 
        SET 
          seances_payees = ?,
          seances_total = ?,
          montant_total = ?,
          montant_paye = ?,
          montant_restant = ?,
          statut = CASE 
            WHEN ? = 0 THEN 'paye'
            WHEN ? < ? THEN 'partiel'
            ELSE 'en_attente'
          END
        WHERE student_id = ?
      `, [
        newPaidSessions,
        newPaidSessions + (existing.seances_non_payees || 0),
        newTotalAmount,
        newPaidAmount,
        newTotalAmount - newPaidAmount,
        existing.seances_non_payees || 0,
        newPaidAmount,
        newTotalAmount,
        studentId
      ]);
    } else {
      // Créer un nouvel enregistrement de paiement
      const prixSeance = 40; // Prix par défaut
      const totalAmount = newPaidSessions * prixSeance;

      await connection.execute(`
        INSERT INTO paiement (
          student_id, 
          seances_total, 
          seances_non_payees, 
          seances_payees,
          montant_total,
          montant_paye,
          montant_restant,
          prix_seance,
          statut,
          date_creation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        studentId,
        newPaidSessions, // seances_total
        0, // seances_non_payees
        newPaidSessions, // seances_payees
        totalAmount, // montant_total
        totalAmount, // montant_paye
        0, // montant_restant
        prixSeance, // prix_seance
        'paye' // statut
      ]);
    }
    
    console.log(`✅ Enregistrement de paiement synchronisé (séances payées) pour l'étudiant ${studentId}`);
    
  } catch (error) {
    console.error('Erreur lors de la synchronisation du paiement (séances payées):', error);
    // Ne pas faire échouer la fonction principale si la synchronisation échoue
  }
}

// Fonction pour synchroniser les deux types de séances
async function synchronizeBothSessions(connection: mysql.Connection, studentId: number, paidSessions: number, unpaidSessions: number) {
  try {
    const prixSeance = 40; // Prix par défaut
    const totalAmount = (paidSessions + unpaidSessions) * prixSeance;
    const paidAmount = paidSessions * prixSeance;
    const unpaidAmount = unpaidSessions * prixSeance;
    
    // Déterminer le statut
    let statut = 'en_attente';
    if (unpaidSessions === 0) {
      statut = 'paye';
    } else if (paidSessions > 0) {
      statut = 'partiel';
    }
    
    // Vérifier si un enregistrement de paiement existe déjà
    const [existingRows] = await connection.execute(
      'SELECT id FROM paiement WHERE student_id = ?',
      [studentId]
    );
    
    if ((existingRows as any[]).length > 0) {
      // Mettre à jour l'enregistrement existant
      await connection.execute(`
        UPDATE paiement 
        SET 
          seances_payees = ?,
          seances_non_payees = ?,
          seances_total = ?,
          montant_total = ?,
          montant_paye = ?,
          montant_restant = ?,
          statut = ?
        WHERE student_id = ?
      `, [
        paidSessions,
        unpaidSessions,
        paidSessions + unpaidSessions,
        totalAmount,
        paidAmount,
        unpaidAmount,
        statut,
        studentId
      ]);
    } else {
      // Créer un nouvel enregistrement de paiement
      await connection.execute(`
        INSERT INTO paiement (
          student_id, 
          seances_total, 
          seances_non_payees, 
          seances_payees,
          montant_total, 
          montant_paye, 
          montant_restant, 
          prix_seance, 
          statut,
          date_creation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        studentId,
        paidSessions + unpaidSessions, // seances_total
        unpaidSessions, // seances_non_payees
        paidSessions, // seances_payees
        totalAmount, // montant_total
        paidAmount, // montant_paye
        unpaidAmount, // montant_restant
        prixSeance, // prix_seance
        statut
      ]);
    }
    
    console.log(`✅ Enregistrement de paiement synchronisé (séances mixtes) pour l'étudiant ${studentId}`);
    
  } catch (error) {
    console.error('Erreur lors de la synchronisation du paiement (séances mixtes):', error);
    // Ne pas faire échouer la fonction principale si la synchronisation échoue
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class');
    const nameFilter = searchParams.get('name');
    
    const connection = await getConnection();
    
    // Requête de base pour récupérer les étudiants avec leurs vraies sessions depuis la table paiement
    let query = `
      SELECT 
        s.id as student_id,
        u.first_name,
        u.last_name,
        u.email,
        s.class_level,
        COALESCE(p.seances_payees, 0) as paid_sessions,
        COALESCE(p.seances_non_payees, 0) as unpaid_sessions,
        u.is_active,
        u.created_at,
        COALESCE(p.montant_paye, 0) as montant_paye,
        COALESCE(p.montant_restant, 0) as montant_restant,
        COALESCE(p.statut, 'en_attente') as statut_paiement
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN paiement p ON s.id = p.student_id
      WHERE u.role = 'student'
    `;
    
    const params: any[] = [];
    
    // Filtre par classe
    if (classFilter && classFilter !== 'Toutes') {
      query += ` AND s.class_level = ?`;
      params.push(classFilter);
    }
    
    // Filtre par nom
    if (nameFilter) {
      query += ` AND (
        u.first_name LIKE ? OR 
        u.last_name LIKE ? OR 
        u.email LIKE ?
      )`;
      const searchTerm = `%${nameFilter}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY s.id DESC`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    // Convertir les chaînes en nombres
    const processedRows = (rows as any[]).map(row => ({
      ...row,
      paid_sessions: parseInt(row.paid_sessions) || 0,
      unpaid_sessions: parseInt(row.unpaid_sessions) || 0,
      montant_paye: parseFloat(row.montant_paye) || 0,
      montant_restant: parseFloat(row.montant_restant) || 0
    }));
    
    console.log(`✅ Étudiants récupérés: ${processedRows.length} étudiants`);
    
    // Log pour déboguer
    if (processedRows.length > 0) {
      console.log('🔍 Premier étudiant détaillé (Présence):', {
        student: `${processedRows[0].first_name} ${processedRows[0].last_name}`,
        paid_sessions: processedRows[0].paid_sessions,
        unpaid_sessions: processedRows[0].unpaid_sessions,
        montant_paye: processedRows[0].montant_paye,
        montant_restant: processedRows[0].montant_restant
      });
    }
    
    return NextResponse.json(processedRows);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la liste des étudiants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, date, isPresent } = await request.json();
    
    const connection = await getConnection();
    
    // Créer la table attendance si elle n'existe pas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        session_date DATE NOT NULL,
        is_present BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_date (student_id, session_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Mettre à jour ou insérer la présence
    await connection.execute(`
      INSERT INTO attendance (student_id, session_date, is_present)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        is_present = VALUES(is_present),
        updated_at = CURRENT_TIMESTAMP
    `, [studentId, date, isPresent]);
    
    // Si l'étudiant est marqué présent, incrémenter les séances non payées
    if (isPresent) {
      try {
        // NE PAS incrémenter ici - la synchronisation s'en chargera
        // await connection.execute(`
        //   UPDATE students 
        //   SET unpaid_sessions = COALESCE(unpaid_sessions, 0) + 1
        //   WHERE id = ?
        // `, [studentId]);
        
        // Synchroniser avec la table paiement (cela mettra à jour students.unpaid_sessions)
        await synchronizePaymentRecord(connection, studentId);
        
      } catch (error) {
        console.log('Impossible de synchroniser les paiements:', error instanceof Error ? error.message : 'Erreur inconnue');
      }
    }
    
    await connection.end();
    
    return NextResponse.json({ 
      message: `Présence ${isPresent ? 'marquée' : 'démarquée'} avec succès`,
      success: true 
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la présence:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la présence' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { studentId, action, sessions, paidSessions, unpaidSessions } = await request.json();
    
    const connection = await getConnection();
    
    let message = '';
    
    switch (action) {
      case 'add_unpaid':
        if (!sessions || sessions <= 0) {
          await connection.end();
          return NextResponse.json(
            { error: 'Nombre de séances invalide' },
            { status: 400 }
          );
        }
        try {
          await connection.execute(`
            UPDATE students
            SET unpaid_sessions = COALESCE(unpaid_sessions, 0) + ?
            WHERE id = ?
          `, [sessions, studentId]);
        
        // Synchroniser avec la table paiement
          await synchronizePaymentRecord(connection, studentId);
          
        } catch (error) {
          console.log('Impossible de mettre à jour unpaid_sessions:', error instanceof Error ? error.message : 'Erreur inconnue');
        }
        message = `${sessions} séance(s) non payée(s) ajoutée(s)`;
        break;
        
      case 'remove_unpaid':
        if (!sessions || sessions <= 0) {
          await connection.end();
          return NextResponse.json(
            { error: 'Nombre de séances invalide' },
            { status: 400 }
          );
        }
        try {
          await connection.execute(`
            UPDATE students
            SET unpaid_sessions = GREATEST(0, COALESCE(unpaid_sessions, 0) - ?)
            WHERE id = ?
          `, [sessions, studentId]);
          
          // Synchroniser avec la table paiement après retrait
          await synchronizePaymentRecord(connection, studentId);
          
        } catch (error) {
          console.log('Impossible de mettre à jour unpaid_sessions:', error instanceof Error ? error.message : 'Erreur inconnue');
        }
        message = `${sessions} séance(s) non payée(s) retirée(s)`;
        break;
        
      case 'add_paid':
        if (!sessions || sessions <= 0) {
          await connection.end();
          return NextResponse.json(
            { error: 'Nombre de séances invalide' },
            { status: 400 }
          );
        }
        try {
          await connection.execute(`
            UPDATE students
            SET paid_sessions = COALESCE(paid_sessions, 0) + ?
            WHERE id = ?
          `, [sessions, studentId]);
          
          // Récupérer le nouveau total des séances payées
          const [result] = await connection.execute(
            'SELECT paid_sessions FROM students WHERE id = ?',
            [studentId]
          );
          const newPaidSessions = (result as any[])[0]?.paid_sessions || 0;
        
        // Synchroniser avec la table paiement
          await synchronizePaidSessions(connection, studentId, newPaidSessions);
          
        } catch (error) {
          console.log('Impossible de mettre à jour paid_sessions:', error instanceof Error ? error.message : 'Erreur inconnue');
        }
        message = `${sessions} séance(s) payée(s) ajoutée(s)`;
        break;
        
      case 'remove_paid':
        if (!sessions || sessions <= 0) {
          await connection.end();
          return NextResponse.json(
            { error: 'Nombre de séances invalide' },
            { status: 400 }
          );
        }
        try {
          await connection.execute(`
            UPDATE students
            SET paid_sessions = GREATEST(0, COALESCE(paid_sessions, 0) - ?)
            WHERE id = ?
          `, [sessions, studentId]);
          
          // Récupérer le nouveau total des séances payées
          const [result] = await connection.execute(
            'SELECT paid_sessions FROM students WHERE id = ?',
            [studentId]
          );
          const newPaidSessions = (result as any[])[0]?.paid_sessions || 0;
        
        // Synchroniser avec la table paiement
          await synchronizePaidSessions(connection, studentId, newPaidSessions);
          
        } catch (error) {
          console.log('Impossible de mettre à jour paid_sessions:', error instanceof Error ? error.message : 'Erreur inconnue');
        }
        message = `${sessions} séance(s) payée(s) retirée(s)`;
        break;
        
      case 'set_both_sessions':
        if (paidSessions === undefined || paidSessions < 0 || unpaidSessions === undefined || unpaidSessions < 0) {
          await connection.end();
          return NextResponse.json(
            { error: 'Nombre de séances invalide' },
            { status: 400 }
          );
        }
        try {
          await connection.execute(`
            UPDATE students
            SET paid_sessions = ?, unpaid_sessions = ?
            WHERE id = ?
          `, [paidSessions, unpaidSessions, studentId]);
          
          // Synchroniser complètement avec la table paiement
          await synchronizeBothSessions(connection, studentId, paidSessions, unpaidSessions);
          
        } catch (error) {
          console.log('Impossible de mettre à jour les sessions:', error instanceof Error ? error.message : 'Erreur inconnue');
        }
        message = `Séances payées: ${paidSessions}, Séances non payées: ${unpaidSessions}`;
        break;
        
      default:
        await connection.end();
        return NextResponse.json(
          { error: 'Action non reconnue' },
          { status: 400 }
        );
    }
    
    await connection.end();
    
    return NextResponse.json({ 
      message,
      success: true 
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'action administrative:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'action administrative' },
      { status: 500 }
    );
  }
}

