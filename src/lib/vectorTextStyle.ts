export interface VectorTextStyleInput {
  color: string;
  fontSize: number;
  backgroundColor: string;
  fontFamily: string;
  fontWeight: string;
  multiline: boolean;
  text?: string;
  boxWidth?: number;
  boxHeight?: number;
  rotation?: number;
  textAlign?: 'left' | 'center' | 'right';
  padding?: number;
}

interface StyleLike {
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  padding?: string;
  transform?: string;
  transformOrigin?: string;
  whiteSpace?: string;
  wordBreak?: string;
  width?: string;
  minWidth?: string;
  height?: string;
  minHeight?: string;
}

interface TextElementLike {
  style: StyleLike;
  dataset: Record<string, string>;
  value?: string;
  offsetWidth?: number;
  offsetHeight?: number;
  setAttribute(name: string, value: string): void;
}

interface IconLike {
  style: StyleLike;
}

interface IconOptionsLike {
  iconSize?: [number, number];
  iconAnchor?: [number, number];
}

export interface ApplyVectorTextStyleOptions {
  element: TextElementLike;
  icon?: IconLike | null;
  iconOptions?: IconOptionsLike | null;
  setText?: (text: string) => void;
  textStyle: VectorTextStyleInput;
}

function setOptionalBoxSize(
  element: TextElementLike,
  key: 'Width' | 'Height',
  value: number | undefined,
) {
  const styleKey = key === 'Width' ? 'width' : 'height';
  const minStyleKey = key === 'Width' ? 'minWidth' : 'minHeight';
  const datasetKey = key === 'Width' ? 'boxWidth' : 'boxHeight';

  if (value !== undefined) {
    if (styleKey === 'width') {
      element.style.width = `${value}px`;
      element.style.minWidth = `${value}px`;
    } else {
      element.style.height = `${value}px`;
      element.style.minHeight = `${value}px`;
    }
    element.dataset[datasetKey] = String(value);
    return;
  }

  if (styleKey === 'width') {
    element.style.width = '';
    element.style.minWidth = '';
  } else {
    element.style.height = '';
    element.style.minHeight = '';
  }
  delete element.dataset[datasetKey];
}

export function applyVectorTextStyle({
  element,
  icon,
  iconOptions,
  setText,
  textStyle,
}: ApplyVectorTextStyleOptions): { width: number; height: number } {
  element.style.color = textStyle.color;
  element.style.backgroundColor = textStyle.backgroundColor === 'transparent'
    ? 'transparent'
    : textStyle.backgroundColor;
  element.style.fontSize = `${textStyle.fontSize}px`;
  element.style.fontFamily = textStyle.fontFamily;
  element.style.fontWeight = textStyle.fontWeight;
  element.style.textAlign = textStyle.textAlign || 'left';
  element.style.padding = `${textStyle.padding || 0}px`;
  element.style.transform = `rotate(${textStyle.rotation || 0}deg)`;
  element.style.transformOrigin = 'center center';

  if (textStyle.multiline) {
    element.setAttribute('wrap', 'soft');
    element.style.whiteSpace = 'pre-wrap';
    element.style.wordBreak = 'break-word';
  } else {
    element.setAttribute('wrap', 'off');
    element.style.whiteSpace = 'pre';
    element.style.wordBreak = 'normal';
  }

  if (textStyle.text !== undefined && element.value !== textStyle.text) {
    setText?.(textStyle.text);
  }

  setOptionalBoxSize(element, 'Width', textStyle.boxWidth);
  setOptionalBoxSize(element, 'Height', textStyle.boxHeight);

  const width = textStyle.boxWidth || element.offsetWidth || 60;
  const height = textStyle.boxHeight || element.offsetHeight || 20;

  if (icon) {
    icon.style.width = `${width}px`;
    icon.style.height = `${height}px`;
  }

  if (iconOptions) {
    iconOptions.iconSize = [width, height];
    iconOptions.iconAnchor = [width / 2, height / 2];
  }

  return { width, height };
}
