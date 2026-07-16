import { DocumentStatus, OfferType, TermUnit } from './enums';

export interface BankDto {
  id: number;
  bankName: string;
  phoneNumber: string;
  licenseNumber: string;
}

export interface OfferDto {
  id: number;
  bankDto: BankDto;
  offerType: OfferType;
  interestRate: number;
  maxDurationMonths: number;
  minAmount: number;
}

export interface ProductDetailsDto {
  productName: string;
  productType: string;
}

export interface CreateBankingRequest {
  bankingRequestType: OfferType;
  offerId: number;
  purpose?: string;
  approvedAmount: number;
  tenor: number;
  termUnit: TermUnit;
  productName?: string;
  productType?: string;
}

export interface ContractDto {
  id: number;
  offerType?: OfferType;
  approvedAmount: number;
  tenor?: number;
  tenorUnit?: TermUnit;
  productDetailsDto?: ProductDetailsDto;
  documentStatus?: DocumentStatus;
  documentUrl?: string | null;
  createdAt?: string;
}

// Banking wrappers: lists under `offersDto` / `contracts`; by-id returns a single-element array.
export interface OffersResponse {
  offersDto: OfferDto[];
}
export interface ContractsResponse {
  contracts: ContractDto[];
}
