import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Auth Guard - For username/password authentication
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
