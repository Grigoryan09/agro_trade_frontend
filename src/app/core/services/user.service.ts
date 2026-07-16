import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../api-paths';
import {
  BaseUserInfo,
  BaseUserInfoResponse,
  ChangePasswordRequest,
  CreateOrganizationRequest,
  OrganizationDetails,
  OrganizationDetailsResponse,
  PassportInfo,
  PassportInfoResponse,
  PassportRequest,
  UpdateOrganizationRequest,
  UpdateUserRequest,
} from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${API.agro}/user`;

  getProfile(): Observable<BaseUserInfo> {
    return this.http.get<BaseUserInfoResponse>(this.base).pipe(map((r) => r.baseUserInfoDto));
  }

  updateProfile(body: UpdateUserRequest): Observable<BaseUserInfo> {
    return this.http
      .put<BaseUserInfoResponse>(this.base, body)
      .pipe(map((r) => r.baseUserInfoDto));
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/change-password`, body);
  }

  // ---- Passport ----
  getPassports(): Observable<PassportInfo[]> {
    return this.http
      .get<PassportInfoResponse>(`${this.base}/passport`)
      .pipe(map((r) => r.passportInfoDto ?? []));
  }

  createPassport(body: PassportRequest): Observable<PassportInfo[]> {
    return this.http
      .post<PassportInfoResponse>(`${this.base}/passport`, body)
      .pipe(map((r) => r.passportInfoDto ?? []));
  }

  updatePassport(body: PassportRequest): Observable<PassportInfo[]> {
    return this.http
      .put<PassportInfoResponse>(`${this.base}/passport`, body)
      .pipe(map((r) => r.passportInfoDto ?? []));
  }

  deletePassport(): Observable<void> {
    return this.http.delete<void>(`${this.base}/passport`);
  }

  // ---- Organizations ----
  getOrganizations(): Observable<OrganizationDetails[]> {
    return this.http
      .get<OrganizationDetailsResponse>(`${this.base}/organizations`)
      .pipe(map((r) => r.organizationDetailsDto ?? []));
  }

  getOrganization(id: number): Observable<OrganizationDetails | undefined> {
    return this.http
      .get<OrganizationDetailsResponse>(`${this.base}/organizations/${id}`)
      .pipe(map((r) => r.organizationDetailsDto?.[0]));
  }

  createOrganization(body: CreateOrganizationRequest): Observable<OrganizationDetails[]> {
    return this.http
      .post<OrganizationDetailsResponse>(`${this.base}/organizations`, body)
      .pipe(map((r) => r.organizationDetailsDto ?? []));
  }

  updateOrganization(
    id: number,
    body: UpdateOrganizationRequest,
  ): Observable<OrganizationDetails[]> {
    return this.http
      .put<OrganizationDetailsResponse>(`${this.base}/organizations/${id}`, body)
      .pipe(map((r) => r.organizationDetailsDto ?? []));
  }

  deleteOrganization(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/organizations/${id}`);
  }
}
