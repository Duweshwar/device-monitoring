import { Controller, Post, Get, Body, Param, Headers, Req, Logger } from '@nestjs/common';
import { PaymentsService, CreateOrderDto } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  // 1. Create Cashfree PG Order
  @Public()
  @Post('create-order')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createCashfreeOrder(dto);
  }

  // 2. Universal Cashfree Webhook
  @Public()
  @Post('cashfree-webhook')
  async handleCashfreeWebhook(
    @Req() req: any,
    @Body() body: any,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(body);
    const sig = signature || req.headers?.['x-webhook-signature'] || '';
    const ts = timestamp || req.headers?.['x-webhook-timestamp'] || '';

    this.logger.log(`[Cashfree Webhook] Received webhook event notification`);
    return this.paymentsService.handleCashfreeWebhook(rawBody, sig, ts);
  }

  // 3. Check Order Status
  @Public()
  @Get('order-status/:orderId')
  async getOrderStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.checkOrderStatus(orderId);
  }

  // 4. Client Return / Complete Order Verification
  @Public()
  @Post('verify-order/:orderId')
  async verifyOrder(@Param('orderId') orderId: string, @Body() body?: { referenceId?: string }) {
    return this.paymentsService.processSuccessfulPayment(orderId, body?.referenceId);
  }
}
