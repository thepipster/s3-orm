import {
    S3Client,
    ListObjectsV2Command,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    GetObjectCommandOutput,
    PutObjectCommandOutput
} from "@aws-sdk/client-s3";
import {Stash} from "../core/Stash";
import Chance from "chance";
import {Profiler} from "../utils/Profiler";


// Tree metadata interface
interface TreeMetadata {
    minRange: number;
    maxRange: number;
    totalFiles: number;
    created: string;
    updated: string;
    allowNegative: boolean;
    precision: number;
    [key: string]: any;
}

interface NodeBase {
    type: 'branch' | 'leaf';
    min: number;
    max: number;
    metadata: {
        created: string;
        updated?: string;
        [key: string]: any;
    };
}

interface BranchNode extends NodeBase {
    type: 'branch';
    leftChild: string | null;
    rightChild: string | null;
    metadata: {
        created: string;
        updated?: string;
        totalFiles: number;
        [key: string]: any;
    };
}

interface FileMetadata {
    key: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: any;
}

interface LeafNode extends NodeBase {
    type: 'leaf';
    usedNumbers: {
        [key: string]: FileMetadata;
    };
    metadata: {
        created: string;
        updated?: string;
        count: number;
        [key: string]: any;
    };
}

type TreeNode = BranchNode | LeafNode;

// Types for results
interface UploadResult {
    key: string;
    alreadyExists?: boolean;
    number?: number;
}

interface FileInfo {
    number: number;
    key: string;
    metadata: FileMetadata;
}

/**
 * S3BinaryTreeManager - Manages numerical files in S3 using a binary tree approach
 * Each node in the tree tracks a range of numbers and their availability
 */
class S3BinaryTreeManager {
    private bucketName: string;
    private basePrefix: string;
    private suffix: string;
    private paddingDigits: number;
    private minRange: number;
    private maxRange: number;
    private nodeCapacity: number;
    private allowNegative: boolean;
    private rangeInitialized: boolean;
    private precision: number;
    private s3Client: S3Client;
    private rootNodeKey: string;
    private treeMetaKey: string;

    /**
     * Create a new S3BinaryTreeManager
     * @param {string} basePrefix - Base prefix for all files (e.g., "data/")
     * @param {string} suffix - Suffix for all files (e.g., ".json")
     * @param {number} paddingDigits - Number of digits for zero-padding (e.g., 4 for "0001")
     * @param {number} nodeCapacity - Maximum numbers a leaf node can track before splitting
     * @param {boolean} allowNegative - Whether to allow negative numbers
     * @param {number} precision - Decimal precision for floating point numbers (e.g., 2 for two decimal places)
     * @param {number|null} initialMinRange - Optional initial minimum value (null for dynamic)
     * @param {number|null} initialMaxRange - Optional initial maximum value (null for dynamic)
     */
    constructor(
        basePrefix: string = "",
        suffix: string = "",
        paddingDigits: number = 0,
        nodeCapacity: number = 100,
        allowNegative: boolean = true,
        precision: number = 2,
        initialMinRange: number | null = null,
        initialMaxRange: number | null = null
    ) {
        this.bucketName =  Stash.aws().opts.bucket;
        this.basePrefix = basePrefix;
        this.suffix = suffix;
        this.paddingDigits = paddingDigits;
        this.precision = precision;

        // Default to very large range if null (will be adjusted dynamically)
        this.minRange = initialMinRange !== null ? initialMinRange : (allowNegative ? -Number.MAX_SAFE_INTEGER : 0);
        this.maxRange = initialMaxRange !== null ? initialMaxRange : Number.MAX_SAFE_INTEGER;
        this.nodeCapacity = nodeCapacity;
        this.allowNegative = allowNegative;
        this.rangeInitialized = initialMinRange !== null && initialMaxRange !== null;

        // Initialize S3 client
        this.s3Client =  Stash.aws().s3;

        // Root node of the binary tree
        this.rootNodeKey = `${this.basePrefix}_tree/root.json`;

        // Meta-information about the tree
        this.treeMetaKey = `${this.basePrefix}_tree/meta.json`;
    }

