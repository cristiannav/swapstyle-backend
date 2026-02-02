import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load proto file
const PROTO_PATH = path.join(__dirname, '../protos/vision.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const visionProto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  swapstyle: {
    vision: {
      VisionService: new (
        address: string,
        credentials: grpc.ChannelCredentials
      ) => VisionServiceClient;
    };
  };
};

// Type definitions
interface AnalysisOptions {
  detect_category?: boolean;
  detect_color?: boolean;
  detect_brand?: boolean;
  detect_pattern?: boolean;
  detect_material?: boolean;
  extract_features?: boolean;
  estimate_condition?: boolean;
}

interface AnalyzeGarmentRequest {
  image_url?: string;
  image_data?: Buffer;
  options?: AnalysisOptions;
}

interface AnalyzeGarmentResponse {
  request_id: string;
  category: {
    primary_category: string;
    subcategory: string;
    confidence: number;
    alternatives: Array<{ category: string; score: number }>;
  };
  colors: {
    primary_color: string;
    secondary_colors: string[];
    hex_code: string;
    confidence: number;
    color_palette: Array<{ name: string; hex: string; percentage: number }>;
  };
  brand: {
    detected_brand: string;
    confidence: number;
    logo_detected: boolean;
    logo_location?: { x: number; y: number; width: number; height: number };
    alternatives: Array<{ brand: string; score: number }>;
  };
  pattern: {
    pattern_type: string;
    confidence: number;
    pattern_details: string[];
  };
  material: {
    primary_material: string;
    secondary_materials: string[];
    confidence: number;
  };
  style_vector: number[];
  condition: {
    condition: string;
    confidence: number;
    defects: Array<{
      type: string;
      severity: string;
      location?: { x: number; y: number; width: number; height: number };
    }>;
  };
  confidence: number;
  tags: string[];
}

interface ExtractFeaturesRequest {
  image_url?: string;
  image_data?: Buffer;
  model_version?: string;
}

interface ExtractFeaturesResponse {
  feature_vector: number[];
  vector_dimension: number;
  model_version: string;
}

interface AuthenticityRequest {
  garment_id: string;
  image_urls: string[];
  claimed_brand: string;
}

interface AuthenticityResponse {
  is_authentic: boolean;
  confidence: number;
  flags: Array<{
    flag_type: string;
    description: string;
    severity: number;
  }>;
  verification_id: string;
}

// Client interface
interface VisionServiceClient {
  AnalyzeGarment(
    request: AnalyzeGarmentRequest,
    callback: (error: grpc.ServiceError | null, response: AnalyzeGarmentResponse) => void
  ): void;
  ExtractStyleFeatures(
    request: ExtractFeaturesRequest,
    callback: (error: grpc.ServiceError | null, response: ExtractFeaturesResponse) => void
  ): void;
  VerifyAuthenticity(
    request: AuthenticityRequest,
    callback: (error: grpc.ServiceError | null, response: AuthenticityResponse) => void
  ): void;
}

// Create client instance
let client: VisionServiceClient | null = null;

export function getVisionClient(): VisionServiceClient {
  if (!client) {
    const serviceUrl = config.services.vision || 'localhost:50053';
    client = new visionProto.swapstyle.vision.VisionService(
      serviceUrl,
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

// Promisified wrapper methods
export async function analyzeGarment(
  imageUrl: string,
  options: AnalysisOptions = {
    detect_category: true,
    detect_color: true,
    detect_brand: true,
    detect_pattern: true,
    detect_material: true,
    extract_features: true,
    estimate_condition: true,
  }
): Promise<AnalyzeGarmentResponse> {
  return new Promise((resolve, reject) => {
    const client = getVisionClient();
    client.AnalyzeGarment(
      {
        image_url: imageUrl,
        options,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC AnalyzeGarment error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

export async function extractStyleFeatures(
  imageUrl: string,
  modelVersion?: string
): Promise<ExtractFeaturesResponse> {
  return new Promise((resolve, reject) => {
    const client = getVisionClient();
    client.ExtractStyleFeatures(
      {
        image_url: imageUrl,
        model_version: modelVersion,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC ExtractStyleFeatures error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

export async function verifyAuthenticity(
  garmentId: string,
  imageUrls: string[],
  claimedBrand: string
): Promise<AuthenticityResponse> {
  return new Promise((resolve, reject) => {
    const client = getVisionClient();
    client.VerifyAuthenticity(
      {
        garment_id: garmentId,
        image_urls: imageUrls,
        claimed_brand: claimedBrand,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC VerifyAuthenticity error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Utility function to process garment image and update database
export async function processGarmentImage(
  garmentId: string,
  imageUrl: string
): Promise<{
  category: string;
  color: string;
  brand: string | null;
  tags: string[];
  styleVector: number[];
}> {
  try {
    const analysis = await analyzeGarment(imageUrl);

    return {
      category: analysis.category.primary_category,
      color: analysis.colors.primary_color,
      brand: analysis.brand.confidence > 0.7 ? analysis.brand.detected_brand : null,
      tags: analysis.tags,
      styleVector: analysis.style_vector,
    };
  } catch (error) {
    console.error(`Failed to process garment image for ${garmentId}:`, error);
    throw error;
  }
}
