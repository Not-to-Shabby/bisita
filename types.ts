export interface Attraction {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  entranceFee?: string;
  operatingHours?: string;
}

export interface Business {
  id: string;
  name: string;
  type: 'Accommodation' | 'Restaurant' | 'Activity' | 'Guide';
  rating: number;
  reviews: number;
  image: string;
}

export interface User {
  name: string;
  email: string;
  joinedDate: string;
  avatar: string;
  reviewCount: number;
  contributionCount: number;
}

export interface QuestTask {
  id: string;
  title: string;
  description: string;
  locationId?: string; // Link to an attraction
  isCompleted: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  image: string;
  badgeImage: string;
  tasks: QuestTask[];
  reward: string;
  totalExp: number;
}

export interface UserQuestProgress {
  questId: string;
  userId: string;
  completedTaskIds: string[];
  status: 'active' | 'completed';
  startedAt: string;
  completedAt?: string;
}
