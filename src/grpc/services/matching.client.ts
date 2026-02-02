import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load proto file
const PROTO_PATH = path.join(__dirname, '../protos/matching.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const matchingProto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  swapstyle: {
    matching: {
      MatchingService: new (
        address: string,
        credentials: grpc.ChannelCredentials
      ) => MatchingServiceClient;
    };
  };
};

// Type definitions
interface RecommendationRequest {
  user_id: string;
  limit: number;
  exclude_garment_ids?: string[];
  filters?: {
    categories?: string[];
    sizes?: string[];
    colors?: string[];
    max_distance_km?: number;
    min_compatibility_score?: number;
  };
}

interface GarmentRecommendation {
  garment_id: string;
  user_id: string;
  compatibility_score: number;
  match_reasons: string[];
  style_compatibility: {
    overall: number;
    color_match: number;
    style_match: number;
    brand_preference: number;
    size_match: number;
  };
}

interface RecommendationResponse {
  recommendations: GarmentRecommendation[];
  request_id: string;
}

interface CompatibilityRequest {
  user_id_1: string;
  user_id_2: string;
  garment_id_1: string;
  garment_id_2?: string;
}

interface CompatibilityResponse {
  overall_score: number;
  style_compatibility: {
    overall: number;
    color_match: number;
    style_match: number;
    brand_preference: number;
    size_match: number;
  };
  location_score: number;
  reputation_score: number;
  recommended_match: boolean;
}

interface UpdateStyleVectorRequest {
  user_id: string;
  interactions: Array<{
    garment_id: string;
    type: string;
    timestamp: number;
    duration_seconds?: number;
  }>;
}

interface UpdateStyleVectorResponse {
  success: boolean;
  new_style_vector: number[];
  vector_version: number;
}

interface SimilarGarmentsRequest {
  garment_id: string;
  limit: number;
  exclude_ids?: string[];
}

interface SimilarGarmentsResponse {
  garments: Array<{
    garment_id: string;
    similarity_score: number;
    similar_attributes: string[];
  }>;
}

// Client interface
interface MatchingServiceClient {
  GetRecommendations(
    request: RecommendationRequest,
    callback: (error: grpc.ServiceError | null, response: RecommendationResponse) => void
  ): void;
  CalculateCompatibility(
    request: CompatibilityRequest,
    callback: (error: grpc.ServiceError | null, response: CompatibilityResponse) => void
  ): void;
  UpdateStyleVector(
    request: UpdateStyleVectorRequest,
    callback: (error: grpc.ServiceError | null, response: UpdateStyleVectorResponse) => void
  ): void;
  GetSimilarGarments(
    request: SimilarGarmentsRequest,
    callback: (error: grpc.ServiceError | null, response: SimilarGarmentsResponse) => void
  ): void;
}

// Create client instance
let client: MatchingServiceClient | null = null;

export function getMatchingClient(): MatchingServiceClient {
  if (!client) {
    const serviceUrl = config.services.ai || 'localhost:50052';
    client = new matchingProto.swapstyle.matching.MatchingService(
      serviceUrl,
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

// Promisified wrapper methods
export async function getRecommendations(
  userId: string,
  limit: number = 20,
  excludeIds: string[] = [],
  filters?: RecommendationRequest['filters']
): Promise<GarmentRecommendation[]> {
  return new Promise((resolve, reject) => {
    const client = getMatchingClient();
    client.GetRecommendations(
      {
        user_id: userId,
        limit,
        exclude_garment_ids: excludeIds,
        filters,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC GetRecommendations error:', error);
          reject(error);
        } else {
          resolve(response.recommendations);
        }
      }
    );
  });
}

export async function calculateCompatibility(
  userId1: string,
  userId2: string,
  garmentId1: string,
  garmentId2?: string
): Promise<CompatibilityResponse> {
  return new Promise((resolve, reject) => {
    const client = getMatchingClient();
    client.CalculateCompatibility(
      {
        user_id_1: userId1,
        user_id_2: userId2,
        garment_id_1: garmentId1,
        garment_id_2: garmentId2,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC CalculateCompatibility error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

export async function updateStyleVector(
  userId: string,
  interactions: UpdateStyleVectorRequest['interactions']
): Promise<UpdateStyleVectorResponse> {
  return new Promise((resolve, reject) => {
    const client = getMatchingClient();
    client.UpdateStyleVector(
      {
        user_id: userId,
        interactions,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC UpdateStyleVector error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

export async function getSimilarGarments(
  garmentId: string,
  limit: number = 10,
  excludeIds: string[] = []
): Promise<SimilarGarmentsResponse['garments']> {
  return new Promise((resolve, reject) => {
    const client = getMatchingClient();
    client.GetSimilarGarments(
      {
        garment_id: garmentId,
        limit,
        exclude_ids: excludeIds,
      },
      (error, response) => {
        if (error) {
          console.error('gRPC GetSimilarGarments error:', error);
          reject(error);
        } else {
          resolve(response.garments);
        }
      }
    );
  });
}
