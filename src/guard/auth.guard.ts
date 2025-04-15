import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CompanyService } from 'src/company/company.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private companyService: CompanyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const req = context.switchToHttp().getRequest();
      const token = this.getToken(req.headers);
      if (!token) throw new UnauthorizedException();

      const payload = await this.jwtService.verifyAsync(token);
      req.companyId = payload.sub;
      req.userId = payload.userId;
      req.role = payload.role;
      const company = await this.companyService.getById(req.companyId);
      if (!company) {
        throw new UnauthorizedException('Not found');
      }

      if (company && req.role === 'admin') {
        req.subscription = company.subscriptionPlan;
      } else {
        req.subscription = null;
      }

      return true;
    } catch (e) {
      console.error(e);
      throw new UnauthorizedException('Unauthorized access');
    }
  }

  getToken(header: string) {
    if (!header['authorization']) return;
    const [type, token] = header['authorization'].split(' ');
    return type === 'Bearer' ? token : null;
  }
}
