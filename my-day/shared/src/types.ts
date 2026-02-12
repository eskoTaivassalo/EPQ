export interface Task {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewTask {
  title: string;
  description?: string;
}

export interface UpdateTask {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
