import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CategorySortField,
  CategorySortOrder,
} from './filter-categories-query.dto';

export class PublicCategoriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CategorySortField)
  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: CategorySortField,
    default: CategorySortField.order,
  })
  sortBy?: CategorySortField = CategorySortField.order;

  @IsOptional()
  @IsEnum(CategorySortOrder)
  @ApiPropertyOptional({
    description: 'Sort order',
    enum: CategorySortOrder,
    default: CategorySortOrder.ASC,
  })
  sortOrder?: CategorySortOrder = CategorySortOrder.ASC;
}
