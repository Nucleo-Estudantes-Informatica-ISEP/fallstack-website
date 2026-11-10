"use client";

import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useCallback,
  useState,
} from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { MdOutlineCloudUpload as UploadIcon } from "react-icons/md";

import { resizeMinWidthImage } from "@/utils/canvas";
import { readFile } from "@/utils/files";

interface AvatarCropperProps {
  imageSrc: string | null;
  uploadIcon?: React.ReactNode;
  setImageSrc: Dispatch<SetStateAction<string | null>>;
  setCroppedAreaPixels: Dispatch<SetStateAction<Area | null>>;
}

const AvatarCropper: FunctionComponent<AvatarCropperProps> = ({
  imageSrc,
  uploadIcon = <UploadIcon />,
  setImageSrc,
  setCroppedAreaPixels,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [setCroppedAreaPixels]
  );

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const read = await readFile(file);

      // needs resize to avoid crop issues
      const imageDataUrl = await resizeMinWidthImage(read, 325);

      setImageSrc(imageDataUrl);
    }
  };

  return imageSrc ? (
    <div className="relative h-64 w-full overflow-hidden">
      <Cropper
        image={imageSrc}
        crop={crop}
        cropShape="round"
        zoom={zoom}
        aspect={1}
        showGrid={false}
        onCropChange={setCrop}
        onCropComplete={onCropComplete}
        onZoomChange={setZoom}
        classes={{
          cropAreaClassName: "!border-primary",
          containerClassName: "",
        }}
        style={{
          mediaStyle: {
            width: "100%",
            objectFit: "scale-down",
          },
        }}
      />
    </div>
  ) : (
    <div className="relative flex w-full flex-row items-center justify-center">
      <input
        type="file"
        name="avatar"
        id="avatar"
        accept="image/*"
        className="peer sr-only field-focus-target"
        onChange={onFileChange}
      />
      <label
        className="flex field-height min-w-0 flex-1 cursor-pointer items-center rounded-full border field-border bg-background py-2 pr-4 pl-(--field-icon-padding,3.125rem) field-text text-gray-400 transition-colors peer-focus-visible:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:border-white/60"
        htmlFor="avatar"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-(--field-icon-inset,1rem) flex items-center text-lg"
        >
          {uploadIcon}
        </span>
        <span className="min-w-0 truncate">Insere uma imagem</span>
      </label>
    </div>
  );
};
export default AvatarCropper;
