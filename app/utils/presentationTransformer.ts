import { 
  SlideConfig, 
  ThemeName, 
  THEMES,
  TitleSlideContent,
  TwoColumnContent,
  ImageSlideContent,
  QuoteSlideContent,
  BulletPointsContent,
  NumberPointsContent
} from '@/types/presentation';
import { RgbColor, Position, Size, FontStyle } from '@/types/common';

interface Element {
  type: 'text' | 'image' | 'shape';
  content?: string;
  position: Position;
  size: Size;
  style?: {
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
  };
  shape_type?: 'RECTANGLE';
  fill_color?: RgbColor;
}

interface TransformedSlide {
  elements: Element[];
}

function createTextElement(
  content: string,
  position: Position,
  size: Size,
  style: Partial<FontStyle>,
  color: RgbColor
): Element {
  return {
    type: 'text',
    content,
    position,
    size,
    style: {
      bold: style.bold,
      fontSize: style.fontSize || { magnitude: 14, unit: 'PT' },
      foregroundColor: {
        opaqueColor: {
          rgbColor: color
        }
      }
    }
  };
}

function transformTitleSlide(content: TitleSlideContent, type: string, theme: ThemeName): TransformedSlide {
  const colors = THEMES[theme];
  const elements: Element[] = [
    // Background
    {
      type: 'shape',
      shape_type: 'RECTANGLE',
      position: { left: 0, top: 0 },
      size: { width: 720, height: 405 },
      fill_color: colors.background
    }
  ];

  switch (type) {
    case 'TITLE_CENTERED':
      elements.push(
        createTextElement(
          content.title,
          { left: 50, top: 120 },
          { width: 620, height: 60 },
          { bold: true, fontSize: { magnitude: 40, unit: 'PT' } },
          colors.primary
        )
      );
      if (content.subtitle) {
        elements.push(
          createTextElement(
            content.subtitle,
            { left: 50, top: 220 },
            { width: 620, height: 40 },
            { fontSize: { magnitude: 24, unit: 'PT' } },
            colors.secondary
          )
        );
      }
      break;

    case 'TITLE_LEFT':
      elements.push(
        createTextElement(
          content.title,
          { left: 50, top: 80 },
          { width: 300, height: 200 },
          { bold: true, fontSize: { magnitude: 36, unit: 'PT' } },
          colors.primary
        )
      );
      if (content.subtitle) {
        elements.push(
          createTextElement(
            content.subtitle,
            { left: 50, top: 200 },
            { width: 300, height: 60 },
            { fontSize: { magnitude: 20, unit: 'PT' } },
            colors.secondary
          )
        );
      }
      break;

    case 'TITLE_GRADIENT':
      // Replace background with darker gradient
      elements[0] = {
        type: 'shape',
        shape_type: 'RECTANGLE',
        position: { left: 0, top: 0 },
        size: { width: 720, height: 405 },
        fill_color: {
          red: colors.primary.red * 0.8,
          green: colors.primary.green * 0.8,
          blue: colors.primary.blue * 0.8
        }
      };
      elements.push(
        createTextElement(
          content.title,
          { left: 50, top: 120 },
          { width: 620, height: 60 },
          { bold: true, fontSize: { magnitude: 40, unit: 'PT' } },
          colors.textLight
        )
      );
      if (content.subtitle) {
        elements.push(
          createTextElement(
            content.subtitle,
            { left: 50, top: 220 },
            { width: 620, height: 40 },
            { fontSize: { magnitude: 24, unit: 'PT' } },
            colors.textLight
          )
        );
      }
      break;
  }

  return { elements };
}

function transformTwoColumnSlide(content: TwoColumnContent, type: string, theme: ThemeName): TransformedSlide {
  const colors = THEMES[theme];
  const elements: Element[] = [
    // Background
    {
      type: 'shape',
      shape_type: 'RECTANGLE',
      position: { left: 0, top: 0 },
      size: { width: 720, height: 405 },
      fill_color: colors.background
    },
    // Title
    createTextElement(
      content.title,
      { left: 50, top: 40 },
      { width: 620, height: 60 },
      { bold: true, fontSize: { magnitude: 28, unit: 'PT' } },
      colors.primary
    )
  ];

  let leftWidth: number, rightWidth: number, rightStart: number;

  switch (type) {
    case 'TWO_COLUMNS_EQUAL':
      leftWidth = 300;
      rightWidth = 300;
      rightStart = 370;
      break;
    case 'TWO_COLUMNS_LEFT_WIDE':
      leftWidth = 400;
      rightWidth = 200;
      rightStart = 470;
      break;
    case 'TWO_COLUMNS_RIGHT_WIDE':
      leftWidth = 200;
      rightWidth = 400;
      rightStart = 270;
      break;
    default:
      leftWidth = 300;
      rightWidth = 300;
      rightStart = 370;
  }

  // Add column titles if provided
  if (content.leftTitle) {
    elements.push(
      createTextElement(
        content.leftTitle,
        { left: 50, top: 120 },
        { width: leftWidth, height: 30 },
        { bold: true, fontSize: { magnitude: 16, unit: 'PT' } },
        colors.secondary
      )
    );
  }

  if (content.rightTitle) {
    elements.push(
      createTextElement(
        content.rightTitle,
        { left: rightStart, top: 120 },
        { width: rightWidth, height: 30 },
        { bold: true, fontSize: { magnitude: 16, unit: 'PT' } },
        colors.secondary
      )
    );
  }

  // Add column content
  elements.push(
    createTextElement(
      content.leftContent,
      { left: 50, top: content.leftTitle ? 160 : 120 },
      { width: leftWidth, height: 200 },
      { fontSize: { magnitude: 14, unit: 'PT' } },
      colors.text
    ),
    createTextElement(
      content.rightContent,
      { left: rightStart, top: content.rightTitle ? 160 : 120 },
      { width: rightWidth, height: 200 },
      { fontSize: { magnitude: 14, unit: 'PT' } },
      colors.text
    )
  );

  return { elements };
}

