import { getValidAccessToken } from '@/utils/auth';

export interface SlideRequest {
  layout: string;
  title?: string;
  content?: string;
  image_url?: string;
  background_color?: {
    red?: number;
    green?: number;
    blue?: number;
  };
  style?: Record<string, any>;
}

export interface PresentationRequest {
  title: string;
  slides?: SlideRequest[];
}

export interface MultiStylePresentationRequest {
  title: string;
  num_slides?: number;
  custom_shapes?: string[];
  custom_colors?: boolean;
}

export interface PresentationResponse {
  presentation_id: string;
  title: string;
  url: string;
}

export async function createPresentation(
  userId: string,
  request: PresentationRequest
): Promise<PresentationResponse> {
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error('Failed to get valid access token');
    }

    // Make the request to your FastAPI backend
    const response = await fetch('http://localhost:8000/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create presentation');
    }

    return response.json();
  } catch (error) {
    console.error('Error creating presentation:', error);
    throw error;
  }
}

export async function createMultiStylePresentation(
  userId: string,
  request: MultiStylePresentationRequest
): Promise<PresentationResponse> {
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error('Failed to get valid access token');
    }

    // Make the request to your FastAPI backend
    const response = await fetch('http://localhost:8000/presentations/multi-style', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create multi-style presentation');
    }

    return response.json();
  } catch (error) {
    console.error('Error creating multi-style presentation:', error);
    throw error;
  }
} 