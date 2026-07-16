import { OrderStatus } from './enums';
import { BaseUserInfo } from './user.models';

// Backend shape: BuyerDetailsDto/SellerDetailsDto/ManagerDetailsDto each carry a
// role-specific id string + the nested profile under `baseUserInfoDto` (NOT flat).
export interface PartyDetails {
  buyerId?: string;
  sellerId?: string;
  managerId?: string;
  baseUserInfoDto?: BaseUserInfo;
}

// Order's ProductDetailsDto exposes only these two fields (no id/price/category).
export interface ProductDetails {
  productName?: string;
  productType?: string;
}

// @JsonInclude(NON_NULL) — most fields optional.
export interface OrderDetails {
  id?: number;
  buyerDetailsDto?: PartyDetails;
  sellerDetailsDto?: PartyDetails;
  managerDetailsDto?: PartyDetails;
  productDetailsDto?: ProductDetails;
  quantity: number;
  totalPrice: number;
  orderStatus: OrderStatus;
  chatId?: number; // NOTE: not in contract today — see CONTRACT-GAPS #? (auto chat link)
}

export interface CreateOrderRequest {
  sellerId: number;
  productId: number;
  quantity: number;
  price: number;
}

export interface UpdateOrderStatusRequest {
  orderStatus: OrderStatus;
}

export interface OrderDetailsResponse {
  orderDetailsDto: OrderDetails[];
}
