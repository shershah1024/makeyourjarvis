import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { fal } from '@fal-ai/client';

// Initialize fal client
fal.config({
  // The client will use FAL_KEY environment variable automatically
  proxyUrl: '/api/fal/proxy'  // Optional: proxy requests through our API
});

interface ImageGenerationRequest {
  prompt: string;
  style?: string;
  additional_params?: Record<string, any>;
}

interface ImageData {
  url: string;
  content_type: string;
  file_name: string;
  file_size: number;
}

export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json() as ImageGenerationRequest;

    // Prepare request with image parameters
    const imageParams = {
      ...requestData.additional_params,
      quality: 85    // Good quality but smaller file size
    };

    console.log('Sending request to Fal AI:', {
      ...requestData,
      additional_params: imageParams
    });

    // Generate image using Fal AI directly
    const { data, requestId } = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
      input: {
        prompt: requestData.prompt
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs?.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('Received response from Fal AI:', {
      data: JSON.stringify(data, null, 2),
      requestId,
      dataType: typeof data,
      hasImages: Array.isArray(data?.images),
      imageType: data?.images?.[0] ? typeof data.images[0] : 'undefined',
      contentType: data?.images?.[0]?.content_type
    });

    if (!data || typeof data !== 'object' || !Array.isArray(data.images)) {
      throw new Error('Invalid response from Fal AI');
    }

    // Get the first generated image
    const imageData = data.images[0] as unknown as ImageData;
    console.log('Image data type:', typeof imageData);
    console.log('Image data keys:', Object.keys(imageData));
    console.log('Image data:', imageData);

    if (!imageData.url) {
      throw new Error('No image URL found in the response');
    }

    // Fetch the image from the URL
    const imageResponse = await fetch(imageData.url);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image from Fal AI');
    }

    // Log response headers
    console.log('Fal AI image response headers:', {
      contentType: imageResponse.headers.get('content-type'),
      contentLength: imageResponse.headers.get('content-length'),
      allHeaders: Object.fromEntries(imageResponse.headers.entries())
    });

    // Get the image data as an ArrayBuffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate a unique filename using timestamp and random string for uniqueness
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `generated_image_${timestamp}_${randomString}.jpg`;

    // Upload to Supabase Storage with JPEG format
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('presentation_images')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('presentation_images')
      .getPublicUrl(filename);

    // Ensure the URL is properly formatted
    const formattedPublicUrl = publicUrl
      .replace(/([^:])\/+/g, '$1/') // Fix any duplicate slashes except after protocol
      .replace(/^https?:\/?\/?\/?/, 'https://'); // Ensure proper protocol format

    console.log('Generated public URL:', formattedPublicUrl);
    
    // Verify the URL is accessible
    try {
      const verifyResponse = await fetch(formattedPublicUrl, { method: 'HEAD' });
      if (!verifyResponse.ok) {
        throw new Error(`URL not accessible: ${verifyResponse.status}`);
      }
      console.log('URL verified as accessible');
    } catch (error) {
      console.error('Error verifying URL:', error);
    }

    return NextResponse.json({
      success: true,
      url: formattedPublicUrl,
      filename,
      requestId,
      originalUrl: imageData.url
    });

  } catch (error) {
    console.error('Image generation/upload failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate/upload image',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 