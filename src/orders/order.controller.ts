import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { OrderResponseDto } from './dto/order-response.dto';
import { GetUser } from '../auth/decorators/current-user.decorator';
import { OrderHistoryQueryDto } from './dto/order-history-query.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get user order history' })
  @ApiResponse({ status: 200, type: OrderResponseDto, isArray: true })
  async getOrderHistory(
    @GetUser('id') userId: number,
    @Query() query: OrderHistoryQueryDto,
  ) {
    return this.orderService.getOrderHistory(
      userId.toString(),
      query.page ?? 1,
      query.limit ?? 20,
      query.status,
    );
  }

  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(
    @GetUser('id') userId: number,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.getOrderById(userId.toString(), orderId);
  }
}
