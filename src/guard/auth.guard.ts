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

//*********************************************************************** */

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

//       if (payload.subscription) {
//         req.companyId = payload.sub;
//       } else {
//         req.userId = payload.sub;
//       }

//       req.role = payload.role;
//       req.subscription = payload.subscription;

//       return true;
//     } catch (e) {
//       console.log(e);
//       throw new UnauthorizedException();
//     }
//   }

//   getToken(header: string) {
//     if (!header['authorization']) return;
//     const [type, token] = header['authorization'].split(' ');
//     return type === 'Bearer' ? token : null;
//   }
// }
//**************************************************************** */

// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { CompanyService } from 'src/company/company.service';
// import { Company } from 'src/company/schema/company.schema';
// import { User } from 'src/user/schema/user.schema';
// import { UserModule } from 'src/user/user.module';
// import { UserService } from 'src/user/user.service';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   constructor(
//     private jwtService: JwtService,
//     private userService: UserService,
//     private companyService: CompanyService,

//     // @InjectModel(User.name) private userModel: Model<User>,
//     // @InjectModel(Company.name) private companyModel: Model<Company>,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     try {
//       const req = context.switchToHttp().getRequest();
//       const token = this.getToken(req.headers);
//       if (!token) throw new UnauthorizedException();

//       const payload = await this.jwtService.verifyAsync(token);
//       req.userId = payload.userId;
//       // req.companyId = payload.sub;

//       // const user = await this.userModel.findById(req.userId).exec();

//       // if (!user) {
//       //   throw new UnauthorizedException('User not found');
//       // }

//       // if (user && user.companyId) {
//       //   const company = await this.companyModel.findById(user.companyId).exec();
//       //   if (company) {
//       //     req.subscription = company.subscriptionPlan;
//       //   } else {
//       //     req.subscription = null;
//       //   }
//       // }

//       // req.role = payload.role;
//       return true;
//     } catch (e) {
//       console.error(e);
//       throw new UnauthorizedException('Unauthorized access');
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
