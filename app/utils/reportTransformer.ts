import { SectionType, Report, ReportStyle } from '@/types/report';

interface TransformedReport {
  title: string;
  style: ReportStyle;
  metadata: {
    author: string;
    date: string;
    version?: string;
    keywords: string[];
    abstract: string;
  };
  sections: TransformedSection[];
  styleReasoning: string;
  contentFlow: string[];
  inferredDetails: {
    audience: string;
    purpose: string;
    keyFindings: string[];
    suggestedNextSteps: string[];
  };
}

interface TransformedSection {
  type: SectionType['type'];
  title: string;
  content: TransformedContent[];
  subsections?: TransformedSection[];
}

type TransformedContent = {
  type: 'text' | 'image' | 'table' | 'chart' | 'code' | 'quote';
  content: any;
  style?: any;
};

type TextContent = { content: string; style?: 'NORMAL' | 'EMPHASIS' | 'HIGHLIGHT' };
type ImageContent = { description: string; style?: 'REALISTIC' | 'ARTISTIC' | 'TECHNICAL' | 'MINIMALIST'; size?: 'SMALL' | 'MEDIUM' | 'LARGE'; placement?: 'INLINE' | 'FULL_WIDTH' | 'SIDE'; caption?: string };
type TableContent = { headers: string[]; rows: string[][]; caption?: string };
type ChartContent = { type: 'LINE' | 'BAR' | 'PIE' | 'SCATTER'; data: Record<string, number[]>; labels: string[]; title: string; description?: string };
type CodeContent = { code: string; language: string; caption?: string };
type QuoteContent = { text: string; author: string; source?: string; year?: string };

function transformTextContent(content: TextContent): TransformedContent {
  return {
    type: 'text',
    content: content.content,
    style: content.style || 'NORMAL'
  };
}

function transformImagePrompt(content: ImageContent): TransformedContent {
  return {
    type: 'image',
    content: {
      description: content.description,
      caption: content.caption
    },
    style: {
      imageStyle: content.style || 'REALISTIC',
      size: content.size || 'MEDIUM',
      placement: content.placement || 'INLINE'
    }
  };
}

function transformTableContent(content: TableContent): TransformedContent {
  return {
    type: 'table',
    content: {
      headers: content.headers,
      rows: content.rows,
      caption: content.caption
    }
  };
}

function transformChartContent(content: ChartContent): TransformedContent {
  return {
    type: 'chart',
    content: {
      chartType: content.type,
      data: content.data,
      labels: content.labels,
      title: content.title,
      description: content.description
    }
  };
}

function transformCodeContent(content: CodeContent): TransformedContent {
  return {
    type: 'code',
    content: {
      code: content.code,
      language: content.language,
      caption: content.caption
    }
  };
}

function transformQuoteContent(content: QuoteContent): TransformedContent {
  return {
    type: 'quote',
    content: {
      text: content.text,
      author: content.author,
      source: content.source,
      year: content.year
    }
  };
}

function transformSection(section: SectionType): TransformedSection {
  return {
    type: section.type,
    title: section.title,
    content: section.content.map((content: SectionType['content'][number]) => {
      if ('content' in content) return transformTextContent(content as TextContent);
      if ('description' in content) return transformImagePrompt(content as ImageContent);
      if ('headers' in content) return transformTableContent(content as TableContent);
      if ('type' in content && 'data' in content) return transformChartContent(content as ChartContent);
      if ('code' in content) return transformCodeContent(content as CodeContent);
      if ('text' in content) return transformQuoteContent(content as QuoteContent);
      throw new Error('Unknown content type');
    }),
    subsections: section.subsections?.map(transformSection)
  };
}

export function transformReport(report: Report): TransformedReport {
  return {
    title: report.title,
    style: report.style,
    metadata: report.metadata,
    sections: report.sections.map(transformSection),
    styleReasoning: report.styleReasoning,
    contentFlow: report.contentFlow,
    inferredDetails: report.inferredDetails
  };
} 