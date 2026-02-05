import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements NestLoggerService {
  private logLevel: string;
  private logToFile: boolean;
  private logFilePath: string;

  constructor(private configService: ConfigService) {
    this.logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    this.logToFile = this.configService.get<string>('LOG_TO_FILE') === 'true';
    this.logFilePath = this.configService.get<string>('LOG_FILE_PATH', './logs');

    if (this.logToFile) {
      this.ensureLogDirectory();
    }
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logFilePath)) {
      fs.mkdirSync(this.logFilePath, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} [${level.toUpperCase()}] ${contextStr} ${message}`;
  }

  private writeToFile(message: string) {
    if (!this.logToFile) return;

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logFilePath, `${date}.log`);
    
    fs.appendFileSync(logFile, message + '\n', 'utf8');
  }

  log(message: string, context?: string) {
    const formatted = this.formatMessage('info', message, context);
    console.log(`\x1b[32m${formatted}\x1b[0m`); // Green
    this.writeToFile(formatted);
  }

  error(message: string, trace?: string, context?: string) {
    const formatted = this.formatMessage('error', message, context);
    console.error(`\x1b[31m${formatted}\x1b[0m`); // Red
    if (trace) {
      console.error(`\x1b[31m${trace}\x1b[0m`);
    }
    this.writeToFile(formatted + (trace ? `\n${trace}` : ''));
  }

  warn(message: string, context?: string) {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(`\x1b[33m${formatted}\x1b[0m`); // Yellow
    this.writeToFile(formatted);
  }

  debug(message: string, context?: string) {
    if (this.logLevel !== 'debug') return;
    const formatted = this.formatMessage('debug', message, context);
    console.debug(`\x1b[36m${formatted}\x1b[0m`); // Cyan
    this.writeToFile(formatted);
  }

  verbose(message: string, context?: string) {
    if (this.logLevel !== 'debug' && this.logLevel !== 'verbose') return;
    const formatted = this.formatMessage('verbose', message, context);
    console.log(`\x1b[35m${formatted}\x1b[0m`); // Magenta
    this.writeToFile(formatted);
  }

  /**
   * Security event logging (always write to file)
   */
  security(message: string, context?: string, metadata?: Record<string, any>) {
    const formatted = this.formatMessage('security', message, context);
    console.warn(`\x1b[93m🔒 ${formatted}\x1b[0m`); // Bright yellow
    
    const securityLog = formatted + (metadata ? `\n${JSON.stringify(metadata, null, 2)}` : '');
    this.writeToFile(securityLog);
  }

  /**
   * Audit trail logging (immutable, always write)
   */
  audit(action: string, entity: string, entityId: string, userId?: string, metadata?: Record<string, any>) {
    const auditMessage = {
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      userId,
      metadata,
    };

    const formatted = this.formatMessage('audit', JSON.stringify(auditMessage), 'AuditTrail');
    console.log(`\x1b[94m📋 ${formatted}\x1b[0m`); // Bright blue
    
    // Always write audit logs
    const auditFile = path.join(this.logFilePath, `audit-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(auditFile, JSON.stringify(auditMessage) + '\n', 'utf8');
  }
}
