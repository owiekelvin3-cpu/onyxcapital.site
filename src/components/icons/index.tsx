"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGaugeHigh,
  faChartLine,
  faWallet,
  faArrowDown,
  faArrowUp,
  faGear,
  faRightFromBracket,
  faBell,
  faRobot,
  faUsers,
  faBars,
  faXmark,
  faEllipsis,
  faCopy,
  faCheck,
  faSpinner,
  faArrowsRotate,
  faLock,
  faEnvelope,
  faShieldHalved,
  faArrowRight,
  faFileCircleCheck,
  faChevronDown,
  faChevronRight,
  faChevronLeft,
  faGlobe,
  faArrowTrendUp,
  faStar,
  faClock,
  faLayerGroup,
  faReceipt,
  faEye,
  faEyeSlash,
  faArrowLeft,
  faCircleQuestion,
  faBolt,
  faCalendar,
  faLocationDot,
  faPhone,
  faUser,
  faBuildingColumns,
  faMoneyBillTransfer,
  faComments,
  faPlus,
  faMagnifyingGlass,
  faPaperPlane,
  faPaperclip,
  faFaceSmile,
  faFileLines,
  faImage,
  faCircleCheck,
  faTriangleExclamation,
  faMoon,
  faSun,
  faPlay,
  faCamera,
  faCreditCard,
  faUpload,
  faWandMagicSparkles,
  faArrowUpRightFromSquare,
  faDownload,
  faShareNodes,
  faMagnifyingGlassPlus,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  spin?: boolean;
  /** Ignored — kept for compatibility with previous Lucide usage. */
  strokeWidth?: number;
};

function icon(def: IconDefinition, defaults?: { spin?: boolean }) {
  function Icon({ className, spin }: IconProps) {
    return (
      <FontAwesomeIcon
        icon={def}
        className={cn(className)}
        spin={spin ?? defaults?.spin}
      />
    );
  }
  Icon.displayName = def.iconName;
  return Icon;
}

export const LayoutDashboard = icon(faGaugeHigh);
export const TrendingUp = icon(faArrowTrendUp);
export const Wallet = icon(faWallet);
export const ArrowDownToLine = icon(faArrowDown);
export const ArrowUpFromLine = icon(faArrowUp);
export const Settings = icon(faGear);
export const LogOut = icon(faRightFromBracket);
export const Bell = icon(faBell);
export const Bot = icon(faRobot);
export const Users = icon(faUsers);
export const Menu = icon(faBars);
export const X = icon(faXmark);
export const MoreHorizontal = icon(faEllipsis);
export const Copy = icon(faCopy);
export const Check = icon(faCheck);
export const Loader2 = icon(faSpinner, { spin: true });
export const RefreshCw = icon(faArrowsRotate);
export const Lock = icon(faLock);
export const Mail = icon(faEnvelope);
export const Shield = icon(faShieldHalved);
export const ArrowRight = icon(faArrowRight);
export const FileCheck = icon(faFileCircleCheck);
export const ChevronDown = icon(faChevronDown);
export const ChevronRight = icon(faChevronRight);
export const ChevronLeft = icon(faChevronLeft);
export const Globe = icon(faGlobe);
export const Star = icon(faStar);
export const Clock = icon(faClock);
export const Layers = icon(faLayerGroup);
export const Receipt = icon(faReceipt);
export const Eye = icon(faEye);
export const EyeOff = icon(faEyeSlash);
export const ArrowLeft = icon(faArrowLeft);
export const HelpCircle = icon(faCircleQuestion);
export const Zap = icon(faBolt);
export const LineChart = icon(faChartLine);
export const Calendar = icon(faCalendar);
export const MapPin = icon(faLocationDot);
export const Phone = icon(faPhone);
export const User = icon(faUser);
export const BuildingColumns = icon(faBuildingColumns);
export const MoneyBillTransfer = icon(faMoneyBillTransfer);
export const Comments = icon(faComments);
export const Plus = icon(faPlus);
export const Search = icon(faMagnifyingGlass);
export const PaperPlane = icon(faPaperPlane);
export const PaperClip = icon(faPaperclip);
export const FaceSmile = icon(faFaceSmile);
export const FileLines = icon(faFileLines);
export const Image = icon(faImage);
export const CircleCheck = icon(faCircleCheck);
export const CheckCircle = CircleCheck;
export const AlertTriangle = icon(faTriangleExclamation);
export const Sun = icon(faSun);
export const Moon = icon(faMoon);
export const Play = icon(faPlay);
export const Camera = icon(faCamera);
export const CreditCard = icon(faCreditCard);
export const Upload = icon(faUpload);
export const Sparkles = icon(faWandMagicSparkles);
export const ExternalLink = icon(faArrowUpRightFromSquare);
export const Download = icon(faDownload);
export const Share = icon(faShareNodes);
export const ZoomIn = icon(faMagnifyingGlassPlus);
export const Coins = icon(faCoins);
export const ImageIcon = Image;
