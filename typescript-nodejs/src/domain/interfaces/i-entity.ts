/**
 * Interface for domain entities.
 * Entities are objects that have a distinct identity that runs through time and different representations.
 * They are defined primarily by their identity, not their attributes.
 *
 * @template TId The type of the entity's identifier
 */
export interface IEntity<TId extends object> {
  /** The unique identifier of the entity */
  readonly id: TId;

  /**
   * Determines equality based on identity rather than attribute values.
   * @param other The other entity to compare with
   * @returns True if entities have the same identity
   */
  equals(other: unknown): boolean;

  /**
   * Gets the hash code for the entity based on its identity.
   * @returns Hash code for the entity
   */
  getHashCode(): number;
}