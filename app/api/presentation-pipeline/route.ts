import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { ThemeName, SlideConfig, ImageSlideContent } from '@/types/presentation';
import { transformPresentation } from '@/utils/presentationTransformer';

interface PresentationRequest {
  topic: string;
  keyPoints: string[];
  audience?: string;
  purpose?: string;
  preferredTheme?: string;
}

async function generateImage(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:3000/api/images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      style: 'realistic_image',
      additional_params: {}  // Removed high quality setting
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to generate image: ${error.details || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.url;
}

async function processImageSlides(slides: SlideConfig[]): Promise<SlideConfig[]> {
  const processedSlides = await Promise.all(
    slides.map(async (slide) => {
      // Only process slides that have imagePlaceholder
      if (
        slide.type === 'IMAGE_CENTERED' &&
        slide.content &&
        typeof slide.content === 'object' &&
        'imagePlaceholder' in slide.content &&
        typeof slide.content.imagePlaceholder === 'string'
      ) {
        const content = slide.content as ImageSlideContent & { imagePlaceholder: string };
        try {
          console.log('Generating image for prompt:', content.imagePlaceholder);
          const imageUrl = await generateImage(content.imagePlaceholder);
          
          return {
            ...slide,
            content: {
              ...content,
              imageUrl // Replace imagePlaceholder with actual image URL
            }
          };
        } catch (error) {
          console.error('Failed to generate image:', error);
          // Return the slide without an image if generation fails
          return slide;
        }
      }
      return slide;
    })
  );

  return processedSlides;
}

function validateAndFixSlide(slide: any): SlideConfig {
  console.log('Validating slide:', JSON.stringify(slide, null, 2));
  
  if (!slide.type || !slide.content) {
    console.error('Invalid slide:', slide);
    throw new Error('Invalid slide: missing type or content');
  }

  const content = { ...slide.content };
  console.log('Processing slide type:', slide.type);

  switch (slide.type) {
    case 'TITLE_GRADIENT':
    case 'TITLE_CENTERED':
    case 'TITLE_LEFT':
      console.log('Title slide content before:', content);
      if (!content.subtitle) {
        content.subtitle = ''; // Ensure subtitle exists
      }
      console.log('Title slide content after:', content);
      break;

    case 'TWO_COLUMNS_EQUAL':
    case 'TWO_COLUMNS_LEFT_WIDE':
    case 'TWO_COLUMNS_RIGHT_WIDE':
      console.log('Two columns content before:', content);
      if (!content.leftTitle) content.leftTitle = '';
      if (!content.rightTitle) content.rightTitle = '';
      if (!content.leftContent) throw new Error('Missing leftContent in two-column slide');
      if (!content.rightContent) throw new Error('Missing rightContent in two-column slide');
      console.log('Two columns content after:', content);
      break;

    case 'IMAGE_CENTERED':
      console.log('Image slide content before:', content);
      if (!content.caption) content.caption = '';
      // Don't validate imageUrl here as it will be generated later
      console.log('Image slide content after:', content);
      break;

    case 'QUOTE_CENTERED':
    case 'QUOTE_SIDE':
      console.log('Quote slide content before:', content);
      if (!content.context) content.context = '';
      if (!content.quote) throw new Error('Missing quote in quote slide');
      if (!content.author) throw new Error('Missing author in quote slide');
      console.log('Quote slide content after:', content);
      break;

    case 'BULLET_POINTS':
    case 'NUMBER_POINTS':
      console.log('Points slide content before:', content);
      if (!Array.isArray(content.points) || content.points.length === 0) {
        throw new Error('Missing or empty points array in bullet/number points slide');
      }
      console.log('Points slide content after:', content);
      break;

    default:
      console.error('Unknown slide type:', slide.type);
      throw new Error(`Unknown slide type: ${slide.type}`);
  }

  const result = {
    type: slide.type,
    content,
  };
  console.log('Validated slide result:', JSON.stringify(result, null, 2));
  return result;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
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

    // Step 1: Get the presentation request from the user
    const presentationRequest: PresentationRequest = await req.json();
    console.log('Received request:', JSON.stringify(presentationRequest, null, 2));
    
    // Step 2: Generate the presentation structure using AI
    const aiResponse = await fetch('http://localhost:3000/api/presentation-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(presentationRequest),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI generation failed:', errorText);
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const aiGeneratedPresentation = await aiResponse.json();
    console.log('AI generated presentation:', JSON.stringify(aiGeneratedPresentation, null, 2));

    // Log the structure of the first slide for debugging
    if (aiGeneratedPresentation.slides && aiGeneratedPresentation.slides.length > 0) {
      console.log('First slide structure:', {
        keys: Object.keys(aiGeneratedPresentation.slides[0]),
        type: aiGeneratedPresentation.slides[0].type,
        contentKeys: aiGeneratedPresentation.slides[0].content ? Object.keys(aiGeneratedPresentation.slides[0].content) : 'no content',
      });
    }

    // Validate and fix slides
    const validatedSlides = aiGeneratedPresentation.slides.map((slide: any, index: number) => {
      try {
        return validateAndFixSlide(slide);
      } catch (error) {
        throw new Error(`Error in slide ${index}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Generate images for image slides
    console.log('Generating images for slides...');
    const slidesWithImages = await processImageSlides(validatedSlides);
    console.log('Finished generating images');

    // Step 3: Transform the AI response into the format expected by our presentation endpoint
    const transformedPresentation = transformPresentation(
      aiGeneratedPresentation.title,
      aiGeneratedPresentation.theme as ThemeName,
      slidesWithImages
    );

    console.log('Transformed presentation:', JSON.stringify(transformedPresentation, null, 2));

    // Step 4: Send the presentation to the FastAPI backend
    console.log('Making request to FastAPI presentations endpoint...');
    const presentationPayload = {
      title: transformedPresentation.title,
      slides: await Promise.all(transformedPresentation.slides.map(async slide => ({
        elements: await Promise.all(slide.elements.map(async element => {
          if (element.type === 'image' && element.content) {
            // Ensure proper URL formatting with double slashes
            const formattedUrl = element.content
              .replace(/([^:])\/+/g, '$1/') // Fix any duplicate slashes except after protocol
              .replace(/^https?:\/?\/?\/?/, 'https://'); // Ensure proper protocol format
            
            console.log('Processing image URL:', formattedUrl);
            
            // Verify the image URL is accessible
            try {
              const verifyResponse = await fetch(formattedUrl, { method: 'HEAD' });
              if (!verifyResponse.ok) {
                console.error(`Image URL not accessible: ${formattedUrl}`);
                throw new Error(`Image URL not accessible: ${verifyResponse.status}`);
              }
              console.log('Image URL verified as accessible:', formattedUrl);
              
              // Check content type
              const contentType = verifyResponse.headers.get('content-type');
              console.log('Image content type:', contentType);
              
              if (!contentType?.startsWith('image/')) {
                throw new Error(`Invalid content type: ${contentType}`);
              }
            } catch (error: any) {
              console.error('Error verifying image URL:', error);
              throw new Error(`Failed to verify image URL: ${error.message || String(error)}`);
            }

            return {
              ...element,
              content: formattedUrl
            };
          }
          return element;
        }))
      })))
    };

    console.log('Sending presentation payload:', JSON.stringify(presentationPayload, null, 2));

    const response = await fetch('http://localhost:8000/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validAccessToken}`
      },
      body: JSON.stringify(presentationPayload)
    });

    console.log('FastAPI response status:', response.status);
    console.log('FastAPI response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('FastAPI error:', errorData);
      
      // Handle rate limit errors
      if (errorData.detail?.includes('RATE_LIMIT_EXCEEDED')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'Please try again in a minute',
            retryAfter: 60
          },
          { status: 429 }
        );
      }

      // Handle Google Slides API errors
      if (errorData.detail?.includes('slides.googleapis.com')) {
        // Check if token is expired
        const tokenExpiredMatch = errorData.detail.match(/invalid_grant|expired|unauthorized/i);
        if (tokenExpiredMatch) {
          return NextResponse.json(
            {
              error: 'Authentication Error',
              message: 'Your Google Slides access has expired. Please sign in again.',
              code: 'TOKEN_EXPIRED'
            },
            { status: 401 }
          );
        }

        // Other Google Slides API errors
        return NextResponse.json(
          {
            error: 'Google Slides Error',
            message: 'Failed to create presentation in Google Slides. Please try again.',
            details: errorData.detail
          },
          { status: 500 }
        );
      }
      
      throw new Error(`FastAPI error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Successfully created presentation. Response data:', JSON.stringify(data, null, 2));
    
    if (!data.url) {
      console.error('Missing presentation URL in response:', data);
      throw new Error('Invalid response: missing presentation URL');
    }

    // Step 5: Return the complete response including AI reasoning and the final presentation URL
    return NextResponse.json({
      ...data,
      themeReasoning: aiGeneratedPresentation.themeReasoning,
      presentationFlow: aiGeneratedPresentation.presentationFlow,
      generationTime: `${Date.now() - startTime}ms`,
    });

  } catch (error) {
    console.error('[Presentation Pipeline] Process failed:', error);
    // Add more context to the error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      message: errorMessage,
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : typeof error
    };
    
    return NextResponse.json(
      { 
        error: 'Pipeline Error',
        ...errorDetails
      },
      { status: 500 }
    );
  }
} 