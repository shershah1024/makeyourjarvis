import { NextRequest, NextResponse } from 'next/server';
import { createAzure } from '@ai-sdk/azure';
import { generateObject } from 'ai';
import { z } from 'zod';

const azure = createAzure({
  resourceName: 'shahiroai1',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

const model = azure('gpt-4o-3');

// Schema for different content types
const TextContent = z.object({
  content: z.string().min(1),
  style: z.enum(['NORMAL', 'EMPHASIS', 'HIGHLIGHT']).optional(),
});

const ImageGenerationPrompt = z.object({
  description: z.string().min(1).describe('Detailed description of the image to generate'),
  style: z.enum(['REALISTIC', 'ARTISTIC', 'TECHNICAL', 'MINIMALIST']).optional(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  placement: z.enum(['INLINE', 'FULL_WIDTH', 'SIDE']).optional(),
  caption: z.string().optional(),
});

const TableContent = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  caption: z.string().optional(),
});

const ChartContent = z.object({
  type: z.enum(['LINE', 'BAR', 'PIE', 'SCATTER']),
  data: z.record(z.string(), z.array(z.number())),
  labels: z.array(z.string()),
  title: z.string(),
  description: z.string().optional(),
});

const CodeBlockContent = z.object({
  code: z.string(),
  language: z.string(),
  caption: z.string().optional(),
});

const QuoteContent = z.object({
  text: z.string(),
  author: z.string(),
  source: z.string().optional(),
  year: z.string().optional(),
});

// Schema for section types
interface SectionType {
  type: 'EXECUTIVE_SUMMARY' | 'INTRODUCTION' | 'METHODOLOGY' | 'FINDINGS' | 'ANALYSIS' | 'CONCLUSION' | 'RECOMMENDATIONS' | 'APPENDIX';
  title: string;
  content: Array<
    | { content: string; style?: 'NORMAL' | 'EMPHASIS' | 'HIGHLIGHT' }
    | { description: string; style?: 'REALISTIC' | 'ARTISTIC' | 'TECHNICAL' | 'MINIMALIST'; size?: 'SMALL' | 'MEDIUM' | 'LARGE'; placement?: 'INLINE' | 'FULL_WIDTH' | 'SIDE'; caption?: string }
    | { headers: string[]; rows: string[][]; caption?: string }
    | { type: 'LINE' | 'BAR' | 'PIE' | 'SCATTER'; data: Record<string, number[]>; labels: string[]; title: string; description?: string }
    | { code: string; language: string; caption?: string }
    | { text: string; author: string; source?: string; year?: string }
  >;
  subsections?: SectionType[];
}

const Section: z.ZodType<SectionType> = z.lazy(() => z.object({
  type: z.enum([
    'EXECUTIVE_SUMMARY',
    'INTRODUCTION',
    'METHODOLOGY',
    'FINDINGS',
    'ANALYSIS',
    'CONCLUSION',
    'RECOMMENDATIONS',
    'APPENDIX'
  ]),
  title: z.string(),
  content: z.array(z.union([
    TextContent,
    ImageGenerationPrompt,
    TableContent,
    ChartContent,
    CodeBlockContent,
    QuoteContent
  ])),
  subsections: z.array(Section).optional(),
}));

// Schema for the complete report
const ReportSchema = z.object({
  title: z.string(),
  style: z.enum(['ACADEMIC', 'BUSINESS', 'TECHNICAL', 'CREATIVE']).describe('The overall style that best matches the report content and purpose'),
  sections: z.array(Section),
  metadata: z.object({
    author: z.string(),
    date: z.string(),
    version: z.string().optional(),
    keywords: z.array(z.string()),
    abstract: z.string()
  }),
  styleReasoning: z.string().describe('Explanation of why this style was chosen'),
  contentFlow: z.array(z.string()).describe('Description of how the report flows and why sections are ordered this way'),
  inferredDetails: z.object({
    audience: z.string().describe('The inferred target audience based on the topic'),
    purpose: z.string().describe('The inferred purpose of the report'),
    keyFindings: z.array(z.string()).describe('Key findings extracted and expanded from the topic'),
    suggestedNextSteps: z.array(z.string()).describe('Suggested next steps or actions based on the findings')
  })
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { topic } = await req.json();
    
    if (!topic) {
      throw new Error('Missing required data: topic is required');
    }

    const prompt = `Create a comprehensive report about the following topic:

    Topic: ${topic}

    First, analyze the topic and infer:
    1. The most suitable target audience
    2. The primary purpose of the report
    3. Key findings that should be covered
    4. The most appropriate style from the available options
    5. Suggested next steps based on the findings

    Available Styles:
    - ACADEMIC: Formal, research-oriented with citations and methodology
    - BUSINESS: Professional, action-oriented with executive summary
    - TECHNICAL: Detailed, process-focused with diagrams and code
    - CREATIVE: Engaging, story-driven with visual elements

    For each section, provide complete content including:
    1. Clear and engaging text content
    2. Relevant image generation prompts where visuals would enhance understanding
    3. Tables, charts, or code blocks where appropriate
    4. Supporting quotes or citations where relevant

    The report should include:
    1. An executive summary or abstract
    2. Clear section organization
    3. Supporting evidence and data
    4. Visual elements with detailed generation prompts
    5. Actionable conclusions and recommendations

    The report should be:
    1. Professional and well-structured
    2. Appropriate for the target audience
    3. Evidence-based and thorough
    4. Visually engaging where appropriate
    5. Actionable with clear next steps`;
    
    const { object: report } = await generateObject({
      model: model,
      schema: ReportSchema,
      prompt: prompt,
    });

    return NextResponse.json({
      title: report.title,
      style: report.style,
      sections: report.sections,
      metadata: report.metadata,
      styleReasoning: report.styleReasoning,
      contentFlow: report.contentFlow,
      inferredDetails: report.inferredDetails
    });

  } catch (error) {
    const errorDetails = {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    };

    console.error('[Report Generation] Process failed', errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: errorDetails.message 
      }, 
      { status: 500 }
    );
  }
} 