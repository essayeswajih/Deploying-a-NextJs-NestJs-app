import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FoldersService } from './folders.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { AddFileToFolderDto } from './dto/add-file-to-folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { File } from './entities/file.entity';
import * as path from 'path';
import * as fs from 'fs';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly foldersService: FoldersService
  ) {}

  @Post()
  async create(@Body() createFileDto: CreateFileDto, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent uploader des fichiers');
    }

    return this.filesService.create(createFileDto, req.user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description: string,
    @Request() req
  ) {
    try {
      console.log('📤 Upload de fichier - Données reçues:', {
        title,
        description,
        fileName: file?.originalname,
        fileSize: file?.size,
        userRole: req.user?.role
      });

      if (req.user.role !== UserRole.ADMIN) {
        throw new BadRequestException('Seuls les administrateurs peuvent uploader des fichiers');
      }

      if (!file) {
        throw new BadRequestException('Aucun fichier fourni');
      }

      if (!title) {
        throw new BadRequestException('Le titre est requis');
      }


    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Générer un nom de fichier unique pour éviter les conflits
    const fileExtension = path.extname(file.originalname);
    const fileName = path.basename(file.originalname, fileExtension);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const storedName = `file-${timestamp}-${randomSuffix}-${fileName}${fileExtension}`;
    const filePath = path.join('uploads', storedName);

    // Sauvegarder le fichier
    const fullPath = path.join(process.cwd(), filePath);
    fs.writeFileSync(fullPath, file.buffer);

    console.log('✅ Fichier sauvegardé:', fullPath);

    // Créer l'entrée dans la base de données
    const createFileDto: CreateFileDto = {
      title,
      description: description || '',
      fileName: file.originalname,
      storedName,
      filePath,
      fileType: file.mimetype,
      fileSize: file.size,
      isPublic: true
    };

    console.log('📝 Création du DTO:', {
      title: createFileDto.title,
      description: createFileDto.description
    });

    const createdFile = await this.filesService.create(createFileDto, req.user.id);
    console.log('✅ Fichier créé en base:', createdFile.id);

      return {
        success: true,
        file: createdFile,
        filePath
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload:', error);
      throw new BadRequestException(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  @Get()
  async findAll(@Request() req) {
    if (req.user.role === UserRole.ADMIN) {
      // Les admins voient tous les fichiers
      return this.filesService.findAll();
    } else if (req.user.role === UserRole.STUDENT) {
      // Les étudiants voient tous les fichiers (plus de filtrage par classe)
      return this.filesService.findAll();
    }
    
    throw new BadRequestException('Rôle non autorisé');
  }

  @Get('stats')
  async getStats(@Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent voir les statistiques');
    }

    return this.filesService.getFileStats();
  }



  // Endpoint déplacé après les endpoints spécifiques

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response, @Request() req) {
    const file = await this.filesService.findOne(+id);
    
    if (!file) {
      throw new BadRequestException('Fichier non trouvé');
    }
    
    // Vérifier que l'utilisateur a accès au fichier
    if (req.user.role === UserRole.STUDENT) {
      // Pour les étudiants, vérifier qu'ils appartiennent à la classe cible
      // Cette vérification devrait être faite avec les données de l'étudiant
      // Pour l'instant, on autorise l'accès
    }

    // Construire le chemin du fichier
    let filePath: string;
    
    // Normaliser les séparateurs de chemins (Windows \ vers Unix /)
    const normalizedFilePath = file.filePath.replace(/\\/g, '/');
    
    // Si filePath contient déjà "uploads/", l'utiliser directement
    if (normalizedFilePath.startsWith('uploads/')) {
      filePath = path.join(process.cwd(), normalizedFilePath);
    } else {
      filePath = path.join(process.cwd(), 'uploads', normalizedFilePath);
    }
    
    console.log('🔍 Recherche du fichier:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier non trouvé:', filePath);
      throw new BadRequestException('Fichier non trouvé sur le serveur. Veuillez contacter l\'administrateur.');
    }

    // Incrémenter le compteur de téléchargements
    await this.filesService.incrementDownloadCount(+id);

    // Obtenir la taille réelle du fichier et vérifier l'intégrité
    const stats = fs.statSync(filePath);
    
    // Vérifier que la taille correspond à celle en base de données
    if (stats.size !== file.fileSize) {
      console.log(`⚠️ Incohérence de taille détectée pour le fichier ${file.id}:`);
      console.log(`   Base de données: ${file.fileSize} bytes`);
      console.log(`   Fichier physique: ${stats.size} bytes`);
      
      // Mettre à jour la taille en base de données
      await this.filesService.update(+id, { fileSize: stats.size });
      console.log(`✅ Taille mise à jour en base de données`);
    }

    // Définir les headers pour le téléchargement
    // Pour les fichiers exécutables, utiliser application/octet-stream pour éviter les problèmes de sécurité
    let contentType = file.fileType || 'application/octet-stream';
    if (file.fileType === 'application/x-msdownload' || file.fileName.endsWith('.exe')) {
      contentType = 'application/octet-stream';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    
    // Encoder le nom de fichier pour éviter les problèmes avec les caractères spéciaux
    const encodedFileName = encodeURIComponent(file.fileName);
    // Utiliser les deux formats pour une meilleure compatibilité
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"; filename*=UTF-8''${encodedFileName}`);
    
    // Headers supplémentaires pour les fichiers binaires
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log(`📥 Téléchargement du fichier: ${file.fileName} (${stats.size} bytes)`);

    // Envoyer le fichier avec gestion d'erreur
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      console.error('❌ Erreur lors de la lecture du fichier:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Erreur lors de la lecture du fichier' });
      }
    });
    
    fileStream.pipe(res);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent modifier les fichiers');
    }

    return this.filesService.update(+id, updateFileDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent supprimer les fichiers');
    }

    await this.filesService.remove(+id);
    return { message: 'Fichier supprimé avec succès' };
  }

  // ===== ENDPOINTS POUR LA GESTION DES DOSSIERS =====

  @Post('folders')
  async createFolder(@Body() createFolderDto: CreateFolderDto, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent créer des dossiers');
    }

    return this.foldersService.create(createFolderDto, req.user.id);
  }

  @Get('folders')
  async getFolders(@Request() req) {
    console.log('🔍 getFolders - req.user:', req.user);
    console.log('🔍 getFolders - req.user.role:', req.user?.role);
    
    if (!req.user) {
      throw new BadRequestException('Utilisateur non authentifié');
    }
    
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent voir les dossiers');
    }

    try {
      console.log('📁 Récupération des dossiers...');
      const folders = await this.foldersService.findAll();
      console.log('📁 Dossiers trouvés:', folders.length);
      return folders;
    } catch (error) {
      console.error('❌ Erreur dans getFolders:', error);
      throw error;
    }
  }

  @Get('folders/test')
  @UseGuards() // Pas de guard pour ce endpoint de test
  async testFolders() {
    try {
      console.log('🧪 Test des dossiers sans authentification...');
      const folders = await this.foldersService.findAll();
      console.log('✅ Test réussi - Dossiers trouvés:', folders.length);
      return { success: true, count: folders.length, folders };
    } catch (error) {
      console.error('❌ Erreur dans testFolders:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('folders/debug')
  @UseGuards() // Pas de guard pour ce endpoint de debug
  async debugFolders(@Request() req) {
    console.log('🔍 Debug - req.user:', req.user);
    console.log('🔍 Debug - req.headers:', req.headers);
    return { 
      user: req.user, 
      hasAuth: !!req.user,
      role: req.user?.role,
      headers: req.headers
    };
  }

  @Get('folders/public')
  @UseGuards() // Pas de guard pour ce endpoint public
  async getFoldersPublic() {
    try {
      console.log('🌐 Récupération des dossiers (public)...');
      const folders = await this.foldersService.findAll();
      console.log('🌐 Dossiers trouvés:', folders.length);
      return folders;
    } catch (error) {
      console.error('❌ Erreur dans getFoldersPublic:', error);
      throw error;
    }
  }


  @Get('folders/tree')
  async getFolderTree(@Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent voir l\'arborescence des dossiers');
    }

    return this.foldersService.getFolderTree();
  }

  @Get('folders/:id')
  async getFolder(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent voir les dossiers');
    }

    const folderId = parseInt(id);
    if (isNaN(folderId) || folderId < 1) {
      throw new BadRequestException('ID de dossier invalide');
    }

    return this.foldersService.findOne(folderId);
  }

  @Get('folders/:id/contents')
  async getFolderContents(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent voir le contenu des dossiers');
    }

    const folderId = parseInt(id);
    if (isNaN(folderId) || folderId < 1) {
      throw new BadRequestException('ID de dossier invalide');
    }

    return this.foldersService.getFolderContents(folderId);
  }

  @Patch('folders/:id')
  async updateFolder(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent modifier les dossiers');
    }

    return this.foldersService.update(+id, updateFolderDto);
  }

  @Delete('folders/:id')
  async removeFolder(@Param('id') id: string, @Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent supprimer les dossiers');
    }

    await this.foldersService.remove(+id);
    return { message: 'Dossier supprimé avec succès' };
  }

  @Post('folders/:id/files')
  async addFilesToFolder(
    @Param('id') id: string,
    @Body() addFileToFolderDto: AddFileToFolderDto,
    @Request() req
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent ajouter des fichiers aux dossiers');
    }

    await this.foldersService.addFilesToFolder(+id, addFileToFolderDto);
    return { message: 'Fichiers ajoutés au dossier avec succès' };
  }

  @Delete('folders/:folderId/files/:fileId')
  async removeFileFromFolder(
    @Param('folderId') folderId: string,
    @Param('fileId') fileId: string,
    @Request() req
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Seuls les administrateurs peuvent retirer des fichiers des dossiers');
    }

    await this.foldersService.removeFileFromFolder(+folderId, +fileId);
    return { message: 'Fichier retiré du dossier avec succès' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const fileId = parseInt(id);
    if (isNaN(fileId) || fileId < 1) {
      throw new BadRequestException('ID de fichier invalide');
    }
    const file = await this.filesService.findOne(fileId);
    
    // Vérifier que l'utilisateur a accès au fichier
    if (req.user && req.user.role === UserRole.STUDENT) {
      // Pour les étudiants, vérifier qu'ils appartiennent à la classe cible
      // Cette vérification devrait être faite avec les données de l'étudiant
      // Pour l'instant, on autorise l'accès
    }

    return file;
  }
}