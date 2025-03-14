import { Body, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from './schema/company.schema';
import { CreateCompanyDto } from './dto/create.company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<Company>,
  ) {}

  findAll() {
    return this.companyModel.find();
  }

  findCompanyWithPassword(query) {
    return this.companyModel.findOne(query).select("+password")
  }


  findOne(query) {
    return this.companyModel.findOne(query);
  }





  //************************** */

  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyModel.create(createCompanyDto);
  }

  getById(id: string) {
    return this.companyModel.findById(id);
  }


}
