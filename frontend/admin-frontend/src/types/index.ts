export interface Message {
  id: number;
  user_id: string;
  text: string;
  status: 'new' | 'in_progress' | 'resolved';
  reply?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageFilters {
  status?: 'new' | 'in_progress' | 'resolved';
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export interface CreateMessageRequest {
  userId: string;
  text: string;
}

export interface UpdateMessageStatusRequest {
  status: 'new' | 'in_progress' | 'resolved';
}

export interface ReplyMessageRequest {
  text: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    username: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  username: string;
  role: string;
}
