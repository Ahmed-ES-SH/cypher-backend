import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListPaginationQueryDto } from '../../common/dto/list-pagination-query.dto';
import { PaymentStatus } from '../schema/payment-status.enum';

export class PaymentHistoryQueryDto extends ListPaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
  })
  status?: PaymentStatus;
}
