import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department } from './schemas/department.schema';
import { Material } from './schemas/material.schema';
import { CacheService, ErrorHandlerService } from '@railji/shared';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);
  private readonly DEPARTMENTS_CACHE_KEY = 'all_departments';
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<Department>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly cacheService: CacheService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async fetchAllDepartments(query?: any): Promise<Department[]> {
    try {
      const cacheKey = `${this.DEPARTMENTS_CACHE_KEY}`;

      // Check cache first
      const cached = this.cacheService.get<Department[]>(cacheKey);

      if (cached) {
        this.logger.debug('Returning cached departments data');
        return cached;
      }

      // Fetch from database
      const departments = await this.departmentModel
        .find(query || {})
        .sort({ departmentId: 1 })
        .exec();

      if (!departments || departments.length === 0) {
        throw new NotFoundException('No departments found');
      }

      // Cache the result
      this.cacheService.set(cacheKey, departments, this.CACHE_TTL);
      this.logger.debug(
        `Cached departments data with ${departments.length} departments`,
      );

      this.logger.log(`Found ${departments.length} departments`);
      return departments;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'DepartmentsService.fetchAllDepartments',
      });
    }
  }

  async fetchMaterialsByDepartment(
    departmentId: string,
    query?: any,
  ): Promise<Material[]> {
    try {
      const cacheKey = `materials_${departmentId}`;

      // Check cache first
      const cached = this.cacheService.get<Material[]>(cacheKey);

      if (cached) {
        this.logger.debug(
          `Returning cached materials data for department ${departmentId}`,
        );
        return cached;
      }

      // Build filter query
      const filter = { departmentId, isActive: true, ...query };

      // Fetch from database
      const materials = await this.materialModel.find(filter).exec();

      if (!materials || materials.length === 0) {
        throw new NotFoundException(
          `No materials found for department ${departmentId}`,
        );
      }

      // Cache the result
      this.cacheService.set(cacheKey, materials, this.CACHE_TTL);
      this.logger.debug(
        `Cached materials data for department ${departmentId} with ${materials.length} materials`,
      );

      this.logger.log(
        `Found ${materials.length} materials for department ${departmentId}`,
      );
      return materials;
    } catch (error) {
      this.errorHandler.handle(error, {
        context: 'DepartmentsService.fetchMaterialsByDepartment',
      });
    }
  }
}
