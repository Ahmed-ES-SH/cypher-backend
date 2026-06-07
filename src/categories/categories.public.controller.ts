import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';
import { PublicCategoriesQueryDto } from './dto/public-categories-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PublicAllCategoryDto } from './dto/public-categories-all-list';

@ApiTags('Categories')
@Public()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('categories')
export class CategoriesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of all categories with pagination',
  })
  async findAll(@Query() filters: PublicCategoriesQueryDto): Promise<{
    data: CategoryResponseDto[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    return this.categoriesService.getAllPublicPaginated(filters);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get all categories (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of all categories',
    type: PublicAllCategoryDto,
    isArray: true,
  })
  async findAllList(): Promise<PublicAllCategoryDto[]> {
    return this.categoriesService.getAllPublicList();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a category by slug (public)' })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.getBySlugPublic(slug);
  }
}
