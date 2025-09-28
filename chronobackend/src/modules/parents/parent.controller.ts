import { Controller, Get, Query } from '@nestjs/common';
import { ParentsService } from './parents.service';

@Controller('parent')
export class ParentController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get('children')
  async getChildren(@Query('parentId') parentId: string) {
    return this.parentsService.getChildren(parseInt(parentId));
  }
}

