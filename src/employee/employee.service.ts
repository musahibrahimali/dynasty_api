import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CloudinaryService } from '@cloudinary/cloudinary.service';
import {
  Employee as EmployeeModel,
  Attendance as AttendanceModel,
} from '@prisma/client';
import {CreateEmployeeInput} from "@employee/dto/employee.input.dto";
import {UpdateEmployeeInput} from "@employee/dto/update.input.dto";
import {CreateAttendanceInput} from "@employee/dto/attendance.input.dto";
import {UpdateAttendanceInput} from "@employee/dto/attendance.update.dto";

@Injectable()
export class EmployeeService {
  constructor(
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) { }

  async createEmployee(
    employeeInput: CreateEmployeeInput,
    file?: Express.Multer.File,
  ): Promise<EmployeeModel> {
    const _employee : EmployeeModel = await this.prismaService.employee.create({
      data: employeeInput,
    });
    if (file != null) {
      await this.updateEmployeeAvatar(_employee.id, file);
    }
    return _employee;
  }

  /// update the avatar of customer
  async updateEmployeeAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<boolean> {
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
  async deleteEmployeeAvatar(id: string): Promise<boolean> {
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

  /// get all employees
  async getEmployees(): Promise<Array<EmployeeModel>> {
    return this.prismaService.employee.findMany({
      include: {
        attendance: true,
      },
    });
  }

  async updateEmployee(
    id: string,
    updateEmployeeInput: UpdateEmployeeInput,
  ): Promise<EmployeeModel> {
    return this.prismaService.employee.update({
      where: { id: id },
      data: updateEmployeeInput,
    });
  }

  async getEmployeeById(id: string): Promise<EmployeeModel> {
    return this.prismaService.employee.findUnique({
      where: { id: id },
      include: {
        attendance: true,
      },
    });
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const _deleted = await this.prismaService.employee.delete({
      where: { id: id },
    });
    return !!_deleted;
  }

  // Attendance
  async clockIn(
    id: string,
    attendanceInput: CreateAttendanceInput,
  ): Promise<EmployeeModel> {
    return this.prismaService.employee.update({
      where: { id: id },
      data: {
        attendance: {
          create: attendanceInput,
        },
      },
      include: {
        attendance: true,
      },
    });
  }

  async clockOut(
    employeeId: string,
    attendanceId: string,
    updateAttendanceInput: UpdateAttendanceInput,
  ): Promise<EmployeeModel> {
    return this.prismaService.employee.update({
      where: { id: employeeId },
      data: {
        attendance: {
          update: {
            where: { id: attendanceId },
            data: updateAttendanceInput,
          },
        },
      },
      include: {
        attendance: true,
      },
    });
  }

  // get all attendance
  async getAttendance(): Promise<Array<AttendanceModel>> {
    const _attendance = await this.prismaService.attendance.findMany({
      include: {
        employee: true,
      },
    });
    if (_attendance == null) {
      return undefined
    }
    return _attendance;
  }

  async getAttendanceById(id: string): Promise<AttendanceModel> {
    return this.prismaService.attendance.findUnique({
      where: { id: id },
      include: {
        employee: true,
      },
    });
  }
}
