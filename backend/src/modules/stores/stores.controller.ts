import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto, StoreQueryDto } from './dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new store (merchant only)' })
  @ApiResponse({ status: 201, description: 'Store created successfully' })
  @ApiResponse({ status: 403, description: 'Merchant not verified' })
  async createStore(
    @CurrentUser('id') userId: string,
    @Body() createStoreDto: CreateStoreDto,
  ) {
    return this.storesService.createStore(userId, createStoreDto);
  }

  @Get('my-stores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my stores (merchant only)' })
  @ApiResponse({ status: 200, description: 'Returns merchant stores' })
  async getMyStores(@CurrentUser('id') userId: string) {
    return this.storesService.getMerchantStores(userId);
  }

  @Get('browse')
  @Public()
  @ApiOperation({ summary: 'Browse stores with filters (public)' })
  @ApiResponse({ status: 200, description: 'Returns filtered stores' })
  async browseStores(@Query() query: StoreQueryDto) {
    return this.storesService.browseStores(query);
  }

  @Get('category/:category')
  @Public()
  @ApiOperation({ summary: 'Get stores by category (public)' })
  @ApiResponse({ status: 200, description: 'Returns stores in category' })
  async getStoresByCategory(
    @Param('category') category: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.storesService.getStoresByCategory(category, page, limit);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get store by slug (public)' })
  @ApiResponse({ status: 200, description: 'Returns store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getStoreBySlug(slug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get store by ID (public)' })
  @ApiResponse({ status: 200, description: 'Returns store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreById(@Param('id') id: string) {
    return this.storesService.getStoreById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store (merchant only)' })
  @ApiResponse({ status: 200, description: 'Store updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async updateStore(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(userId, id, updateStoreDto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle store published status (merchant only)' })
  @ApiResponse({ status: 200, description: 'Store status updated' })
  async toggleStoreStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.storesService.toggleStoreStatus(userId, id, isPublished);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate store (merchant only)' })
  @ApiResponse({ status: 200, description: 'Store deactivated successfully' })
  async deactivateStore(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.storesService.deactivateStore(userId, id);
  }
}
