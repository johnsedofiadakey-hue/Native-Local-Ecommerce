import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/common/services/logger.service';
import axios, { AxiosInstance } from 'axios';

interface HubtelSmsResponse {
  Status: string;
  MessageId: string;
  NetworkId: string;
  Rate: number;
}

@Injectable()
export class HubtelService {
  private readonly client: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly senderId: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.clientId = this.configService.get<string>('HUBTEL_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('HUBTEL_CLIENT_SECRET') || '';
    this.senderId = this.configService.get<string>('HUBTEL_SENDER_ID', 'CommerceGH');

    // Initialize Hubtel API client
    this.client = axios.create({
      baseURL: this.configService.get<string>(
        'HUBTEL_BASE_URL',
        'https://api.hubtel.com/v1',
      ),
      auth: {
        username: this.clientId,
        password: this.clientSecret,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });
  }

  /**
   * Send SMS via Hubtel API
   */
  async sendSms(to: string, message: string): Promise<HubtelSmsResponse> {
    try {
      // Remove + from phone number if present (Hubtel format)
      const formattedPhone = to.replace(/^\+/, '');

      const response = await this.client.post<HubtelSmsResponse>('/messages/send', {
        From: this.senderId,
        To: formattedPhone,
        Content: message,
        RegisteredDelivery: true,
      });

      if (response.data.Status === '0') {
        this.logger.log(`SMS sent successfully to ${to}`, 'HubtelService');
        return response.data;
      } else {
        throw new Error(`Hubtel API returned status: ${response.data.Status}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${to}: ${error.message}`,
        error.stack,
        'HubtelService',
      );

      // In development, log the message instead of failing
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(
          `[DEV MODE] SMS would have been sent to ${to}: ${message}`,
          'HubtelService',
        );
        return {
          Status: '0',
          MessageId: 'dev-mock-id',
          NetworkId: 'dev-network',
          Rate: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Check SMS delivery status
   */
  async checkDeliveryStatus(messageId: string): Promise<any> {
    try {
      const response = await this.client.get(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to check SMS delivery status: ${error.message}`,
        error.stack,
        'HubtelService',
      );
      throw error;
    }
  }

  /**
   * Get account balance (useful for monitoring)
   */
  async getAccountBalance(): Promise<number> {
    try {
      const response = await this.client.get('/account/balance');
      return response.data.Balance;
    } catch (error) {
      this.logger.error(
        `Failed to get Hubtel account balance: ${error.message}`,
        error.stack,
        'HubtelService',
      );
      return 0;
    }
  }
}
