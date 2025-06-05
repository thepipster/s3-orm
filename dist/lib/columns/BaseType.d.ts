/**
 * A base class for a column type. We have to deal with 2 scenarios:
 * 2. encode() - We saving a valie to the database, so we need to encoded it into an internal value
 * 3. decode() - we are loading a value from the database, so we need to decode it back into a value
 */
export declare class BaseType {
    static isNumeric: boolean;
    static typeName: string;
    static mock(): any;
    static encode(val: any): string;
    static decode(val: any): any;
}
//# sourceMappingURL=BaseType.d.ts.map