import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getValidAccessToken } from '@/utils/auth';

export interface ChainedApiConfig {
  steps: ApiRequestConfig[];
  transforms?: {
    extractPath?: string[];        // Path to extract from previous response
    injectPath?: string;          // Where to inject in next request
    transformFn?: string;         // Name of predefined transform function
  }[];
}

interface ApiRequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
}

interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  simplifiedContent?: any;
  contentType: ContentType;
  contentFormat?: string;
}

type ContentType = 
  | 'text'
  | 'json'
  | 'image'
  | 'audio'
  | 'video'
  | 'binary'
  | 'stream'
  | 'unknown';

// Predefined transform functions
const transformFunctions: Record<string, (data: any) => any> = {
  // Extract text from OpenAI response
  extractOpenAIText: (data: any) => data?.choices?.[0]?.message?.content || data,
  // Convert text to speech payload
  textToSpeechPayload: (text: string) => ({
    model: "tts-1",
    voice: "alloy",
    input: text
  }),
  // Identity function
  identity: (data: any) => data
};

// Helper function to extract value using path
function extractByPath(data: any, path: string[]): any {
  return path.reduce((acc, key) => acc?.[key], data);
}

// Helper function to inject value at path
function injectAtPath(obj: any, path: string, value: any): any {
  const parts = path.split('.');
  const lastPart = parts.pop()!;
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  target[lastPart] = value;
  return obj;
}

// Helper to determine content type from headers
function getContentType(headers: Record<string, string>): { type: ContentType; format?: string } {
  const contentType = headers['content-type'] || '';
  
  if (contentType.includes('application/json')) {
    return { type: 'json' };
  }
  if (contentType.includes('text/')) {
    return { type: 'text' };
  }
  if (contentType.includes('image/')) {
    return { 
      type: 'image',
      format: contentType.split('/')[1]
    };
  }
  if (contentType.includes('audio/')) {
    return { 
      type: 'audio',
      format: contentType.split('/')[1]
    };
  }
  if (contentType.includes('video/')) {
    return { 
      type: 'video',
      format: contentType.split('/')[1]
    };
  }
  if (contentType.includes('application/octet-stream')) {
    return { type: 'binary' };
  }
  return { type: 'unknown' };
}

async function makeApiCall(config: ApiRequestConfig): Promise<ApiResponse<any>> {
  const { url, method, headers = {}, body, params, responseType = 'json' } = config;

  try {
    // Build URL with params if they exist
    let fullUrl = url;
    if (params) {
      const paramString = new URLSearchParams(params).toString();
      fullUrl = `${url}?${paramString}`;
    }

    console.log(`Making API call to: ${fullUrl}`);
    console.log('Headers:', headers);
    console.log('Body:', body);

    // Make the fetch request
    const response = await fetch(fullUrl, {
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log('Response status:', response.status);
    console.log('Response headers:', responseHeaders);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}\nDetails: ${errorText}`);
    }

    const { type: contentType, format } = getContentType(responseHeaders);
    console.log('Detected content type:', contentType, format);

    // Handle response based on content type
    let data;
    try {
      switch (responseType) {
        case 'json':
          data = await response.json();
          break;
        case 'text':
          data = await response.text();
          break;
        case 'blob':
          data = await response.blob();
          break;
        case 'arrayBuffer':
          data = await response.arrayBuffer();
          break;
        default:
          data = await response.json();
      }
    } catch (parseError: unknown) {
      console.error('Error parsing response:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      throw new Error(`Failed to parse ${responseType} response: ${errorMessage}`);
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      simplifiedContent: data,
      contentType,
      contentFormat: format
    };
  } catch (error) {
    console.error('makeApiCall error:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get the session token
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get a valid access token
    const accessToken = await getValidAccessToken(token.sub);
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get valid access token' }, { status: 401 });
    }

    console.log('Received chainFetch request');
    const config: ChainedApiConfig = await req.json();
    console.log('Request config:', JSON.stringify(config, null, 2));

    // Add the access token to all requests that need it
    config.steps = config.steps.map(step => {
      if (step.url.includes('api.openai.com')) {
        return {
          ...step,
          headers: {
            ...step.headers,
            'Authorization': `Bearer ${accessToken}`
          }
        };
      }
      return step;
    });

    const responses: ApiResponse<any>[] = [];
    let currentData: any = null;

    // Execute each step in the chain
    for (let i = 0; i < config.steps.length; i++) {
      console.log(`\nExecuting step ${i + 1}/${config.steps.length}`);
      const step = config.steps[i];
      const transform = config.transforms?.[i];

      // If not the first step and we have transforms, apply them
      if (i > 0 && transform && currentData) {
        console.log('Applying transforms to data:', transform);
        
        // Extract data from previous response if path specified
        if (transform.extractPath) {
          console.log('Extracting data using path:', transform.extractPath);
          currentData = extractByPath(currentData, transform.extractPath);
          console.log('Extracted data:', currentData);
        }

        // Apply transform function if specified
        if (transform.transformFn && transformFunctions[transform.transformFn]) {
          console.log('Applying transform function:', transform.transformFn);
          currentData = transformFunctions[transform.transformFn](currentData);
          console.log('Transformed data:', currentData);
        }

        // Inject transformed data into next request
        if (transform.injectPath) {
          console.log('Injecting data at path:', transform.injectPath);
          step.body = injectAtPath(step.body || {}, transform.injectPath, currentData);
        } else {
          step.body = currentData;
        }
        console.log('Final request body:', step.body);
      }

      // Make the API call
      const response = await makeApiCall(step);
      responses.push(response);
      currentData = response.data;
    }

    console.log('Chain completed successfully');
    return NextResponse.json({ steps: responses });
  } catch (error) {
    console.error('Chain execution error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 