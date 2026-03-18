export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
}
