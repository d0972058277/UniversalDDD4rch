/**
 * Abstract base class for value objects.
 * Value objects are objects that are defined by their attributes rather than their identity.
 * They should be immutable and their equality is based on their attribute values.
 */
export abstract class ValueObject {
  private _hashCode?: number;

  /**
   * Type guard to check if an object has an equals method
   */
  private hasEqualsMethod(obj: unknown): obj is { equals(other: unknown): boolean } {
    return typeof obj === 'object' && obj !== null && 'equals' in obj &&
           typeof (obj as Record<string, unknown>).equals === 'function';
  }

  /**
   * Type guard to check if an object has a getHashCode method
   */
  private hasGetHashCodeMethod(obj: unknown): obj is { getHashCode(): number } {
    return typeof obj === 'object' && obj !== null && 'getHashCode' in obj &&
           typeof (obj as Record<string, unknown>).getHashCode === 'function';
  }

  /**
   * Returns the components that define the equality of this value object.
   * Subclasses must implement this method to specify which properties
   * should be used for equality comparison.
   *
   * @returns Array of components used for equality comparison
   */
  protected abstract getEqualityComponents(): readonly unknown[];

  /**
   * Determines equality based on the equality components.
   * @param other The other object to compare with
   * @returns True if objects are equal based on their components
   */
  public equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof ValueObject)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    const thisComponents = this.getEqualityComponents();
    const otherComponents = other.getEqualityComponents();

    if (thisComponents.length !== otherComponents.length) {
      return false;
    }

    for (let i = 0; i < thisComponents.length; i++) {
      const thisComponent = thisComponents[i];
      const otherComponent = otherComponents[i];

      if (!this.componentsEqual(thisComponent, otherComponent)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets the hash code for this value object.
   * Hash code is calculated once and cached for performance.
   * @returns Hash code for this value object
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
  public static equals(left: ValueObject | null, right: ValueObject | null): boolean {
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
  public static notEquals(left: ValueObject | null, right: ValueObject | null): boolean {
    return !ValueObject.equals(left, right);
  }

  /**
   * String representation of the value object.
   * @returns String representation
   */
  public toString(): string {
    const components = this.getEqualityComponents();
    const componentStrings = components.map(c => c?.toString() || 'null');
    return `${this.constructor.name}(${componentStrings.join(', ')})`;
  }

  /**
   * Compares two individual components for equality.
   * @param component1 First component
   * @param component2 Second component
   * @returns True if components are equal
   */
  private componentsEqual(component1: unknown, component2: unknown): boolean {
    if (component1 === component2) {
      return true;
    }

    // Handle NaN special case - NaN !== NaN in JavaScript, but we want them to be equal
    if (typeof component1 === 'number' && typeof component2 === 'number' &&
        Number.isNaN(component1) && Number.isNaN(component2)) {
      return true;
    }

    if (component1 === null || component1 === undefined ||
        component2 === null || component2 === undefined) {
      return component1 === component2;
    }

    // Handle arrays
    if (Array.isArray(component1) && Array.isArray(component2)) {
      if (component1.length !== component2.length) {
        return false;
      }
      for (let i = 0; i < component1.length; i++) {
        if (!this.componentsEqual(component1[i], component2[i])) {
          return false;
        }
      }
      return true;
    }

    // Handle Map objects
    if (component1 instanceof Map && component2 instanceof Map) {
      if (component1.size !== component2.size) {
        return false;
      }
      for (const [key, value] of component1) {
        if (!component2.has(key) || !this.componentsEqual(value, component2.get(key))) {
          return false;
        }
      }
      return true;
    }

    // Handle Set objects
    if (component1 instanceof Set && component2 instanceof Set) {
      if (component1.size !== component2.size) {
        return false;
      }
      for (const value of component1) {
        let found = false;
        for (const otherValue of component2) {
          if (this.componentsEqual(value, otherValue)) {
            found = true;
            break;
          }
        }
        if (!found) {
          return false;
        }
      }
      return true;
    }

    // Handle objects with equals method
    if (this.hasEqualsMethod(component1)) {
      return component1.equals(component2);
    }

    // Handle Date objects
    if (component1 instanceof Date && component2 instanceof Date) {
      return component1.getTime() === component2.getTime();
    }

    // Deep equality for plain objects
    if (typeof component1 === 'object' && typeof component2 === 'object') {
      return JSON.stringify(component1) === JSON.stringify(component2);
    }

    return component1 === component2;
  }

  /**
   * Calculates the hash code based on equality components.
   * @returns Calculated hash code
   */
  private calculateHashCode(): number {
    const components = this.getEqualityComponents();
    let hash = 17;

    for (const component of components) {
      hash = hash * 23 + this.getComponentHashCode(component);
    }

    return hash;
  }

  /**
   * Gets the hash code for an individual component.
   * @param component Component to get hash code for
   * @returns Hash code for the component
   */
  private getComponentHashCode(component: unknown): number {
    if (component === null || component === undefined) {
      return 0;
    }

    if (typeof component === 'string') {
      return this.stringHashCode(component);
    }

    if (typeof component === 'number') {
      // Handle NaN consistently
      if (Number.isNaN(component)) {
        return 0; // Consistent hash for NaN
      }
      return component;
    }

    if (typeof component === 'boolean') {
      return component ? 1 : 0;
    }

    if (component instanceof Date) {
      return component.getTime();
    }

    if (Array.isArray(component)) {
      let hash = 17;
      for (const item of component) {
        hash = hash * 23 + this.getComponentHashCode(item);
      }
      return hash;
    }

    if (component instanceof Map) {
      let hash = 17;
      // Sort entries by key to ensure consistent hash regardless of insertion order
      const sortedEntries = Array.from(component.entries()).sort(([a], [b]) =>
        String(a).localeCompare(String(b))
      );
      for (const [key, value] of sortedEntries) {
        hash = hash * 23 + this.getComponentHashCode(key);
        hash = hash * 31 + this.getComponentHashCode(value);
      }
      return hash;
    }

    if (component instanceof Set) {
      let hash = 17;
      // Sort values to ensure consistent hash regardless of insertion order
      const sortedValues = Array.from(component).sort((a, b) =>
        String(a).localeCompare(String(b))
      );
      for (const value of sortedValues) {
        hash = hash * 23 + this.getComponentHashCode(value);
      }
      return hash;
    }

    if (this.hasGetHashCodeMethod(component)) {
      return component.getHashCode();
    }

    // For other objects, use string representation
    return this.stringHashCode(JSON.stringify(component));
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