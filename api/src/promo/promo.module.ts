import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { PanelAuthService } from '../auth/panel-auth.service';
import { WalletClient } from './wallet.client';
import { PanelMailClient } from './mail.client';

@Module({
  providers: [StoreService, PanelAuthService, PromoService, WalletClient, PanelMailClient],
  controllers: [PromoController],
  exports: [StoreService, PanelAuthService],
})
export class PromoModule {}
