/**
 * ValueObject Multi-Field Equality Unit Tests
 * Architecture.Core TypeScript Implementation
 */

import { ValueObject } from '../../src/domain/value-object';

// Test ValueObject implementations for edge cases
class PersonName extends ValueObject {
    constructor(
        private readonly firstName: string,
        private readonly lastName: string,
        private readonly middleName?: string
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.firstName, this.lastName, this.middleName];
    }

    get fullName(): string {
        return [this.firstName, this.middleName, this.lastName]
            .filter(name => name)
            .join(' ');
    }
}

class Address extends ValueObject {
    constructor(
        private readonly street: string,
        private readonly city: string,
        private readonly state: string,
        private readonly zipCode: string,
        private readonly country: string = 'USA',
        private readonly apartment?: string
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.street, this.city, this.state, this.zipCode, this.country, this.apartment];
    }
}

class Money extends ValueObject {
    constructor(
        private readonly amount: number,
        private readonly currency: string
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [this.amount, this.currency];
    }

    get value(): number {
        return this.amount;
    }

    get currencyCode(): string {
        return this.currency;
    }
}

class ComplexObject extends ValueObject {
    constructor(
        private readonly id: string,
        private readonly numbers: readonly number[],
        private readonly strings: readonly string[],
        private readonly nested: readonly ValueObject[],
        private readonly map: ReadonlyMap<string, unknown>,
        private readonly set: ReadonlySet<string>,
        private readonly nullableField: string | null,
        private readonly optionalField?: string
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [
            this.id,
            this.numbers,
            this.strings,
            this.nested,
            this.map,
            this.set,
            this.nullableField,
            this.optionalField
        ];
    }
}

class EdgeCaseObject extends ValueObject {
    constructor(
        private readonly emptyString: string,
        private readonly emptyArray: readonly unknown[],
        private readonly emptyMap: ReadonlyMap<string, unknown>,
        private readonly emptySet: ReadonlySet<unknown>,
        private readonly nullValue: null,
        private readonly undefinedValue: undefined,
        private readonly zeroNumber: number,
        private readonly falseBoolean: boolean,
        private readonly nanNumber: number,
        private readonly infinityNumber: number
    ) {
        super();
    }

    protected getEqualityComponents(): readonly unknown[] {
        return [
            this.emptyString,
            this.emptyArray,
            this.emptyMap,
            this.emptySet,
            this.nullValue,
            this.undefinedValue,
            this.zeroNumber,
            this.falseBoolean,
            this.nanNumber,
            this.infinityNumber
        ];
    }
}

