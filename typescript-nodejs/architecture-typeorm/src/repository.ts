import { Repository as CoreRepository } from '@architecture/core';
import { AggregateRoot } from '@architecture/core';
import { Maybe, Result } from '@architecture/core';
import { Repository, DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

/**
 * TypeORM-based repository implementation that bridges the core Repository interface
 * with TypeORM's Repository for domain aggregates.
 */
export abstract class TypeOrmRepositoryBase<
  TAggregate extends AggregateRoot<TId>,
  TId,
  TEntity extends ObjectLiteral = any
> implements CoreRepository<TAggregate, TId> {

  protected readonly repository: Repository<TEntity>;

  constructor(
    dataSource: DataSource,
    entityTarget: EntityTarget<TEntity>,
    protected readonly aggregateToEntity: (aggregate: TAggregate) => TEntity,
    protected readonly entityToAggregate: (entity: TEntity) => TAggregate,
    protected readonly idToKey: (id: TId) => any
  ) {
    this.repository = dataSource.getRepository(entityTarget);
  }

  async getByIdAsync(id: TId): Promise<Maybe<TAggregate>> {
    try {
      const key = this.idToKey(id);
      const entity = await this.repository.findOne({ where: { id: key } as any });

      if (!entity) {
        return Maybe.none<TAggregate>();
      }

      const aggregate = this.entityToAggregate(entity);
      return Maybe.some(aggregate);
    } catch (error) {
      // Log error if needed
      return Maybe.none<TAggregate>();
    }
  }

  async addAsync(aggregate: TAggregate): Promise<Result<void>> {
    try {
      const entity = this.aggregateToEntity(aggregate);
      await this.repository.save(entity);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new Error(`Failed to add aggregate: ${error.message}`));
    }
  }

  async updateAsync(aggregate: TAggregate): Promise<Result<void>> {
    try {
      const entity = this.aggregateToEntity(aggregate);
      const result = await this.repository.save(entity);

      if (!result) {
        return Result.fail(new Error('Update operation failed'));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new Error(`Failed to update aggregate: ${error.message}`));
    }
  }

  async deleteAsync(id: TId): Promise<Result<void>> {
    try {
      const key = this.idToKey(id);
      await this.repository.delete({ id: key } as any);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new Error(`Failed to delete aggregate: ${error.message}`));
    }
  }

  async existsAsync(id: TId): Promise<Result<boolean>> {
    try {
      const key = this.idToKey(id);
      const count = await this.repository.count({ where: { id: key } as any });
      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(new Error(`Failed to check existence: ${error.message}`));
    }
  }

  /**
   * Provides access to the underlying TypeORM repository for advanced operations
   */
  protected getTypeOrmRepository(): Repository<TEntity> {
    return this.repository;
  }
}