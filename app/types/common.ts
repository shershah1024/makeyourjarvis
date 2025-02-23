export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface Position {
  left: number;
  top: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface FontStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize: {
    magnitude: number;
    unit: string;
  };
} 