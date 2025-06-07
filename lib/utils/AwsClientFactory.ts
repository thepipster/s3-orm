import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import fs from "fs";
import path from "path";
import readline from "readline";
import dotenv from 'dotenv';
import { homedir } from 'os';
import Logger from "./Logger";

dotenv.config();

export type AwsCreds = {
    AccessKeyId: string;
    SecretAccessKey: string;
    SessionToken: string;
    Expiration: string;
}

function prompt(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve =>
        rl.question(query, answer => {
            rl.close();
            resolve(answer.trim());
        })
    );
}

/**
 * A Factory pattern class that provides AWS client credentials that can be used to initialize AWS clients.
 * It handles authentication with AWS using MFA for local clients and adapts to handle AWS credentials 
 * for server-side code (lambda, ec2).
 *
 * The factory detects the execution environment and uses the appropriate
 * credential provider:
 * - For Lambda: Uses the built-in Lambda role credentials
 * - For EC2: Uses the instance profile credentials
 * - For local development: Uses MFA with role assumption
 * 
 * Example usage;
 * 
 * const creds = await AwsClientFactory.getClient();
 * 
 * const transcribeClient = new TranscribeClient({
 *     region: process.env.AWS_REGION,
 *     credentials: {
 *         accessKeyId: creds.AccessKeyId,
 *         secretAccessKey: creds.SecretAccessKey,
 *         sessionToken: creds.SessionToken,
 *     }
 * });       
 */
export class AwsClientFactory {

    private static ROLE_SESSION_NAME = `aws-greenhouse-sesh-${(new Date()).getTime()}`;
    private static CACHE_FILE = path.join(homedir(), ".aws/.local_profile_cache.json");
    private static SESSION_LENGTH = 60 * 60 * 12; // 12 hours, in seconds
    private static creds: AwsCreds;

    static async getClient(): Promise<AwsCreds> {

        // If we already have credentials and they're still valid, return them
        if (AwsClientFactory.creds && AwsClientFactory.areCredsValid(AwsClientFactory.creds.Expiration)) {
            return AwsClientFactory.creds;
        }

        // Determine the execution environment and get appropriate credentials
        if (AwsClientFactory.isLambda() || AwsClientFactory.isEC2()) {
            return AwsClientFactory.getServerCredentials();
        } else {
            // Local development with MFA
            return AwsClientFactory.assumeRoleWithMFA();
        }
    }

    /**
     * Checks for Lambda-specific environment variables.
     * 
     * NOTE: AWS_LAMBDA_FUNCTION_NAME and LAMBDA_TASK_ROOT are environment variables that are automatically set by AWS when a Lambda function runs:
     * - AWS_LAMBDA_FUNCTION_NAME contains the name of the Lambda function as defined in AWS.
     * - LAMBDA_TASK_ROOT contains the path to your Lambda function code, typically /var/task in the Lambda execution environment.
     * These environment variables are part of the standard Lambda runtime environment and are reliable indicators that your code is 
     * running within an AWS Lambda context. 
     * They're commonly used for exactly this purpose - to detect if code is running in a Lambda environment versus other environments.
     */
    private static isLambda(): boolean {
        return !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.LAMBDA_TASK_ROOT;
    }

    /**
     * Checks for EC2-specific environment variables.
     * 
     * NOTE: Unlike the Lambda environment variables, EC2_INSTANCE_ID is not automatically set by AWS in EC2 instances. 
     * It's a custom environment variable that you would need to set yourself, typically during instance initialization using user data scripts or through your application deployment process.    
     * For more reliable EC2 detection, here are better approaches:
     * 
     * - Metadata Service Check: EC2 instances have access to the EC2 Instance Metadata Service (IMDS) at a special IP address (169.254.169.254). 
     * You could make an HTTP request to this endpoint to confirm you're on EC2.
     * 
     * - File System Indicators: The check for /sys/hypervisor/uuid is a reasonable approach, as this file is typically present on EC2 instances.
     * 
     * - AWS SDK Detection: The AWS SDK's credential provider chain already has logic to detect if it's running on EC2 
     * and will use the instance profile credentials automatically.     
     */
    private static isEC2(): boolean {
        // Check for EC2 metadata endpoint availability
        // This is a simplified check - in production you might want to actually
        // try to access the metadata service
        return fs.existsSync('/sys/hypervisor/uuid') || process.env.EC2_INSTANCE_ID !== undefined;
    }

