export interface CreateAdRequest {
  title: string;
  price: number;
  imageBase64?: string;
}

export interface AdItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdResponse {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
}
