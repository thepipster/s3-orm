import {
    S3Client,
    ListObjectsV2Command,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand
} from "@aws-sdk/client-s3";
import {Storm} from "../core/Storm";
import Chance from "chance";
import {Profiler} from "../utils/Profiler";

/**
 * S3ShardedManager - Manages numerical files in S3 using dynamic sharding
 * Uses a combination of directory sharding and distribution strategies for optimal performance
 */
class S3ShardedManager {
    private bucketName: string;
    private basePrefix: string;
    private suffix: string;
    private paddingDigits: number;
    private precision: number;
    private allowNegative: boolean;
    private s3Client: S3Client;

    // Shard configuration
    private primaryShardSize: number;
    private secondaryShardSize: number;
    private enableSecondarySharding: boolean;
    private metaPrefix: string;

    /**
     * Create a new S3ShardedManager
     * @param {string} basePrefix - Base prefix for all files (e.g., "data/")
     * @param {string} suffix - Suffix for all files (e.g., ".json")
     * @param {number} paddingDigits - Number of digits for zero-padding
     * @param {number} precision - Decimal precision for floating point numbers
     * @param {boolean} allowNegative - Whether to allow negative numbers
     * @param {number} primaryShardSize - Size of the primary shards (e.g. 1000 means group by thousands)
     * @param {boolean} enableSecondarySharding - Whether to enable secondary sharding for dense areas
     * @param {number} secondaryShardSize - Size of secondary shards (e.g., 100 would create sub-shards with 100 items)
     */
    constructor(
        basePrefix: string = "",
        suffix: string = "",
        paddingDigits: number = 0,
        precision: number = 2,
        allowNegative: boolean = true,
        primaryShardSize: number = 1000,
        enableSecondarySharding: boolean = true,
        secondaryShardSize: number = 100
    ) {
        this.bucketName = Storm.aws().opts.bucket;
        this.basePrefix = basePrefix.endsWith('/') ? basePrefix : basePrefix + '/';
        this.suffix = suffix;
        this.paddingDigits = paddingDigits;
        this.precision = precision;
        this.allowNegative = allowNegative;

        // Shard configuration
        this.primaryShardSize = primaryShardSize;
        this.secondaryShardSize = secondaryShardSize;
        this.enableSecondarySharding = enableSecondarySharding;

        // Meta information storage
        this.metaPrefix = `${this.basePrefix}_meta/`;

        // Initialize S3 client
        this.s3Client = Storm.aws().s3;
    }

    /**
     * Calculate the shard key for a number
     * @param {number} num - The number
     * @returns {string} - The shard key
     * @private
     */
    private getPrimaryShardKey(num: number): string {
        // Round to specified precision first
        const roundedNum = parseFloat(num.toFixed(this.precision));

        // Handle negative numbers specially
        if (roundedNum < 0) {
            // For negative numbers, we group in reverse order to keep correct sorting
            const absNum = Math.abs(roundedNum);
            const shardIndex = Math.ceil(absNum / this.primaryShardSize);
            return `n${shardIndex.toString().padStart(this.paddingDigits, '0')}`;
        } else {
            // For positive numbers
            const shardIndex = Math.floor(roundedNum / this.primaryShardSize);
            return `p${shardIndex.toString().padStart(this.paddingDigits, '0')}`;
        }
    }

    /**
     * Calculate the secondary shard key for dense areas
     * @param {number} num - The number
     * @param {string} primaryShard - The primary shard key
     * @returns {string} - The secondary shard key
     * @private
     */
    private getSecondaryShardKey(num: number, primaryShard: string): string {
        // Only create secondary shards when enabled
        if (!this.enableSecondarySharding) {
            return '';
        }

        // Round to specified precision
        const roundedNum = parseFloat(num.toFixed(this.precision));

        // Calculate the offset within the primary shard
        let offsetInShard: number;

        if (primaryShard.startsWith('n')) {
            // Negative shard - calculate how far from the "start" of this shard
            const shardIndex = parseInt(primaryShard.substring(1), 10);
            offsetInShard = Math.abs(roundedNum) - ((shardIndex - 1) * this.primaryShardSize);
            // Reverse for negative numbers to maintain sort order
            offsetInShard = this.primaryShardSize - offsetInShard;
        } else {
            // Positive shard - calculate how far from the "start" of this shard
            const shardIndex = parseInt(primaryShard.substring(1), 10);
            offsetInShard = roundedNum - (shardIndex * this.primaryShardSize);
        }

        // Map to a secondary shard
        const secondaryIndex = Math.floor(offsetInShard / this.secondaryShardSize);
        return secondaryIndex.toString().padStart(2, '0');
    }

