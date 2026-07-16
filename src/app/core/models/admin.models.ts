import { Role } from './enums';
import { BaseUserInfo } from './user.models';

/** Admin-only user view (adds id, roles, active to the base profile). */
export interface UserForAdmin extends BaseUserInfo {
  id: number;
  roles: Role[];
  active: boolean;
}

export interface UpdateUserRolesRequest {
  roles: Role[]; // NotEmpty — at least one role
}

export interface UpdateUserStatusRequest {
  active: boolean; // NotNull
}

// ---- Response wrappers (every payload wraps the DTO; lists & singles are arrays) ----
export interface UserForAdminResponse {
  userForAdminDto: UserForAdmin[];
}