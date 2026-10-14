import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../../entities/role.entity';
import { UserEntity } from '../../entities/user.entity';
import { AclService } from './acl.service';
import { PermissionsGuard } from './permissions.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity])],
  providers: [AclService, PermissionsGuard],
  exports: [AclService, PermissionsGuard],
})
export class AclModule {}
