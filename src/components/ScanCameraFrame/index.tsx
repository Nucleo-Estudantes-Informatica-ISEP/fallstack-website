interface ScanCameraFrameProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Box the live camera preview fills. `relative` keeps the scanner's own
 * "A ligar a tua câmara..." overlay inside it, and the label names the
 * unlabelled video for screen readers.
 */
const ScanCameraFrame: React.FC<ScanCameraFrameProps> = ({
  children,
  className = "",
}) => (
  <div
    role="group"
    aria-label="Câmara do leitor de QR Code"
    className={`relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black [&_video]:size-full [&_video]:object-cover [&>div]:size-full ${className}`}
  >
    {children}
  </div>
);

export default ScanCameraFrame;
