// src/modules/parents/parents.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { ParentController } from './parent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Parent])],
  providers: [ParentsService],
  controllers: [ParentsController, ParentController],
  exports: [ParentsService],
})
export class ParentsModule {}