// app/api/openFetch/route.ts
import { NextRequest, NextResponse } from 'next/server';

export interface ApiRequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
  chainConfig?: {
    next?: ApiRequestConfig;
    extractPath?: string[];        // Path to extract from previous response
    injectPath?: string;          // Where to inject in next request
    transformFn?: string;         // Name of predefined transform function
  };
}

export type ContentType = 
  | 'text'        // Plain text responses
  | 'json'        // JSON data
  | 'image'       // Image data
  | 'audio'       // Audio data
  | 'video'       // Video data
  | 'binary'      // Other binary data
  | 'stream'      // Stream data
  | 'unknown';    // Fallback type

// Predefined transform functions
const transformFunctions: Record<string, (data: any) => any> = {
  // Extract text from OpenAI response
  extractOpenAIText: (data: any) => data?.choices?.[0]?.message?.content || data,
  // Convert text to speech payload
  textToSpeechPayload: (text: string) => ({
    input: { text },
    voice: "alloy",
    model: "tts-1"
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

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  simplifiedContent?: any;
  contentType: ContentType;
  contentFormat?: string;
  chainedResponse?: ApiResponse<any>; // Response from chained API call
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

// Utility function to extract content based on common API patterns
function extractMainContent(data: any, contentType: ContentType): any {
  // Handle different content types
  switch (contentType) {
    case 'json':
      // Handle common JSON API patterns
      if (data?.choices?.[0]?.message?.content) {
        // OpenAI API
        return data.choices[0].message.content;
      }
      if (data?.content) {
        // Generic content field
        return data.content;
      }
      if (data?.data) {
        // Common API wrapper pattern
        return data.data;
      }
      if (Array.isArray(data)) {
        // Array responses
        return data;
      }
      // If no special handling, return as is
      return data;

    case 'text':
      return data;

    case 'image':
    case 'audio':
    case 'video':
    case 'binary':
      // For binary data, we return a reference to the data
      // and information about how to handle it
      return {
        type: contentType,
        data: data,
        size: data.length,
        format: data.format
      };

    case 'stream':
      return {
        type: 'stream',
        stream: data
      };

    default:
      return data;
  }
}

async function makeApiCall(config: ApiRequestConfig): Promise<ApiResponse<any>> {
  const { url, method, headers = {}, body, params, responseType = 'json' } = config;

  // Build URL with params if they exist
  let fullUrl = url;
  if (params) {
    const paramString = new URLSearchParams(params).toString();
    fullUrl = `${url}?${paramString}`;
  }

  // Make the fetch request
  const response = await fetch(fullUrl, {
    method,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
  }

  const responseHeaders = Object.fromEntries(response.headers.entries());
  const { type: contentType, format } = getContentType(responseHeaders);

  // Handle response based on content type
  let data;
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

  // Extract the simplified content
  const simplifiedContent = extractMainContent(data, contentType);

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    simplifiedContent,
    contentType,
    contentFormat: format
  };
}

export async function POST(req: NextRequest) {
  try {
    const config: ApiRequestConfig = await req.json();
    
    // Make the initial API call
    const response = await makeApiCall(config);

    // Handle chained API call if configured
    if (config.chainConfig?.next) {
      const { next, extractPath, injectPath, transformFn = 'identity' } = config.chainConfig;
      
      // Extract data from the first response
      let chainedData = extractPath 
        ? extractByPath(response.data, extractPath)
        : response.simplifiedContent;

      // Apply transform function if specified
      if (transformFn && transformFunctions[transformFn]) {
        chainedData = transformFunctions[transformFn](chainedData);
      }

      // Prepare the next request
      const nextConfig = { ...next };
      if (injectPath) {
        nextConfig.body = injectAtPath(
          nextConfig.body || {}, 
          injectPath, 
          chainedData
        );
      } else {
        nextConfig.body = chainedData;
      }

      // Make the chained API call
      const chainedResponse = await makeApiCall(nextConfig);
      response.chainedResponse = chainedResponse;
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}