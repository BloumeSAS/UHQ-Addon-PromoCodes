import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

/** Champs d'un code promo (création et modification) — les bornes finales sont ré-appliquées par PromoService.clean(). */
export class CodeDto {
  @IsOptional() @IsString() @MaxLength(60) code?: string;
  @IsOptional() @IsString() @MaxLength(80) label?: string;
  @IsOptional() @IsString() @MaxLength(400) description?: string;
  @IsOptional() @IsIn(['credit', 'topup_bonus', 'discount']) kind?: 'credit' | 'topup_bonus' | 'discount';
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) percent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000) fixed?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000) max_effect?: number;
  @IsOptional() @IsString() @MaxLength(40) starts_at?: string | null;
  @IsOptional() @IsString() @MaxLength(40) expires_at?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) max_uses?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) max_uses_per_user?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) min_amount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) max_amount?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) product_ids?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) exclude_product_ids?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) min_items?: number;
  @IsOptional() @IsBoolean() first_order_only?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) user_ids?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) emails?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) email_domains?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) payment_methods?: string[];
  @IsOptional() @IsString() @MaxLength(400) notes?: string;
}

export class GenerateDto {
  @IsObject() @ValidateNested() @Type(() => CodeDto) template!: CodeDto;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) count!: number;
  @IsOptional() @IsString() @MaxLength(12) prefix?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(6) @Max(16) length?: number;
}

export class RedeemDto {
  @IsString() @MaxLength(60) code!: string;
}

class ItemDto {
  @IsString() @MaxLength(120) product_id!: string;
  @Type(() => Number) @IsNumber() @Min(0) unit_price!: number;
  @Type(() => Number) @IsNumber() @Min(0) quantity!: number;
}

/** Corps des appels internes (Orders / Wallet) — X-Panel-Key obligatoire. */
export class InternalDto {
  @IsString() @MaxLength(60) code!: string;
  @IsString() @MaxLength(120) user_id!: string;
  @IsOptional() @IsString() @MaxLength(254) user_email?: string;
  @IsIn(['redeem', 'topup', 'shop']) context!: 'redeem' | 'topup' | 'shop';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items?: ItemDto[];
  @IsOptional() @IsString() @MaxLength(20) payment_method?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) user_order_count?: number;
  @IsOptional() @IsString() @MaxLength(120) ref?: string;
}

export class ReleaseDto {
  @IsString() @MaxLength(120) ref!: string;
}
