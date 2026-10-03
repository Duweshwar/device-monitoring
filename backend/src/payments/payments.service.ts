import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

export interface CreateOrderDto {
  planCode: string;
  durationMonths: number;
  quantity?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  addAssistance?: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly configService: ConfigService,
  ) {}

  // 1. Create Cashfree PG Order based on Plan, Duration, and Quantity
  async createCashfreeOrder(dto: CreateOrderDto) {
    if (!dto.planCode || !dto.customerEmail || !dto.customerName) {
      throw new BadRequestException('Plan code, customer email, and customer name are required.');
    }

    const cleanEmail = dto.customerEmail.trim().toLowerCase();
    const cleanPhone = (dto.customerPhone || '9999999999').replace(/[^0-9]/g, '').slice(-10);
    const months = Number(dto.durationMonths) || 12;
    const quantity = Math.max(1, Number(dto.quantity) || 1);

    // Look up dynamic plan & pricing from database
    const plan = await this.plansService.getPlanByCode(dto.planCode);
    if (!plan) {
      throw new NotFoundException(`Plan with code "${dto.planCode}" not found.`);
    }

    const pricing = plan.pricing as Record<string, number>;
    const unitPrice = pricing[months] || pricing[12] || 4999;
    const baseAmount = unitPrice * quantity;
    const assistancePrice = dto.addAssistance ? 2500 : 0;
    const totalAmount = baseAmount + assistancePrice;

    // Generate unique order ID
    const orderId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Cashfree Environment Credentials
    const appId = this.configService.get<string>('CASHFREE_APP_ID') || process.env.CASHFREE_APP_ID || '';
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY') || process.env.CASHFREE_SECRET_KEY || '';
    const isProd = this.configService.get<string>('CASHFREE_ENV') === 'PRODUCTION' || process.env.CASHFREE_ENV === 'PRODUCTION';
    const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const clientDashboardUrl = this.configService.get<string>('CLIENT_DASHBOARD_URL') || 'http://localhost:5173';

    let paymentSessionId = '';

    // If real Cashfree API credentials are provided, call Cashfree PG Order API
    if (appId && secretKey && !appId.includes('YOUR_')) {
      try {
        const cashfreeResponse = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: totalAmount,
            order_currency: 'INR',
            customer_details: {
              customer_id: `cust_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
              customer_name: dto.customerName,
              customer_email: cleanEmail,
              customer_phone: cleanPhone,
            },
            order_meta: {
              return_url: `${clientDashboardUrl}/billing?order_id={order_id}`,
              notify_url: `${this.configService.get<string>('API_PUBLIC_URL') || 'http://localhost:3000'}/api/v1/payments/cashfree-webhook`,
            },
            order_tags: {
              planCode: plan.code,
              durationMonths: String(months),
              quantity: String(quantity),
            },
          }),
        });

        const cfData = await cashfreeResponse.json();

        if (cashfreeResponse.ok && cfData.payment_session_id) {
          paymentSessionId = cfData.payment_session_id;
          this.logger.log(`[Cashfree PG] Created real order ${orderId}, session: ${paymentSessionId}`);
        } else {
          this.logger.warn(`[Cashfree PG] API response warning: ${JSON.stringify(cfData)}`);
          paymentSessionId = `session_cf_sandbox_${orderId}`;
        }
      } catch (err: any) {
        this.logger.error(`[Cashfree PG] Network error calling Cashfree API: ${err.message}`);
        paymentSessionId = `session_cf_sandbox_${orderId}`;
      }
    } else {
      // Sandbox test session ID for instant development and testing
      paymentSessionId = `session_cf_sandbox_${orderId}`;
      this.logger.log(`[Cashfree PG] Operating in Sandbox test session mode for order ${orderId}`);
    }

    // Save PaymentOrder in PostgreSQL
    try {
      await this.prisma.paymentOrder.create({
        data: {
          orderId,
          paymentSessionId,
          amount: totalAmount,
          currency: 'INR',
          status: 'PENDING',
          planCode: plan.code,
          planName: plan.name,
          durationMonths: months,
          quantity,
          customerName: dto.customerName,
          customerEmail: cleanEmail,
          customerPhone: cleanPhone,
          customerAddress: dto.customerAddress || null,
          metadata: {
            addAssistance: dto.addAssistance || false,
            unitPrice,
            baseAmount,
          },
        },
      });
    } catch (e: any) {
      this.logger.warn(`[PaymentsService] Error saving payment order in DB: ${e.message}`);
    }

    return {
      success: true,
      orderId,
      paymentSessionId,
      amount: totalAmount,
      currency: 'INR',
      planName: plan.name,
      planCode: plan.code,
      durationMonths: months,
      quantity,
      environment: isProd ? 'PRODUCTION' : 'SANDBOX',
      appId: appId || 'TEST_APP_ID',
    };
  }

  // 2. Universal Cashfree Webhook Handler (Verifies signature & provisions licenses)
  async handleCashfreeWebhook(rawBody: string, signature: string, timestamp: string) {
    const secretKey = this.configService.get<string>('CASHFREE_SECRET_KEY') || process.env.CASHFREE_SECRET_KEY || '';

    // Verify Cashfree Webhook HMAC-SHA256 signature if secret is configured
    if (secretKey && !secretKey.includes('YOUR_') && signature && timestamp) {
      try {
        const payloadToSign = timestamp + rawBody;
        const expectedSignature = crypto
          .createHmac('sha256', secretKey)
          .update(payloadToSign)
          .digest('base64');

        if (signature !== expectedSignature) {
          this.logger.warn('[Cashfree Webhook] Invalid signature match! Rejecting webhook.');
          throw new BadRequestException('Invalid webhook signature');
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.error(`[Cashfree Webhook] Signature verification error: ${err.message}`);
      }
    }

    // Parse payload
    let eventData: any = {};
    try {
      eventData = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch {
      eventData = {};
    }

    this.logger.log(`[Cashfree Webhook] Received webhook event: ${eventData.type || 'PAYMENT_EVENT'}`);

    const orderData = eventData.data?.order || eventData.order || {};
    const paymentData = eventData.data?.payment || eventData.payment || {};
    const orderId = orderData.order_id || eventData.order_id;

    if (!orderId) {
      return { success: false, message: 'Missing order_id in webhook payload' };
    }

    const isPaid =
      paymentData.payment_status === 'SUCCESS' ||
      eventData.type === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventData.type === 'ORDER_PAID_WEBHOOK';

    if (isPaid) {
      return this.processSuccessfulPayment(orderId, paymentData.cf_payment_id || paymentData.payment_id);
    }

    return { success: true, message: 'Webhook received for non-success event' };
  }

  // 3. Confirm and Provision Licenses for Paid Order
  async processSuccessfulPayment(orderId: string, referenceId?: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderId },
    }).catch(() => null);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (order.status === 'PAID') {
      this.logger.log(`[PaymentsService] Order ${orderId} is already fulfilled.`);
      return { success: true, message: 'Order already fulfilled', orderId };
    }

    // Mark order as PAID in PostgreSQL
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        referenceId: referenceId || `cf_pay_${Date.now()}`,
      },
    });

    const cleanEmail = order.customerEmail.toLowerCase();

    // 1. Find or create parent User account with Argon2 password
    let user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    }).catch(() => null);

    if (!user) {
      const tempPassword = `Pass@${Math.floor(100000 + Math.random() * 900000)}`;
      const passwordHash = await argon2.hash(tempPassword);
      const pairingCode = `PAR-${Math.floor(100000 + Math.random() * 900000)}`;

      user = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name: order.customerName,
          pairingCode,
          accountType: 'PARENT',
          roles: ['FAMILY_PARENT'],
        },
      }).catch(() => null);

      this.logger.log(`[PaymentsService] Created new Parent User ${cleanEmail} (Pairing Code: ${pairingCode})`);
    }

    // Connect user to order
    if (user && !order.userId) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { userId: user.id },
      }).catch(() => null);
    }

    // 2. Provision exactly "quantity" Licenses in PostgreSQL!
    const createdLicenses: any[] = [];
    const expiresAt = new Date(Date.now() + order.durationMonths * 30 * 24 * 60 * 60 * 1000);
    const planPrefix = (order.planCode || 'PREMIUM').toUpperCase();

    for (let i = 0; i < order.quantity; i++) {
      const licenseKey = `LIC-${planPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      try {
        const license = await this.prisma.license.create({
          data: {
            licenseKey,
            planName: `${order.planName} (${order.durationMonths} Months)`,
            planCode: (order.planCode || 'basic').toLowerCase(),
            userId: user?.id || 'usr_demo',
            status: 'UNASSIGNED',
            expiresAt,
          },
        });
        createdLicenses.push(license);
      } catch (err: any) {
        this.logger.error(`[PaymentsService] Error provisioning license key: ${err.message}`);
      }
    }

    this.logger.log(`[PaymentsService] Provisioned ${createdLicenses.length} License(s) for Order ${orderId}`);

    return {
      success: true,
      orderId,
      licenses: createdLicenses.map((l) => ({
        licenseKey: l.licenseKey,
        planName: l.planName,
        expiresAt: l.expiresAt,
        status: l.status,
      })),
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        pairingCode: user?.pairingCode,
      },
    };
  }

  // 4. Client-side Order Status Check / Fallback Verification
  async checkOrderStatus(orderId: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderId },
      include: {
        user: {
          include: {
            licenses: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    }).catch(() => null);

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      success: true,
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      planName: order.planName,
      quantity: order.quantity,
      durationMonths: order.durationMonths,
      licenses: order.user?.licenses || [],
    };
  }
}
