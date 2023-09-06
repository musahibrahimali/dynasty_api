import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import {EmployeeController} from "./employee.controller";

@Module({
  imports: [
  ],
  providers: [EmployeeService],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
