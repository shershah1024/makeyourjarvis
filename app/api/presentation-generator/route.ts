import { NextRequest, NextResponse } from 'next/server';
import { createAzure } from '@ai-sdk/azure';
import { generateObject } from 'ai';
import { z } from 'zod';
import { THEMES, ThemeName } from '@/types/presentation';

const azure = createAzure({
  resourceName: 'shahiroai1',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

const model = azure('gpt-4o-3');

// Schema for slide content
const TitleSlideContent = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1)
});

const TwoColumnContent = z.object({
  title: z.string().min(1),
  leftTitle: z.string().min(1),
  rightTitle: z.string().min(1),
  leftContent: z.string().min(1),
  rightContent: z.string().min(1)
});

const ImageContent = z.object({
  title: z.string().min(1),
  caption: z.string().min(1),
  imagePlaceholder: z.string().min(1).describe('Description of what kind of image should be shown')
});

const QuoteContent = z.object({
  quote: z.string().min(1),
  author: z.string().min(1),
  context: z.string().min(1)
});

const BulletPointsContent = z.object({
  title: z.string().min(1),
  points: z.array(z.string().min(1)).min(1)
});

const NumberPointsContent = z.object({
  title: z.string().min(1),
  points: z.array(z.string().min(1)).min(1)
});

const SlideSchema = z.object({
  type: z.enum([
    'TITLE_GRADIENT',
    'TITLE_CENTERED',
    'TITLE_LEFT',
    'TWO_COLUMNS_EQUAL',
    'TWO_COLUMNS_LEFT_WIDE',
    'TWO_COLUMNS_RIGHT_WIDE',
    'IMAGE_CENTERED',
    'QUOTE_CENTERED',
    'QUOTE_SIDE',
    'BULLET_POINTS',
    'NUMBER_POINTS'
  ]),
  content: z.union([
    TitleSlideContent,
    TwoColumnContent,
    ImageContent,
    QuoteContent,
    BulletPointsContent,
    NumberPointsContent
  ])
});

const PresentationSchema = z.object({
  title: z.string(),
  theme: z.enum(['MIDNIGHT', 'SUNSET', 'FOREST', 'TECH', 'MINIMAL'] as const).describe('The theme that best matches the presentation content and purpose'),
  slides: z.array(SlideSchema),
  themeReasoning: z.string().describe('Explanation of why this theme was chosen'),
  presentationFlow: z.array(z.string()).describe('Description of how the presentation flows and why slides are ordered this way'),
  inferredDetails: z.object({
    audience: z.string().describe('The inferred target audience based on the topic'),
    purpose: z.string().describe('The inferred purpose of the presentation'),
    keyPoints: z.array(z.string()).describe('Key points extracted and expanded from the topic')
  })
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { topic } = await req.json();
    
    if (!topic) {
      throw new Error('Missing required data: topic is required');
    }

    const prompt = `Create a professional presentation about the following topic:

    Topic: ${topic}

    First, analyze the topic and infer:
    1. The most suitable target audience
    2. The primary purpose of the presentation
    3. Key points that should be covered
    4. The most appropriate theme from the available options

    Available Themes:
    - MIDNIGHT: Deep blue with modern accents, professional and tech-forward
    - SUNSET: Purple to coral gradient, modern and creative
    - FOREST: Rich greens with earth tones, sophisticated and natural
    - TECH: Dark base with electric blue and hot pink, modern tech startup feel
    - MINIMAL: Clean black and white with red accent, ultra-modern

    For each slide, you MUST provide complete content based on the slide type:

    1. For TITLE slides (TITLE_GRADIENT, TITLE_CENTERED, TITLE_LEFT):
       - title: Main title text
       - subtitle: Supporting subtitle text

    2. For TWO_COLUMN slides (TWO_COLUMNS_EQUAL, TWO_COLUMNS_LEFT_WIDE, TWO_COLUMNS_RIGHT_WIDE):
       - title: Section title
       - leftTitle: Left column header
       - rightTitle: Right column header
       - leftContent: Detailed content for left column
       - rightContent: Detailed content for right column

    3. For IMAGE slides (IMAGE_CENTERED):
       - title: Image section title
       - caption: Description of the image
       - imagePlaceholder: Detailed description of what image should be shown

    4. For QUOTE slides (QUOTE_CENTERED, QUOTE_SIDE):
       - quote: The full quote text
       - author: Name of the person being quoted
       - context: Background or context for the quote

    5. For BULLET_POINTS and NUMBER_POINTS:
       - title: Section title
       - points: Array of detailed bullet points

    Create a complete presentation including:
    1. An engaging title that may be different from the input topic
    2. A logical flow of slides that effectively communicates the key points
    3. Appropriate mix of different slide layouts
    4. Clear and concise content for each slide
    5. Descriptive placeholders for images

    The presentation should be professional, engaging, and suitable for the target audience.
    Choose layouts and content that best serve the message.`;
    
    const { object: presentation } = await generateObject({
      model: model,
      schema: PresentationSchema,
      prompt: prompt,
    });

    return NextResponse.json({
      title: presentation.title,
      theme: presentation.theme,
      slides: presentation.slides,
      themeReasoning: presentation.themeReasoning,
      presentationFlow: presentation.presentationFlow,
      inferredDetails: presentation.inferredDetails
    });

  } catch (error) {
    const errorDetails = {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    };

    console.error('[Presentation Generation] Process failed', errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: errorDetails.message 
      }, 
      { status: 500 }
    );
  }
} 