import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expected = process.env.INTERNAL_API_TOKEN || '';
    const providedHeader = request.headers?.['x-internal-token'];
    const provided = Array.isArray(providedHeader) ? providedHeader[0] : providedHeader || '';

    if (!expected) {
      throw new UnauthorizedException('INTERNAL_API_TOKEN is not configured');
    }

    if (!provided || !this.secureEquals(provided, expected)) {
      throw new UnauthorizedException('Invalid internal token');
    }

    return true;
  }

  private secureEquals(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    // Avoid token comparison timing leaks.
    return timingSafeEqual(aBuffer, bBuffer);
  }
}
