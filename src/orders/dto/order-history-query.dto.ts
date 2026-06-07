import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListPaginationQueryDto } from '../../common/dto/list-pagination-query.dto';
import { OrderStatus } from '../types/order-status.enum';

export class OrderHistoryQueryDto extends ListPaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: OrderStatus,
  })
  status?: OrderStatus;
}
