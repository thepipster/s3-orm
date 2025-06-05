export declare class BooleanType {
    static isNumeric: boolean;
    static typeName: string;
    static mock(): any;
    /**
     * Store boolean values as a 1 or 0 to save space
     * @param val
     * @returns
     */
    static encode(val: any): string;
    static decode(val: string): boolean;
}
declare const _default: BooleanType;
export default _default;
//# sourceMappingURL=BooleanType.d.ts.map