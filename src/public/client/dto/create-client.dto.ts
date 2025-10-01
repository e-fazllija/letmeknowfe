import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  companyName!: string;

  @ApiProperty()
  @IsEmail()
  contactEmail!: string;

  @ApiProperty()
  @IsString()
  employeeRange!: string;
}

 