function transformImageSlide(content: ImageSlideContent, type: string, theme: ThemeName): TransformedSlide {
  const colors = THEMES[theme];
  const elements: Element[] = [
    // Background
    {
      type: 'shape',
      shape_type: 'RECTANGLE',
      position: { left: 0, top: 0 },
      size: { width: 720, height: 405 },
      fill_color: colors.background
    },
    // Title
    createTextElement(
      content.title,
      { left: 50, top: 30 },
      { width: 620, height: 50 },
      { bold: true, fontSize: { magnitude: 28, unit: 'PT' } },
      colors.primary
    )
  ];

  // Only IMAGE_CENTERED remains
  elements.push({
    type: 'image',
    content: content.imageUrl,
    position: { left: 110, top: 100 },
    size: { width: 500, height: 260 }
  });
  
  if (content.caption) {
    elements.push(
      createTextElement(
        content.caption,
        { left: 110, top: 370 },
        { width: 500, height: 25 },
        { fontSize: { magnitude: 14, unit: 'PT' }, bold: false },
        colors.text
      )
    );
  }

  return { elements };
}

function transformQuoteSlide(content: QuoteSlideContent, type: string, theme: ThemeName): TransformedSlide {
  const colors = THEMES[theme];
  const elements: Element[] = [
    // Background
    {
      type: 'shape',
      shape_type: 'RECTANGLE',
      position: { left: 0, top: 0 },
      size: { width: 720, height: 405 },
      fill_color: colors.background
    }
  ];

  switch (type) {
    case 'QUOTE_CENTERED':
      elements.push(
        createTextElement(
          `"${content.quote}"`,
          { left: 100, top: 100 },
          { width: 520, height: 100 },
          { bold: true, fontSize: { magnitude: 32, unit: 'PT' } },
          colors.primary
        ),
        createTextElement(
          `- ${content.author}`,
          { left: 100, top: 220 },
          { width: 520, height: 40 },
          { fontSize: { magnitude: 20, unit: 'PT' } },
          colors.secondary
        )
      );
      if (content.context) {
        elements.push(
          createTextElement(
            content.context,
            { left: 100, top: 270 },
            { width: 520, height: 60 },
            { fontSize: { magnitude: 16, unit: 'PT' } },
            colors.text
          )
        );
      }
      break;

    case 'QUOTE_SIDE':
      elements.push(
        createTextElement(
          `"${content.quote}"`,
          { left: 50, top: 80 },
          { width: 400, height: 200 },
          { bold: true, fontSize: { magnitude: 24, unit: 'PT' } },
          colors.primary
        ),
        createTextElement(
          `- ${content.author}`,
          { left: 470, top: 80 },
          { width: 200, height: 40 },
          { fontSize: { magnitude: 18, unit: 'PT' } },
          colors.secondary
        )
      );
      if (content.context) {
        elements.push(
          createTextElement(
            content.context,
            { left: 470, top: 130 },
            { width: 200, height: 150 },
            { fontSize: { magnitude: 16, unit: 'PT' } },
            colors.text
          )
        );
      }
      break;
  }

  return { elements };
}

function transformBulletPoints(content: BulletPointsContent, type: string, theme: ThemeName): TransformedSlide {
  const colors = THEMES[theme];
  const elements: Element[] = [
    // Background
    {
      type: 'shape',
      shape_type: 'RECTANGLE',
      position: { left: 0, top: 0 },
      size: { width: 720, height: 405 },
      fill_color: colors.background
    },
    // Title
    createTextElement(
      content.title,
      { left: 50, top: 40 },
      { width: 620, height: 60 },
      { bold: true, fontSize: { magnitude: 28, unit: 'PT' } },
      colors.primary
    ),
    // Points
    createTextElement(
      content.points.map((point: string) => `• ${point}`).join('\n'),
      { left: 70, top: 120 },
      { width: 580, height: 250 },
      { fontSize: { magnitude: 18, unit: 'PT' } },
      colors.text
    )
  ];

  return { elements };
}

