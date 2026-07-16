import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { EmailService } from '../common/email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  // Modificar el método create existente
async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
  // Verificar si el email ya existe
  const existingUser = await this.userRepository.findOne({
    where: { email: createUserDto.email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictException(`User with email${createUserDto.email} already exists`);
  }

  // Hashear la contraseña
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

  // Crear el usuario
  const user = User.create(
    createUserDto.name,
    createUserDto.lastName,
    createUserDto.email.toLowerCase(),
    hashedPassword,
    createUserDto.role || UserRole.EMPLOYEE,
  );

  // Generar token de verificación
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.setEmailVerificationToken(verificationToken);

  const savedUser = await this.userRepository.save(user);

  // Enviar email de verificación
  try {
    await this.emailService.sendVerificationEmail(
      savedUser.email,
      `${savedUser.name}${savedUser.lastName}`,
      verificationToken,
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    // No lanzamos error para no interrumpir la creación del usuario
  }

  return new UserResponseDto(savedUser);
}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(user => new UserResponseDto(user));
  }

  async findAdmins(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      where: { role: UserRole.ADMIN },
      order: { name: 'ASC' },
    });
    return users.map(user => new UserResponseDto(user));
  }

  async findEmployees(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      where: { role: UserRole.EMPLOYEE },
      order: { name: 'ASC' },
    });
    return users.map(user => new UserResponseDto(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID${id} not found`);
    }

    return new UserResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID${id} not found`);
    }

    // Actualizar email si se proporcionó y es diferente
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email.toLowerCase() },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`Email${updateUserDto.email} is already in use`);
      }

      user.updateEmail(updateUserDto.email);
    }

    // Actualizar nombre y apellido
    if (updateUserDto.name || updateUserDto.lastName) {
      const name = updateUserDto.name || user.name;
      const lastName = updateUserDto.lastName || user.lastName;
      user.updateProfile(name, lastName);
    }

    const updatedUser = await this.userRepository.save(user);
    return new UserResponseDto(updatedUser);
  }

  async deactivate(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID${id} not found`);
    }

    user.deactivate();
    await this.userRepository.save(user);
  }

  async activate(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID${id} not found`);
    }

    user.activate();
    await this.userRepository.save(user);
  }

  async resendWelcomeEmail(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID${id} not found`);
    }

    try {
      // Enviar email de bienvenida (sin la contraseña porque no la tenemos)
      await this.emailService.sendWelcomeEmail(
        user.email,
        `${user.name}${user.lastName}`,
      );
    } catch (error) {
      throw new BadRequestException('Error sending email. Please check email configuration.');
    }
  }

  async delete(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID${id} not found`);
    }

    // No permitir eliminar al último admin
    if (user.role === UserRole.ADMIN) {
      const admins = await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      });

      if (admins === 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    await this.userRepository.remove(user);
  }

  // Agregar estos métodos al final de la clase UserService

async findByVerificationToken(token: string): Promise<User | null> {
  const user = await this.userRepository.findOne({
    where: {
      emailVerificationToken: token,
    },
  });

  if (!user) {
    return null;
  }

  // Verificar si el token expiró
  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    return null;
  }

  return user;
}

async findByPasswordResetToken(token: string): Promise<User | null> {
  const user = await this.userRepository.findOne({
    where: {
      passwordResetToken: token,
    },
  });

  if (!user) {
    return null;
  }

  // Verificar si el token expiró
  if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
    return null;
  }

  return user;
}

async updateUserEntity(user: User): Promise<void> {
  await this.userRepository.save(user);
}

}