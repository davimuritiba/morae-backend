import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { AddFavoriteUseCase } from '../../../application/use-cases/add-favorite/add-favorite.use-case.js';
import { ListFavoritesUseCase } from '../../../application/use-cases/list-favorites/list-favorites.use-case.js';
import { RemoveFavoriteUseCase } from '../../../application/use-cases/remove-favorite/remove-favorite.use-case.js';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(
    private readonly listFavorites: ListFavoritesUseCase,
    private readonly addFavorite: AddFavoriteUseCase,
    private readonly removeFavorite: RemoveFavoriteUseCase,
  ) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.listFavorites.execute({ userId });
  }

  @Put(':listingId')
  add(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.addFavorite.execute({ userId, listingId });
  }

  @Delete(':listingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<void> {
    return this.removeFavorite.execute({ userId, listingId });
  }
}