    /**
     * Format a number for file naming
     * @param {number} num - The number to format
     * @returns {string} - Formatted string
     * @private
     */
    private formatNumberForFilename(num: number): string {
        // Round to specified precision
        const roundedNum = parseFloat(num.toFixed(this.precision));

        if (roundedNum < 0) {
            // For negative numbers, use the absolute value but keep track of negativity
            const absNum = Math.abs(roundedNum);

            // Split into integer and decimal parts
            const integerPart = Math.floor(absNum).toString().padStart(this.paddingDigits, '0');
            const decimalPart = absNum.toFixed(this.precision).split('.')[1] || '';

            // Only include decimal part if we have a precision > 0
            if (this.precision > 0 && decimalPart) {
                return `n${integerPart}_${decimalPart}`;
            } else {
                return `n${integerPart}`;
            }
        } else {
            // Split into integer and decimal parts
            const integerPart = Math.floor(roundedNum).toString().padStart(this.paddingDigits, '0');
            const decimalPart = roundedNum.toFixed(this.precision).split('.')[1] || '';

            // Only include decimal part if we have a precision > 0
            if (this.precision > 0 && decimalPart) {
                return `${integerPart}_${decimalPart}`;
            } else {
                return integerPart;
            }
        }
    }

    /**
     * Get the full S3 key for a file
     * @param {number} num - The number
     * @returns {string} - The full S3 key
     */
    getFileKey(num: number): string {
        // Check if negative numbers are allowed
        if (!this.allowNegative && num < 0) {
            throw new Error("Negative numbers are not allowed");
        }

        // Round to specified precision
        const roundedNum = parseFloat(num.toFixed(this.precision));

        // Get the primary shard
        const primaryShard = this.getPrimaryShardKey(roundedNum);

        // Get the secondary shard (if enabled)
        const secondaryShard = this.getSecondaryShardKey(roundedNum, primaryShard);

        // Format the filename
        const fileName = this.formatNumberForFilename(roundedNum);

        // Build the full path with sharding
        let fullPath = `${this.basePrefix}${primaryShard}/`;

        if (secondaryShard) {
            fullPath += `${secondaryShard}/`;
        }

        fullPath += `${fileName}${this.suffix}`;
        return fullPath;
    }