    /**
     * Initialize the binary tree
     * @returns {Promise<void>}
     */
    async initialize(): Promise<void> {
        try {
            // Check if metadata exists
            const metaResponse = await this.s3Client.send(new GetObjectCommand({
                Bucket: this.bucketName,
                Key: this.treeMetaKey
            }));

            if (metaResponse.Body) {
                // Load metadata if it exists
                const metaData = await metaResponse.Body.transformToString();
                const treeMeta = JSON.parse(metaData) as TreeMetadata;

                // Update our ranges from stored metadata
                this.minRange = treeMeta.minRange;
                this.maxRange = treeMeta.maxRange;
                this.allowNegative = treeMeta.allowNegative;
                this.precision = treeMeta.precision;
                this.rangeInitialized = true;
            }

            // Check if root node exists
            await this.s3Client.send(new GetObjectCommand({
                Bucket: this.bucketName,
                Key: this.rootNodeKey
            }));

        } catch (error) {
            // Create metadata and root node if they don't exist
            await this.createInitialStructure();
        }
    }

    /**
     * Create the initial tree structure
     * @returns {Promise<void>}
     * @private
     */
    private async createInitialStructure(): Promise<void> {
        // Create tree metadata
        const treeMeta: TreeMetadata = {
            minRange: this.minRange,
            maxRange: this.maxRange,
            totalFiles: 0,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            allowNegative: this.allowNegative,
            precision: this.precision
        };

        // Create root node
        const rootNode: BranchNode = {
            type: 'branch',
            min: this.minRange,
            max: this.maxRange,
            leftChild: null,
            rightChild: null,
            metadata: {
                created: new Date().toISOString(),
                totalFiles: 0
            }
        };

        // Save both to S3
        await Promise.all([
            this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: this.treeMetaKey,
                Body: JSON.stringify(treeMeta, null, 2)
            })),
            this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: this.rootNodeKey,
                Body: JSON.stringify(rootNode, null, 2)
            }))
        ]);
    }

    /**
     * Converts a floating point number to a string key that sorts correctly
     * @param {number} num - The number to convert
     * @returns {string} - String representation for storage
     * @private
     */
    private numberToStorageKey(num: number): string {
        // Round to specified precision
        const roundedNum = parseFloat(num.toFixed(this.precision));

        // Handle special case of -0 vs 0
        if (Object.is(roundedNum, -0)) {
            return "0";
        }

        return roundedNum.toString();
    }

    /**
     * Converts a storage key back to a number
     * @param {string} key - The storage key
     * @returns {number} - The original number
     * @private
     */
    private storageKeyToNumber(key: string): number {
        return parseFloat(key);
    }

    /**
     * Updates the stored range when a new number is found outside current bounds
     * @param {number} num - The number that's outside current range
     * @returns {Promise<void>}
     * @private
     */
    private async updateRangeForNumber(num: number): Promise<void> {
        let rangeUpdated = false;

        if (num < this.minRange) {
            this.minRange = num;
            rangeUpdated = true;
        }

        if (num > this.maxRange) {
            this.maxRange = num;
            rangeUpdated = true;
        }

        if (rangeUpdated || !this.rangeInitialized) {
            // Update metadata
            try {
                const response = await this.s3Client.send(new GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: this.treeMetaKey
                }));

                if (response.Body) {
                    const metaData = await response.Body.transformToString();
                    const treeMeta = JSON.parse(metaData) as TreeMetadata;

                    treeMeta.minRange = this.minRange;
                    treeMeta.maxRange = this.maxRange;
                    treeMeta.updated = new Date().toISOString();

                    await this.s3Client.send(new PutObjectCommand({
                        Bucket: this.bucketName,
                        Key: this.treeMetaKey,
                        Body: JSON.stringify(treeMeta, null, 2)
                    }));

                    this.rangeInitialized = true;
                }
            } catch (error) {
                // If metadata doesn't exist yet, create it
                await this.createInitialStructure();
            }
        }
    }

    /**
     * Get a node from S3
     * @param {string} nodeKey - The key of the node in S3
     * @returns {Promise<TreeNode>} - The node object
     */
    async getNode(nodeKey: string): Promise<TreeNode> {
        const response: GetObjectCommandOutput = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: nodeKey
        }));

        if (!response.Body) {
            throw new Error(`Failed to retrieve node: ${nodeKey}`);
        }

        const nodeData = await response.Body.transformToString();
        return JSON.parse(nodeData) as TreeNode;
    }

    /**
     * Save a node to S3
     * @param {string} nodeKey - The key to save the node at
     * @param {TreeNode} node - The node object to save
     * @returns {Promise<void>}
     */
    async saveNode(nodeKey: string, node: TreeNode): Promise<void> {
        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: nodeKey,
            Body: JSON.stringify(node, null, 2)
        }));
    }

    /**
     * Get the node key for a branch node
     * @param {number} min - Minimum value of the range
     * @param {number} max - Maximum value of the range
     * @returns {string} - The node key
     */
    getBranchNodeKey(min: number, max: number): string {
        return `${this.basePrefix}_tree/branch_${min.toFixed(this.precision)}_${max.toFixed(this.precision)}.json`;
    }

    /**
     * Get the node key for a leaf node
     * @param {number} min - Minimum value of the range
     * @param {number} max - Maximum value of the range
     * @returns {string} - The node key
     */
    getLeafNodeKey(min: number, max: number): string {
        return `${this.basePrefix}_tree/leaf_${min.toFixed(this.precision)}_${max.toFixed(this.precision)}.json`;
    }

    /**
     * Split a leaf node into two child nodes
     * @param {LeafNode} leafNode - The leaf node to split
     * @param {string} leafNodeKey - The key of the leaf node
     * @returns {Promise<void>}
     */
    async splitLeafNode(leafNode: LeafNode, leafNodeKey: string): Promise<void> {
        const min = leafNode.min;
        const max = leafNode.max;
        const mid = (min + max) / 2;

        // Create left child (lower half of range)
        const leftChildKey = this.getLeafNodeKey(min, mid);
        const leftChild: LeafNode = {
            type: 'leaf',
            min: min,
            max: mid,
            usedNumbers: {},
            metadata: {
                created: new Date().toISOString(),
                count: 0
            }
        };

        // Create right child (upper half of range)
        const rightChildKey = this.getLeafNodeKey(mid, max);
        const rightChild: LeafNode = {
            type: 'leaf',
            min: mid,
            max: max,
            usedNumbers: {},
            metadata: {
                created: new Date().toISOString(),
                count: 0
            }
        };

        // Distribute existing used numbers to appropriate child nodes
        for (const numStr in leafNode.usedNumbers) {
            const num = this.storageKeyToNumber(numStr);
            if (num <= mid) {
                leftChild.usedNumbers[numStr] = leafNode.usedNumbers[numStr];
                leftChild.metadata.count++;
            } else {
                rightChild.usedNumbers[numStr] = leafNode.usedNumbers[numStr];
                rightChild.metadata.count++;
            }
        }

        // Save the child nodes
        await Promise.all([
            this.saveNode(leftChildKey, leftChild),
            this.saveNode(rightChildKey, rightChild)
        ]);

        // Convert the original leaf node to a branch node
        const branchNode: BranchNode = {
            type: 'branch',
            min: min,
            max: max,
            leftChild: leftChildKey,
            rightChild: rightChildKey,
            metadata: {
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                totalFiles: leafNode.metadata.count
            }
        };

        // Save the branch node (replacing the original leaf node)
        await this.saveNode(leafNodeKey, branchNode);
    }

    /**
     * Find a leaf node that contains the given number
     * @param {number} num - The number to find
     * @returns {Promise<{node: LeafNode, nodeKey: string}>} - The leaf node and its key
     */
    async findLeafNodeForNumber(num: number): Promise<{ node: LeafNode, nodeKey: string }> {
        let currentNodeKey = this.rootNodeKey;
        let currentNode = await this.getNode(currentNodeKey);

        while (currentNode.type === 'branch') {
            const mid = (currentNode.min + currentNode.max) / 2;

            if (num <= mid) {
                if (!currentNode.leftChild) {
                    // Initialize left child if it doesn't exist
                    const leftChildKey = this.getLeafNodeKey(currentNode.min, mid);
                    const leftChild: LeafNode = {
                        type: 'leaf',
                        min: currentNode.min,
                        max: mid,
                        usedNumbers: {},
                        metadata: {
                            created: new Date().toISOString(),
                            count: 0
                        }
                    };
                    await this.saveNode(leftChildKey, leftChild);

                    // Update parent node
                    currentNode.leftChild = leftChildKey;
                    await this.saveNode(currentNodeKey, currentNode);

                    return { node: leftChild, nodeKey: leftChildKey };
                }

                currentNodeKey = currentNode.leftChild;
            } else {
                if (!currentNode.rightChild) {
                    // Initialize right child if it doesn't exist
                    const rightChildKey = this.getLeafNodeKey(mid, currentNode.max);
                    const rightChild: LeafNode = {
                        type: 'leaf',
                        min: mid,
                        max: currentNode.max,
                        usedNumbers: {},
                        metadata: {
                            created: new Date().toISOString(),
                            count: 0
                        }
                    };
                    await this.saveNode(rightChildKey, rightChild);

                    // Update parent node
                    currentNode.rightChild = rightChildKey;
                    await this.saveNode(currentNodeKey, currentNode);

                    return { node: rightChild, nodeKey: rightChildKey };
                }

                currentNodeKey = currentNode.rightChild;
            }

            currentNode = await this.getNode(currentNodeKey);
        }

        return { node: currentNode as LeafNode, nodeKey: currentNodeKey };
    }

    /**
     * Get the file key for a number
     * @param {number} number - The number to generate a key for
     * @returns {string} - The S3 key for the file
     */
    getFileKey(number: number): string {
        // Handle negative numbers by prefixing with 'n' to maintain proper sorting
        let formattedNumber: string;

        // Round to specified precision
        const roundedNum = parseFloat(number.toFixed(this.precision));

        if (roundedNum < 0) {
            // For negative numbers, use 'n' prefix and pad the absolute value
            // Format: n{integer part}.{decimal part}
            const absNum = Math.abs(roundedNum);
            const integerPart = Math.floor(absNum).toString().padStart(this.paddingDigits, '0');
            const decimalPart = absNum.toFixed(this.precision).split('.')[1] || '';
            formattedNumber = `n${integerPart}_${decimalPart}`;
        } else {
            // For positive numbers, pad the integer part
            // Format: {integer part}.{decimal part}
            const integerPart = Math.floor(roundedNum).toString().padStart(this.paddingDigits, '0');
            const decimalPart = roundedNum.toFixed(this.precision).split('.')[1] || '';
            formattedNumber = `${integerPart}_${decimalPart}`;
        }

        return `${this.basePrefix}${formattedNumber}${this.suffix}`;
    }

    /**
     * Upload a file with a specific number
     * @param {Buffer|string} fileContent - The content to upload
     * @param {number} number - The numerical filename to use
     * @param {boolean} [overwrite=false] - Whether to overwrite if the file exists
     * @returns {Promise<UploadResult>} - Result of the operation
     */
    async uploadWithNumber(
        fileContent: Buffer | string,
        number: number,
        overwrite: boolean = false
    ): Promise<UploadResult> {
        // Check if negative numbers are allowed
        if (!this.allowNegative && number < 0) {
            throw new Error(`Negative numbers are not allowed in this tree`);
        }

        // Round to specified precision
        const roundedNum = parseFloat(number.toFixed(this.precision));

        // If the number is outside current range, update the range
        if (roundedNum < this.minRange || roundedNum > this.maxRange) {
            await this.updateRangeForNumber(roundedNum);
        }

        // Find the leaf node for this number
        const { node, nodeKey } = await this.findLeafNodeForNumber(roundedNum);

        // Check if the number is already used
        const numStr = this.numberToStorageKey(roundedNum);
        const alreadyExists = numStr in node.usedNumbers;

        if (alreadyExists && !overwrite) {
            return {
                key: this.getFileKey(roundedNum),
                alreadyExists: true
            };
        }

        // Upload the file
        const fileKey = this.getFileKey(roundedNum);
        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
            Body: fileContent
        }));

        // Update the leaf node
        if (!alreadyExists) {
            node.usedNumbers[numStr] = {
                key: fileKey,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            node.metadata.count++;
        } else {
            node.usedNumbers[numStr].updatedAt = new Date().toISOString();
        }

        // Save the updated leaf node
        await this.saveNode(nodeKey, node);

        // Check if this leaf node needs to be split
        if (node.metadata.count > this.nodeCapacity) {
            await this.splitLeafNode(node, nodeKey);
        }

        return {
            key: fileKey,
            alreadyExists
        };
    }

    /**
     * Upload a file with a random unused number
     * @param {Buffer|string} fileContent - The content to upload
     * @param {number} [minRange] - Optional minimum range (defaults to instance min)
     * @param {number} [maxRange] - Optional maximum range (defaults to instance max)
     * @param {number} [maxAttempts=10] - Maximum attempts to find an unused number
     * @returns {Promise<UploadResult>} - The uploaded file key and number
     */
    async uploadWithRandomNumber(
        fileContent: Buffer | string,
        minRange: number | null = null,
        maxRange: number | null = null,
        maxAttempts: number = 10
    ): Promise<UploadResult> {
        const min = minRange !== null ? minRange : this.minRange;
        const max = maxRange !== null ? maxRange : this.maxRange;

        // Validate ranges
        if (!this.allowNegative && min < 0) {
            throw new Error("Negative numbers are not allowed in this tree");
        }

        let attempts = 0;
        while (attempts < maxAttempts) {
            // Generate a random number in range
            const randomNum = min + Math.random() * (max - min);
            // Round to specified precision
            const roundedNum = parseFloat(randomNum.toFixed(this.precision));

            // Find the leaf node for this number
            const { node, nodeKey } = await this.findLeafNodeForNumber(roundedNum);

            // Check if the number is available
            const numStr = this.numberToStorageKey(roundedNum);
            if (!(numStr in node.usedNumbers)) {
                // Upload the file
                const fileKey = this.getFileKey(roundedNum);
                await this.s3Client.send(new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: fileKey,
                    Body: fileContent
                }));

                // Update the leaf node
                node.usedNumbers[numStr] = {
                    key: fileKey,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                node.metadata.count++;

                // Save the updated leaf node
                await this.saveNode(nodeKey, node);

                // Check if this leaf node needs to be split
                if (node.metadata.count > this.nodeCapacity) {
                    await this.splitLeafNode(node, nodeKey);
                }

                return {
                    key: fileKey,
                    number: roundedNum
                };
            }

            attempts++;
        }

        throw new Error(`Failed to find an unused random number after ${maxAttempts} attempts`);
    }

    /**
     * Check if a file with a specific number exists
     * @param {number} number - The number to check
     * @returns {Promise<boolean>} - Whether the file exists
     */
    async doesNumberExist(number: number): Promise<boolean> {
        // Check if negative numbers are allowed
        if (!this.allowNegative && number < 0) {
            return false;
        }

        // Round to specified precision
        const roundedNum = parseFloat(number.toFixed(this.precision));

        // If number is outside current range, it definitely doesn't exist
        if (roundedNum < this.minRange || roundedNum > this.maxRange) {
            return false;
        }

        // Find the leaf node for this number
        const { node } = await this.findLeafNodeForNumber(roundedNum);

        // Check if the number is used
        const numStr = this.numberToStorageKey(roundedNum);
        return numStr in node.usedNumbers;
    }

    /**
     * List all files in a numerical range
     * @param {number} startNum - Starting number (inclusive)
     * @param {number} endNum - Ending number (inclusive)
     * @returns {Promise<Array<FileInfo>>} - List of matching files
     */
    async listFilesInRange(startNum: number, endNum: number): Promise<Array<FileInfo>> {
        // Validate the range
        if (startNum > endNum) {
            throw new Error(`Invalid range: ${startNum}-${endNum}`);
        }

        // Round to specified precision
        const roundedStart = parseFloat(startNum.toFixed(this.precision));
        const roundedEnd = parseFloat(endNum.toFixed(this.precision));

        // If range is completely outside our tracked range, return empty array
        if (roundedEnd < this.minRange || roundedStart > this.maxRange) {
            return [];
        }

        // Adjust range to fit within our tracked range
        const adjustedStart = Math.max(roundedStart, this.minRange);
        const adjustedEnd = Math.min(roundedEnd, this.maxRange);

        const results: Array<FileInfo> = [];
        await this._collectFilesInRange(this.rootNodeKey, adjustedStart, adjustedEnd, results);

        // Sort by number
        results.sort((a, b) => a.number - b.number);

        return results;
    }

    /**
     * Helper function to recursively collect files in a range
     * @param {string} nodeKey - The current node key
     * @param {number} startNum - Start of range
     * @param {number} endNum - End of range
     * @param {Array<FileInfo>} results - Array to collect results
     * @returns {Promise<void>}
     * @private
     */
    private async _collectFilesInRange(
        nodeKey: string,
        startNum: number,
        endNum: number,
        results: Array<FileInfo>
    ): Promise<void> {
        const node = await this.getNode(nodeKey);

        // Check if the node range overlaps with our query range
        if (node.max < startNum || node.min > endNum) {
            return; // No overlap, skip this node
        }

        if (node.type === 'branch') {
            // For branch nodes, recurse into children
            if (node.leftChild) {
                await this._collectFilesInRange(node.leftChild, startNum, endNum, results);
            }
            if (node.rightChild) {
                await this._collectFilesInRange(node.rightChild, startNum, endNum, results);
            }
        } else if (node.type === 'leaf') {
            // For leaf nodes, collect matching numbers
            for (const numStr in node.usedNumbers) {
                const num = this.storageKeyToNumber(numStr);
                if (num >= startNum && num <= endNum) {
                    results.push({
                        number: num,
                        key: node.usedNumbers[numStr].key,
                        metadata: node.usedNumbers[numStr]
                    });
                }
            }
        }
    }

    /**
     * Find available numbers in a range
     * @param {number} startNum - Start of range
     * @param {number} endNum - End of range
     * @param {number} count - Number of available numbers to find
     * @returns {Promise<Array<number>>} - List of available numbers
     */
    async findAvailableNumbers(startNum: number, endNum: number, count: number): Promise<Array<number>> {
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
            const adjustedEnd = Math.max(0, roundedEnd);

            if (adjustedStart >= adjustedEnd) {
                return []; // No valid range after adjustment
            }

            return this.findAvailableNumbers(adjustedStart, adjustedEnd, count);
        }

        // Get all used numbers in the range
        const usedFiles = await this.listFilesInRange(roundedStart, roundedEnd);
        const usedNumbers = new Set(usedFiles.map(file => file.number));

        const availableNumbers: Array<number> = [];

        // For floating point numbers, we need to use a different strategy
        // Just generate random numbers within the range and check if they're available
        const generateRandom = () => {
            // Generate a random number in range
            const randomNum = roundedStart + Math.random() * (roundedEnd - roundedStart);
            // Round to specified precision
            return parseFloat(randomNum.toFixed(this.precision));
        };

        // Try to find random numbers
        const maxAttempts = count * 10; // Allow more retries for float ranges
        let attempts = 0;

        while (availableNumbers.length < count && attempts < maxAttempts) {
            const randomNum = generateRandom();

            if (!usedNumbers.has(randomNum) && !availableNumbers.includes(randomNum)) {
                availableNumbers.push(randomNum);
            }

            attempts++;
        }

        return availableNumbers;
    }

    /**
     * Delete a file with a specific number
     * @param {number} number - The number of the file to delete
     * @returns {Promise<boolean>} - Whether the file was deleted
     */
    async deleteFile(number: number): Promise<boolean> {
        // Check if negative numbers are allowed
        if (!this.allowNegative && number < 0) {
            return false;
        }

        // Round to specified precision
        const roundedNum = parseFloat(number.toFixed(this.precision));

        // If number is outside current range, it doesn't exist
        if (roundedNum < this.minRange || roundedNum > this.maxRange) {
            return false;
        }

        // Find the leaf node for this number
        const { node, nodeKey } = await this.findLeafNodeForNumber(roundedNum);

        // Check if the number exists
        const numStr = this.numberToStorageKey(roundedNum);
        if (!(numStr in node.usedNumbers)) {
            return false; // File doesn't exist
        }

        // Delete the file from S3
        const fileKey = node.usedNumbers[numStr].key;
        await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey
        }));

        // Update the leaf node
        delete node.usedNumbers[numStr];
        node.metadata.count--;

        // Save the updated leaf node
        await this.saveNode(nodeKey, node);

        return true;
    }
}

