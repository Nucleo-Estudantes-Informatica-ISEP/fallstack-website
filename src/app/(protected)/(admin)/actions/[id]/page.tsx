import ActionQrCodeData from "@/components/Action/ActionQrCodeData";
import CloseActionButton from "@/components/Action/CloseActionButton";
import Custom404 from "@/app/not-found";
import { toActionDto } from "@/application/dto/actionDto";
import { getActionQrCode } from "@/application/services/actionService";

interface ActionParams {
  params: Promise<{
    id: string;
  }>;
}

const Actions = async ({ params }: ActionParams) => {
  const { id } = await params;
  const actionQrCode = await getActionQrCode(id);
  if (!actionQrCode) return Custom404();
  const { action, qrCode } = actionQrCode;
  const actionDto = toActionDto(action);

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <h1 className="mb-12 text-3xl font-bold text-primary lg:text-6xl">
        {actionDto.name}
      </h1>
      <CloseActionButton id={id} action={actionDto} />
      <ActionQrCodeData id={id} initialQrCode={qrCode} />
    </section>
  );
};

export default Actions;
