"use client";

import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useCallback,
  useState,
} from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import { MdFileUpload as UploadIcon } from "react-icons/md";

import { resizeMinWidthImage } from "@/utils/canvas";
import { readFile } from "@/utils/files";

interface AvatarCropperProps {
  imageSrc: string | null;
  setImageSrc: Dispatch<SetStateAction<string | null>>;
  setCroppedAreaPixels: Dispatch<SetStateAction<Area | null>>;
}

const AvatarCropper: FunctionComponent<AvatarCropperProps> = ({
  imageSrc,
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
    <div className="flex w-full flex-row items-center justify-center">
      <input
        type="file"
        name="avatar"
        id="avatar"
        accept="image/*"
        hidden
        className={`border border-white/35 bg-[#141414] px-2 py-1 text-sm text-white focus:border-primary focus:ring-0 disabled:text-gray-600`}
        onChange={onFileChange}
      />
      <label
        className={
          "flex h-14 flex-1 cursor-pointer flex-row items-center border border-white/35 bg-[#141414] px-2 py-1 text-sm text-white/35"
        }
        htmlFor="avatar"
      >
        <span className="mr-2 min-w-min text-lg md:text-xl">
          <UploadIcon />
        </span>
        <span className="w-52 truncate">Selecionar imagem</span>
      </label>
    </div>
  );
};
export default AvatarCropper;