/**
 * Example usage
 */
async function main() {
    try {

        Stash.connect({
            bucket: process.env.AWS_BUCKET,
            prefix: process.env.AWS_ROOT_FOLDER,
            region: process.env.AWS_REGION,
            rootUrl: process.env.AWS_CLOUDFRONT_URL,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_ACCESS_SECRET,
        });

        // Initialize the manager with support for floating point numbers
        const manager = new S3BinaryTreeManager(
            "data/",            // base prefix
            ".json",            // suffix
            4,                  // padding digits for integer part
            100,                // node capacity
            true,               // allow negative numbers
            2,                  // precision (2 decimal places)
            null,               // dynamic min range
            null                // dynamic max range
        );

        // Initialize the binary tree
        await manager.initialize();


        // chance.floating({ min: 0, max: 100 }),
        const chance = new Chance();
        const no = 1000;

            
        for (let i=0; i<no; i+=1){
            
            let name:string = chance.name({ nationality: 'en' });
            let score:number = chance.integer({ min: -9999999, max: 9999999 });

            //let score:number = chance.floating({ min: 0, max: 100 });

            Profiler.start('uploadWithNumber');
            const result = await manager.uploadWithNumber(name,score);
            //console.debug(result);
            Profiler.stop('uploadWithNumber');

            if (i % 100 === 0) {
                console.debug(i)
                Profiler.showResults();
            }

        }

        Profiler.showResults();
        


        for (let i=0; i<no; i+=1){

            let m1: number = chance.integer({ min: -9999999, max: 9999999 });
            let m2: number = chance.integer({ min: m1+1, max: 9999999 });
            console.log(`Getting files between ${m1} and ${m2}`);       

            Profiler.start('listFilesInRange');
            const files = await manager.listFilesInRange(m1, m2);    
            let ms:number = Profiler.stop('listFilesInRange');
            console.log(`Found ${files.length} files between ${m1} and ${m2} in ${ms} ms`);       
        }

        Profiler.showResults();        

        /*
        // Example 1: Upload a file with an integer number
        console.log("Uploading file with number 42...");
        const result1 = await manager.uploadWithNumber(
            JSON.stringify({ data: "integer example" }),
            42
        );
        console.log(`File uploaded: ${result1.key}`);

        // Example 2: Upload a file with a floating point number
        console.log("Uploading file with floating point number 3.14...");
        const result2 = await manager.uploadWithNumber(
            JSON.stringify({ data: "pi example" }),
            3.14
        );
        console.log(`File uploaded: ${result2.key}`);

        // Example 3: Upload a file with a negative floating point number
        console.log("Uploading file with negative floating point number -2.71...");
        const result3 = await manager.uploadWithNumber(
            JSON.stringify({ data: "euler example" }),
            -2.71
        );
        console.log(`File uploaded: ${result3.key}`);

        // Example 4: Upload a file with a random floating point number
        console.log("Uploading file with random floating point number...");
        const result4 = await manager.uploadWithRandomNumber(
            JSON.stringify({ data: "random float example" }),
            0,          // min range
            10,         // max range
            10          // max attempts
        );
        console.log(`File uploaded: ${result4.key} with number ${result4.number}`);

        // Example 5: List files in a range that includes floating point numbers
        console.log("Listing files between 0 and 5...");
        const files = await manager.listFilesInRange(0, 5);
        console.log(`Found ${files.length} files`);
        for (const file of files) {
            console.log(` - ${file.key} (number: ${file.number})`);
        }

        // Example 6: Find available floating point numbers
        console.log("Finding 3 available numbers between 1 and 4...");
        const availableNumbers = await manager.findAvailableNumbers(1, 4, 3);
        console.log("Available numbers:", availableNumbers);

        // Example 7: Check if a floating point number exists
        console.log("Checking if number 3.14 exists...");
        const exists = await manager.doesNumberExist(3.14);
        console.log(`Number 3.14 exists: ${exists}`);

        // Example 8: Delete a file with a floating point number
        console.log("Deleting file with number 3.14...");
        const deleted = await manager.deleteFile(3.14);
        console.log(`File with number 3.14 deleted: ${deleted}`);
        */

    } catch (error) {
        console.error("Error:", error);
    }
}

// Uncomment to run the example
main();

export default S3BinaryTreeManager;