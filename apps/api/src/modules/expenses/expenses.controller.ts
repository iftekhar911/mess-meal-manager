import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { RecordShoppingExpenseDto, RecordFuelExpenseDto } from './dto/expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentMembership } from '../../common/decorators/current-mess.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserDto, MembershipDto, MembershipRole, ShoppingExpenseDto } from '@mess/shared';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('messes/:messId/expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post('shopping')
  @ApiOperation({ summary: 'Record market shopping expense with receipts (Shopper)' })
  async recordShoppingExpense(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentMembership() membership: MembershipDto,
    @Body() dto: RecordShoppingExpenseDto
  ): Promise<ShoppingExpenseDto> {
    return this.expensesService.recordShoppingExpense(messId, membership.id, dto);
  }

  @Post('shopping/:expenseId/approve')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Approve shopper expense making it public (Manager only)' })
  async approveShoppingExpense(
    @Param('messId', ParseUUIDPipe) messId: string,
    @CurrentUser() user: UserDto,
    @Param('expenseId', ParseUUIDPipe) expenseId: string
  ): Promise<ShoppingExpenseDto> {
    return this.expensesService.approveShoppingExpense(messId, user.id, expenseId);
  }

  @Post('fuel')
  @Roles(MembershipRole.MANAGER)
  @ApiOperation({ summary: 'Record fuel/gas cylinder expense (Manager only)' })
  async recordFuelExpense(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Body() dto: RecordFuelExpenseDto
  ) {
    return this.expensesService.recordFuelExpense(messId, dto);
  }

  @Get('shopping')
  @ApiOperation({ summary: 'List approved shopping expenses (Public to mess members)' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async listShoppingExpenses(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('month') month: string
  ): Promise<ShoppingExpenseDto[]> {
    return this.expensesService.listApprovedShoppingExpenses(messId, month);
  }

  @Get('fuel')
  @ApiOperation({ summary: 'List fuel expenses (Public to mess members)' })
  @ApiQuery({ name: 'month', required: true, example: '2026-11' })
  async listFuelExpenses(
    @Param('messId', ParseUUIDPipe) messId: string,
    @Query('month') month: string
  ) {
    return this.expensesService.listFuelExpenses(messId, month);
  }
}
