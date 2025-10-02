import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  Message, 
  MessageFilters, 
  CreateMessageRequest, 
  UpdateMessageStatusRequest, 
  ReplyMessageRequest,
  LoginRequest,
  AuthResponse,
  ApiResponse 
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3002';
    
    this.api = axios.create({
      baseURL: this.baseURL + '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Добавляем токен к каждому запросу
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Обрабатываем ответы
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/login', credentials);
      
      if (response.data.success && response.data.data?.token) {
        localStorage.setItem('admin_token', response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  }

  async verifyToken(): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.get('/auth/verify');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Token verification failed'
      };
    }
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  }

  // Messages
  async getMessages(filters?: MessageFilters): Promise<ApiResponse<Message[]>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response: AxiosResponse<ApiResponse<Message[]>> = await this.api.get(
        `/messages?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch messages'
      };
    }
  }

  async getMessageById(id: number): Promise<ApiResponse<Message>> {
    try {
      const response: AxiosResponse<ApiResponse<Message>> = await this.api.get(`/messages/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch message'
      };
    }
  }

  async createMessage(data: CreateMessageRequest): Promise<ApiResponse<Message>> {
    try {
      const response: AxiosResponse<ApiResponse<Message>> = await this.api.post('/messages', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create message'
      };
    }
  }

  async updateMessageStatus(id: number, data: UpdateMessageStatusRequest): Promise<ApiResponse<Message>> {
    try {
      const response: AxiosResponse<ApiResponse<Message>> = await this.api.put(`/messages/${id}/status`, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update message status'
      };
    }
  }

  async replyToMessage(id: number, data: ReplyMessageRequest): Promise<ApiResponse<Message>> {
    try {
      const response: AxiosResponse<ApiResponse<Message>> = await this.api.post(`/messages/${id}/reply`, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reply to message'
      };
    }
  }

  async deleteMessage(id: number): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.delete(`/api/messages/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete message'
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
