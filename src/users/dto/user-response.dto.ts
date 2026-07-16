import { User, UserRole } from '../entities/user.entity';

export class UserResponseDto {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.emailVerified = user.emailVerified;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}