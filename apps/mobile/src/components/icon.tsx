import {
  Home,
  BookOpen,
  Package,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  Truck,
  Star,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'book'
  | 'orders'
  | 'profile'
  | 'chevronR'
  | 'chevronL'
  | 'check'
  | 'clock'
  | 'pkg'
  | 'truck'
  | 'wa'
  | 'star'
  | 'settings'
  | 'bell'
  | 'help'
  | 'logout';

const LUCIDE: Partial<Record<IconName, LucideIcon>> = {
  home: Home,
  book: BookOpen,
  orders: Package,
  profile: User,
  chevronR: ChevronRight,
  chevronL: ChevronLeft,
  check: Check,
  clock: Clock,
  pkg: Package,
  truck: Truck,
  star: Star,
  settings: Settings,
  bell: Bell,
  help: HelpCircle,
  logout: LogOut,
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

type GlyphProps = Omit<IconProps, 'name'>;

// WhatsApp glyph — not in Lucide, ported from the exact path used in
// project/app-screens.jsx so the mark matches everywhere else in the brand.
function WhatsAppIcon({ size = 20, color = 'currentColor', strokeWidth = 1.5 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Icon({ name, size = 20, color = '#0A1F44', strokeWidth = 1.5 }: IconProps) {
  if (name === 'wa') {
    return <WhatsAppIcon size={size} color={color} strokeWidth={strokeWidth} />;
  }
  const LucideComp = LUCIDE[name];
  if (!LucideComp) return null;
  return <LucideComp size={size} color={color} strokeWidth={strokeWidth} />;
}
