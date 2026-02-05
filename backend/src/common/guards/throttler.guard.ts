import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that works behind proxies (AWS ALB, Cloudflare, etc.)
 * Extracts real IP from X-Forwarded-For header
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Get real IP from proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, use the first one
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    // Fallback to connection IP
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}
