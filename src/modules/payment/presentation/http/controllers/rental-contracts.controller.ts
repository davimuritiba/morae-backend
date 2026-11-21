import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { PaymentFlowService } from '../../../application/payment-flow.service.js';
import { CreateRentalContractDto } from '../dtos/create-rental-contract.dto.js';

@Controller('rental-contracts')
@UseGuards(JwtAuthGuard)
export class RentalContractsController {
  constructor(private readonly paymentFlow: PaymentFlowService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.paymentFlow.listContracts(request.user.userId);
  }

  @Get('listings')
  listOwnedListings(@Req() request: AuthenticatedRequest) {
    return this.paymentFlow.listOwnedListings(request.user.userId);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateRentalContractDto,
  ) {
    return this.paymentFlow.createContract(request.user.userId, body);
  }

  @Post(':id/accept')
  accept(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) contractId: string,
  ) {
    return this.paymentFlow.acceptContract(request.user.userId, contractId);
  }

  @Post(':id/reject')
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) contractId: string,
  ) {
    return this.paymentFlow.rejectContract(request.user.userId, contractId);
  }

  @Post(':id/terminate')
  terminate(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) contractId: string,
  ) {
    return this.paymentFlow.terminateContract(request.user.userId, contractId);
  }
}
