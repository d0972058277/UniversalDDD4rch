import { IEntity } from './interfaces/i-entity';

/**
 * Abstract base class for domain entities.
 * Entities are objects that have a distinct identity that runs through time and different representations.
 * They are defined primarily by their identity, not their attributes.
 *
 * @template TId The type of the entity's identifier
 */
export abstract class Entity<TId extends object> implements IEntity<TId> {
  private readonly _id: TId;
  private _hashCode?: number;

  /**
   * Creates a new entity with the specified identifier.
   * @param id The unique identifier for the entity
   */
  protected constructor(id: TId) {
    if (id === null || id === undefined) {
      throw new globalThis.Error('Entity ID cannot be null or undefined');
    }

    this._id = id;
    // Make the ID property immutable
    Object.defineProperty(this, '_id', {
      writable: false,
      configurable: false
    });
  }

  /** The unique identifier of the entity */
  public get id(): TId {
    return this._id;
  }

  /**
   * Determines equality based on identity rather than attribute values.
   * Two entities are equal if they have the same type and the same ID.
   * @param other The other entity to compare with
   * @returns True if entities have the same identity
   */
  public equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof Entity)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.idEquals(this._id, other._id);
  }

  /**
   * Gets the hash code for the entity based on its identity.
   * Hash code is calculated once and cached for performance.
   * @returns Hash code for the entity
   */
  public getHashCode(): number {
    if (this._hashCode === undefined) {
      this._hashCode = this.calculateHashCode();
    }
    return this._hashCode;
  }

  /**
   * Equality operator overload.
   * @param left Left operand
   * @param right Right operand
   * @returns True if operands are equal
   */
  public static equals<T extends object>(
    left: Entity<T> | null,
    right: Entity<T> | null
  ): boolean {
    if (left === null && right === null) {
      return true;
    }

    if (left === null || right === null) {
      return false;
    }

    return left.equals(right);
  }

  /**
   * Inequality operator overload.
   * @param left Left operand
   * @param right Right operand
   * @returns True if operands are not equal
   */
  public static notEquals<T extends object>(
    left: Entity<T> | null,
    right: Entity<T> | null
  ): boolean {
    return !Entity.equals(left, right);
  }

  /**
   * String representation of the entity.
   * @returns String representation including type and ID
   */
  public toString(): string {
    return `${this.constructor.name}(${this.idToString(this._id)})`;
  }

  /**
   * Compares two entity IDs for equality.
   * @param id1 First ID
   * @param id2 Second ID
   * @returns True if IDs are equal
   */
  private idEquals(id1: TId, id2: TId): boolean {
    if (id1 === id2) {
      return true;
    }

    // Handle objects with equals method
    if (typeof id1 === 'object' && 'equals' in id1 &&
        typeof (id1 as any).equals === 'function') {
      return (id1 as any).equals(id2);
    }

    // Handle objects with toString comparison
    if (typeof id1 === 'object' && typeof id2 === 'object') {
      return JSON.stringify(id1) === JSON.stringify(id2);
    }

    return false;
  }

  /**
   * Calculates the hash code based on the entity's ID.
   * @returns Calculated hash code
   */
  private calculateHashCode(): number {
    return this.getIdHashCode(this._id);
  }

  /**
   * Gets the hash code for an entity ID.
   * @param id The ID to get hash code for
   * @returns Hash code for the ID
   */
  private getIdHashCode(id: TId): number {
    if (id === null || id === undefined) {
      return 0;
    }

    if (typeof id === 'string') {
      return this.stringHashCode(id);
    }

    if (typeof id === 'number') {
      return id;
    }

    if (typeof id === 'object' && 'getHashCode' in id &&
        typeof (id as any).getHashCode === 'function') {
      return (id as any).getHashCode();
    }

    if (typeof id === 'object' && id !== null && 'toString' in id &&
        typeof (id as any).toString === 'function') {
      return this.stringHashCode((id as any).toString());
    }

    // For other objects, use string representation
    return this.stringHashCode(JSON.stringify(id));
  }

  /**
   * Converts an entity ID to string representation.
   * @param id The ID to convert
   * @returns String representation of the ID
   */
  private idToString(id: TId): string {
    if (id === null || id === undefined) {
      return 'null';
    }

    if (typeof id === 'string') {
      return id;
    }

    if (typeof id === 'number') {
      return String(id);
    }

    if (typeof id === 'object' && id !== null && 'toString' in id &&
        typeof (id as any).toString === 'function') {
      return (id as any).toString();
    }

    return JSON.stringify(id);
  }

  /**
   * Calculates hash code for a string.
   * @param str String to hash
   * @returns Hash code
   */
  private stringHashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash;
  }
}