    /**
     * Get credentials from the AWS provider chain when running on Lambda or EC2
     * This leverages the built-in role-based credentials available in these environments
     */
    private static async getServerCredentials(): Promise<AwsCreds> {
        try {
            Logger.debug("Getting credentials from AWS provider chain");

            // Use the Node.js provider chain which will automatically detect
            // and use the appropriate credentials provider for the environment
            const credentialsProvider = fromNodeProviderChain();
            const credentials = await credentialsProvider();

            // Convert to our internal AwsCreds format
            AwsClientFactory.creds = {
                AccessKeyId: credentials.accessKeyId,
                SecretAccessKey: credentials.secretAccessKey,
                SessionToken: credentials.sessionToken || '',
                // Set expiration to 1 hour from now if not provided
                Expiration: credentials.expiration?.toISOString() ||
                    new Date(Date.now() + AwsClientFactory.SESSION_LENGTH*1000).toISOString()
            };

            Logger.debug("Successfully obtained server credentials");
            return AwsClientFactory.creds;
        } catch (error) {
            Logger.error("Failed to get server credentials", error);
            throw new Error("Failed to get AWS credentials from provider chain");
        }
    }

    private static async assumeRoleWithMFA(): Promise<AwsCreds> {
        Logger.debug("Getting credentials using MFA for local development");

        // If we already have credentials, then just return them if they're still valid
        if (AwsClientFactory.creds &&
            AwsClientFactory.areCredsValid(AwsClientFactory.creds.Expiration)) {
            return AwsClientFactory.creds;
        }

        const cached = AwsClientFactory.loadCachedCreds(process.env.AWS_PROFILE!);

        if (cached) {
            Logger.debug("Using cached role credentials");
            return cached;
        }

        const mfaCode = await prompt("Enter MFA code: ");

        const stsClient = new STSClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        const assumeRoleCommand = new AssumeRoleCommand({
            RoleArn: process.env.AWS_ARN,
            RoleSessionName: AwsClientFactory.ROLE_SESSION_NAME,
            SerialNumber: process.env.AWS_SERIAL,
            TokenCode: mfaCode,
            DurationSeconds: AwsClientFactory.SESSION_LENGTH,
        });

        const response = await stsClient.send(assumeRoleCommand);
        if (!response.Credentials) throw new Error("Failed to assume role");

        const { AccessKeyId, SecretAccessKey, SessionToken, Expiration } = response.Credentials;

        const creds: AwsCreds = {
            AccessKeyId: AccessKeyId!,
            SecretAccessKey: SecretAccessKey!,
            SessionToken: SessionToken!,
            Expiration: Expiration!.toISOString(),
        };

        AwsClientFactory.saveCredsToCache(process.env.AWS_PROFILE!, creds);

        return creds;
    }

    private static areCredsValid(expiration: string): boolean {
        const tm: number = new Date(expiration).getTime();
        return tm > Date.now() + 60 * 1000; // 1 min buffer
    }

    private static loadCachedCreds(profile: string): AwsCreds | null {
        try {
            const raw = fs.readFileSync(AwsClientFactory.CACHE_FILE, "utf-8");
            const creds = JSON.parse(raw)[profile];
            if (AwsClientFactory.areCredsValid(creds.Expiration)) {
                return creds;
            }
        } catch {
            return null;
        }
        return null;
    }

    private static saveCredsToCache(profile: string, creds: AwsCreds) {
        let tmp: any = {};
        tmp[profile] = creds;
        fs.writeFileSync(AwsClientFactory.CACHE_FILE, JSON.stringify(tmp, null, 4));
    }

}