import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Sale } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { CreateSaleDto } from './dto/sale.dto';

@Injectable()
export class SaleService {
    constructor(
        private prismaService: PrismaService,
    ) { }

    /**
     * Create a new sale
     * @param createSaleDto - sale data to be created
     * @returns Sale
     */
    async createSale(
        createSaleDto: CreateSaleDto,
    ): Promise<Sale> {
        const _saleDto = createSaleDto;
        // make sure the amount is a floating point number and the quantity is an integer
        _saleDto.amount = parseFloat(_saleDto.amount.toString());
        _saleDto.quantity = parseInt(_saleDto.quantity.toString(), 10);

        return await this.prismaService.sale.create({
            data: _saleDto,
        });
    }

    /**
     * Get all 
     * @returns List<Sale>
     */
    async getSales(): Promise<Array<Sale>> {
        return await this.prismaService.sale.findMany();
    }

    /**
     * Get a sale by id
     * @param id - sale id
     * @returns Sale
     */
    async getSaleById(id: string): Promise<Sale> {
        if (!id) {
            throw new HttpException('Sale id is required', HttpStatus.BAD_REQUEST);
        }
        const _sale = await this.prismaService.sale.findUnique({
            where: { id: id },
        });

        if (!_sale) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }
        return _sale;
    }

    /**
     * Get sales by employee id
     * @param employeeId - employee id
     * @returns List<Sale>
     */
    async getSalesByEmployeeId(employeeId: string): Promise<Array<Sale>> {
        if (!employeeId) {
            throw new HttpException('Employee Id required', HttpStatus.BAD_REQUEST);
        }
        const _sales = await this.prismaService.sale.findMany({
            where: { employeeId: employeeId },
        });
        if (!_sales) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }
        return _sales;
    }

    /**
     * Get sales by product id
     * @param productId - product id
     * @returns List<Sale>
     */
    async getSalesByProductId(productId: string): Promise<Array<Sale>> {
        if (!productId) {
            throw new HttpException('Product Id required', HttpStatus.BAD_REQUEST);
        }
        const _sales = await this.prismaService.sale.findMany({
            where: { productId: productId },
        });
        if (!_sales) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }
        return _sales;
    }


    /**
     * Update a sale
     * @param id - sale id
     * @param updateSaleDto - sale data to be updated
     * @returns Sale
     */
    async updateSale(
        id: string,
        updateSaleDto: CreateSaleDto,
    ): Promise<Sale> {
        if (!id) {
            throw new HttpException('Product Id required', HttpStatus.BAD_REQUEST);
        }
        const _saleDto = updateSaleDto;
        // make sure the amount is a floating point number and the quantity is an integer
        _saleDto.amount = parseFloat(_saleDto.amount.toString());
        _saleDto.quantity = parseInt(_saleDto.quantity.toString(), 10);

        const _sale = await this.prismaService.sale.findUnique({
            where: { id: id },
        });

        if (!_sale) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }

        return await this.prismaService.sale.update({
            where: { id: id },
            data: _saleDto,
        });
    }

    /**
     * Delete a sale
     * @param id - sale id
     * @returns true if deleted, false if not
     */
    async deleteSale(id: string): Promise<boolean> {
        if (!id) {
            throw new HttpException('Sale Id required', HttpStatus.BAD_REQUEST);
        }

        const _sale = await this.prismaService.sale.findUnique({
            where: { id: id },
        });

        if (!_sale) {
            throw new HttpException('Sale not found', HttpStatus.NOT_FOUND);
        }

        const response = await this.prismaService.sale.delete({
            where: { id: id },
        });
        return !!response;
    }
}
