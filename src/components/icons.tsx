import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color?: string };

const line = (color: string, w: number) =>
  ({ fill: 'none', stroke: color, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round' }) as const;

const HEART = 'M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2 0 3.5 1 4.4 2.5h2c.9-1.5 2.4-2.5 4.4-2.5 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z';

export function HeartIcon({ size = 24, color = '#06241A', filled = true }: P & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={HEART} {...(filled ? { fill: color } : line(color, 2.6))} />
    </Svg>
  );
}

export function CloseIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5l14 14M19 5 5 19" {...line(color, 3)} />
    </Svg>
  );
}

export function PlusIcon({ size = 30, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 4v16M4 12h16" {...line(color, 3)} />
    </Svg>
  );
}

export function ShuffleIcon({ size = 20, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" {...line(color, 2.4)} />
    </Svg>
  );
}

export function CameraIcon({ size = 46, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" {...line(color, 2.4)} />
      <Circle cx={12} cy={13} r={3.5} {...line(color, 2.4)} />
    </Svg>
  );
}

export function GalleryIcon({ size = 20, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={16} rx={3} {...line(color, 2.4)} />
      <Circle cx={9} cy={10} r={1.8} {...line(color, 2.4)} />
      <Path d="m21 16-5-5-9 9" {...line(color, 2.4)} />
    </Svg>
  );
}

export function TrashIcon({ size = 24, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...line(color, 2.4)} />
    </Svg>
  );
}

export function CheckIcon({ size = 30, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m5 12.5 4.5 4.5L19 7.5" {...line(color, 3.2)} />
    </Svg>
  );
}

export function BackIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 12H5M11 6l-6 6 6 6" {...line(color, 3)} />
    </Svg>
  );
}

export function HangerIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 8V6.5a2.2 2.2 0 1 0-2.2-2.2M12 8l8.5 5.6a1.4 1.4 0 0 1-.8 2.6H4.3a1.4 1.4 0 0 1-.8-2.6L12 8z" {...line(color, 2.2)} />
    </Svg>
  );
}

export function SparkleIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" {...line(color, 2.2)} />
    </Svg>
  );
}

export function StackIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={7} width={14} height={14} rx={3.5} {...line(color, 2.2)} />
      <Path d="M7 3.5h11A3 3 0 0 1 21 6.5V17" {...line(color, 2.2)} />
    </Svg>
  );
}

export function PencilIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" {...line(color, 2.4)} />
    </Svg>
  );
}

export function UserIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} {...line(color, 2.4)} />
      <Path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" {...line(color, 2.4)} />
    </Svg>
  );
}

export function LogoutIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" {...line(color, 2.4)} />
    </Svg>
  );
}

export function GearIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3.2} {...line(color, 2.4)} />
      <Path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" {...line(color, 2.4)} />
    </Svg>
  );
}

export function RetakeIcon({ size = 26, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" {...line(color, 2.6)} />
      <Path d="M3 3v5h5" {...line(color, 2.6)} />
      <Path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" {...line(color, 2.6)} />
      <Path d="M21 21v-5h-5" {...line(color, 2.6)} />
    </Svg>
  );
}

export function CropIcon({ size = 24, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 2v14a2 2 0 0 0 2 2h14" {...line(color, 2.4)} />
      <Path d="M18 22V8a2 2 0 0 0-2-2H2" {...line(color, 2.4)} />
    </Svg>
  );
}

export function RotateCwIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 8" {...line(color, 2.4)} />
      <Path d="M21 3v5h-5" {...line(color, 2.4)} />
    </Svg>
  );
}

export function VolumeIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" {...line(color, 2.2)} />
      <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" {...line(color, 2.2)} />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" {...line(color, 2.2)} />
    </Svg>
  );
}

export function EmptyClosetIcon({ size = 22, color = '#06241A' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" {...line(color, 2.2)} />
      <Path d="M5 21v2M19 21v2" {...line(color, 2.2)} />
      <Path d="M6 7.5h12" {...line(color, 2)} />
      <Path d="M12 7.5v1.2a1 1 0 1 0 1-1" {...line(color, 1.8)} />
      <Path d="m12 8.7-3.5 2.8h7L12 8.7z" {...line(color, 1.8)} />
      <Path d="M3 16.5h18" {...line(color, 2)} />
    </Svg>
  );
}
