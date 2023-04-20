export interface ITask {
  id: string;
  user: string;
  title: string;
  description: string;
  status: 2 | 1 | 0;
  due_date: number;
}

export interface IUser {
  id: string;
}

export type ServerResponse<T = any> =
  | {
      error: false;
      data: T;
    }
  | {
      error: true;
      data: string;
    };
