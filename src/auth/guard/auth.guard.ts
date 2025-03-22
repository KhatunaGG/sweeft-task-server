// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   constructor(private jwtService: JwtService) {}
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     try {
//       const req = context.switchToHttp().getRequest();
//       const token = this.getToken(req.headers);
//       if (!token) throw new UnauthorizedException();
//       const payload = await this.jwtService.verifyAsync(token);
//       // req.userId = payload.sub;
//       req.companyId = payload.sub;
//       req.subscription = payload.subscription;

      
//       req.role = payload.role;
//       req.userId = payload.userId;

//       return true;
//     } catch (e) {
//       console.log(e);
//     }
//   }

//   getToken(header: string) {
//     if (!header['authorization']) return;
//     const [type, token] = header['authorization'].split(' ');
//     return type === 'Bearer' ? token : null;
//   }
// }




import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const req = context.switchToHttp().getRequest();
      const token = this.getToken(req.headers);
      if (!token) throw new UnauthorizedException();
  
      const payload = await this.jwtService.verifyAsync(token);
      
      // Check if it's a company or user and assign the appropriate ID
      if (payload.subscription) {
        req.companyId = payload.sub;  // If there is a subscription, it's a company
      } else {
        req.userId = payload.sub;  // If there is no subscription, it's a user
      }
  
      req.role = payload.role;
      req.subscription = payload.subscription; // Optional, depending on your needs
  
      return true;
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException();
    }
  }
  

  getToken(header: string) {
    if (!header['authorization']) return;
    const [type, token] = header['authorization'].split(' ');
    return type === 'Bearer' ? token : null;
  }
}

