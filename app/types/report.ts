export type ReportStyle = 'ACADEMIC' | 'BUSINESS' | 'TECHNICAL' | 'CREATIVE';

export type SectionType = {
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
};

export interface ReportMetadata {
  author: string;
  date: string;
  version?: string;
  keywords: string[];
  abstract: string;
}

export interface ReportInferredDetails {
  audience: string;
  purpose: string;
  keyFindings: string[];
  suggestedNextSteps: string[];
}

export interface Report {
  title: string;
  style: ReportStyle;
  sections: SectionType[];
  metadata: ReportMetadata;
  styleReasoning: string;
  contentFlow: string[];
  inferredDetails: ReportInferredDetails;
} 