export declare class DateType {
    static isNumeric: boolean;
    static typeName: string;
    static mock(): any;
    /**
     * Covnert the date to an epoch timestamp for storage
     */
    static encode(val: Date | string): string;
    /**
     * Extract the epoch time stamp and convert back to a date
     * @param val This will be the epoch, but as a string
     * @returns
     */
    static decode(val: string): Date;
}
//# sourceMappingURL=DateType.d.ts.map