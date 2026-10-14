import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '管理员用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: '密码', example: 'luotianyi2026' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(72)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: '用户名（3~50 位）', example: 'luotianyi_fan' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少 3 位' })
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: '密码（至少 6 位）' })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(72)
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '原密码' })
  @IsString()
  @IsNotEmpty({ message: '原密码不能为空' })
  currentPassword: string;

  @ApiProperty({ description: '新密码', minLength: 6 })
  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  @MaxLength(72)
  newPassword: string;
}
