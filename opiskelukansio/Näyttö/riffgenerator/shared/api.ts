/**
 * API client utilities for communicating with the Python backend
 */

import { 
  RiffData, 
  ConversionResult, 
  GenerateRiffRequest, 
  ConvertAudioRequest, 
  ApiResponse,
  ExportFormat 
} from '../shared/types';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000'  // Development
  : 'https://your-production-api.com';  // Production

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Generate riff
  async generateRiff(params: GenerateRiffRequest): Promise<ApiResponse<RiffData>> {
    return this.request<RiffData>('/api/generate-riff', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Convert audio to MIDI
  async convertAudio(file: File): Promise<ApiResponse<ConversionResult>> {
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const url = `${this.baseUrl}/api/convert-audio`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Audio conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed'
      };
    }
  }

  // Get available styles
  async getAvailableStyles(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/api/styles');
  }

  // Export riff
  async exportRiff(riff: RiffData, format: ExportFormat): Promise<Blob | null> {
    try {
      const url = `${this.baseUrl}/api/export/${format}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ riff }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  }

  // Set base URL (useful for switching between dev/prod)
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  // Get current base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };