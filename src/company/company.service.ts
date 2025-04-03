import { Body, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company } from './schema/company.schema';
import { CreateCompanyDto } from './dto/create.company.dto';
import { UpdateCompanyDto } from './dto/update.company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<Company>,
  ) {}

  findAll() {
    return this.companyModel.find();
  }

  findOne(query) {
    return this.companyModel.findOne(query);
  }

  async update(
    id: string | Types.ObjectId,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyModel
      .findByIdAndUpdate(id, { $set: updateCompanyDto }, { new: true })
      .exec();
  }

  getById(id: string | Types.ObjectId) {
    return this.companyModel.findById(id);
  }

  findCompanyWithPassword(query) {
    return this.companyModel.findOne(query).select('+password');
  }

  async updateCompany(
    id: string | Types.ObjectId,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    try {
      return await this.companyModel.findByIdAndUpdate(id, updateCompanyDto, {
        new: true,
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findById(id: Types.ObjectId | string) {
    console.log(id, 'id from companyService');
    try {
      if (!id) throw new NotFoundException('Company not found');
      return await this.companyModel.findById(id);
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  //************************** */

  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyModel.create(createCompanyDto);
  }

  // getById(id: string) {
  //   return this.companyModel.findById(id);
  // }
}