    /**
     * Check if a file with a specific number exists
     * @param {number} num - The number to check
     * @returns {Promise<boolean>} - Whether the file exists
     */
    async doesNumberExist(num: number): Promise<boolean> {
        try {
            // Get the full file key
            const fileKey = this.getFileKey(num);

            // Check if the file exists
            await this.s3Client.send(new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: fileKey
            }));

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Upload a file with a specific number
     * @param {Buffer|string} fileContent - Content to upload
     * @param {number} num - The numerical identifier
     * @param {boolean} overwrite - Whether to overwrite if exists
     * @returns {Promise<{key: string, alreadyExists: boolean}>} - Result info
     */
    async uploadWithNumber(
        fileContent: Buffer | string,
        num: number,
        overwrite: boolean = false
    ): Promise<{ key: string, alreadyExists: boolean }> {
        // Get the full file key
        const fileKey = this.getFileKey(num);

        // Check if the file already exists
        let alreadyExists = false;

        if (!overwrite) {
            alreadyExists = await this.doesNumberExist(num);

            if (alreadyExists) {
                return { key: fileKey, alreadyExists: true };
            }
        }

        // Upload the file
        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
            Body: fileContent
        }));

        // Update secondary shard density metadata if enabled
        if (this.enableSecondarySharding) {
            await this.updateShardDensity(num);
        }

        return { key: fileKey, alreadyExists };
    }

    /**
     * Track density of shards for optimizing shard sizes
     * @param {number} num - The number being added
     * @private
     */
    private async updateShardDensity(num: number): Promise<void> {
        const primaryShard = this.getPrimaryShardKey(num);
        const metaKey = `${this.metaPrefix}shard_density/${primaryShard}.json`;

        try {
            // Try to get existing shard metadata
            const response = await this.s3Client.send(new GetObjectCommand({
                Bucket: this.bucketName,
                Key: metaKey
            }));

            if (response.Body) {
                const metaData = await response.Body.transformToString();
                const shardMeta = JSON.parse(metaData);

                // Increment count
                shardMeta.count = (shardMeta.count || 0) + 1;
                shardMeta.updated = new Date().toISOString();

                // Update shard metadata
                await this.s3Client.send(new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: metaKey,
                    Body: JSON.stringify(shardMeta, null, 2)
                }));
            }
        } catch (error) {
            // Metadata doesn't exist yet, create it
            const shardMeta = {
                shard: primaryShard,
                count: 1,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: metaKey,
                Body: JSON.stringify(shardMeta, null, 2)
            }));
        }
    }

    /**
     * Upload a file with a random number in a range
     * @param {Buffer|string} fileContent - Content to upload
     * @param {number} min - Minimum number in range (inclusive)
     * @param {number} max - Maximum number in range (inclusive)
     * @param {number} maxAttempts - Maximum attempts to find unused number
     * @returns {Promise<{key: string, number: number}>} - Result with used number
     */
    async uploadWithRandomNumber(
        fileContent: Buffer | string,
        min: number,
        max: number,
        maxAttempts: number = 10
    ): Promise<{ key: string, number: number }> {
        // Validate range
        if (min > max) {
            throw new Error(`Invalid range: ${min}-${max}`);
        }

        // Check if negative numbers are allowed
        if (!this.allowNegative && min < 0) {
            min = 0;
        }

        let attempts = 0;
        while (attempts < maxAttempts) {
            // Generate a random number in the range
            const randomNum = min + Math.random() * (max - min);

            // Round to the specified precision
            const roundedNum = parseFloat(randomNum.toFixed(this.precision));

            // Check if this number is available
            const exists = await this.doesNumberExist(roundedNum);

            if (!exists) {
                // Upload the file with this number
                const fileKey = await this.uploadWithNumber(fileContent, roundedNum);
                return { key: fileKey.key, number: roundedNum };
            }

            attempts++;
        }

        throw new Error(`Failed to find an unused random number after ${maxAttempts} attempts`);
    }

    /**
     * Delete a file with a specific number
     * @param {number} num - The number identifier
     * @returns {Promise<boolean>} - Whether delete was successful
     */
    async deleteFile(num: number): Promise<boolean> {
        try {
            // Get the file key
            const fileKey = this.getFileKey(num);

            // Delete the file
            await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: fileKey
            }));

            // Update metadata if secondary sharding is enabled
            if (this.enableSecondarySharding) {
                await this.decrementShardDensity(num);
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Update shard density after deletion
     * @param {number} num - The number being deleted
     * @private
     */
    private async decrementShardDensity(num: number): Promise<void> {
        const primaryShard = this.getPrimaryShardKey(num);
        const metaKey = `${this.metaPrefix}shard_density/${primaryShard}.json`;

        try {
            // Get existing shard metadata
            const response = await this.s3Client.send(new GetObjectCommand({
                Bucket: this.bucketName,
                Key: metaKey
            }));

            if (response.Body) {
                const metaData = await response.Body.transformToString();
                const shardMeta = JSON.parse(metaData);

                // Decrement count
                shardMeta.count = Math.max(0, (shardMeta.count || 1) - 1);
                shardMeta.updated = new Date().toISOString();

                // Update shard metadata
                await this.s3Client.send(new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: metaKey,
                    Body: JSON.stringify(shardMeta, null, 2)
                }));
            }
        } catch (error) {
            // Ignore errors when decrementing nonexistent metadata
        }
    }

    /**
     * List all files in a numerical range
     * @param {number} startNum - Start of range (inclusive)
     * @param {number} endNum - End of range (inclusive)
     * @returns {Promise<Array<{number: number, key: string}>>} - List of files
     */
    async listFilesInRange(startNum: number, endNum: number): Promise<Array<{ number: number, key: string }>> {
        // Validate range
        if (startNum > endNum) {
            throw new Error(`Invalid range: ${startNum}-${endNum}`);
        }

        // Round to specified precision
        const roundedStart = parseFloat(startNum.toFixed(this.precision));
        const roundedEnd = parseFloat(endNum.toFixed(this.precision));

        // Adjust range if negative numbers aren't allowed
        let adjustedStart = roundedStart;
        if (!this.allowNegative && adjustedStart < 0) {
            adjustedStart = 0;
        }

        // Calculate all the primary shards we need to check
        const shards = this.calculateShardsInRange(adjustedStart, roundedEnd);

        // Collect all matching files
        const results: Array<{ number: number, key: string }> = [];

        // Process each primary shard
        for (const shard of shards) {
            // List all objects in this shard
            await this.listFilesInShard(shard, adjustedStart, roundedEnd, results);
        }

        // Sort by number
        results.sort((a, b) => a.number - b.number);

        return results;
    }

    /**
     * Calculate all the primary shard keys that cover a range
     * @param {number} startNum - Start of range
     * @param {number} endNum - End of range
     * @returns {Array<string>} - List of shard keys
     * @private
     */
    private calculateShardsInRange(startNum: number, endNum: number): Array<string> {
        const shards: Set<string> = new Set();

        // Handle negative and positive ranges separately
        if (startNum < 0) {
            if (endNum < 0) {
                // Only negative shards
                const startShard = Math.ceil(Math.abs(startNum) / this.primaryShardSize);
                const endShard = Math.ceil(Math.abs(endNum) / this.primaryShardSize);

                // Add all negative shards from end to start (important for negative numbers)
                for (let i = endShard; i <= startShard; i++) {
                    shards.add(`n${i.toString().padStart(this.paddingDigits, '0')}`);
                }
            } else {
                // Mix of negative and positive shards

                // Add negative shards
                const highestNegShard = Math.ceil(Math.abs(startNum) / this.primaryShardSize);
                for (let i = 1; i <= highestNegShard; i++) {
                    shards.add(`n${i.toString().padStart(this.paddingDigits, '0')}`);
                }

                // Add positive shards
                const highestPosShard = Math.floor(endNum / this.primaryShardSize);
                for (let i = 0; i <= highestPosShard; i++) {
                    shards.add(`p${i.toString().padStart(this.paddingDigits, '0')}`);
                }
            }
        } else {
            // Only positive shards
            const startShard = Math.floor(startNum / this.primaryShardSize);
            const endShard = Math.floor(endNum / this.primaryShardSize);

            for (let i = startShard; i <= endShard; i++) {
                shards.add(`p${i.toString().padStart(this.paddingDigits, '0')}`);
            }
        }

        return Array.from(shards);
    }

    /**
     * List all files in a specific shard that match a range
     * @param {string} shard - Shard key
     * @param {number} startNum - Start of range
     * @param {number} endNum - End of range
     * @param {Array<{number: number, key: string}>} results - Results collection
     * @private
     */
    private async listFilesInShard(
        shard: string,
        startNum: number,
        endNum: number,
        results: Array<{ number: number, key: string }>
    ): Promise<void> {
        let continuationToken: string | undefined = undefined;

        do {
            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: `${this.basePrefix}${shard}/`,
                ContinuationToken: continuationToken
            });

            const response = await this.s3Client.send(command);

            if (response.Contents) {
                for (const item of response.Contents) {
                    if (!item.Key) continue;

                    // Extract the number from the key
                    const num = this.extractNumberFromKey(item.Key);

                    // Check if it's in our range
                    if (num !== null && num >= startNum && num <= endNum) {
                        results.push({
                            number: num,
                            key: item.Key
                        });
                    }
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
    }

    /**
     * Extract a number from a file key
     * @param {string} key - The S3 key
     * @returns {number|null} - The number or null if invalid
     * @private
     */
    private extractNumberFromKey(key: string): number | null {
        try {
            // Get the filename without the path or suffix
            const pathParts = key.split('/');
            let filename = pathParts[pathParts.length - 1];

            if (this.suffix && filename.endsWith(this.suffix)) {
                filename = filename.substring(0, filename.length - this.suffix.length);
            }

            // Check if it's a negative number
            const isNegative = filename.startsWith('n');
            if (isNegative) {
                // Handle negative numbers
                filename = filename.substring(1); // Remove 'n' prefix
            }

            // Handle decimal part if present
            let numStr: string;
            if (filename.includes('_')) {
                const parts = filename.split('_');
                numStr = parts[0] + '.' + parts[1];
            } else {
                numStr = filename;
            }

            // Convert to number
            let num = parseFloat(numStr);

            // Apply sign
            if (isNegative) {
                num = -num;
            }

            return num;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find available numbers in a range
     * @param {number} startNum - Start of range
     * @param {number} endNum - End of range
     * @param {number} count - Number of available numbers to find
     * @param {string} [strategy="random"] - Strategy: "random" or "sequential"
     * @returns {Promise<Array<number>>} - Available numbers
     */
    async findAvailableNumbers(
        startNum: number,
        endNum: number,
        count: number,
        strategy: "random" | "sequential" = "random"
    ): Promise<Array<number>> {
        // Validate range
        if (startNum > endNum) {
            throw new Error(`Invalid range: ${startNum}-${endNum}`);
        }

        // Round to specified precision
        const roundedStart = parseFloat(startNum.toFixed(this.precision));
        const roundedEnd = parseFloat(endNum.toFixed(this.precision));

        // Check if negative numbers are allowed
        if (!this.allowNegative && roundedStart < 0) {
            const adjustedStart = 0;
            return this.findAvailableNumbers(adjustedStart, roundedEnd, count, strategy);
        }

        // Get all existing numbers in the range
        const existingFiles = await this.listFilesInRange(roundedStart, roundedEnd);
        const existingNumbers = new Set(existingFiles.map(file => file.number));

        const availableNumbers: Array<number> = [];

        if (strategy === "random") {
            // Random strategy - good for sparse ranges
            const maxAttempts = count * 10;
            let attempts = 0;

            while (availableNumbers.length < count && attempts < maxAttempts) {
                const randomNum = roundedStart + Math.random() * (roundedEnd - roundedStart);
                const roundedNum = parseFloat(randomNum.toFixed(this.precision));

                if (!existingNumbers.has(roundedNum) && !availableNumbers.includes(roundedNum)) {
                    availableNumbers.push(roundedNum);
                }

                attempts++;
            }
        } else {
            // Sequential strategy - good for dense ranges or when need continuous numbers
            for (let num = roundedStart; num <= roundedEnd && availableNumbers.length < count; num += Math.pow(10, -this.precision)) {
                const roundedNum = parseFloat(num.toFixed(this.precision));

                if (!existingNumbers.has(roundedNum)) {
                    availableNumbers.push(roundedNum);
                }
            }
        }

        return availableNumbers;
    }
}

/**
 * Example usage
 */
async function main() {
    try {

        Storm.connect({
            bucket: process.env.AWS_BUCKET,
            prefix: process.env.AWS_ROOT_FOLDER,
            region: process.env.AWS_REGION,
            rootUrl: process.env.AWS_CLOUDFRONT_URL,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_ACCESS_SECRET,
        });

        // Initialize manager with recommended settings for different scenarios

        // For large, sparse numerical range (like IDs)
        const largeRangeManager = new S3ShardedManager(
            "large-range/",
            ".json",
            6,            // 6-digit padding
            0,            // 0 decimal places (integers)
            true,         // allow negative
            10000,        // primary shard size of 10,000
            true,         // enable secondary sharding
            1000          // secondary shard size of 1,000
        );

        // chance.floating({ min: 0, max: 100 }),
        const chance = new Chance();
        const no = 1000;

        

        /*
        for (let i=0; i<no; i+=1){
            
            let name:string = chance.name({ nationality: 'en' });
            let score:number = chance.integer({ min: -9999999, max: 9999999 });

            //let score:number = chance.floating({ min: 0, max: 100 });

            Profiler.start('uploadWithNumber');
            const result = await largeRangeManager.uploadWithNumber(name,score);
            //console.debug(result);
            let ms:number = Profiler.stop('uploadWithNumber');
            console.debug(`Uploaded ${i} in ${ms} ms`);

            if (i % 100 === 0) {
                console.debug(i)
                Profiler.showResults();
            }

        }

        Profiler.showResults();
        */


        for (let i=0; i<no; i+=1){

            let m1: number = chance.integer({ min: -9999999, max: 9999999 });
            let m2: number = chance.integer({ min: m1+1, max: 9999999 });
            console.log(`Getting files between ${m1} and ${m2}`);       

            Profiler.start('listFilesInRange');
            const files = await largeRangeManager.listFilesInRange(m1, m2);    
            let ms:number = Profiler.stop('listFilesInRange');
            console.log(`Found ${files.length} files between ${m1} and ${m2} in ${ms} ms`);       
        }

        Profiler.showResults();

        /*
        // For densely packed float values (like scientific measurements)
        const floatManager = new S3ShardedManager(
            "measurements/",
            ".json",
            3,            // 3-digit padding
            4,            // 4 decimal places
            true,         // allow negative
            1,            // primary shard size of 1.0
            true,         // enable secondary sharding
            0.1           // secondary shard size of 0.1
        );


        // Example: Upload a file with a specific number
        const result = await largeRangeManager.uploadWithNumber(
            JSON.stringify({ data: "example" }),
            12345
        );

        console.log(`File uploaded: ${result.key}`);

        // Example: List files in a range
        const files = await largeRangeManager.listFilesInRange(10000, 20000);

        console.log(`Found ${files.length} files`);

        // Example: Find available numbers
        const availableNumbers = await floatManager.findAvailableNumbers(
            -1.5,
            1.5,
            5,
            "random"
        );

        console.log("Available numbers:", availableNumbers);
        */

    } catch (error) {
        console.error("Error:", error);
    }
}

// Uncomment to run the example
main();

export default S3ShardedManager;