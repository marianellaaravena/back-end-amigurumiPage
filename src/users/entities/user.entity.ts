import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Column({ unique: true, length: 150 })
  email!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires!: Date | null;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Lógica de negocio
  updateProfile(name: string, lastName: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (!lastName || lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    this.name = name.trim();
    this.lastName = lastName.trim();
  }

  updateEmail(email: string): void {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    this.email = email.toLowerCase().trim();
    this.emailVerified = false;
    this.emailVerificationToken = null;
    this.emailVerificationExpires = null;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  verifyEmail(): void {
    this.emailVerified = true;
    this.emailVerificationToken = null;
    this.emailVerificationExpires = null;
  }

  setEmailVerificationToken(token: string, expiresInHours: number = 24): void {
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date();
    this.emailVerificationExpires.setHours(this.emailVerificationExpires.getHours() + expiresInHours);
  }

  setPasswordResetToken(token: string, expiresInHours: number = 1): void {
    this.passwordResetToken = token;
    this.passwordResetExpires = new Date();
    this.passwordResetExpires.setHours(this.passwordResetExpires.getHours() + expiresInHours);
  }

  clearPasswordResetToken(): void {
    this.passwordResetToken = null;
    this.passwordResetExpires = null;
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  static create(
    name: string,
    lastName: string,
    email: string,
    hashedPassword: string,
    role: UserRole = UserRole.EMPLOYEE,
  ): User {
    const user = new User();
    user.updateProfile(name, lastName);
    user.updateEmail(email);
    user.password = hashedPassword;
    user.role = role;
    user.isActive = true;
    user.emailVerified = false;
    return user;
  }
}