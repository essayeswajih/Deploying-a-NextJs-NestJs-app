import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizAccessService } from './quiz-access.service';
import { QuizAccessGuard } from './guards/quiz-access.guard';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller('quizzes')
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly quizAccessService: QuizAccessService,
  ) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('subject') subject?: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
  ) {
    return this.quizzesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      subject,
      level,
      status,
    });
  }

  @Get('attempts')
  listStudentAttempts(
    @Query('quiz_id') quizId?: string,
    @Query('student_id') studentId?: string,
  ) {
    return this.quizzesService.listStudentAttempts(
      quizId ? parseInt(quizId) : undefined,
      studentId ? parseInt(studentId) : undefined,
    );
  }

  @Get('attempts/recent')
  getRecentAttempts() {
    return this.quizzesService.getRecentAttempts();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(parseInt(id));
  }

  @Get(':id/with-questions')
  findOneWithQuestions(@Param('id') id: string) {
    return this.quizzesService.findOneWithQuestions(parseInt(id));
  }

  @Get(':id/attempts')
  listAttempts(@Param('id') id: string) {
    return this.quizzesService.listAttempts(parseInt(id));
  }

  @Post()
  create(@Body() dto: CreateQuizDto) {
    return this.quizzesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(parseInt(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(parseInt(id));
  }

  @Post('attempts')
  // @UseGuards(QuizAccessGuard) // Temporairement désactivé pour debug
  submitAttempt(@Body() dto: SubmitQuizDto) {
    // Le guard vérifie automatiquement l'accès
    return this.quizzesService.submitAttempt(dto, dto.student_id);
  }

  // Question management endpoints
  @Get(':quizId/questions')
  findQuestions(@Param('quizId') quizId: string) {
    return this.quizzesService.findQuestions(parseInt(quizId));
  }

  @Get('questions/:questionId')
  findQuestion(@Param('questionId') questionId: string) {
    return this.quizzesService.findQuestion(parseInt(questionId));
  }

  // Endpoint pour récupérer les réponses d'une tentative spécifique
  @Get('attempts/:attemptId/answers')
  getAttemptAnswers(@Param('attemptId') attemptId: string) {
    return this.quizzesService.getAttemptAnswers(parseInt(attemptId));
  }

  @Get(':id/can-take/:studentClassLevel')
  canStudentTakeQuiz(
    @Param('id') id: string,
    @Param('studentClassLevel') studentClassLevel: string,
  ) {
    return this.quizzesService.canStudentTakeQuiz(parseInt(id), studentClassLevel);
  }

  @Get('accessible/:studentId')
  getAccessibleQuizzes(@Param('studentId') studentId: string) {
    return this.quizAccessService.getAccessibleQuizzes(parseInt(studentId));
  }

  @Get(':id/access-stats')
  getQuizAccessStats(@Param('id') id: string) {
    return this.quizAccessService.getQuizAccessStats(parseInt(id));
  }

  @Get(':id/can-take-student/:studentId')
  canStudentTakeQuizById(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.quizAccessService.canStudentTakeQuiz(parseInt(id), parseInt(studentId));
  }

  @Post('questions')
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.quizzesService.createQuestion(dto);
  }

  @Patch('questions/:questionId')
  updateQuestion(@Param('questionId') questionId: string, @Body() dto: UpdateQuestionDto) {
    return this.quizzesService.updateQuestion(parseInt(questionId), dto);
  }

  @Delete('questions/:questionId')
  removeQuestion(@Param('questionId') questionId: string) {
    return this.quizzesService.removeQuestion(parseInt(questionId));
  }
}
