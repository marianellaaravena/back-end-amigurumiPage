import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserService } from '../users/user.service';
import { EmailService } from '../common/email/email.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Buscar usuario por email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar si está activo
    if (!user.isActive) {
      throw new UnauthorizedException('User is deactivated');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Registrar el login
    user.recordLogin();
    await this.userService.updateUserEntity(user);

    // Generar token JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const userResponse = new UserResponseDto(user);
    return new AuthResponseDto(accessToken, userResponse);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.verifyEmail();
    await this.userService.updateUserEntity(user);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generar nuevo token
    const token = randomBytes(32).toString('hex');
    user.setEmailVerificationToken(token);
    await this.userService.updateUserEntity(user);

    // Enviar email
    await this.emailService.sendVerificationEmail(
      user.email,
      `${user.name}${user.lastName}`,
      token,
    );

    return { message: 'Verification email sent successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // No revelamos si el usuario existe por seguridad
      return { message: 'If your email is registered, you will receive a password reset link' };
    }

    // Generar token de restablecimiento
    const token = randomBytes(32).toString('hex');
    user.setPasswordResetToken(token);
    await this.userService.updateUserEntity(user);

    // Enviar email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      `${user.name}${user.lastName}`,
      token,
    );

    return { message: 'If your email is registered, you will receive a password reset link' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.clearPasswordResetToken();
    await this.userService.updateUserEntity(user);

    return { message: 'Password reset successfully' };
  }
}