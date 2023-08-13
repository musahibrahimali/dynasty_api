import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import { Customer as CustomerModel } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import {comparePassword, generateSalt, getDefaultPropertyValue, hashPassword} from '@common';
import { PrismaService } from '@prisma/prisma.service';
import { CloudinaryService } from '@cloudinary/cloudinary.service';
import {Ctx} from "@common/context";
import {ConfigService} from "@nestjs/config";
import {CreateCustomerInput} from "@customer/dto/customer.input.dto";
import {LoginCustomerInput} from "@customer/dto/login.input.dto";
import {UpdateCustomerInput} from "@customer/dto/update.input.dto";
import {CreateAttendanceInput} from "@employee/dto/attendance.input.dto";
import {CreateCartInput} from "@customer/dto/cart.input.dto";
import {UpdateAttendanceInput} from "@employee/dto/attendance.update.dto";
import {Employee as EmployeeModel} from ".prisma/client";
import {UpdateCartInput} from "@customer/dto/cart.update.dto";

@Injectable()
export class CustomerService {
  constructor(
    private prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) { }

  /// create a customer
  async register(createCustomerInput: CreateCustomerInput, context:Ctx): Promise<CustomerModel> {
    // check if email already exists
    const emailExists = await this.prismaService.customer.findUnique({
      where: { email: createCustomerInput.email },
    });
    if (emailExists) {
      throw new HttpException( 'Email already exists', HttpStatus.CONFLICT);
    }
    if (createCustomerInput.userName == null) {
      createCustomerInput.userName = `${createCustomerInput.firstName}`;
    }
    // generate salt
    createCustomerInput.salt = await generateSalt();
    // hash password , add the hashed password to the dto
    createCustomerInput.password = await hashPassword(
        createCustomerInput.password,
        createCustomerInput.salt,
    );

    // create a new user
    const _customer: CustomerModel = await this.prismaService.customer.create({
      data: createCustomerInput,
      include: {Cart: true}
    });
    // generate a token
    const payload = { sub: _customer.id, username: _customer.email, role: _customer.role };
    const token = await this.jwtService.signAsync(payload);
    /// set cookie
    context.res.cookie('access_token', token, {
      domain: this.configService.get<string>('DOMAIN'),
      httpOnly: true,
    });
    return this.exclude(_customer, ['password', 'salt']);
  }

  // log in customer
  async loginCustomer(loginCustomerDto: LoginCustomerInput, context:Ctx): Promise<CustomerModel> {
    const customer = await this.prismaService.customer.findUnique({
      where: { email: loginCustomerDto.email },
      include: {Cart: true}
    });
    if (!customer) {
      throw new HttpException('No record found for this email', HttpStatus.BAD_REQUEST);
    }
    // compare passwords
    const isPasswordValid = await comparePassword(loginCustomerDto.password, customer.password);
    if (!isPasswordValid) {
      throw new HttpException('Invalid password', HttpStatus.BAD_REQUEST);
    }
    // generate a token
    const payload = { username: customer.email, sub: customer.id, role: customer.role  };
    const token = await this.jwtService.signAsync(payload);
    /// set cookie
    context.res.cookie('access_token', token, {
      domain: this.configService.get<string>('DOMAIN'),
      httpOnly: true,
    });
    return this.exclude(customer, ['password', 'salt']);
  }

  // validate customer
  async validateCustomer(
    loginCustomerDto: LoginCustomerInput,
  ): Promise<CustomerModel> {
    const customer = await this.prismaService.customer.findUnique({
      where: { email: loginCustomerDto.email },
    });
    if (!customer) {
      return undefined;
    }
    // compare passwords
    const isPasswordValid = await comparePassword(loginCustomerDto.password, customer.password);
    if (!isPasswordValid) {
      return null;
    }
    if (!customer) {
      return undefined;
    }
    return customer;
  }

  // get user profile
  async getProfile(id: string): Promise<CustomerModel> {
    // console.log("Customer Id ", id);
    const customer: CustomerModel = await this.prismaService.customer.findUnique({
      where: { id: id },
      include: {Cart: true}
    });
    if (!customer) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return this.exclude(customer, ['password', 'salt']);
  }

  /// get all customers
  async getCustomers(): Promise<CustomerModel[]> {
    const _customers: CustomerModel[] = await this.prismaService.customer.findMany({
        include: {Cart: true}
    });
    _customers.forEach((_customer) =>
      this.exclude(_customer, ['password', 'salt']),
    );
    return _customers;
  }

  // update customer profile
  async updateProfile(
    id: string,
    updateCustomerDto: UpdateCustomerInput,
  ): Promise<CustomerModel> {
    const updated: CustomerModel = await this.prismaService.customer.update({
      where: { id: id },
      data: updateCustomerDto,
    });
    return this.exclude(updated, ['password', 'salt']);
  }

  /// add to cart
  async addToCart(
      id: string,
      cartInput: CreateCartInput,
  ): Promise<CustomerModel> {
    return this.prismaService.customer.update({
      where: { id: id },
      data: {
        Cart: {
          create: cartInput,
        },
      },
      include: {
        Cart: true,
      },
    });
  }

  /// update cart
  async updateCart(
      customerId: string,
      cartId: string,
      updateCartInput: UpdateCartInput,
  ): Promise<CustomerModel> {
    return this.prismaService.customer.update({
      where: { id: customerId },
      data: {
        Cart: {
          update: {
            where: { id: cartId },
            data: updateCartInput,
          },
        },
      },
      include: {
        Cart: true,
      },
    });
  }

  /// update the avatar of customer
  async updateAvatar(id: string, file: Express.Multer.File): Promise<boolean> {
    const _uploadFile = await this.cloudinaryService.uploadFile(
      file,
      'dynasty/customer/avatar',
      `${file.originalname?.split('.')[0]}`,
    );
    const _customer = await this.prismaService.customer.update({
      where: {
        id: id,
      },
      data: {
        avatar: _uploadFile,
      },
    });
    return !!_customer;
  }

  /// delete the customer avatar
  async deleteAvatar(id: string): Promise<boolean> {
    const _customer = await this.prismaService.customer.findUnique({
      where: { id: id },
    });
    if (_customer != null) {
      _customer.avatar =
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    }
    const saved = await this.prismaService.customer.update({
      where: { id: id },
      data: {
        avatar: _customer.avatar,
      },
    });
    return !!saved;
  }

  // delete customer data from database
  async deleteCustomerData(id: string): Promise<boolean> {
    const _customer = await this.prismaService.customer.delete({
      where: { id: id },
    });
    return !!_customer;
  }

  /*
   * ##################################################
   * ######### private methods ########################
   * ##################################################
   * */

  /// validate social user
  // async validateSocialUser(
  //   socialId: string,
  //   user: any,
  // ): Promise<CustomerModel | any> {
  //   // check if user already exists in our db, if not create a new user
  //   const _customer = await this.prismaService.customer.findFirst({
  //     where: { social: socialId },
  //   });
  //   if (!_customer) {
  //     // create a new user
  //     return this.prismaService.customer.create({
  //       data: user,
  //     });
  //   }
  //   return this.exclude(_customer, ['password', 'salt']);
  // }


  /// Exclude keys from user
  private exclude<CustomerModel, Key extends keyof CustomerModel>(
      user: CustomerModel,
      keys: Key[],
  ): CustomerModel {
    for (const key of keys) {
      // Populate the value with a default value of its type
      user[key] = getDefaultPropertyValue(user[key]);
    }
    return user;
  }
}
