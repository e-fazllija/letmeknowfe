import { Injectable } from '@nestjs/common';
import { PrismaPublicService } from '../prisma-public.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaPublicService) {}

  create(data: CreateClientDto) {
    return this.prisma.client.create({ data });
  }

  findAll() {
    return this.prisma.client.findMany({ include: { subscriptions: true } });
  }
}
 