import {
  Activity, AlertCircle, AlertTriangle, Armchair, ArrowLeft, ArrowRight, Ban, BadgeCheck, Banknote, BarChart3,
  Baby, Bell, Bolt, BriefcaseMedical, Building, Building2, Calendar, CalendarCheck, CalendarDays, CalendarX,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, ClipboardList, ClipboardPen,
  Clock, CloudDownload, CloudOff, CloudUpload, Construction, CreditCard, Database, DoorOpen, ExternalLink,
  FileCheck, FilePlus, FileSignature, FileText, FlaskConical, FolderOpen, HeartPulse, HelpCircle, History,
  Hospital, Hourglass, IdCard, Image, Inbox, LayoutDashboard, List, ListChecks, ListOrdered, Lock, LogIn, LogOut,
  MapPin, Mic, Microscope, Package, Paperclip, Pill, Pipette, Play, Plus, Receipt, ReceiptText, RefreshCw,
  ScanLine, Search, Settings, Shield, ShieldCheck, ShieldPlus, UserRoundCheck, ShoppingCart, Siren, Smartphone,
  Stethoscope, Store, Syringe, Ticket, Trash2, TrendingUp, Truck, User, UserCog, UserPlus, Users, UserX, Video,
  Wallet, X, XCircle, Zap, ArrowRightLeft, Bandage,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps legacy Material Symbols names (still stored in a few data tables and
 * screen configs) onto the Lucide set so the whole app renders one icon family.
 * Prefer `<Icon name=… />` for new code.
 */
const GLYPHS: Record<string, LucideIcon> = {
  account_balance_wallet: Wallet, add: Plus, analytics: BarChart3, arrow_back: ArrowLeft,
  arrow_forward: ArrowRight, assessment: BarChart3, assignment_ind: IdCard, attach_file: Paperclip,
  audit: ShieldCheck, autorenew: RefreshCw, biotech: Microscope, block: Ban, bolt: Zap, branches: Building2,
  calendar_month: CalendarDays, calendar_today: Calendar, cancel: XCircle, check: Check,
  check_circle: CheckCircle2, check_circle_outline: CheckCircle2, chevron_left: ChevronLeft,
  chevron_right: ChevronRight, clinical_notes: ClipboardPen, close: X, cloud_download: CloudDownload,
  cloud_off: CloudOff, cloud_upload: CloudUpload, colorize: Pipette, confirmation_number: Ticket,
  construction: Construction, contract: FileSignature, credit_card: CreditCard, dashboard: LayoutDashboard,
  database: Database, delete: Trash2, description: FileText, domain: Building2, domain_disabled: Building,
  door_open: DoorOpen, e911_emergency: Siren, emergency: Siren, error: AlertCircle, event: Calendar,
  event_available: CalendarCheck, event_busy: CalendarX, event_seat: Armchair, expand_less: ChevronUp,
  expand_more: ChevronDown, folder_open: FolderOpen, format_list_bulleted: List, groups: Users,
  healing: Bandage, health_and_safety: ShieldPlus, help: HelpCircle, history: History, hourglass_top: Hourglass,
  image: Image, inbox: Inbox, info: AlertCircle, inventory: Package, inventory_2: Package,
  lab_profile: FileText, labs: FlaskConical, list_alt: ListChecks, local_hospital: Hospital,
  local_shipping: Truck, location_on: MapPin, lock: Lock, login: LogIn, logout: LogOut,
  manage_accounts: UserCog, medical_services: BriefcaseMedical, medication: Pill, mic: Mic,
  monitoring: Activity, notifications: Bell, open_in_new: ExternalLink, patients: Users, payments: Banknote,
  person: User, person_add: UserPlus, person_off: UserX, picture_as_pdf: FileText, pill: Pill,
  play_arrow: Play, point_of_sale: CreditCard, policy: FileCheck, post_add: FilePlus,
  pregnant_woman: Baby, prescriptions: ClipboardList, priority_high: AlertCircle, queue: ListOrdered,
  radiology: ScanLine, receipt: Receipt, receipt_long: ReceiptText, rule: ListChecks, schedule: Clock,
  science: FlaskConical, search: Search, settings: Settings, shield: Shield, shield_person: UserRoundCheck,
  shield_with_heart: ShieldPlus, shopping_cart: ShoppingCart, smartphone: Smartphone,
  stethoscope: Stethoscope, storefront: Store, task_alt: CheckCircle2,
  transfer_within_a_station: ArrowRightLeft, triage: HeartPulse, trending_up: TrendingUp, upload: CloudUpload,
  vaccines: Syringe, verified: BadgeCheck, verified_user: ShieldCheck, videocam: Video, warning: AlertTriangle,
  power: Bolt,
};

interface GlyphProps {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function Glyph({ name, className, size = 18, strokeWidth = 1.75 }: GlyphProps): JSX.Element {
  const Component = GLYPHS[name] ?? Circle;
  return <Component className={className} size={size} strokeWidth={strokeWidth} aria-hidden />;
}
