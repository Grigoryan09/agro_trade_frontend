import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import { PageQuery } from '../models/api.models';
import { pageParams } from '../util/http-params';
import {
  ContractDto,
  ContractsResponse,
  CreateBankingRequest,
  OfferDto,
  OffersResponse,
} from '../models/banking.models';

@Injectable({ providedIn: 'root' })
export class BankingService {
  private http = inject(HttpClient);
  private base = API.banking;

  listOffers(q: PageQuery = {}): Observable<OfferDto[]> {
    return this.http
      .get<OffersResponse>(`${this.base}/offers`, { params: pageParams(q) })
      .pipe(map((r) => r.offersDto ?? []));
  }

  getOffer(id: number): Observable<OfferDto | undefined> {
    return this.http
      .get<OffersResponse>(`${this.base}/offers/${id}`)
      .pipe(map((r) => r.offersDto?.[0]));
  }

  createBankingRequest(body: CreateBankingRequest): Observable<void> {
    return this.http
      .post<unknown>(API.bankingRequests, body)
      .pipe(map(() => undefined));
  }

  listContracts(q: PageQuery = {}): Observable<ContractDto[]> {
    return this.http
      .get<ContractsResponse>(`${this.base}/contracts`, { params: pageParams(q) })
      .pipe(map((r) => r.contracts ?? []));
  }

  getContract(id: number): Observable<ContractDto | undefined> {
    return this.http
      .get<ContractsResponse>(`${this.base}/contracts/${id}`)
      .pipe(map((r) => r.contracts?.[0]));
  }
}
