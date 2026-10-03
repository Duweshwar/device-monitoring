import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService, CreatePlanDto, UpdatePlanDto } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  async getAllPlans() {
    return this.plansService.getAllPlans();
  }

  @Public()
  @Get('admin')
  async getAdminPlans() {
    return this.plansService.getAdminPlans();
  }

  @Public()
  @Get('catalog')
  getFeatureCatalog() {
    return this.plansService.getFeatureCatalog();
  }

  @Public()
  @Get(':code')
  async getPlanByCode(@Param('code') code: string) {
    return this.plansService.getPlanByCode(code);
  }

  @Public()
  @Post()
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @Public()
  @Put(':id')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.updatePlan(id, dto);
  }

  @Public()
  @Patch(':id/status')
  async togglePlanStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.plansService.togglePlanStatus(id, body.isActive);
  }
}
