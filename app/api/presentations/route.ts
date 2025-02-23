import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { PresentationConfig } from '@/types/presentation';
import { transformPresentation } from '@/utils/presentationTransformer';

// Types for element-based slides
interface Position {
  left: number;
  top: number;
}

interface Size {
  width: number;
  height: number;
}

interface RgbColor {
  red?: number;
  green?: number;
  blue?: number;
}

interface TextStyle {
  bold?: boolean;
  fontSize?: {
    magnitude: number;
    unit: string;
  };
  foregroundColor?: {
    opaqueColor: {
      rgbColor: RgbColor;
    };
  };
}

interface BaseElement {
  type: string;
  position: Position;
  size: Size;
}

interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  style?: TextStyle;
}

interface ImageElement extends BaseElement {
  type: 'image';
  content: string; // URL of the image
}

interface ShapeElement extends BaseElement {
  type: 'shape';
  shape_type: string;
  fill_color: RgbColor;
}

type SlideElement = TextElement | ImageElement | ShapeElement;

interface SlideRequest {
  elements: SlideElement[];
}

interface PresentationRequest {
  title: string;
  slides: SlideRequest[];
}

interface PresentationResponse {
  presentation_id: string;
  title: string;
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    console.log('Starting presentation creation...');
    
    // Get tokens from Supabase
    const { data: tokens, error: tokenError } = await supabase
      .from('user_auth')
      .select('*');

    if (tokenError || !tokens || tokens.length === 0) {
      console.error('Token error:', tokenError);
      return NextResponse.json(
        { error: 'No valid tokens found' },
        { status: 401 }
      );
    }

    console.log('Found tokens in Supabase');

    // Get a valid access token for the first user
    const validAccessToken = await getValidAccessToken(tokens[0].user_id);
    if (!validAccessToken) {
      console.error('Failed to get valid access token');
      return NextResponse.json(
        { error: 'Failed to get valid access token' },
        { status: 401 }
      );
    }

    console.log('Got valid access token');

    // Get the request body
    const presentationConfig: PresentationConfig = await req.json();
    console.log('Request config:', JSON.stringify(presentationConfig, null, 2));

    // Check if slides already have elements
    if (presentationConfig.slides?.[0]?.elements) {
      // If slides already have elements, return them directly
      console.log('Slides already have elements, skipping transformation');
      return NextResponse.json({
        title: presentationConfig.title,
        slides: presentationConfig.slides
      });
    }

    // Transform the high-level config into the detailed format
    const presentationData = transformPresentation(
      presentationConfig.title,
      presentationConfig.theme,
      presentationConfig.slides
    );
    console.log('Transformed data:', JSON.stringify(presentationData, null, 2));

    // Make the request to your FastAPI backend
    const requestBody = {
      title: presentationData.title,
      slides: presentationData.slides.map(slide => ({
        elements: slide.elements
      }))
    };
    console.log('Sending to FastAPI:', JSON.stringify(requestBody, null, 2));

    console.log('Making request to FastAPI presentations endpoint...');
    const response = await fetch('http://localhost:8000/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validAccessToken}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('FastAPI response status:', response.status);
    console.log('FastAPI response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('FastAPI error:', errorData);
      return NextResponse.json(
        { 
          error: errorData.detail || 'Failed to create presentation',
          status: response.status,
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully created presentation. Response data:', JSON.stringify(data, null, 2));
    
    if (!data.url) {
      console.error('Missing presentation URL in response:', data);
      return NextResponse.json(
        { error: 'Invalid response: missing presentation URL' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in presentation creation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 