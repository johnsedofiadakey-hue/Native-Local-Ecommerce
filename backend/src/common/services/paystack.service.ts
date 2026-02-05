import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import axios, { AxiosInstance } from 'axios';

interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackSubaccount {
  id: number;
  subaccount_code: string;
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  settlement_schedule: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
}

interface PaystackAccountValidation {
  account_number: string;
  account_name: string;
  bank_id: number;
}

@Injectable()
export class PaystackService {
  private readonly client: AxiosInstance;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    this.publicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY') || '';

    // Initialize Paystack API client
    this.client = axios.create({
      baseURL: this.configService.get<string>(
        'PAYSTACK_BASE_URL',
        'https://api.paystack.co',
      ),
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Verify Paystack configuration
   */
  isConfigured(): boolean {
    return !!(this.secretKey && this.publicKey);
  }

  /**
   * Get list of Ghana banks from Paystack
   */
  async getBanks(): Promise<PaystackBank[]> {
    try {
      const response = await this.client.get<PaystackResponse<PaystackBank[]>>(
        '/bank?country=ghana',
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to fetch banks from Paystack');
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch banks: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw error;
    }
  }

  /**
   * Validate Ghana bank account
   */
  async validateBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<PaystackAccountValidation> {
    try {
      const response = await this.client.get<
        PaystackResponse<PaystackAccountValidation>
      >(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);

      if (!response.data.status) {
        throw new BadRequestException('Invalid bank account details');
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to validate bank account: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw new BadRequestException('Could not verify bank account. Please check details.');
    }
  }

  /**
   * Create Paystack subaccount for merchant
   * Merchants receive payments directly to their own accounts
   */
  async createSubaccount(params: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
    description?: string;
    primaryContactEmail?: string;
    primaryContactName?: string;
    primaryContactPhone?: string;
  }): Promise<PaystackSubaccount> {
    try {
      // Validate bank account first
      await this.validateBankAccount(params.accountNumber, params.settlementBank);

      const response = await this.client.post<PaystackResponse<PaystackSubaccount>>(
        '/subaccount',
        {
          business_name: params.businessName,
          settlement_bank: params.settlementBank,
          account_number: params.accountNumber,
          percentage_charge: params.percentageCharge,
          description: params.description || `Subaccount for ${params.businessName}`,
          primary_contact_email: params.primaryContactEmail,
          primary_contact_name: params.primaryContactName,
          primary_contact_phone: params.primaryContactPhone,
        },
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to create subaccount',
        );
      }

      this.logger.log(
        `Paystack subaccount created: ${response.data.data.subaccount_code}`,
        'PaystackService',
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to create subaccount: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw error;
    }
  }

  /**
   * Update Paystack subaccount
   */
  async updateSubaccount(
    subaccountCode: string,
    params: {
      businessName?: string;
      settlementBank?: string;
      accountNumber?: string;
      percentageCharge?: number;
      description?: string;
      active?: boolean;
    },
  ): Promise<PaystackSubaccount> {
    try {
      const response = await this.client.put<PaystackResponse<PaystackSubaccount>>(
        `/subaccount/${subaccountCode}`,
        {
          business_name: params.businessName,
          settlement_bank: params.settlementBank,
          account_number: params.accountNumber,
          percentage_charge: params.percentageCharge,
          description: params.description,
          active: params.active,
        },
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to update subaccount');
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to update subaccount: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw error;
    }
  }

  /**
   * Get subaccount details
   */
  async getSubaccount(subaccountCode: string): Promise<PaystackSubaccount> {
    try {
      const response = await this.client.get<PaystackResponse<PaystackSubaccount>>(
        `/subaccount/${subaccountCode}`,
      );

      if (!response.data.status) {
        throw new BadRequestException('Subaccount not found');
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch subaccount: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw error;
    }
  }

  /**
   * Initialize payment transaction
   */
  async initializeTransaction(params: {
    email: string;
    amount: number; // in kobo (pesewas)
    currency?: string;
    reference?: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
    subaccount?: string;
    transactionCharge?: number;
    bearer?: 'account' | 'subaccount';
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    try {
      const response = await this.client.post<
        PaystackResponse<{
          authorization_url: string;
          access_code: string;
          reference: string;
        }>
      >('/transaction/initialize', {
        email: params.email,
        amount: params.amount,
        currency: params.currency || 'GHS',
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        subaccount: params.subaccount,
        transaction_charge: params.transactionCharge,
        bearer: params.bearer || 'account', // Platform bears Paystack fees by default
      });

      if (!response.data.status) {
        throw new BadRequestException('Failed to initialize transaction');
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to initialize transaction: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw error;
    }
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await this.client.get<PaystackResponse>(
        `/transaction/verify/${reference}`,
      );

      if (!response.data.status) {
        throw new BadRequestException('Transaction verification failed');
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to verify transaction: ${error.message}`,
        error.stack,
        'PaystackService',
      );
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Get public key for frontend
   */
  getPublicKey(): string {
    return this.publicKey;
  }
}
