import { HealthSummary, PodHealth, DB2Health, StorageHealth, BackupHealth, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class ApiService {
  private async fetchApi<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<T> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }
      
      return result.data as T;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getHealthSummary(): Promise<HealthSummary> {
    return this.fetchApi<HealthSummary>('/api/health/summary');
  }

  async getPodHealth(): Promise<PodHealth> {
    return this.fetchApi<PodHealth>('/api/health/pod');
  }

  async getDB2Health(): Promise<DB2Health> {
    return this.fetchApi<DB2Health>('/api/health/db2');
  }

  async getStorageHealth(): Promise<StorageHealth> {
    return this.fetchApi<StorageHealth>('/api/health/storage');
  }

  async getBackupHealth(): Promise<BackupHealth> {
    return this.fetchApi<BackupHealth>('/api/health/backup');
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default new ApiService();

// Made with Bob
