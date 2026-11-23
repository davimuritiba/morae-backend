import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  NotFoundException,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginThrottlerGuard } from '../guards/login-throttler.guard.js';
import { GoogleOAuthService } from '../../../infra/services/google-oauth.service.js';
import { ExchangeGoogleLoginCodeDto } from '../dtos/exchange-google-login-code.dto.js';

const OAUTH_ATTEMPTS = { default: { limit: 10, ttl: 15 * 60 * 1000 } };
const STATE_COOKIE = 'morae.google-oauth-state';

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const value = cookies
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value;
}

@Controller('auth/google')
@UseGuards(LoginThrottlerGuard)
@Throttle(OAUTH_ATTEMPTS)
export class GoogleOAuthController {
  constructor(private readonly google: GoogleOAuthService) {}

  @Get()
  async start(@Res() response: Response): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const authorization = await this.google.createAuthorizationUrl();
      response.cookie(STATE_COOKIE, authorization.state, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/auth/google/callback',
        maxAge: 10 * 60 * 1000,
      });
      response.redirect(302, authorization.authorizationUrl);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        response.redirect(302, this.loginUrl('unavailable'));
        return;
      }
      throw error;
    }
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    response.clearCookie(STATE_COOKIE, {
      path: '/auth/google/callback',
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
    });
    if (!state || readCookie(request, STATE_COOKIE) !== state) {
      response.redirect(302, this.loginUrl('failed'));
      return;
    }
    if (providerError) {
      response.redirect(302, this.loginUrl('cancelled'));
      return;
    }

    try {
      const login = await this.google.completeAuthorization(
        code ?? '',
        state ?? '',
      );
      const fragment = new URLSearchParams({
        oauth: 'google',
        code: login.code,
      });
      response.redirect(
        302,
        `${this.google.frontendUrl()}/login#${fragment.toString()}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        response.redirect(302, this.loginUrl('register'));
        return;
      }
      if (error instanceof ForbiddenException) {
        response.redirect(302, this.loginUrl('inactive'));
        return;
      }
      if (error instanceof ConflictException) {
        response.redirect(302, this.loginUrl('linked'));
        return;
      }
      if (error instanceof ServiceUnavailableException) {
        response.redirect(302, this.loginUrl('unavailable'));
        return;
      }
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        response.redirect(302, this.loginUrl('failed'));
        return;
      }
      throw error;
    }
  }

  @Post('exchange')
  @HttpCode(200)
  exchangeLoginCode(@Body() body: ExchangeGoogleLoginCodeDto) {
    return this.google.exchangeLoginCode(body.code);
  }

  private loginUrl(result: string): string {
    const url = new URL(`${this.google.frontendUrl()}/login`);
    url.searchParams.set('oauth', result);
    return url.toString();
  }
}
