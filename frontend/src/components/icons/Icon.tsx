import {
  Activity,
  ArrowRight,
  BarChart3,
  BedDouble,
  Bell,
  Boxes,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Eye,
  EyeOff,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LogOut,
  Mail,
  Menu,
  Moon,
  Pill,
  Plus,
  Receipt,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
  User,
  Users,
  X,
  Monitor,
  Clock,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  Download,
  type LucideIcon,
} from 'lucide-react';

/**
 * Centralized icon registry (foundation §10 — one `<Icon name="…"/>` component,
 * no emojis). Add new glyphs here, never import lucide directly elsewhere.
 */
const REGISTRY = {
  dashboard: LayoutDashboard,
  patients: Users,
  appointments: Calendar,
  queue: ListOrdered,
  triage: Activity,
  emr: Stethoscope,
  clinical: ClipboardList,
  pharmacy: Pill,
  laboratory: FlaskConical,
  radiology: ScanLine,
  billing: Receipt,
  payments: CreditCard,
  inpatient: BedDouble,
  inventory: Boxes,
  reports: BarChart3,
  settings: Settings,
  audit: ShieldCheck,
  branches: Building2,
  bell: Bell,
  user: User,
  logout: LogOut,
  sun: Sun,
  moon: Moon,
  mail: Mail,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,
  heartPulse: HeartPulse,
  search: Search,
  plus: Plus,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  arrowRight: ArrowRight,
  menu: Menu,
  close: X,
  monitor: Monitor,
  business: Building2,
  time: Clock,
  users: Users,
  arrowLeft: ArrowLeft,
  calendar: Calendar,
  message: MessageSquare,
  download: Download,
  alertCircle: AlertCircle,
  shield: ShieldCheck,
  medical: HeartPulse,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof REGISTRY;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  'aria-hidden'?: boolean;
}

export function Icon({ name, className, size = 18, strokeWidth = 1.75, ...rest }: IconProps): JSX.Element {
  const Glyph = REGISTRY[name];

  return <Glyph className={className} size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />;
}
