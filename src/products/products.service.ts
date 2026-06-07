import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, In } from 'typeorm';
import { Product } from './schema/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  FilterProductsQueryDto,
  ProductSortField,
} from './dto/filter-products-query.dto';
import { generateUniqueSlug } from '../common/utils/slug.util';
import { CategoriesService } from '../categories/categories.service';
import { SortOrder } from '../common/dto/pagination-query.dto';

/** Postgres unique violation error code */
const PG_UNIQUE_VIOLATION = '23505';

/** Whitelisted sort column mappings — prevents SQL injection */
const PRODUCT_SORT_COLUMN_MAP: Record<ProductSortField, string> = {
  price: 'product.price',
  rating: 'product.rating',
  createdAt: 'product.createdAt',
  title: 'product.title',
  stock: 'product.stock',
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
  ) {}

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<Product> {
    const result = await this.productRepository.findOne({ where: { id } });
    if (!result) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return result;
  }

  private async findOneBySlugOrFail(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  /** Validate that a category exists (if categoryId provided) */
  private async validateCategory(
    categoryId: string | undefined,
  ): Promise<void> {
    if (categoryId) {
      await this.categoriesService.getById(categoryId);
    }
  }

  /** Wrap a DB save and convert unique-violation errors to ConflictException */
  private async saveWithConflictHandling(product: Product): Promise<Product> {
    try {
      return await this.productRepository.save(product);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code: string }).code ===
          PG_UNIQUE_VIOLATION
      ) {
        const detail = (err as QueryFailedError & { detail?: string }).detail;
        if (detail?.includes('slug')) {
          throw new ConflictException('Product with this slug already exists');
        }
        if (detail?.includes('sku')) {
          throw new ConflictException('Product with this SKU already exists');
        }
        throw new ConflictException('Product already exists');
      }
      throw err;
    }
  }

  /** Parse comma-separated tag string into normalized array */
  private parseTags(tags: string): string[] {
    return tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Build a shared query builder for product listing (admin + public) */
  private buildProductQuery(
    filters: FilterProductsQueryDto,
    publishedOnly = false,
  ) {
    const {
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      minRating,
      tags,
      inStockOnly,
      isPublished,
      availabilityStatus,
      brand,
      onSale,
      minDiscount,
      maxDiscount,
      minWeight,
      maxWeight,
      categoryIds,
      sortBy = ProductSortField.createdAt,
      sortOrder = SortOrder.DESC,
    } = filters;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .select(['product', 'category.id', 'category.name', 'category.slug']);

    if (publishedOnly) {
      qb.where('product.isPublished = :isPublished', { isPublished: true });
    }

    // ── Filters ──────────────────────────────

    if (isPublished !== undefined) {
      qb.andWhere('product.isPublished = :isPublished', { isPublished });
    }

    if (availabilityStatus) {
      qb.andWhere('product.availabilityStatus = :availabilityStatus', {
        availabilityStatus,
      });
    }

    if (search) {
      qb.andWhere(
        '(product.title ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug });
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (minRating !== undefined) {
      qb.andWhere('product.rating >= :minRating', { minRating });
    }

    if (tags) {
      const tagList = this.parseTags(tags);
      if (tagList.length > 0) {
        qb.andWhere(':tags && product.tags', { tags: tagList });
      }
    }

    if (inStockOnly) {
      qb.andWhere('product.stock > 0');
    }

    if (brand) {
      qb.andWhere('product.brand ILIKE :brand', { brand: `%${brand}%` });
    }

    if (onSale) {
      qb.andWhere('product.discountPercentage > 0');
    }

    if (minDiscount !== undefined) {
      qb.andWhere('product.discountPercentage >= :minDiscount', {
        minDiscount,
      });
    }

    if (maxDiscount !== undefined) {
      qb.andWhere('product.discountPercentage <= :maxDiscount', {
        maxDiscount,
      });
    }

    if (minWeight !== undefined) {
      qb.andWhere('product.weight >= :minWeight', { minWeight });
    }

    if (maxWeight !== undefined) {
      qb.andWhere('product.weight <= :maxWeight', { maxWeight });
    }

    if (categoryIds) {
      const ids = categoryIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        qb.andWhere('product.categoryId IN (:...categoryIds)', {
          categoryIds: ids,
        });
      }
    }

    // ── Sort (whitelisted — prevents SQL injection) ──

    const orderByColumn =
      PRODUCT_SORT_COLUMN_MAP[sortBy] ?? 'product.createdAt';
    const orderDirection = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
    qb.orderBy(orderByColumn, orderDirection);

    return qb;
  }

  /** Apply pagination to a query builder and return paginated result */
  private async paginate<T>(
    qb: any,
    page: number,
    limit: number,
  ): Promise<{
    data: T[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);
    return { data, total, page, limit, totalPages };
  }

  // ─────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────

  /**
   * Get product statistics for admin dashboard
   */
  async getStats(): Promise<{
    total: number;
    published: number;
    drafts: number;
    inStock: number;
    outOfStock: number;
    lowStock: number;
    totalInventory: number;
    averagePrice: number;
    totalCategories: number;
  }> {
    const [
      total,
      published,
      drafts,
      inStock,
      outOfStock,
      lowStock,
      inventoryResult,
      priceResult,
      categoryResult,
    ] = await Promise.all([
      this.productRepository.count(),
      this.productRepository.count({ where: { isPublished: true } }),
      this.productRepository.count({ where: { isPublished: false } }),
      this.productRepository.count({
        where: { availabilityStatus: 'In Stock' },
      }),
      this.productRepository.count({
        where: { availabilityStatus: 'Out of Stock' },
      }),
      this.productRepository.count({
        where: { availabilityStatus: 'Low Stock' },
      }),
      this.productRepository
        .createQueryBuilder('product')
        .select('SUM(product.stock)', 'total')
        .getRawOne(),
      this.productRepository
        .createQueryBuilder('product')
        .select('AVG(product.price)', 'average')
        .getRawOne(),
      this.productRepository
        .createQueryBuilder('product')
        .select('COUNT(DISTINCT product.categoryId)', 'count')
        .where('product.categoryId IS NOT NULL')
        .getRawOne(),
    ]);

    return {
      total,
      published,
      drafts,
      inStock,
      outOfStock,
      lowStock,
      totalInventory: parseInt(inventoryResult?.total ?? '0', 10) || 0,
      averagePrice: parseFloat(priceResult?.average ?? '0') || 0,
      totalCategories: parseInt(categoryResult?.count ?? '0', 10) || 0,
    };
  }

  // ─────────────────────────────────────────────
  // Admin CRUD
  // ─────────────────────────────────────────────

  /**
   * Create a new product
   */
  async create(dto: CreateProductDto): Promise<Product> {
    await this.validateCategory(dto.categoryId);

    const slug = dto.slug
      ? dto.slug
      : await generateUniqueSlug(dto.title, this.productRepository);

    const product = this.productRepository.create({
      ...dto,
      slug,
      categoryId: dto.categoryId ?? null,
      stock: dto.stock ?? 0,
      discountPercentage: dto.discountPercentage ?? 0,
      minimumOrderQuantity: dto.minimumOrderQuantity ?? 1,
      availabilityStatus: dto.availabilityStatus ?? 'In Stock',
      tags: dto.tags ?? [],
      images: dto.images ?? [],
      reviews: dto.reviews ?? [],
      isPublished: dto.isPublished ?? false,
    });

    const saved = await this.saveWithConflictHandling(product);
    this.logger.log(`Product created: ${saved.id}`);
    return saved;
  }

  /**
   * Get all products with pagination and filters (admin — includes drafts)
   */
  async getAll(filters: FilterProductsQueryDto): Promise<{
    data: Product[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10 } = filters;
    const qb = this.buildProductQuery(filters, false);
    return this.paginate<Product>(qb, page, limit);
  }

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product> {
    const result = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!result) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return result;
  }

  /**
   * Get product by slug
   */
  async getBySlug(slug: string): Promise<Product> {
    const result = await this.productRepository.findOne({
      where: { slug },
      relations: ['category'],
    });
    if (!result) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return result;
  }

  /**
   * Update a product
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneOrFail(id);

    if (dto.categoryId !== undefined) {
      await this.validateCategory(dto.categoryId);
    }

    // Regenerate slug if title changed and no explicit slug provided
    if (dto.title && dto.title !== product.title && !dto.slug) {
      product.slug = await generateUniqueSlug(
        dto.title,
        this.productRepository,
        {
          excludeId: id,
        },
      );
    }

    // Use repository.merge to properly apply DTO and trigger entity hooks
    this.productRepository.merge(product, dto);

    // Ensure nullable fields are handled
    if (dto.categoryId === null) {
      product.categoryId = null;
    }

    const updated = await this.saveWithConflictHandling(product);
    this.logger.log(`Product updated: ${id}`);
    return updated;
  }

  /**
   * Soft-delete a product
   */
  async delete(id: string): Promise<{ message: string }> {
    const product = await this.findOneOrFail(id);
    await this.productRepository.softRemove(product);
    this.logger.log(`Product soft-deleted: ${id}`);
    return { message: 'Product deleted successfully' };
  }

  /**
   * Toggle product publish status
   */
  async togglePublish(id: string): Promise<{
    id: string;
    isPublished: boolean;
    message: string;
  }> {
    const product = await this.findOneOrFail(id);

    product.isPublished = !product.isPublished;
    await this.productRepository.save(product);

    const action = product.isPublished ? 'published' : 'unpublished';
    this.logger.log(`Product ${action}: ${id}`);

    return {
      id: product.id,
      isPublished: product.isPublished,
      message: `Product ${action} successfully`,
    };
  }

  /**
   * Atomic stock adjustment (e.g., after an order) — uses pessimistic locking
   */
  async adjustStock(id: string, quantity: number): Promise<Product> {
    return this.productRepository.manager.transaction(async (tx) => {
      const product = await tx.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID "${id}" not found`);
      }

      const newStock = product.stock + quantity;
      if (newStock < 0) {
        throw new ConflictException(
          `Insufficient stock. Available: ${product.stock}, Requested: ${Math.abs(quantity)}`,
        );
      }

      product.stock = newStock;
      product.availabilityStatus =
        newStock === 0
          ? 'Out of Stock'
          : newStock <= 10
            ? 'Low Stock'
            : 'In Stock';

      return tx.save(product);
    });
  }

  /**
   * Bulk update stock for multiple products (e.g., after bulk import)
   */
  async bulkUpdateStock(
    updates: { id: string; stock: number }[],
  ): Promise<void> {
    await this.productRepository.manager.transaction(async (tx) => {
      for (const { id, stock } of updates) {
        const availabilityStatus =
          stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'In Stock';
        await tx.update(Product, id, { stock, availabilityStatus });
      }
    });
  }

  // ─────────────────────────────────────────────
  // Public catalog
  // ─────────────────────────────────────────────

  /**
   * Get available filter options for the public catalog sidebar.
   * Returns aggregated metadata (brands, price range, categories, tags, etc.)
   * so the frontend can build dynamic filter controls.
   */
  async getFilterOptions(): Promise<{
    brands: string[];
    categories: {
      id: string;
      name: string;
      slug: string;
      productCount: number;
    }[];
    priceRange: { min: number; max: number };
    discountRange: { min: number; max: number };
    weightRange: { min: number | null; max: number | null };
    ratingRange: { min: number; max: number };
    tags: string[];
    availabilityStatuses: string[];
  }> {
    const publishedQb = this.productRepository
      .createQueryBuilder('product')
      .where('product.isPublished = :isPublished', { isPublished: true });

    const [
      brands,
      categoriesWithCounts,
      priceAgg,
      discountAgg,
      weightAgg,
      ratingAgg,
      tagsResult,
      statusesResult,
    ] = await Promise.all([
      publishedQb
        .clone()
        .select('DISTINCT product.brand')
        .andWhere('product.brand IS NOT NULL')
        .orderBy('product.brand', 'ASC')
        .getRawMany<{ brand: string }>(),
      this.productRepository
        .createQueryBuilder('product')
        .select([
          'category.id',
          'category.name',
          'category.slug',
          'COUNT(product.id) as product_count',
        ])
        .leftJoin('product.category', 'category')
        .where('product.isPublished = :isPublished', { isPublished: true })
        .andWhere('product.categoryId IS NOT NULL')
        .groupBy('category.id')
        .addGroupBy('category.name')
        .addGroupBy('category.slug')
        .orderBy('product_count', 'DESC')
        .getRawMany<{
          category_id: string;
          category_name: string;
          category_slug: string;
          product_count: number;
        }>(),
      publishedQb
        .clone()
        .select('MIN(product.price)', 'min')
        .addSelect('MAX(product.price)', 'max')
        .getRawOne<{ min: number; max: number }>(),
      publishedQb
        .clone()
        .select('MIN(product.discountPercentage)', 'min')
        .addSelect('MAX(product.discountPercentage)', 'max')
        .getRawOne<{ min: number; max: number }>(),
      publishedQb
        .clone()
        .select('MIN(product.weight)', 'min')
        .addSelect('MAX(product.weight)', 'max')
        .getRawOne<{ min: number | null; max: number | null }>(),
      publishedQb
        .clone()
        .select('MIN(product.rating)', 'min')
        .addSelect('MAX(product.rating)', 'max')
        .getRawOne<{ min: number; max: number }>(),
      publishedQb
        .clone()
        .select('DISTINCT UNNEST(product.tags)', 'tag')
        .orderBy('tag', 'ASC')
        .getRawMany<{ tag: string }>(),
      publishedQb
        .clone()
        .select('DISTINCT product.availabilityStatus', 'status')
        .orderBy('product.availabilityStatus', 'ASC')
        .getRawMany<{ status: string }>(),
    ]);

    return {
      brands: brands.map((r) => r.brand),
      categories: categoriesWithCounts.map((r) => ({
        id: r.category_id,
        name: r.category_name,
        slug: r.category_slug,
        productCount: Number(r.product_count),
      })),
      priceRange: {
        min: Number(priceAgg?.min ?? 0),
        max: Number(priceAgg?.max ?? 0),
      },
      discountRange: {
        min: Number(discountAgg?.min ?? 0),
        max: Number(discountAgg?.max ?? 0),
      },
      weightRange: {
        min: weightAgg?.min != null ? Number(weightAgg.min) : null,
        max: weightAgg?.max != null ? Number(weightAgg.max) : null,
      },
      ratingRange: {
        min: Number(ratingAgg?.min ?? 0),
        max: Number(ratingAgg?.max ?? 0),
      },
      tags: tagsResult.map((r) => r.tag),
      availabilityStatuses: statusesResult.map((r) => r.status),
    };
  }

  /**
   * Get public product catalog (only published products)
   */
  async getPublicCatalog(filters: FilterProductsQueryDto): Promise<{
    data: Product[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10 } = filters;
    const qb = this.buildProductQuery(filters, true);
    return this.paginate<Product>(qb, page, limit);
  }

  /**
   * Get products by category slug (public)
   */
  async getByCategorySlug(
    categorySlug: string,
    filters: FilterProductsQueryDto,
  ): Promise<{
    data: Product[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    // Verify category exists
    await this.categoriesService.getBySlug(categorySlug);

    return this.getPublicCatalog({
      ...filters,
      categorySlug,
    });
  }
}
