import { Body, Injectable } from '@nestjs/common';
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

  findCompanyWithPassword(query) {
    return this.companyModel.findOne(query).select('+password');
  }

  findOne(query) {
    return this.companyModel.findOne(query);
  }

  async update(id: string | Types.ObjectId, updateCompanyDto: UpdateCompanyDto) {
    return this.companyModel
      .findByIdAndUpdate(
        id,
        { $set: updateCompanyDto },
        { new: true }, 
      )
      .exec();
  }

  //************************** */

  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyModel.create(createCompanyDto);
  }

  getById(id: string) {
    return this.companyModel.findById(id);
  }
}