describe('ValueObject Multi-Field Equality Edge Cases', () => {
    describe('Basic Multi-Field Equality', () => {
        test('Should_BeEqual_When_AllFieldsMatch', () => {
            // Given
            const name1 = new PersonName('John', 'Doe', 'Michael');
            const name2 = new PersonName('John', 'Doe', 'Michael');

            // When
            const areEqual = name1.equals(name2);
            const hashCodesEqual = name1.getHashCode() === name2.getHashCode();

            // Then
            expect(areEqual).toBe(true);
            expect(hashCodesEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_AnyFieldDiffers', () => {
            // Given
            const name1 = new PersonName('John', 'Doe', 'Michael');
            const name2 = new PersonName('John', 'Doe', 'Robert');

            // When
            const areEqual = name1.equals(name2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_HandleOptionalFields_When_BothUndefined', () => {
            // Given
            const name1 = new PersonName('John', 'Doe');
            const name2 = new PersonName('John', 'Doe');

            // When
            const areEqual = name1.equals(name2);
            const hashCodesEqual = name1.getHashCode() === name2.getHashCode();

            // Then
            expect(areEqual).toBe(true);
            expect(hashCodesEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_OptionalFieldsDiffer', () => {
            // Given
            const name1 = new PersonName('John', 'Doe', 'Michael');
            const name2 = new PersonName('John', 'Doe'); // No middle name

            // When
            const areEqual = name1.equals(name2);

            // Then
            expect(areEqual).toBe(false);
        });
    });

    describe('Array Field Equality', () => {
        test('Should_BeEqual_When_ArraysHaveSameContent', () => {
            // Given
            const numbers1 = [1, 2, 3, 4, 5];
            const strings1 = ['a', 'b', 'c'];
            const nested1 = [new Money(100, 'USD'), new Money(200, 'EUR')];

            const obj1 = new ComplexObject(
                'test',
                numbers1,
                strings1,
                nested1,
                new Map(),
                new Set(),
                null
            );

            const obj2 = new ComplexObject(
                'test',
                numbers1,
                strings1,
                nested1,
                new Map(),
                new Set(),
                null
            );

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_ArraysHaveDifferentContent', () => {
            // Given
            const obj1 = new ComplexObject(
                'test',
                [1, 2, 3],
                ['a', 'b'],
                [],
                new Map(),
                new Set(),
                null
            );

            const obj2 = new ComplexObject(
                'test',
                [1, 2, 4], // Different numbers
                ['a', 'b'],
                [],
                new Map(),
                new Set(),
                null
            );

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_NotBeEqual_When_ArraysHaveDifferentOrder', () => {
            // Given
            const obj1 = new ComplexObject(
                'test',
                [1, 2, 3],
                ['a', 'b', 'c'],
                [],
                new Map(),
                new Set(),
                null
            );

            const obj2 = new ComplexObject(
                'test',
                [3, 2, 1], // Different order
                ['c', 'b', 'a'], // Different order
                [],
                new Map(),
                new Set(),
                null
            );

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_NotBeEqual_When_ArraysHaveDifferentLength', () => {
            // Given
            const obj1 = new ComplexObject(
                'test',
                [1, 2, 3],
                ['a', 'b'],
                [],
                new Map(),
                new Set(),
                null
            );

            const obj2 = new ComplexObject(
                'test',
                [1, 2], // Shorter array
                ['a', 'b', 'c'], // Longer array
                [],
                new Map(),
                new Set(),
                null
            );

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_BeEqual_When_BothArraysEmpty', () => {
            // Given
            const obj1 = new ComplexObject(
                'test',
                [],
                [],
                [],
                new Map(),
                new Set(),
                null
            );

            const obj2 = new ComplexObject(
                'test',
                [],
                [],
                [],
                new Map(),
                new Set(),
                null
            );

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });
    });

    describe('Map Field Equality', () => {
        test('Should_BeEqual_When_MapsHaveSameEntries', () => {
            // Given
            const map1 = new Map([
                ['key1', 'value1'],
                ['key2', 42],
                ['key3', true]
            ]);

            const map2 = new Map([
                ['key1', 'value1'],
                ['key2', 42],
                ['key3', true]
            ]);

            const obj1 = new ComplexObject('test', [], [], [], map1, new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], map2, new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_MapsHaveDifferentEntries', () => {
            // Given
            const map1 = new Map([
                ['key1', 'value1'],
                ['key2', 42]
            ]);

            const map2 = new Map([
                ['key1', 'value1'],
                ['key2', 43] // Different value
            ]);

            const obj1 = new ComplexObject('test', [], [], [], map1, new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], map2, new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_NotBeEqual_When_MapsHaveDifferentKeys', () => {
            // Given
            const map1 = new Map([
                ['key1', 'value1'],
                ['key2', 42]
            ]);

            const map2 = new Map([
                ['key1', 'value1'],
                ['key3', 42] // Different key
            ]);

            const obj1 = new ComplexObject('test', [], [], [], map1, new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], map2, new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_BeEqual_When_BothMapsEmpty', () => {
            // Given
            const map1 = new Map();
            const map2 = new Map();

            const obj1 = new ComplexObject('test', [], [], [], map1, new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], map2, new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });
    });

    describe('Set Field Equality', () => {
        test('Should_BeEqual_When_SetsHaveSameElements', () => {
            // Given
            const set1 = new Set(['a', 'b', 'c']);
            const set2 = new Set(['a', 'b', 'c']);

            const obj1 = new ComplexObject('test', [], [], [], new Map(), set1, null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), set2, null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_BeEqual_When_SetsHaveSameElementsDifferentOrder', () => {
            // Given
            const set1 = new Set(['a', 'b', 'c']);
            const set2 = new Set(['c', 'a', 'b']); // Sets don't have order

            const obj1 = new ComplexObject('test', [], [], [], new Map(), set1, null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), set2, null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_SetsHaveDifferentElements', () => {
            // Given
            const set1 = new Set(['a', 'b', 'c']);
            const set2 = new Set(['a', 'b', 'd']); // Different element

            const obj1 = new ComplexObject('test', [], [], [], new Map(), set1, null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), set2, null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_NotBeEqual_When_SetsHaveDifferentSizes', () => {
            // Given
            const set1 = new Set(['a', 'b', 'c']);
            const set2 = new Set(['a', 'b']); // Smaller set

            const obj1 = new ComplexObject('test', [], [], [], new Map(), set1, null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), set2, null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });
    });

    describe('Null and Undefined Handling', () => {
        test('Should_BeEqual_When_BothHaveNullValues', () => {
            // Given
            const obj1 = new ComplexObject('test', [], [], [], new Map(), new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_OneHasNullOtherHasValue', () => {
            // Given
            const obj1 = new ComplexObject('test', [], [], [], new Map(), new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), new Set(), 'value');

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });

        test('Should_BeEqual_When_BothHaveUndefinedOptionalFields', () => {
            // Given
            const obj1 = new ComplexObject('test', [], [], [], new Map(), new Set(), null);
            const obj2 = new ComplexObject('test', [], [], [], new Map(), new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_NotBeEqual_When_OptionalFieldsDiffer', () => {
            // Given
            const obj1 = new ComplexObject('test', [], [], [], new Map(), new Set(), null, 'optional');
            const obj2 = new ComplexObject('test', [], [], [], new Map(), new Set(), null); // No optional field

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });
    });

    describe('Special Value Handling', () => {
        test('Should_HandleSpecialValues_When_ComparingEdgeCases', () => {
            // Given
            const obj1 = new EdgeCaseObject(
                '', // empty string
                [], // empty array
                new Map(), // empty map
                new Set(), // empty set
                null,
                undefined,
                0, // zero
                false, // false boolean
                NaN, // NaN
                Infinity // Infinity
            );

            const obj2 = new EdgeCaseObject(
                '', // empty string
                [], // empty array
                new Map(), // empty map
                new Set(), // empty set
                null,
                undefined,
                0, // zero
                false, // false boolean
                NaN, // NaN
                Infinity // Infinity
            );

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_HandleNaNComparison_When_BothHaveNaN', () => {
            // Given
            const obj1 = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, NaN, Infinity);
            const obj2 = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, NaN, Infinity);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            // NaN === NaN is false in JavaScript, but our equality should handle this consistently
            expect(areEqual).toBe(true);
        });

        test('Should_HandleInfinityComparison_When_BothHaveInfinity', () => {
            // Given
            const obj1 = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, 0, Infinity);
            const obj2 = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, 0, Infinity);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_DistinguishBetween_PositiveAndNegativeInfinity', () => {
            // Given
            const obj1 = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, 0, Infinity);
            const obj2 = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, 0, -Infinity);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });
    });

    describe('Nested ValueObject Equality', () => {
        test('Should_CompareNestedValueObjects_When_AllMatch', () => {
            // Given
            const money1 = new Money(100, 'USD');
            const money2 = new Money(200, 'EUR');
            const nested1 = [money1, money2];

            const money3 = new Money(100, 'USD');
            const money4 = new Money(200, 'EUR');
            const nested2 = [money3, money4];

            const obj1 = new ComplexObject('test', [], [], nested1, new Map(), new Set(), null);
            const obj2 = new ComplexObject('test', [], [], nested2, new Map(), new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(true);
        });

        test('Should_DetectDifferences_When_NestedValueObjectsDiffer', () => {
            // Given
            const money1 = new Money(100, 'USD');
            const money2 = new Money(200, 'EUR');
            const nested1 = [money1, money2];

            const money3 = new Money(100, 'USD');
            const money4 = new Money(300, 'EUR'); // Different amount
            const nested2 = [money3, money4];

            const obj1 = new ComplexObject('test', [], [], nested1, new Map(), new Set(), null);
            const obj2 = new ComplexObject('test', [], [], nested2, new Map(), new Set(), null);

            // When
            const areEqual = obj1.equals(obj2);

            // Then
            expect(areEqual).toBe(false);
        });
    });

    describe('Hash Code Consistency for Edge Cases', () => {
        test('Should_GenerateConsistentHashCodes_When_ObjectsAreEqual', () => {
            // Given
            const map1 = new Map([['key', 'value']]);
            const map2 = new Map([['key', 'value']]);
            const set1 = new Set(['a', 'b']);
            const set2 = new Set(['a', 'b']);

            const obj1 = new ComplexObject('test', [1, 2, 3], ['x', 'y'], [], map1, set1, null);
            const obj2 = new ComplexObject('test', [1, 2, 3], ['x', 'y'], [], map2, set2, null);

            // When
            const hash1 = obj1.getHashCode();
            const hash2 = obj2.getHashCode();

            // Then
            expect(obj1.equals(obj2)).toBe(true);
            expect(hash1).toBe(hash2);
        });

        test('Should_GenerateStableHashCodes_When_CalledMultipleTimes', () => {
            // Given
            const obj = new ComplexObject(
                'test',
                [1, 2, 3],
                ['a', 'b'],
                [new Money(100, 'USD')],
                new Map([['key', 'value']]),
                new Set(['x', 'y']),
                'nullable'
            );

            // When
            const hash1 = obj.getHashCode();
            const hash2 = obj.getHashCode();
            const hash3 = obj.getHashCode();

            // Then
            expect(hash1).toBe(hash2);
            expect(hash2).toBe(hash3);
        });

        test('Should_HandleHashCodeGeneration_When_ContainsSpecialValues', () => {
            // Given
            const obj = new EdgeCaseObject('', [], new Map(), new Set(), null, undefined, 0, false, NaN, Infinity);

            // When & Then
            expect(() => obj.getHashCode()).not.toThrow();

            const hash1 = obj.getHashCode();
            const hash2 = obj.getHashCode();

            expect(hash1).toBe(hash2);
            expect(typeof hash1).toBe('number');
        });
    });

    describe('Performance Edge Cases', () => {
        test('Should_HandleLargeArrays_When_ComparingEquality', () => {
            // Given
            const largeArray = Array.from({ length: 10000 }, (_, i) => i);
            const obj1 = new ComplexObject('large', largeArray, [], [], new Map(), new Set(), null);
            const obj2 = new ComplexObject('large', largeArray, [], [], new Map(), new Set(), null);

            // When
            const start = performance.now();
            const areEqual = obj1.equals(obj2);
            const end = performance.now();

            // Then
            expect(areEqual).toBe(true);
            expect(end - start).toBeLessThan(100); // Should complete within 100ms
        });

        test('Should_HandleLargeMaps_When_ComparingEquality', () => {
            // Given
            const largeMap = new Map();
            for (let i = 0; i < 1000; i++) {
                largeMap.set(`key${i}`, `value${i}`);
            }

            const obj1 = new ComplexObject('large-map', [], [], [], largeMap, new Set(), null);
            const obj2 = new ComplexObject('large-map', [], [], [], largeMap, new Set(), null);

            // When
            const start = performance.now();
            const areEqual = obj1.equals(obj2);
            const end = performance.now();

            // Then
            expect(areEqual).toBe(true);
            expect(end - start).toBeLessThan(50); // Should complete within 50ms
        });
    });
});