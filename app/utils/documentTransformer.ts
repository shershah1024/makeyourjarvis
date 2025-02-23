import { Report, SectionType } from '@/types/report';

type DocumentContentType = 
  | { type: 'text'; content: string; style?: 'NORMAL' | 'EMPHASIS' | 'HIGHLIGHT' }
  | { type: 'image'; content: string; caption?: string }
  | { type: 'table'; content: string; caption?: string }
  | { type: 'chart'; content: string }
  | { type: 'code'; content: string; language: string; caption?: string }
  | { type: 'quote'; content: string; attribution: string };

interface DocumentSection {
  heading: string;
  contents: DocumentContentType[];
}

interface DocumentRequest {
  title: string;
  content: {
    sections: DocumentSection[];
  };
}

// Type guards
function isTextContent(item: SectionType['content'][number]): item is { content: string; style?: 'NORMAL' | 'EMPHASIS' | 'HIGHLIGHT' } {
  return 'content' in item;
}

function isImageContent(item: SectionType['content'][number]): item is { description: string; style?: 'REALISTIC' | 'ARTISTIC' | 'TECHNICAL' | 'MINIMALIST'; size?: 'SMALL' | 'MEDIUM' | 'LARGE'; placement?: 'INLINE' | 'FULL_WIDTH' | 'SIDE'; caption?: string } {
  return 'description' in item;
}

function isTableContent(item: SectionType['content'][number]): item is { headers: string[]; rows: string[][]; caption?: string } {
  return 'headers' in item;
}

function isChartContent(item: SectionType['content'][number]): item is { type: 'LINE' | 'BAR' | 'PIE' | 'SCATTER'; data: Record<string, number[]>; labels: string[]; title: string; description?: string } {
  return 'type' in item && 'data' in item;
}

function isCodeContent(item: SectionType['content'][number]): item is { code: string; language: string; caption?: string } {
  return 'code' in item;
}

function isQuoteContent(item: SectionType['content'][number]): item is { text: string; author: string; source?: string; year?: string } {
  return 'text' in item;
}

function transformContent(content: SectionType['content']): DocumentContentType[] {
  return content.flatMap((item): DocumentContentType[] => {
    if (isTextContent(item)) {
      return [{
        type: 'text',
        content: item.content,
        style: item.style || 'NORMAL'
      }];
    }
    if (isImageContent(item)) {
      return [{
        type: 'image',
        content: `[Image to be generated: ${item.description}]`,
        ...(item.caption && { caption: item.caption })
      }];
    }
    if (isTableContent(item)) {
      const tableContent = [
        item.headers.join(' | '),
        item.headers.map(() => '---').join(' | '),
        ...item.rows.map(row => row.join(' | '))
      ].join('\n');
      return [{
        type: 'table',
        content: tableContent,
        ...(item.caption && { caption: item.caption })
      }];
    }
    if (isChartContent(item)) {
      return [{
        type: 'chart',
        content: JSON.stringify({
          type: item.type,
          data: item.data,
          labels: item.labels,
          title: item.title,
          description: item.description
        })
      }];
    }
    if (isCodeContent(item)) {
      return [{
        type: 'code',
        content: item.code,
        language: item.language,
        ...(item.caption && { caption: item.caption })
      }];
    }
    if (isQuoteContent(item)) {
      return [{
        type: 'quote',
        content: item.text,
        attribution: `${item.author}${item.source ? ` - ${item.source}` : ''}${item.year ? `, ${item.year}` : ''}`
      }];
    }
    return [];
  });
}

function transformSection(section: SectionType): DocumentSection {
  return {
    heading: section.title,
    contents: transformContent(section.content)
  };
}

export function transformToDocumentRequest(report: Report): DocumentRequest {
  // Transform main sections
  const mainSections = report.sections.map(transformSection);

  // Add metadata section
  const metadataSection: DocumentSection = {
    heading: "Document Information",
    contents: [
      {
        type: 'text',
        content: [
          `Author: ${report.metadata.author}`,
          `Date: ${report.metadata.date}`,
          report.metadata.version ? `Version: ${report.metadata.version}` : '',
          `Keywords: ${report.metadata.keywords.join(', ')}`,
          '',
          'Abstract',
          report.metadata.abstract
        ].filter(Boolean).join('\n'),
        style: 'NORMAL'
      }
    ]
  };

  // Add key findings section
  const conclusionSection: DocumentSection = {
    heading: "Key Findings and Next Steps",
    contents: [
      {
        type: 'text',
        content: [
          'Key Findings:',
          ...report.inferredDetails.keyFindings.map(finding => `• ${finding}`),
          '',
          'Suggested Next Steps:',
          ...report.inferredDetails.suggestedNextSteps.map(step => `• ${step}`)
        ].join('\n'),
        style: 'NORMAL'
      }
    ]
  };

  return {
    title: report.title,
    content: {
      sections: [
        metadataSection,
        ...mainSections,
        conclusionSection
      ]
    }
  };
} 