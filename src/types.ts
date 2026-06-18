export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface StarterPrompt {
  id: string;
  label: string;
  promptText: string;
  category: 'Concepts' | 'History' | 'Ethics' | 'Future';
}