function transformNumberPoints(content: NumberPointsContent, type: string, theme: ThemeName): TransformedSlide {
  const colors = THEMES[theme];
  const elements: Element[] = [
    // Background
    {
      type: 'shape',
      shape_type: 'RECTANGLE',
      position: { left: 0, top: 0 },
      size: { width: 720, height: 405 },
      fill_color: colors.background
    },
    // Title
    createTextElement(
      content.title,
      { left: 50, top: 40 },
      { width: 620, height: 60 },
      { bold: true, fontSize: { magnitude: 28, unit: 'PT' } },
      colors.primary
    ),
    // Points
    createTextElement(
      content.points.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n'),
      { left: 70, top: 120 },
      { width: 580, height: 250 },
      { fontSize: { magnitude: 18, unit: 'PT' } },
      colors.text
    )
  ];

  return { elements };
}

export function transformSlide(slideConfig: SlideConfig, theme: ThemeName): TransformedSlide {
  console.log('Transforming slide:', JSON.stringify(slideConfig, null, 2));
  
  // If slide already has elements, return them after ensuring type compatibility
  if (slideConfig.elements) {
    console.log('Slide already has elements, returning as is');
    const elements: Element[] = slideConfig.elements.map(el => {
      const defaultRgb = { red: 0, green: 0, blue: 0 };
      const style = el.style ? {
        bold: el.style.bold,
        fontSize: el.style.fontSize || { magnitude: 14, unit: 'PT' },
        foregroundColor: {
          opaqueColor: {
            rgbColor: el.style.foregroundColor?.opaqueColor?.rgbColor ? {
              red: el.style.foregroundColor.opaqueColor.rgbColor.red ?? defaultRgb.red,
              green: el.style.foregroundColor.opaqueColor.rgbColor.green ?? defaultRgb.green,
              blue: el.style.foregroundColor.opaqueColor.rgbColor.blue ?? defaultRgb.blue
            } : defaultRgb
          }
        }
      } : undefined;

      const fillColor = el.fill_color ? {
        red: el.fill_color.red ?? defaultRgb.red,
        green: el.fill_color.green ?? defaultRgb.green,
        blue: el.fill_color.blue ?? defaultRgb.blue
      } : undefined;

      return {
        ...el,
        type: el.type as 'text' | 'image' | 'shape',
        position: el.position,
        size: el.size,
        style,
        shape_type: el.shape_type as 'RECTANGLE',
        fill_color: fillColor
      };
    });
    return { elements };
  }

  if (!slideConfig.type || !slideConfig.content) {
    throw new Error('Slide missing type or content and has no elements');
  }
  
  switch (slideConfig.type) {
    case 'TITLE_CENTERED':
    case 'TITLE_LEFT':
    case 'TITLE_GRADIENT':
      const titleResult = transformTitleSlide(slideConfig.content as TitleSlideContent, slideConfig.type, theme);
      console.log('Title slide result:', JSON.stringify(titleResult, null, 2));
      return titleResult;
    
    case 'TWO_COLUMNS_EQUAL':
    case 'TWO_COLUMNS_LEFT_WIDE':
    case 'TWO_COLUMNS_RIGHT_WIDE':
      const columnsResult = transformTwoColumnSlide(slideConfig.content as TwoColumnContent, slideConfig.type, theme);
      console.log('Two columns slide result:', JSON.stringify(columnsResult, null, 2));
      return columnsResult;
    
    case 'IMAGE_CENTERED':
      const imageResult = transformImageSlide(slideConfig.content as ImageSlideContent, slideConfig.type, theme);
      console.log('Image slide result:', JSON.stringify(imageResult, null, 2));
      return imageResult;
    
    case 'QUOTE_CENTERED':
    case 'QUOTE_SIDE':
      const quoteResult = transformQuoteSlide(slideConfig.content as QuoteSlideContent, slideConfig.type, theme);
      console.log('Quote slide result:', JSON.stringify(quoteResult, null, 2));
      return quoteResult;
    
    case 'BULLET_POINTS':
      const bulletResult = transformBulletPoints(slideConfig.content as BulletPointsContent, slideConfig.type, theme);
      console.log('Bullet points slide result:', JSON.stringify(bulletResult, null, 2));
      return bulletResult;
    
    case 'NUMBER_POINTS':
      const numberResult = transformNumberPoints(slideConfig.content as NumberPointsContent, slideConfig.type, theme);
      console.log('Number points slide result:', JSON.stringify(numberResult, null, 2));
      return numberResult;
    
    default:
      console.error('Unsupported slide type:', slideConfig.type);
      throw new Error(`Unsupported slide type: ${slideConfig.type}`);
  }
}

export function transformPresentation(title: string, theme: ThemeName, slides: SlideConfig[]) {
  console.log('Starting presentation transformation:', { title, theme });
  console.log('Input slides:', JSON.stringify(slides, null, 2));
  
  const result = {
    title,
    slides: slides.map(slide => transformSlide(slide, theme))
  };
  
  console.log('Transformation result:', JSON.stringify(result, null, 2));
  return result;
} 