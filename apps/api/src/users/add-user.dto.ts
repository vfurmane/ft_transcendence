import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddUserDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  password!: string | null;
}
