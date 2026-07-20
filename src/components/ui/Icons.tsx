import { PinSolid as Pin } from "@mynaui/icons-react";
import {
  FaArchive as Archive,
  FaChartPie as Chart,
  FaRegCheckSquare as CheckSquare,
  FaClipboard as Clipboard,
  FaRegEnvelope as Email,
  FaGithub as Github,
  FaLeaf as Leaf,
  FaTrophy as Trophy,
} from "react-icons/fa";
import { FaRegSquare as Square } from "react-icons/fa6";
import { HiPencilSquare as Pencil } from "react-icons/hi2";
import { IoMdCalendar as Calendar, IoIosLogIn as LogIn } from "react-icons/io";
import {
  MdDownload as DownloadIcon,
  MdInstallDesktop as InstallPwaDesktop,
  MdInstallMobile as InstallPwaMobile,
  MdWatch as Watch,
} from "react-icons/md";

import {
  BsAlarm as Alarm,
  BsChevronDown as ChevronDown,
  BsFacebook as Facebook,
  BsGeoAlt as GeoAlt,
  BsGlobe as Globe,
  BsBoxArrowInDown as ImportCv,
  BsInstagram as Instagram,
  BsLinkedin as Linkedin,
  BsBoxArrowUpRight as OpenCv,
  BsQuestionCircleFill as QuestionCircle,
  BsTwitter as Twitter,
  BsX as X,
  BsYoutube as Youtube,
} from "react-icons/bs";

const Chevron: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  return (
    <ChevronDown
      className={`transition-transform duration-300 ${
        isOpen ? "rotate-180" : "rotate-0"
      } h-6 w-6 text-white md:h-8 md:w-8`}
    />
  );
};

export {
  Alarm,
  Archive,
  Calendar,
  Chart,
  CheckSquare,
  ChevronDown,
  Chevron,
  Clipboard,
  DownloadIcon,
  Email,
  Facebook,
  GeoAlt,
  Github,
  Globe,
  ImportCv,
  Instagram,
  InstallPwaDesktop,
  InstallPwaMobile,
  Leaf,
  Linkedin,
  Pin,
  LogIn,
  OpenCv,
  Pencil,
  QuestionCircle,
  Square,
  Trophy,
  Twitter,
  Watch,
  X,
  Youtube,
};
