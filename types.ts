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
