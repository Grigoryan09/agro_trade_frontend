import { OrganizationDetails } from './user.models';
import { Media } from './media.models';

export interface SellerInfo {
  sellerId: string;
  sellerName: string;
  organization: OrganizationDetails | null;
}

export interface ProductInfo {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  status: string;
  sellerInfoDto: SellerInfo;
  createdAt: string;
  media?: Media[];
}

export interface CreateProductRequest {
  name: string; // 3..150
  description: string; // <=2000
  price: number; // >=0.01
  category: string;
}

export interface UpdateProductRequest {
  name: string;
  description: string;
  price: number;
}

export interface ProductInfoResponse {
  productInfoDto: ProductInfo[];
}
